# ALTIOR — Player Development Platform

> **Werde deine beste Version.**
> `altior` · lateinisch: höher

Buchungs- und Mitgliedersystem für individuelle Fußball-Spielerentwicklung in Münster.
Launch: **Februar 2027**

---

## Was das hier ist

Kein Website-Projekt mit angehängtem Formular, sondern ein Buchungs- und
Mitgliedersystem, das zusätzlich eine Website hat. Ein Spieler soll die Marke
entdecken, ein Konto anlegen, einen Termin wählen, bezahlen, seine Rechnung
bekommen und seine Entwicklung verfolgen können — ohne dass dazwischen jemand
manuell eingreift.

## Technik

| Baustein | Wahl |
|---|---|
| Web | Next.js |
| Datenbank & Auth | Supabase (PostgreSQL), Region **eu-central-1 / Frankfurt** |
| Zahlungen | Stripe — SEPA für Abos, Karte für Einzelbuchungen |
| Buchhaltung | Lexware Office (Rechnungsnummern kommen ausschließlich von dort) |
| App | React Native / Expo (ab Plan-Woche 17) |
| E-Mail | Resend |

## Aufbau

```
docs/                  Fachliche Grundlagen — Product Master, Marke, Datenmodell
supabase/migrations/   Datenbankschema als versionierte Migrationen
web/                   Next.js-Anwendung
  src/app/             Seiten
  src/components/      Bausteine, u. a. die Bildmarke
  src/lib/brand.ts     Markentexte und Regeln an einer Stelle
  src/app/globals.css  Gestaltungswerte — Farbe, Schrift, Form
```

### Gestaltung ändern

Farben, Schrift und Rundungen stehen ausschließlich in `web/src/app/globals.css`,
die Bildmarke ausschließlich in `web/src/components/Mark.tsx`, die Markentexte in
`web/src/lib/brand.ts`. Ein anderer Grünton oder ein neues Zeichen sind damit eine
Änderung an einer Datei — Website und App lesen dieselben Werte.

### Die Dokumente

| Datei | Inhalt |
|---|---|
| `PRODUCT-MASTER.md` | **v1.0, eingefroren.** Leistungen, Preise, Buchungs- und Vertragsregeln |
| `DATENMODELL.md` | Entitäten und die Regeln, die die Datenbank selbst erzwingt |
| `MARKE.md` | Markenstory, Claim, Markenwerte, Tonalität, Ansprache |
| `CORPORATE-DESIGN.md` | Bildmarke, Farbsystem, Typografie |
| `MARKENPRUEFUNG.md` | Marken-, Domain- und Handle-Recherche |
| `STRIPE-STRUKTUR.md` | Produkte, Preise, Abos, Webhooks, Testfälle |
| `WEBSITE-STRUKTUR.md` | Seitenstruktur, Funnel, Pflichtseiten |
| `TECH-STACK.md` | Begründung der Technikwahl und Kosten |

## Die Regeln, die in der Datenbank stehen

Kritische Geschäftsregeln werden **in der Datenbank** erzwungen, nicht nur im
Anwendungscode — Anwendungscode lässt sich bei gleichzeitigen Zugriffen umgehen.

- **Keine Überbuchung.** Getrennte Zähler für 8 Feldspieler und 2 Torhüter mit
  `CHECK`-Constraint. Buchen zwei Spieler gleichzeitig den letzten Platz, weist
  die Datenbank den zweiten ab. Es gibt keine Race Condition.
- **Kein Kontingentverbrauch über das Guthaben hinaus.** `CHECK (used <= total)`.
- **Genau eine Deckungsquelle je Buchung** — Kontingent oder Zahlung, nie beides.
- **Ein aktives Membership je Spieler**, eindeutiger Teilindex.
- **Höchstens zwei Evolution-Teilnahmen** je Spieler.
- **Zeilenschutz auf allen Tabellen.** Spieler sehen ausschließlich eigene Daten.
  Bei Daten Minderjähriger nicht verhandelbar.

## Einrichtung

```bash
cp .env.example .env.local   # Schlüssel eintragen
npm install
npm run dev
```

Datenbankänderungen laufen ausschließlich über Migrationen in
`supabase/migrations/` — nie direkt in der Supabase-Oberfläche.
