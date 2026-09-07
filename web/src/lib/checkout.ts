import { createClient } from "@supabase/supabase-js";
import { getStripe, STATEMENT_DESCRIPTOR } from "@/lib/stripe";

/**
 * Serverseitiger Datenbankzugriff mit vollem Zugriff.
 *
 * Nötig, weil der Kunden-Eintrag und die Abo-Kennung geschrieben werden
 * müssen — beides gehört keinem angemeldeten Nutzer, sondern dem System.
 */
export function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Legt den Stripe-Kunden einmal an und merkt ihn sich am Spieler.
 *
 * Ohne das entstünde bei jeder Zahlung ein neuer Kunde und die
 * Zahlungshistorie im Stripe-Dashboard wäre unbrauchbar — gerade bei
 * Lastschrift, wo das Mandat am Kunden hängt.
 */
export async function getOrCreateCustomer(player: {
  id: string;
  stripe_customer_id: string | null;
  email: string;
  name: string;
}): Promise<string> {
  if (player.stripe_customer_id) return player.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: player.email,
    name: player.name || undefined,
    metadata: { altior_player_id: player.id },
  });

  await adminDb().rpc("set_stripe_customer", {
    p_player_id: player.id,
    p_customer: customer.id,
  });

  return customer.id;
}

/** Erster Tag des kommenden Monats, als Sekunden seit 1970. */
export function firstOfNextMonth(): number {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0) / 1000
  );
}

export const checkoutDefaults = {
  statementDescriptor: STATEMENT_DESCRIPTOR,
} as const;
