"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { adminDb, getOrCreateCustomer, siteUrl } from "@/lib/checkout";

/**
 * Die Bezahlseite liegt auf einer fremden Adresse. Server-Aktionen leiten
 * zuverlaessig nur innerhalb der eigenen Anwendung um — deshalb wird die
 * Adresse zurueckgegeben und der Browser navigiert selbst.
 */
export type SubscribeState = { error?: string; url?: string };

const PLAN_PRODUCT: Record<string, string> = {
  bronze: "membership_bronze",
  silver: "membership_silver",
  gold: "membership_gold",
};

/**
 * Mitgliedschaft abschließen.
 *
 * Anders als bei Einzelbuchungen ist hier die Lastschrift zugelassen: Bei
 * 269 € im Monat kostet sie 2,15 € statt 4,29 € Gebühr, und die
 * Verzögerung von einigen Tagen spielt bei einem Abo keine Rolle.
 */
export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const plan = String(formData.get("plan") ?? "");
  const productKey = PLAN_PRODUCT[plan];
  if (!productKey) return { error: "Diese Stufe gibt es nicht." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/anmelden");

  const db = adminDb();

  const { data: player } = await db
    .from("players")
    .select("id, date_of_birth, stripe_customer_id, profiles(email, first_name, last_name)")
    .eq("profile_id", user.id)
    .single<{
      id: string;
      date_of_birth: string;
      stripe_customer_id: string | null;
      profiles: { email: string; first_name: string | null; last_name: string | null } | null;
    }>();

  if (!player) return { error: "Für dein Konto gibt es noch kein Spielerprofil." };

  // Bei Minderjährigen ist ein Elternteil Vertragspartner (§ 106 BGB).
  // Ohne dessen Einwilligung darf kein Abo zustande kommen.
  const age =
    new Date().getFullYear() - new Date(player.date_of_birth).getFullYear();
  if (age < 18) {
    const { count } = await db
      .from("guardians")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id)
      .not("consent_given_at", "is", null);

    if ((count ?? 0) === 0) {
      return {
        error:
          "Für Spieler unter 18 Jahren fehlt die Zustimmung eines Elternteils. Ergänze sie in deinem Profil.",
      };
    }
  }

  const { count: existing } = await db
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("player_id", player.id)
    .eq("status", "active");

  if ((existing ?? 0) > 0) {
    return { error: "Du hast bereits eine aktive Mitgliedschaft." };
  }

  // Gold ist begrenzt (D31). Vor dem Bezahlen prüfen — sonst zahlt ein
  // elfter Kunde und bekommt keinen Platz.
  const { data: planRow } = await db
    .from("membership_plans")
    .select("id, max_seats")
    .eq("key", plan)
    .single<{ id: string; max_seats: number | null }>();

  if (planRow?.max_seats) {
    const { count: taken } = await db
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planRow.id)
      .eq("status", "active");

    if ((taken ?? 0) >= planRow.max_seats) {
      return { error: "Diese Stufe ist derzeit ausgebucht." };
    }
  }

  const { data: price } = await db
    .from("prices")
    .select("stripe_price_id, products!inner(key)")
    .eq("products.key", productKey)
    .eq("audience", "standard")
    .is("valid_to", null)
    .single<{ stripe_price_id: string | null }>();

  if (!price?.stripe_price_id) {
    return { error: "Für diese Stufe ist noch kein Preis hinterlegt." };
  }

  const customer = await getOrCreateCustomer({
    id: player.id,
    stripe_customer_id: player.stripe_customer_id,
    email: player.profiles?.email ?? "",
    name: [player.profiles?.first_name, player.profiles?.last_name]
      .filter(Boolean)
      .join(" "),
  });

  const checkout = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.stripe_price_id, quantity: 1 }],
    // Lastschrift bevorzugt, Karte als Rückfallebene.
    payment_method_types: ["sepa_debit", "card"],
    locale: "de",
    metadata: {
      altior_player_id: player.id,
      altior_plan: plan,
      altior_kind: "membership",
    },
    subscription_data: {
      metadata: { altior_player_id: player.id, altior_plan: plan },
    },
    success_url: `${siteUrl()}/mitgliedschaft?abgeschlossen=1`,
    cancel_url: `${siteUrl()}/mitgliedschaft?abgebrochen=1`,
  });

  if (!checkout.url) {
    return { error: "Die Bezahlseite konnte nicht geöffnet werden." };
  }

  return { url: checkout.url };
}
