# ALTIOR — Corporate Design v1.0

**Plan-Woche:** 3
**Grundlage:** MARKE.md · MARKENPRUEFUNG.md · BRAND-BEWERTUNG.md
**Visuelle Fassung:** https://claude.ai/code/artifact/8125fc21-b5c0-4910-8fa2-abe34e5d8c4e

---

## 1. Die Bildmarke

**Zwei aufsteigende Balken. Der linke gedämpft, der rechte farbig und höher.**

Der linke Balken ist der Ausgangswert aus dem ersten Assessment, der rechte der Stand nach dem Re-Assessment. Beide Oberkanten laufen parallel — der Sprung dazwischen ist die Entwicklung.

Das Zeichen ist damit eine **Messung, kein Symbol**. Es behauptet keine Höhe, es zeigt einen Unterschied. Genau das, was der Name als Komparativ aussagt.

**Geometrie** (SVG, viewBox `0 0 100 100`):

```
Balken „Vorher": polygon 16,58  44,46  44,82  16,82   → Füllung Vorher-Grau
Balken „Jetzt":  polygon 56,34  84,22  84,82  56,82   → Füllung Pitch
```

Beide Oberkanten haben dieselbe Steigung (−12 auf 28 Einheiten). Scharfe Kanten, keine Rundungen, keine Effekte.

---

## 2. Farbe

Ein Farbton in zwei Werten. **Grau ist, wo du warst. Grün ist, wo du jetzt bist.** Das Farbsystem trägt dieselbe Aussage wie der Name — und übersetzt sich unmittelbar in Fortschrittsbalken, Kontingentanzeigen und Assessment-Diagramme der App.

| Rolle | Hell | Dunkel | Verwendung |
|---|---|---|---|
| **Pitch** (Akzent) | `#1F6B47` | `#4FBF87` | aktueller Wert, Buttons, aktive Zustände |
| **Vorher** | `#A9BDB0` | `#4A5A50` | Ausgangswert, ungenutztes Kontingent, inaktiv |
| **Ink** (Text) | `#121A16` | `#E7EDE8` | Text und Zeichen |
| **Ink weich** | `#4A5A50` | `#95A69B` | Sekundärtext |
| **Papier** (Grund) | `#F2F4F1` | `#0E1411` | Grundfläche |
| **Fläche** | `#FFFFFF` | `#151D19` | Karten, Panels |
| **Linie** | `#D6DDD6` | `#233029` | Trennlinien |

**Zur Begründung:** Kein Gold auf Schwarz. Das ist die Farbwelt von Status — die Marke handelt aber von Veränderung. Das kühle Papierweiß setzt die Marke bewusst neben einen Bericht statt neben einen Nachtclub, und hebt sie in einem Markt ab, in dem fast jeder Anbieter dunkelblau, schwarz oder golden auftritt.

Das Ink ist **kein neutrales Grau**, sondern nahezu Schwarz mit leichtem Grünstich — dadurch wirkt die Neutralfarbe gewählt statt geerbt.

**Akzentfarbe für Text:** `#1F6B47` erreicht auf Weiß etwa 3,4:1 — ausreichend für Flächen, Buttons und große Schrift, **nicht** für Fließtext. Kleiner Text in Akzentfarbe nutzt `#0F4E33`.

---

## 3. Typografie

**IBM Plex Sans** und **IBM Plex Mono** — eine Superfamilie, beide kostenlos über Google Fonts.

| Rolle | Schnitt | Einstellung |
|---|---|---|
| Wortmarke | Plex Sans 700 | Versalien, Laufweite **+0,14 em** |
| Überschrift | Plex Sans 600 | Laufweite −0,015 em |
| Fließtext | Plex Sans 400 | Zeilenhöhe 1,6, max. 65 Zeichen breit |
| **Messwerte** | **Plex Mono 500** | **Tabellenziffern** |
| Mikro-Label | Plex Mono 500 | Versalien, Laufweite +0,16 em |

**Warum Mono für Zahlen:** Eine Marke, die Messwerte verkauft, muss Ziffern sauber untereinander stellen können — Kontingentstände, Assessment-Werte, Preise in Tabellen. `font-variant-numeric: tabular-nums` überall dort, wo Zahlen in Spalten stehen.

Der Mono-Schnitt gibt der Marke außerdem die Stimme eines Messinstruments statt eines Werbetexters. Das deckt sich mit der Tonalitätsregel aus MARKE.md: **Behauptung raus, Zahl rein.**

---

## 4. Anwendungen

| Ort | Fassung |
|---|---|
| App-Icon | Zeichen einfarbig hell auf Ink, abgerundetes Quadrat |
| Profilbild `@altiorfootball` | Zeichen einfarbig weiß auf Pitch, rund |
| Trainingsbekleidung | Zeichen einfarbig, Stickerei |
| Website-Kopf | horizontale Sperrung: Zeichen + Wortmarke, Abstand = halbe Zeichenbreite |
| Favicon | Zeichen zweifarbig, 16 px |

**Die drei Tests, an denen die ursprünglichen fünf Entwürfe gescheitert wären** — und die diese Marke besteht:

1. **32 Pixel:** zwei Flächen, keine Feinheiten, bleibt scharf
2. **Einfarbig:** die Balken unterscheiden sich in der **Höhe**, nicht nur in der Farbe — deshalb funktioniert das Zeichen mit einem Stickfaden
3. **Ohne Schriftzug:** die asymmetrische Silhouette ist auch im runden Profilbild unterscheidbar

---

## 5. Ausschlüsse

| ❌ | |
|---|---|
| Verlauf, Metalleffekt, Schlagschatten im Zeichen | zerfällt bei kleiner Darstellung |
| Fußball, Wappen, Krone | Kennzeichen von Amateurvereinen und Fußballschulen |
| Balken auf gleiche Höhe bringen | der Unterschied **ist** die Aussage |
| Verzerren, neigen, drehen | Balken stehen immer senkrecht |
| Gold, Silber | Status ist nicht das Versprechen dieser Marke |
| Zeichen auf unruhigem Bild ohne Kontrastfläche | |

---

## 6. Offene Punkte

| Nr. | Punkt |
|---|---|
| D47 | **Wortmarke:** steht derzeit als IBM Plex Sans mit angepasster Laufweite. Als Platzhalter tragfähig; ein gezeichnetes Logotype wäre der nächste Ausbauschritt — nicht vor dem Launch nötig. |
| D48 | **Stickdatei testen**, bevor Trainingsbekleidung produziert wird. Bei zwei Flächen ohne Feinheiten unkritisch, aber Prüfen kostet nichts. |
| D44 | **Echtes Bildmaterial.** Die Farbwelt ist zurückhaltend gehalten, damit Fotos vom Training die Seite tragen. Ohne eigene Fotos wirkt sie leer. |

---

## 7. Damit ist Plan-Woche 3 abgeschlossen

**Fertig:** Product Master v1.0 · Datenmodell · Stripe-Struktur · Website-Struktur · Marke · Corporate Design

**Als Nächstes:** Website-Wireframes (Plan-Woche 5) und anschließend das technische Setup (Woche 6) — Next.js, Supabase, Datenmodell als Migration.
