import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rückweg, wenn jemand die Bezahlung bei Stripe abbricht.
 *
 * Stripe meldet einen Abbruch nicht — es meldet erst den Ablauf der
 * Bezahlseite nach 30 Minuten. Ohne diesen Rückweg bliebe der Platz so lange
 * reserviert, und der Spieler könnte es nicht einmal sofort erneut versuchen:
 * seine eigene Reservierung stünde im Weg.
 *
 * Die Datenbankfunktion prüft, dass die Reservierung wirklich dem
 * angemeldeten Spieler gehört. Eine fremde Zahlungskennung in der Adresse
 * bewirkt deshalb nichts.
 */
export async function GET(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("zahlung");
  const back = new URL("/termine?abgebrochen=1", request.url);

  if (!paymentId) return NextResponse.redirect(back);

  const supabase = await createClient();
  await supabase.rpc("release_own_reservation", { p_payment_id: paymentId });

  return NextResponse.redirect(back);
}
