import Stripe from "stripe";

/**
 * Stripe-Zugriff auf dem Server.
 *
 * Nur hier — der geheime Schlüssel darf nie in den Browser gelangen. Deshalb
 * kein NEXT_PUBLIC_ davor und kein Import dieser Datei aus Client-Komponenten.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY fehlt. Trage den Testschlüssel in web/.env.local ein."
    );
  }

  cached = new Stripe(key, {
    // Version festnageln: Stripe ändert das Verhalten zwischen Versionen,
    // und eine Rechnung von heute soll morgen noch gleich entstehen.
    // Muss zur installierten Bibliothek passen — sonst meckert der Typprüfer.
    apiVersion: "2026-08-26.dahlia",
    appInfo: { name: "ALTIOR", url: "https://altior.football" },
  });

  return cached;
}

/** Läuft der Zugang im Testmodus? */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

/**
 * Text auf dem Kontoauszug. Höchstens 22 Zeichen.
 *
 * Steht dort etwas Kryptisches, rufen Eltern bei ihrer Bank an und lassen
 * die Abbuchung zurückgehen — Rückbuchungen kosten Gebühren und Vertrauen.
 */
export const STATEMENT_DESCRIPTOR = "ALTIOR";
