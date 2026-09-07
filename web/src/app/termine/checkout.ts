"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { adminDb, getOrCreateCustomer, siteUrl } from "@/lib/checkout";
import type { BookingResult } from "./actions";

/**
 * Die Bezahlseite liegt auf einer fremden Adresse. Server-Aktionen leiten
 * zuverlaessig nur innerhalb der eigenen Anwendung um — deshalb wird die
 * Adresse zurueckgegeben und der Browser navigiert selbst.
 */
export type CheckoutResult = BookingResult & { url?: string };

/**
 * Kostenpflichtige Einzelbuchung eines Trainings.
 *
 * Ablauf: Platz reservieren, Bezahlseite öffnen, Rückmeldung abwarten.
 * Die Reservierung kommt zuerst — sonst bezahlt jemand für einen Platz,
 * den ihm in der Zwischenzeit ein anderer weggenommen hat.
 */
export async function checkoutSession(
  _prev: BookingResult,
  formData: FormData
): Promise<CheckoutResult> {
  const sessionId = String(formData.get("session_id") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/anmelden");

  const { data: reservation, error: reserveError } = await supabase
    .rpc("reserve_training_booking", { p_session_id: sessionId })
    .single<{ booking_id: string; payment_id: string; amount_cents: number }>();

  if (reserveError || !reservation) {
    const code = reserveError?.message.match(/ALTIOR_([A-Z_]+)/)?.[1];
    switch (code) {
      case "NO_CONSENT":
        return {
          error:
            "Für Spieler unter 18 Jahren fehlt die Zustimmung eines Elternteils. Ergänze sie in deinem Profil.",
        };
      case "TOO_LATE":
        return { error: "Dieser Termin ist nicht mehr buchbar." };
      case "ALREADY_BOOKED":
        return { error: "Du hast diesen Termin bereits gebucht." };
      case "FULL_GK":
      case "FULL_FIELD":
        return { error: "Die Plätze sind gerade belegt worden." };
      default:
        return { error: "Die Buchung konnte nicht vorbereitet werden." };
    }
  }

  const db = adminDb();

  const { data: player } = await db
    .from("players")
    .select("id, stripe_customer_id, profiles(email, first_name, last_name)")
    .eq("profile_id", user.id)
    .single<{
      id: string;
      stripe_customer_id: string | null;
      profiles: { email: string; first_name: string | null; last_name: string | null } | null;
    }>();

  const { data: session } = await db
    .from("training_sessions")
    .select("starts_at, location, prices(stripe_price_id)")
    .eq("id", sessionId)
    .single<{
      starts_at: string;
      location: string;
      prices: { stripe_price_id: string | null } | null;
    }>();

  const priceId = session?.prices?.stripe_price_id;
  if (!player || !priceId) {
    // Reservierung nicht liegen lassen, sonst blockiert sie 30 Minuten.
    await db.rpc("release_reservation_for_payment", {
      p_payment_id: reservation.payment_id,
    });
    return { error: "Für diesen Termin ist noch kein Preis hinterlegt." };
  }

  const customer = await getOrCreateCustomer({
    id: player.id,
    stripe_customer_id: player.stripe_customer_id,
    email: player.profiles?.email ?? "",
    name: [player.profiles?.first_name, player.profiles?.last_name]
      .filter(Boolean)
      .join(" "),
  });

  const start = new Date(session.starts_at).toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  // Stripe verlangt fuer eine Bezahlseite mindestens 30 Minuten Laufzeit.
  // Die Reservierung haelt 35 Minuten, also laenger — so kommt Stripes
  // Ablaufmeldung zuerst und der Platz wird nicht freigegeben, waehrend die
  // Zahlung noch verarbeitet wird.
  const CHECKOUT_MINUTES = 30;

  let checkoutUrl: string | null = null;
  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      // Einzelbuchungen nur per Karte: Lastschrift bestaetigt sich erst nach
      // Tagen und ist bis zu acht Wochen rueckbuchbar — untauglich fuer ein
      // Training am naechsten Abend.
      payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
      locale: "de",
      metadata: {
        altior_payment_id: reservation.payment_id,
        altior_booking_id: reservation.booking_id,
        altior_kind: "training",
      },
      payment_intent_data: {
        description: `Pro Player Training ${start}`,
        metadata: { altior_payment_id: reservation.payment_id },
      },
      success_url: `${siteUrl()}/termine?bezahlt=1`,
      cancel_url: `${siteUrl()}/termine?abgebrochen=1`,
    });
    checkoutUrl = checkout.url;
  } catch (e) {
    // Scheitert der Aufruf, darf die Reservierung nicht liegen bleiben —
    // sonst blockiert sie den Platz, ohne dass jemand bezahlen kann.
    await db.rpc("release_reservation_for_payment", {
      p_payment_id: reservation.payment_id,
    });
    console.error("Stripe-Bezahlseite fehlgeschlagen:", e);
    return {
      error:
        "Die Bezahlseite konnte nicht geoeffnet werden. Dein Platz ist wieder frei — versuch es bitte erneut.",
    };
  }

  if (!checkoutUrl) {
    await db.rpc("release_reservation_for_payment", {
      p_payment_id: reservation.payment_id,
    });
    return { error: "Die Bezahlseite konnte nicht geoeffnet werden." };
  }

  return { url: checkoutUrl };
}
