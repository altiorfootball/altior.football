/**
 * Spiegelt den Produktkatalog aus der Datenbank nach Stripe.
 *
 * Die Preise werden in der Datenbank gepflegt, nicht im Stripe-Dashboard.
 * Sonst driften beide auseinander und niemand weiß, welcher Preis gilt.
 * Dieses Skript legt in Stripe an, was fehlt, und schreibt die erzeugte
 * Stripe-Preis-ID in die Datenbank zurück.
 *
 * Mehrfach ausführbar: bereits verknüpfte Preise werden übersprungen.
 *
 *   npm run stripe:sync
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// .env.local einlesen — dieses Skript läuft außerhalb von Next.js.
// Auf Windows enden Zeilen mit CR LF. Wird das CR nicht abgefangen, scheitert
// das Muster unten stillschweigend an jeder Zeile: der Punkt in einem regulären
// Ausdruck passt nicht auf Zeilenumbruchzeichen.
for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error(
    "STRIPE_SECRET_KEY fehlt in web/.env.local.\n" +
      "Zu finden im Stripe-Dashboard unter Entwickler → API-Schlüssel, Testmodus aktiviert."
  );
  process.exit(1);
}

if (!secret.startsWith("sk_test_")) {
  console.error(
    "Der Schlüssel ist kein Testschlüssel (sk_test_…).\n" +
      "Dieses Skript legt Produkte an — das soll zuerst im Testmodus passieren."
  );
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion: "2026-08-26.dahlia" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type PriceRow = {
  id: string;
  amount_cents: number;
  currency: string;
  tax_rate: number;
  audience: string;
  interval: string | null;
  stripe_price_id: string | null;
  products: { key: string; name: string; type: string } | null;
};

const euro = (cents: number) => (cents / 100).toFixed(2).replace(".", ",") + " €";

async function main() {
  const { data, error } = await supabase
    .from("prices")
    .select(
      "id, amount_cents, currency, tax_rate, audience, interval, stripe_price_id, products(key, name, type)"
    )
    .is("valid_to", null);

  if (error) {
    console.error("Preise konnten nicht gelesen werden:", error.message);
    process.exit(1);
  }

  const prices = (data ?? []) as unknown as PriceRow[];
  console.log(`${prices.length} Preise im Katalog.\n`);

  // Produkte in Stripe: eines je Katalogprodukt, gefunden über die
  // hinterlegte Kennung statt über den Namen — Namen ändern sich.
  const existing = await stripe.products.list({ limit: 100, active: true });
  const byKey = new Map<string, Stripe.Product>();
  for (const p of existing.data) {
    const key = p.metadata?.altior_key;
    if (key) byKey.set(key, p);
  }

  let created = 0;
  let skipped = 0;

  for (const row of prices) {
    const product = row.products;
    if (!product) continue;

    const label = `${product.name}${row.audience === "member_gold" ? " (Gold-Mitgliederpreis)" : ""}`;

    if (row.stripe_price_id) {
      console.log(`· ${label} — bereits verknüpft, übersprungen`);
      skipped++;
      continue;
    }

    let stripeProduct = byKey.get(product.key);
    if (!stripeProduct) {
      stripeProduct = await stripe.products.create({
        name: product.name,
        metadata: { altior_key: product.key },
      });
      byKey.set(product.key, stripeProduct);
    }

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: row.amount_cents,
      currency: row.currency.toLowerCase(),
      // Preise sind Endpreise (D39). Als Kleinunternehmer steht der Satz auf
      // 0 %; beim Wechsel in die Regelbesteuerung ändert sich nur der Satz,
      // nicht der Betrag.
      tax_behavior: "inclusive",
      ...(row.interval === "month"
        ? { recurring: { interval: "month" as const } }
        : {}),
      metadata: {
        altior_price_id: row.id,
        altior_key: product.key,
        audience: row.audience,
      },
    });

    const { error: updateError } = await supabase
      .from("prices")
      .update({ stripe_price_id: stripePrice.id })
      .eq("id", row.id);

    if (updateError) {
      console.error(
        `  Preis in Stripe angelegt (${stripePrice.id}), Rückschreiben fehlgeschlagen: ${updateError.message}`
      );
      continue;
    }

    console.log(
      `✓ ${label} — ${euro(row.amount_cents)}${row.interval === "month" ? " / Monat" : ""} → ${stripePrice.id}`
    );
    created++;
  }

  console.log(`\n${created} angelegt, ${skipped} übersprungen.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
