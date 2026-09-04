# Tech-Stack — Empfehlung & Kosten

**Projekt:** Player Development Platform (Arbeitstitel — Markenname noch offen)
**Stand:** 03.09.2026
**Entscheidung offen bis:** Plan-Woche 6 (5.–11. Oktober) — vorher kein Setup nötig

---

## Kurzfassung

Der Stack aus dem Plan ist grundsätzlich richtig. Ich weiche an **einer** Stelle bewusst ab: **die native App kommt später, zum Launch reicht eine PWA.** Das spart einen zweiten Codebase, den App-Store-Prozess und laufende Gebühren — bei praktisch identischem Nutzen für den Spieler.

> **Empfehlung:** Next.js + Supabase + Stripe + Lexware Office + Resend, gehostet auf Vercel.
> PWA zum Launch, native Expo-App erst wenn Umsatz da ist.
>
> **Kosten Build-Phase (Sep–Jan): ~0 €/Monat.** **Ab Launch: ~65 €/Monat** + Stripe-Gebühren.

---

## Die Bausteine

| Bereich | Empfehlung | Warum | Kosten |
|---|---|---|---|
| **Web-Framework** | Next.js (App Router) | Ein Codebase für Marketing-Website *und* eingeloggten Bereich. Server-Rendering = gute SEO für die öffentlichen Seiten (Vereine, Eltern, Spieler googeln dich). Server Actions ersetzen ein separates Backend. | 0 € |
| **Datenbank + Auth** | Supabase (Postgres) | Echtes Postgres — wichtig, weil Überbuchung nur mit Transaktionen/Constraints sauber verhindert wird. Auth, Storage (Videos) und Row Level Security sind eingebaut. Kein eigener Server-Betrieb. | 0 € (Free) → 25 $/Mon (Pro) |
| **Hosting** | Vercel | Kein Deploy-Aufwand, Preview-URLs pro Änderung, direkt auf Next.js zugeschnitten. Bei 8 h/Woche ist gesparte Zeit mehr wert als gesparte 20 $. | 0 € (Hobby) → 20 $/Mon (Pro) |
| **Zahlungen** | Stripe | Deckt alle vier Fälle ab: Einmalzahlung, Abo (Membership), Ratenzahlung (Evolution), Abo mit Kündigung (Career). Keine Grundgebühr. SEPA-Lastschrift ist bei Abos deutlich günstiger als Karte. | 0 € Grundgebühr; ~1,5 % + 0,25 € (EU-Karte), SEPA 0,8 % (max. 5 €) |
| **Rechnungen / Buchhaltung** | Lexware Office | GoBD-konform, DATEV-Export fürs Steuerbüro, offene API für die automatische Rechnungserstellung nach Zahlung. | ~15–20 €/Mon |
| **Transaktions-E-Mails** | Resend | Buchungsbestätigung, Storno, Erinnerung, Passwort-Reset. Sauber aus Next.js heraus, React-E-Mail-Templates. | 0 € (3.000/Mon) → 20 $/Mon |
| **Code-Verwaltung** | GitHub (privat) | Versionierung, Backup, automatisches Deploy zu Vercel. | 0 € |
| **Mobile App** | **Phase 1: PWA** (installierbar aus dem Browser)<br>**Phase 2: Expo / React Native** | Siehe unten. | Phase 1: 0 €<br>Phase 2: 99 $/Jahr Apple + 25 $ einmalig Google |
| **Fehler-Monitoring** | Sentry | Damit du merkst, wenn eine Buchung beim Kunden crasht — bevor er sich beschwert. | 0 € (Free) |
| **Domain** | .de bei INWX/Namecheap | — | ~10 €/Jahr |

---

## Warum PWA zuerst statt nativer App

Der Plan sieht in Woche 17–19 eine React-Native-App vor. Der Launch-Punkt in Woche 23 lautet aber selbst: *„App verfügbar **oder Beta nutzbar**"*.

**Was der Spieler tatsächlich braucht:** Termine sehen, freie Plätze sehen, buchen, stornieren, Kontingent sehen, Fortschritt sehen. Das kann eine PWA vollständig — inklusive Icon auf dem Homescreen, Vollbild ohne Browserleiste und Push-Nachrichten (iOS ab 16.4).

**Was die PWA spart:**

- kein zweiter Codebase (jede Änderung müsste sonst doppelt gebaut werden)
- kein App-Store-Review vor dem Launch — kein Termindruck durch Apple
- keine 99 $/Jahr + 25 $ vor dem ersten Euro Umsatz
- realistisch **3–4 Wochen Entwicklungszeit gespart** — genau die Wochen 17–19, die dann für Systemtest und Vorverkauf frei werden

**Wann die native App trotzdem kommt:** sobald Spieler regelmäßig buchen und du Features willst, die im Browser nicht gehen — Kamera-Integration für Videoanalyse, Offline-Nutzung auf dem Platz, verlässliche Push-Nachrichten auf allen Geräten. Der Next.js-Code bleibt bestehen; die Expo-App greift dann auf dieselbe API zu. Kein Wegwerf-Aufwand.

---

## Kostenübersicht

### Build-Phase: September 2026 – Mitte Januar 2027

| Posten | Kosten |
|---|---|
| Supabase Free | 0 € |
| Vercel Hobby (nicht-kommerziell während Entwicklung) | 0 € |
| GitHub privat | 0 € |
| Stripe (Test-Modus) | 0 € |
| Resend Free | 0 € |
| Domain (sobald Marke steht) | ~10 € einmal/Jahr |
| **Summe** | **≈ 1 €/Monat** |

> ⚠️ Supabase Free pausiert Projekte nach 7 Tagen ohne Zugriff. Auf der Weltreise mit unregelmäßigen Arbeitsphasen relevant — lässt sich mit einem kleinen automatischen Ping lösen, richte ich beim Setup ein.

### Ab Pre-Launch / Launch: Februar 2027

| Posten | Kosten/Monat |
|---|---|
| Supabase Pro (kein Pausieren, tägliche Backups) | ~23 € |
| Vercel Pro (kommerzielle Nutzung erlaubt) | ~19 € |
| Lexware Office (Plan mit API + Rechnungen) | ~15–20 € |
| Resend | 0 € (bis 3.000 Mails) |
| Domain anteilig | ~1 € |
| **Summe fix** | **≈ 60–65 €/Monat** |
| Stripe | umsatzabhängig, keine Grundgebühr |

**Zum Einordnen:** bei 10 zahlenden Spielern (Ziel M5) mit im Schnitt 100 €/Monat = 1.000 € Umsatz. Die Technik kostet davon ~6 %. Das ist unkritisch.

> Vor Live-Gang mit echten Kundendaten und echten Zahlungen ist **Supabase Pro Pflicht** — wegen der täglichen Backups. Daran nicht sparen.

---

## Kosteneffiziente Variante

Falls jeder Euro zählt, lassen sich ~20 €/Monat einsparen:

| Statt | Alternative | Ersparnis | Preis dafür |
|---|---|---|---|
| Vercel Pro (19 €) | Cloudflare Pages (kostenlos, kommerziell erlaubt) | ~19 €/Mon | Etwas Reibung beim Deploy, kleinere Einschränkungen bei Next.js-Features |
| Vercel Pro (19 €) | Hetzner VPS + Coolify | ~15 €/Mon | Du betreibst den Server selbst — Updates, Sicherheit, Ausfälle. Bei 8 h/Woche **nicht empfohlen** |
| Resend | Brevo (deutscher Anbieter, 300 Mails/Tag frei) | 0 € heute, später ~20 € | Weniger komfortabel in der Anbindung |

**Summe kosteneffizient: ~40 €/Monat.**

**Meine Einschätzung:** die 20 € Differenz sind bei einem Solo-Gründer mit 8 h Wochenbudget schlecht gespart. Ein halber verlorener Deploy-Abend kostet dich mehr als ein Jahr Vercel Pro. Spare lieber bei der nativen App (99 $/Jahr) — die bringt vor dem ersten zahlenden Kunden objektiv nichts.

---

## Was wir bewusst *nicht* nehmen

- **Eigener Server / Docker / Kubernetes** — Betriebsaufwand, den du auf Reisen nicht leisten kannst.
- **Headless CMS (Contentful, Sanity)** — die Website hat ~14 statische Seiten. Texte liegen im Code, Änderungen macht ohnehin einer von uns beiden. Spart 0 € und kostet Komplexität.
- **Eigenes Rechnungssystem** — GoBD-konforme Rechnungen selbst zu bauen ist ein rechtliches Risiko. Dafür gibt es Lexware.
- **Firebase** — schlechter Fit: keine relationalen Constraints, damit ist Überbuchungs-Schutz fummelig.
- **WordPress** — käme dem eingeloggten Buchungsbereich nie hinterher.

---

## Offene Punkte (deine Entscheidung)

1. **Lexware-Office-Tarif** — welcher Tarif enthält API-Zugriff? Vor Woche 13 klären, Abschluss erst Woche 21.
2. **Cloudflare statt Vercel?** — nur wenn du die 19 €/Monat wirklich sparen willst.
3. **Native App zum Launch oder später?** — meine Empfehlung: später. Wenn du sie zum Launch willst, sag es jetzt, dann planen wir Wochen 17–19 anders.
4. **Umsatzsteuer** — Kleinunternehmerregelung §19 UStG oder Regelbesteuerung? Beeinflusst Preisdarstellung, Stripe-Konfiguration und Rechnungsvorlagen. Gehört in den Product Master.
