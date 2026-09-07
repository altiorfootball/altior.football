import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

/**
 * Nimmt Stripes Rückmeldungen entgegen.
 *
 * Zwei Regeln sind hier nicht verhandelbar:
 *
 * 1. Signatur prüfen. Ein ungeprüfter Endpunkt bedeutet, dass jeder im
 *    Internet "Zahlung erfolgreich" schicken kann.
 * 2. Idempotent verarbeiten. Stripe stellt Ereignisse gelegentlich doppelt
 *    zu — ohne Schutz bekäme ein Spieler zwei Buchungen für eine Zahlung.
 */

// Schreibt mit vollem Zugriff: Der Zeilenschutz gilt für angemeldete Nutzer,
// hier kommt die Anfrage aber von Stripe und nicht von einem Konto.
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Signatur oder Webhook-Schlüssel fehlt" },
      { status: 400 }
    );
  }

  // Der Rohtext wird für die Signaturprüfung gebraucht — nicht das geparste
  // JSON, sonst stimmt die Prüfsumme nicht mehr.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  }

  const db = admin();

  // Jedes Ereignis nur einmal verarbeiten. Der eindeutige Schlüssel auf der
  // Ereignis-ID lässt einen zweiten Versuch auflaufen — dann ist nichts zu tun.
  const { error: seen } = await db
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const paymentId = session.metadata?.altior_payment_id;
        if (paymentId) {
          await db.rpc("confirm_reserved_booking", {
            p_payment_id: paymentId,
            p_intent:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
          });
        }
        break;
      }

      case "checkout.session.expired": {
        // Abgebrochen: Platz sofort freigeben, nicht erst nach 30 Minuten.
        const session = event.data.object;
        const paymentId = session.metadata?.altior_payment_id;
        if (paymentId) {
          await db.rpc("release_reservation_for_payment", {
            p_payment_id: paymentId,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        // Buchungsrecht pausieren, bis bezahlt ist (D41). Die Membership
        // bleibt bestehen — beendet wird erst nach der Mahnfrist.
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Fehler zurückmelden, damit Stripe es erneut versucht. Der Eintrag in
    // stripe_events wird dabei zurückgerollt — sonst wäre der zweite Versuch
    // als Doppel abgetan worden.
    await db.from("stripe_events").delete().eq("id", event.id);
    console.error("Webhook fehlgeschlagen:", event.type, e);
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
