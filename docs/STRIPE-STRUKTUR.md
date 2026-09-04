# Stripe-Produktstruktur — v0.1

**Grundlage:** PRODUCT MASTER v1.0 · DATENMODELL v0.1
**Plan-Woche:** 12 (vorgezogen)

---

## 1. Grundsätze

| Grundsatz | Begründung |
|---|---|
| **Stripe ist nicht die Wahrheit** | Kontingente, Kapazitäten und Gold-Plätze liegen in deiner Datenbank. Stripe kassiert Geld — mehr nicht. |
| **Alle Beträge in Cent** | keine Kommazahlen, nie Rundungsfehler in der Buchhaltung |
| **Preise sind Bruttopreise** | `tax_behavior: inclusive` (D39). Als Kleinunternehmer Steuersatz 0 %, später 19 % — der Endpreis bleibt gleich. |
| **Steuersatz zum Zahlungszeitpunkt einfrieren** | eine Rechnung von 2027 muss 2030 noch stimmen |
| **Jede Preisänderung wird ein neuer Price** | Stripe-Preise sind unveränderlich. Alte Abos laufen weiter, neue Kunden bekommen den neuen Preis. |

---

## 2. Produkte und Preise

### Einmalzahlungen

| Produkt (`key`) | Betrag | Stripe-Objekt |
|---|---|---|
| `training` | 3.500 | Price, one_time |
| `online_session` | 3.900 | Price, one_time |
| `video_analysis` | 14.900 | Price, one_time |
| `scouting` | 22.900 | Price, one_time |
| `scouting_gold` | 18.900 | zweiter Price am selben Produkt |
| `assessment_individual` | 24.900 | Price, one_time |
| `assessment_day` | 16.900 | Price, one_time |
| `evolution` | 79.900 | Price, one_time |
| `evolution_repeat` | 67.900 | Price, one_time |
| `evolution_installment` | 27.900 | recurring monthly, 3 Iterationen |

> **Der Gold-Mitgliederpreis für die Spielsichtung** ist ein zweiter Price am selben Stripe-Produkt. Welcher gilt, entscheidet **deine App** anhand des aktiven Gold-Memberships — nicht Stripe. Sonst könnte jeder mit dem Link zur günstigeren Checkout-Session bezahlen.

### Abonnements

| Produkt | Betrag/Monat | Besonderheit |
|---|---|---|
| `membership_bronze` | 5.900 | — |
| `membership_silver` | 12.900 | — |
| `membership_gold` | 26.900 | max. 10 aktive — Prüfung in deiner App |
| `career_support` | 9.900 | 12 Monate Mindestlaufzeit — Durchsetzung in deiner App |

---

## 3. Zahlungsarten

| Methode | Gebühr (EU) | Empfehlung |
|---|---|---|
| **Karte** | ~1,5 % + 0,25 € | ✅ überall aktivieren |
| **SEPA-Lastschrift** | 0,8 %, max. 5 € | ✅ **für alle Abos bevorzugt** |
| PayPal | ~2,99 % + 0,39 € | ⚠️ nur erwägen, wenn die Conversion es verlangt |
| Klarna | ~2,99 % + 0,39 € | ❌ nicht nötig — du hast eine eigene Ratenzahlung |

**Rechenbeispiel Gold, 269 €/Monat:**

| | Gebühr/Monat | im Jahr |
|---|---|---|
| Karte | 4,29 € | 51 € |
| SEPA | 2,15 € | 26 € |

Bei 20 Mitgliedern sind das rund **500 € Unterschied pro Jahr** — mehr als deine gesamten Serverkosten. SEPA ist bei deutschen Abo-Kunden ohnehin vertraut.

⚠️ **SEPA hat eine Eigenheit:** Zahlungen bestätigen sich erst nach mehreren Werktagen, und eine Lastschrift kann bis zu **8 Wochen** rückgängig gemacht werden. Für Abos unkritisch. Für ein Training, das morgen stattfindet, ist es unbrauchbar — **Einzelbuchungen deshalb nur per Karte.**

---

## 4. Der Abrechnungsanker — ein Detail mit Folgen

Dein Kontingent wird **am Monatsersten** zurückgesetzt. Stripe rechnet standardmäßig am **Tag des Abschlusses** ab.

Wer am 17. Silver bucht, würde also jeden 17. bezahlen — sein Kontingent aber jeden 1. zurückgesetzt bekommen. Zwei Zyklen, die auseinanderlaufen. Das erzeugt genau die Support-Fragen, die man nicht haben will: *„Ich habe am 17. bezahlt, warum sind meine Trainings am 1. weg?"*

**Lösung:** `billing_cycle_anchor` auf den Monatsersten setzen. Dann zahlen alle am 1., und das Kontingent wird am 1. zurückgesetzt. Ein Zyklus.

**Für den ersten, angebrochenen Monat** gibt es zwei Wege:

| Variante | Erste Zahlung | Erstes Kontingent |
|---|---|---|
| **A — anteilig** *(empfohlen)* | anteilig für die Resttage | anteilig, aufgerundet |
| B — voll | voller Monatspreis | volles Kontingent |

Variante A ist fair und erklärbar: *„Du steigst am 17. ein, zahlst für den halben Monat und bekommst 2 statt 4 Trainings. Ab dem 1. läuft alles normal."*

**❓ D40 — Variante A oder B?** *(Arbeitsannahme: A)*

---

## 5. Die Evolution-Ratenzahlung

3 × 279 € — technisch am saubersten als **Subscription Schedule mit genau 3 Iterationen**, danach beendet sich das Abo selbst.

| Warum nicht anders |
|---|
| **Drei manuelle Rechnungen:** du müsstest jeden Monat daran denken, und bei Zahlungsausfall passiert nichts automatisch |
| **Eine Zahlung mit Ratenplan:** Stripe kennt das für dieses Szenario nicht sauber |

Der Schedule liefert automatisch: Einzug, Mahnwesen bei Fehlschlag, Beleg je Rate. Jede Rate wird als eigene `payment` gebucht — so stimmt die Buchhaltung, und Lexware bekommt drei saubere Rechnungen.

⚠️ **Wichtig:** Das Programm läuft 12 Wochen, die Raten laufen 3 Monate. Bricht ein Teilnehmer nach Rate 1 ab, hat er bereits Leistungen erhalten. **Die AGB müssen regeln, dass die Ratenzahlung eine Zahlungsweise ist und kein Kündigungsrecht** — sonst zahlst du drauf. Gehört in Plan-Woche 21.

---

## 6. Kündigung

| Fall | Stripe | Deine App |
|---|---|---|
| **Membership** | `cancel_at_period_end = true` | endet zum Monatsletzten, Kontingent bleibt bis dahin nutzbar |
| **Career Support** | dasselbe | **blockiert** die Kündigung bis `minimum_term_ends_on` |

### ⚠️ Das Stripe-Kundenportal erfüllt § 312k nicht

Naheliegend wäre, die Kündigung über Stripes fertiges Kundenportal abzuwickeln. Das geht nicht:

Der gesetzliche **Kündigungsbutton** muss **ohne Login** erreichbar sein — ständig verfügbar, unmittelbar von jeder Seite aus. Das Stripe-Portal setzt eine Anmeldung voraus. Es erfüllt die Anforderung damit **nicht**.

**Also:** eigene öffentliche Kündigungsseite. Button auf jeder Seite → Formular (Name, E-Mail, Vertrag) → Bestätigungsschaltfläche → sofortige Bestätigung per E-Mail. Im Hintergrund setzt sie das Stripe-Abo auf `cancel_at_period_end`. Das Stripe-Portal kann zusätzlich für Zahlungsmittel-Änderungen laufen — aber nicht als Kündigungsweg.

---

## 7. Webhooks

Stripe meldet Ereignisse asynchron. Ohne verlässliche Verarbeitung entstehen bezahlte Buchungen ohne Zugang — oder Zugang ohne Zahlung.

| Ereignis | Was passiert |
|---|---|
| `checkout.session.completed` | Zahlung anlegen, Buchung bestätigen, Rechnung an Lexware |
| `invoice.paid` | Abo-Monat bezahlt, Kontingentperiode sicherstellen, Rechnung an Lexware |
| `invoice.payment_failed` | Mahnstufe hochzählen, Kunde benachrichtigen |
| `customer.subscription.updated` | Upgrade/Downgrade, Statuswechsel |
| `customer.subscription.deleted` | Membership beenden |
| `charge.refunded` | Erstattung buchen, Rechnung korrigieren |

**Zwei Pflichtregeln:**

1. **Signatur prüfen.** Ein ungeprüfter Webhook-Endpunkt bedeutet, dass jeder im Internet dir „Zahlung erfolgreich" schicken kann.
2. **Idempotent verarbeiten.** Stripe liefert Ereignisse gelegentlich doppelt. Jede Event-ID wird gespeichert und ein zweites Mal ignoriert — sonst bekommt ein Kunde zwei Buchungen für eine Zahlung.

---

## 8. Fehlgeschlagene Zahlungen

Stripe versucht es mehrfach automatisch (Smart Retries) und benachrichtigt den Kunden. Offen ist, was **in deinem System** passiert:

**❓ D41 — Was gilt bei nicht bezahltem Monat?**

| Variante | |
|---|---|
| **A** *(empfohlen)* | Buchungsrecht wird **pausiert**, bestehende Buchungen bleiben. Nach ~14 Tagen ohne Zahlung: Membership beenden. |
| B | Alles bleibt aktiv, du sprichst den Kunden persönlich an |

Bei kleinen Zahlen ist B menschlich machbar — aber A muss im System vorhanden sein, sonst trainiert jemand monatelang kostenlos mit.

---

## 9. Was Stripe ausdrücklich nicht macht

| Aufgabe | Wo sie liegt |
|---|---|
| Kontingent zählen und zurücksetzen | Datenbank + Monatsjob |
| Kapazität 8 + 2, Überbuchungsschutz | Datenbank-Constraints |
| Warteliste | deine App |
| Gold auf 10 Plätze begrenzen | Prüfung vor dem Checkout |
| 12-Monats-Bindung Career Support | deine App |
| Rechnungsnummern | **Lexware Office** |

> Rechnungsnummern kommen **nicht** von Stripe. Stripe-Belege sind Zahlungsbestätigungen, keine GoBD-konformen Rechnungen. Die Rechnung erzeugt Lexware.

---

## 10. Testfälle für Woche 12

Aktualisiert auf die Preise aus Product Master v1.0:

| # | Fall | Erwartung |
|---|---|---|
| 1 | Training 35 € per Karte | Zahlung, Buchung, Rechnung |
| 2 | Bronze 59 € per SEPA | Abo aktiv, Kontingent 2 Trainings |
| 3 | Silver 129 € Mitte des Monats | anteilige Zahlung, anteiliges Kontingent, nächster Einzug am 1. |
| 4 | Gold 269 € als 11. Kunde | **abgelehnt** — Platzgrenze |
| 5 | Career Support 99 € | Abo aktiv, Kündigung bis Monat 12 gesperrt |
| 6 | Evolution 799 € einmalig | Zahlung, Zuordnung zur Kohorte |
| 7 | Evolution 3 × 279 € | drei Einzüge, danach Abo selbstbeendet |
| 8 | Spielsichtung als Gold-Mitglied | 189 €, nicht 229 € |
| 9 | Spielsichtung ohne Gold | 229 € |
| 10 | Bronze kündigen am 20. | läuft bis Monatsletzten, Kontingent nutzbar |
| 11 | Lastschrift platzt | Buchungsrecht pausiert, Kunde benachrichtigt |
| 12 | Erstattung eines Trainings | Zahlung storniert, Rechnung korrigiert |
| 13 | Webhook doppelt zugestellt | nur **eine** Buchung entsteht |

---

## 11. Offene Entscheidungen

| Nr. | Frage | Arbeitsannahme |
|---|---|---|
| **D40** | Erster Monat anteilig oder voll? | anteilig |
| **D41** | Verhalten bei Zahlungsausfall | Buchungsrecht pausieren, nach 14 Tagen beenden |
| D42 | PayPal anbieten? | nein zum Start |
| D43 | Ratenzahlung auch für Memberships? | nein |
