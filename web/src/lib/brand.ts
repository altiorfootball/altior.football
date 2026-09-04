/**
 * ALTIOR — Markenkonstanten
 * Grundlage: docs/MARKE.md
 *
 * Texte der Marke stehen hier, nicht verstreut in den Seiten. Eine Änderung
 * am Claim ist damit eine Änderung an einer Stelle.
 */

export const brand = {
  name: "ALTIOR",

  /** Festgelegt 04.09.2026. Aufforderung, kein Zustandsbericht. */
  claim: "Werde deine beste Version.",

  /** Fußnote, die den lateinischen Namen übersetzt — kein zweiter Claim. */
  nameGloss: "altior · lateinisch: höher",

  domain: "altior.football",
  handle: "@altior.football",
  email: "kontakt@altior.football",
  founder: "Steffen Büchter",
  city: "Münster",
} as const;

/** Kapazität je Training. Steht als Versprechen auf jeder Seite. */
export const capacity = {
  field: 8,
  goalkeeper: 2,
} as const;

/** Fristen aus PRODUCT-MASTER.md, Abschnitt 3.2 und 3.3. */
export const deadlines = {
  /** Buchbar bis 2 Stunden vor Beginn. */
  bookingClosesHoursBefore: 2,
  /** Kostenfrei stornierbar bis 24 Stunden vor Beginn. */
  freeCancellationHoursBefore: 24,
} as const;

/** Cent-Betrag als deutscher Preis. Preise liegen immer als Ganzzahl vor. */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
