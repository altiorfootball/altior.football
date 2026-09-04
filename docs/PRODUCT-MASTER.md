# PRODUCT MASTER — v1.0 · EINGEFROREN

**Projekt:** Player Development Platform (Arbeitstitel — Markenname noch offen)
**Plan-Woche:** 1 (2.–6. September 2026) — **abgeschlossen**
**Eingefroren am:** 03.09.2026

> Ab hier werden Leistungen und Preise **nicht mehr wöchentlich verändert**. Änderungen nur noch als bewusste Version (v1.1, v2.0) mit Begründung. Alles Weitere — Datenmodell, Stripe-Struktur, Website, App — leitet sich aus diesem Dokument ab.

**Legende:** `✅` festgelegt · `❓` offen, nicht blockierend · `⚠️` laufend zu beobachten

---

## 1. Produktarchitektur ✅

| # | Produkt | Rolle |
|---|---|---|
| 1 | **Player Assessment** | Standortbestimmung und Entwicklungsanalyse — Einstieg in den Funnel |
| 2 | **12 Week Evolution Program** | Intensives Entwicklungsprogramm über zwölf Wochen |
| 3 | **Pro Player Membership** | Bronze / Silver / Gold — monatliche Entwicklungsbegleitung |
| 4 | **Career Support** | Langfristige Karriereplanung und persönliche Begleitung |

Zusätzlich einzeln buchbar, **unabhängig von einer Membership**: Training, Online Sessions, Spielsichtungen, Videoanalysen.

Career Support und sportliche Membership sind **getrennte Produkte** und frei kombinierbar.

---

## 2. Preisliste (Stand v1.0) ✅

### 2.1 Einzelbuchungen

| Leistung | Umfang | Preis |
|---|---|---|
| Pro Player Training | 60 Min., offenes Gruppentraining | **35 €** |
| Online Development Session | ❓ D16 Dauer | **39 €** |
| Videoanalyse + Feedback | ❓ D38 Umfang | **149 €** |
| Spielsichtung + Feedback | 90 Min. Spiel vor Ort + 30 Min. persönliche Nachbesprechung | **229 €** |
| — *Mitgliederpreis Gold* | dasselbe | **189 €** |
| Player Assessment Individual | ❓ D5 Dauer | **249 €** |
| Assessment Day (Gruppe) | ~3 Std., max. 1× pro Monat | **169 € Fixpreis** |

**Assessment Day:** Fixpreis **169 € pro Spieler**, unabhängig von der Gruppengröße, beim Anlegen des Termins festgelegt. Die Gruppengröße ist unternehmerisches Risiko, nicht Kundenrisiko. Kalkulationsannahme: 6 Spieler × 169 € = **1.014 € pro Assessment Day**.

### 2.2 Pro Player Membership

| Stufe | Preis/Monat | Enthalten |
|---|---|---|
| **Bronze** | **59 €** | 2 Pro Player Trainings |
| **Silver** | **129 €** | 4 Pro Player Trainings + 1 Online Development Session |
| **Gold** | **269 €** | 4 Pro Player Trainings + 1 Online Development Session + **1 Videoanalyse** |

**Gold-Zusatznutzen:** Spielsichtungen zum Mitgliederpreis **189 €** statt 229 € (Ersparnis 40 € je Sichtung). Exklusiv für Gold.

**Gold ist mengenmäßig begrenzt:** Standard **10 Plätze** (❓ D31 — anpassbar). Bei ~2,5 Std. Analysezeit je Videoanalyse entspricht das ~25 Std./Monat. Ist die Grenze erreicht, zeigt das System „ausgebucht".

**Die Spielsichtung ist bewusst kein Bestandteil einer Membership** — Begründung siehe Abschnitt 6, gelöstes Problem P6.

### 2.3 12 Week Evolution Program

| Feld | Wert |
|---|---|
| Regulärer Preis | **799 €** |
| Ratenzahlung | **3 Raten à 279 € = 837 €** (Aufschlag 38 €, 4,8 %) |
| Laufzeit | 12 Wochen |
| Wiederholung | einmalig erlaubt, **15 % Repeat-Rabatt → 679 €** („12 Week Evolution – Next Level") |

**Enthalten:** 12 Pro Player Trainings in zwölf Wochen · 3 Online Development Sessions · 1 Spiel-/Videoanalyse · 1 Re-Assessment im dritten Monat · 1 persönliches Feedbackgespräch à 60 Min.

### 2.4 Career Support

| Feld | Wert |
|---|---|
| Preis | **99 €/Monat bei 12 Monaten Laufzeit** |
| Option später | 109 €/Monat bei flexiblerer Laufzeit |
| Verlängerung nach 12 Monaten | nur monatlich kündbar (gesetzlich vorgegeben) |

**Enthalten:** Anamnesegespräch auf Basis des Assessments · 1 Zoom-Call pro Monat à 30 Min. · Zugang zum Career Knowledge Hub / Videoportal (⚠️ siehe P2) · 2 ausführliche Karrieregespräche pro Jahr à 60 Min.

### 2.5 Kombinationen

| Kombination | Preis/Monat |
|---|---|
| Bronze + Career Support | 158 € |
| Silver + Career Support | 228 € |
| Gold + Career Support | 368 € |

---

## 3. Buchungs-, Kontingent- und Vertragsregeln ✅

Kernlogik des Systems. Wird genau so implementiert.

### 3.1 Kontingent

| Regel | Festlegung |
|---|---|
| Reset | **zum Monatsanfang** (1. des Kalendermonats) |
| Ungenutzte Einheiten | **verfallen** — keine Übertragung in den Folgemonat |
| Über Kontingent hinaus | **nachkaufbar zum Regulärpreis** (Training 35 €, Online Session 39 €, Videoanalyse 149 €, Spielsichtung 229 € bzw. 189 € für Gold) |

### 3.2 Buchung

| Regel | Festlegung |
|---|---|
| Buchbar bis | **2 Stunden vor Trainingsbeginn** |
| Kapazität je Training | **8 Feldspieler + 2 Torhüter**, getrennte Kontingente |
| Kapazitätsprüfung | serverseitig, transaktionssicher — Überbuchung technisch ausgeschlossen |
| Trainingsfrequenz | **4 Einheiten pro Woche** |
| Warteliste | vorgesehen — ❓ D37 |

### 3.3 Stornierung

| Regel | Festlegung |
|---|---|
| Kostenfrei stornierbar bis | **24 Stunden vor Trainingsbeginn** |
| Storno nach Frist / No-Show | **Kontingent verfällt** |
| Einzelbuchung nach Frist | **keine Erstattung** (analoge Anwendung — bei abweichendem Wunsch bitte melden) |

> ⚠️ **Beachten:** Buchung bis 2 h vorher, Storno nur bis 24 h vorher. Wer innerhalb der letzten 24 Stunden bucht, kann **sofort nicht mehr stornieren**. Kein Fehler, wird dem Spieler im Buchungsdialog aber unmissverständlich angezeigt: „Diese Buchung ist verbindlich und nicht stornierbar."

### 3.4 Membership-Vertrag

| Regel | Festlegung |
|---|---|
| Laufzeit | **monatlich kündbar** |
| Kündigungsfrist | **keine** |
| Kündigung wirksam | zum Monatsende, wenn **vor Ablauf des Monats** gekündigt |
| Ohne Kündigung | **automatische Verlängerung** um einen Monat |
| Kündigungsweg | Kündigungsbutton auf Website und in der App (§ 312k BGB — Pflicht) |

**❓ D36 — Kontingent bei Kündigung im laufenden Monat?** *(Vorgabe bis auf Widerruf: bleibt bis Monatsende voll nutzbar — der Monat ist bezahlt.)*

**Abweichung Career Support:** 12 Monate Mindestlaufzeit, danach monatlich kündbar.

---

## 4. Steuer ✅

**Start mit der Kleinunternehmerregelung § 19 UStG.**

⚠️ Grenzen: **25.000 € Vorjahresumsatz**, **100.000 € im laufenden Jahr** (Stand seit 2025). Wird die 100.000-€-Grenze unterjährig gerissen, entfällt der Status sofort ab dem betreffenden Umsatz.

Das realistische Kapazitätsszenario (Abschnitt 5.4) liegt bei ~50.000 €/Jahr. Der Wechsel in die Regelbesteuerung ist damit eine Frage von wann, nicht ob.

**Technische Vorgabe:** Das System wird **von Anfang an umsatzsteuerfähig** gebaut — Steuersatz je Preis hinterlegt, Rechnungsvorlagen für beide Fälle, Stripe mit korrektem Tax-Behavior. Der Wechsel ist dann Konfiguration, kein Umbau.

**❓ D39 — Preise als Endpreise inklusive späterer USt?** *(Vorgabe bis auf Widerruf: ja. Damit ist der 16-%-Effekt einkalkuliert und die Preisdarstellung bleibt konsistent.)*

**Fürs Steuerbüro (Plan-Woche 21):** Ob auf Einzeltraining eine Befreiung greift (§ 4 Nr. 21 / Nr. 22 UStG), ist zu prüfen. Diese Befreiungen zielen auf gemeinnützige Träger und zertifizierte Bildungseinrichtungen — für einen gewerblichen Anbieter ist der Regelsatz von 19 % der wahrscheinliche Fall.

---

## 5. Wirtschaftlichkeitsanalyse

### 5.1 Membership gegen Einzelpreise

| Stufe | Wert einzeln | Preis | Ersparnis |
|---|---|---|---|
| Bronze | 2 × 35 = **70 €** | 59 € | 11 € — **16 %** |
| Silver | 4 × 35 + 39 = **179 €** | 129 € | 50 € — **28 %** |
| Gold | 179 + 149 = **328 €** | 269 € | 59 € — **18 %** |

**Silver ist bewusst die attraktivste Stufe.** Das ist gewollt: Silver ist das Volumenprodukt, auf das die meisten Kunden gehören. Gold verkauft sich nicht über den Rabatt, sondern über die monatlich garantierte individuelle Analyse und den Spielsichtungs-Mitgliederpreis.

⚠️ **Zu beobachten:** Gegen Silver + einzeln gekaufte Videoanalyse (129 + 149 = 278 €) spart Gold nur **9 €**. Der eigentliche Gold-Vorteil ist deshalb der exklusive Spielsichtungspreis (−40 € je Sichtung) und der garantierte monatliche Analyse-Slot. Sollte sich Gold schlecht verkaufen, ist der erste Hebel eine Senkung auf 249 € — nicht mehr Leistung.

### 5.2 Upgrade-Logik Bronze → Silver

> Ein Bronze-Mitglied, das zwei Trainings nachkauft, zahlt **59 + 70 = 129 €** für 4 Trainings.
> Silver kostet **129 €** — für 4 Trainings **plus** eine Online Session (Wert 39 €).

**Systemfunktion:** Sobald ein Bronze-Mitglied das zweite Training nachkauft, erscheint der Hinweis „Mit Silver bekommst du für denselben Preis zusätzlich eine Online Development Session." Kostenloser Upgrade-Pfad.

### 5.3 Stundensatz je Produkt

| Produkt | Umsatz | Eigenzeit | ca. €/Std. |
|---|---|---|---|
| Assessment Day (6 Spieler) | 1.014 € | 3 Std. | **~338 €** |
| Pro Player Training (voll, 10 Spieler) | 350 € | ~1,5 Std. | **~233 €** |
| Individual Assessment | 249 € | ~2 Std. | ~125 € |
| Career Support (pro Jahr) | 1.188 € | ~10 Std. | ~119 € |
| Spielsichtung | 229 € | ~3,5 Std. | ~65 € |
| Videoanalyse | 149 € | ~2,5 Std. | ~60 € |
| Pro Player Training (1 Spieler) | 35 € | ~1,5 Std. | ~23 € |

### 5.4 Kapazität bei 4 Trainings pro Woche

~17,3 Trainings/Monat = **139 Feldspieler-Plätze + 35 Torhüter-Plätze**.

| | Plätze/Monat | max. Mitglieder (4 Einheiten) | realistisch bei 65 % |
|---|---|---|---|
| **Feldspieler** | ~139 | 34 | **~22** |
| **Torhüter** | ~35 | 8 | **~5** |

Für Ziel M5 (10+ zahlende Spieler) reichlich dimensioniert. Kapazität ist 2027 nicht der Engpass — die Nachfrage ist es.

⚠️ **Torhüter bleiben eng:** nur 2 von 10 Plätzen, also max. ~5 Torhüter mit Silver/Gold. Das System zeigt die TW-Auslastung separat an.

### 5.5 Zeitbudget bei ~20 Mitgliedern

| Posten | Std./Monat |
|---|---|
| 17,3 Trainings à 1,5 Std. | 26 |
| 1 Assessment Day | 3 |
| Online Sessions (~15 × 30 Min.) | 8 |
| Gold-Videoanalysen (5 × 2,5 Std.) | 13 |
| Career Calls (5 × 30 Min.) | 3 |
| Admin, Content, Vertrieb | 20 |
| **Summe** | **~73 Std./Monat ≈ 17 Std./Woche** |

Bei grob **4.000–4.500 € Umsatz/Monat**.

---

## 6. Gelöste Probleme (Dokumentation der Entscheidungen)

### ✅ P1 — Gold war teurer als Silver plus Einzelbuchung

Bei 319 € kostete Gold 41 € **mehr** als Silver + einzeln gekaufte Videoanalyse (278 €) — dieselbe Leistung, höherer Preis. Gold lohnte sich nur mit Spielsichtung, was zu negativer Auslese in das zeitaufwendigste Format geführt hätte.

**Entscheidung:** Gold auf **269 €** gesenkt, Inhalt auf **Videoanalyse** festgelegt, Spielsichtung als exklusives Add-on zum Mitgliederpreis 189 €.

### ✅ P6 — Die Spielsichtung passte nicht ins Wochenende

Jugendspiele finden am Wochenende statt, der Spielplan bestimmt den Termin. Realistisch sind 1–2 Spielsichtungen pro Wochenende, also max. 4–8/Monat bei komplett freigehaltenem Wochenende. Mehrere Gold-Mitglieder können zeitgleich spielen. Bei Gold mit Spielsichtung wäre bei **~4 Memberships physisch Schluss** gewesen.

**Entscheidung:** Spielsichtung ist kein Membership-Bestandteil, sondern ein bewusst gebuchtes Premium-Einzelprodukt. Die Videoanalyse ist planbar, ortsunabhängig und abends machbar — Grenze bei ~10 Gold-Mitgliedern statt 4.

### ✅ P3 — Preis nach Gruppengröße war nicht abrechenbar

„149–199 € je nach Gruppengröße" scheitert daran, dass der erste Spieler zahlt, bevor die Gruppengröße feststeht.

**Entscheidung:** Fixpreis **169 €** pro Assessment Day.

---

## 7. Laufend zu beobachten

### ⚠️ P2 — Der Career Knowledge Hub ist nicht eingeplant

Career Support verspricht „Zugang zum Career Knowledge Hub / Videoportal": Videohosting, Zugriffsschutz, Kategorisierung — **und vor allem produzierte Inhalte**. Steht in keinem der 26 Wochenpakete; der Plan führt „komplexes LMS" ausdrücklich unter *„Was wir bewusst nicht vor Februar bauen"*.

**Empfehlung:** Career Support v1 zum Launch **ohne** Videoportal. Anamnese, monatliche Calls und Karrieregespräche tragen das Produkt allein. Kein Website-Versprechen auf etwas, das nicht existiert.

**❓ D34 — Knowledge Hub zum Launch oder später?**

### ⚠️ P4 — Zwei rechtliche Punkte

**Ratenzahlung Evolution:** 3 × 279 € statt 799 € ist ein entgeltlicher Zahlungsaufschub (+38 €). Für Verträge mit Rückzahlung binnen drei Monaten und nur geringen Kosten greift eine Ausnahme (§ 491 Abs. 2 BGB). Die Konstellation dürfte darunterfallen — **vom Steuerbüro oder Anwalt bestätigen lassen**.

**Kündigungsbutton (§ 312k BGB):** Pflicht für Memberships und Career Support. Verstöße sind abmahnfähig; ohne Button kann der Vertrag jederzeit fristlos kündbar sein. → Fest im Website- und App-Umfang, Bauvorgabe.

**Career Support, 12 Monate:** zulässig, aber die automatische Verlängerung darf danach nur noch monatlich kündbar laufen. Wird so gebaut.

### ⚠️ P5 — Wechsel in die Regelbesteuerung

Siehe Abschnitt 4. Wird technisch vorbereitet, kaufmännisch im Blick behalten.

---

## 8. Offene Punkte (keiner blockierend)

| Nr. | Frage | Vorgabe bis auf Widerruf |
|---|---|---|
| D1 | Mindestalter der Spieler | — |
| D2 | Eltern als eigene Nutzer mit Login? | Elternkontakt am Spielerprofil, kein eigener Login in v1 |
| D5 | Dauer Individual Assessment | ~2 Std. |
| D6 | Assessment als Voraussetzung für Evolution? | nein, unabhängig buchbar |
| D7 | Testkategorien des Assessments | — |
| D9 | Evolution: feste Kohorten-Starts? | ja, feste Starts |
| D10 | Evolution: verpasste Termine | verfallen |
| D16 | Dauer Online Development Session | 30 Min. |
| D19 | Spielsichtung: Anfahrtsradius | 229 € pauschal |
| D31 | Anzahl Gold-Plätze | 10 |
| D34 | Career Knowledge Hub zum Launch? | nein, später |
| D36 | Kontingent bei Kündigung im Monat | bleibt bis Monatsende nutzbar |
| D37 | Warteliste: automatisches Nachrücken | ja, bis 2 h vor Beginn |
| D38 | Umfang Videoanalyse | — |
| D39 | Preise als Endpreise inkl. späterer USt | ja |

**Später (bis Plan-Woche 21):** D3 Einzugsgebiet · D23 Ausfall durch dich · D25 Trainingsort · D26 weitere Trainer · D27 Winter/Halle · D29 Rechnungsempfänger Minderjährige · D30 Widerrufsrecht · D32 „Next Level"-Inhalt

> Die Vorgaben oben sind meine Arbeitsannahmen, damit das Datenmodell nicht wartet. Alles davon lässt sich später ändern — sag einfach Bescheid, wenn eine Annahme falsch ist.

---

## 9. Nächster Schritt

**Plan-Woche 1 ist abgeschlossen.** Als Nächstes leite ich aus diesem Dokument ab:

1. **Datenmodell** — alle Entitäten, Felder und Regeln (Plan-Woche 6, vorgezogen)
2. **Stripe-Produktstruktur** — alle Preise, Abos, Ratenpläne, Steuersätze (Plan-Woche 12)
3. **Website-Seitenstruktur** mit echten Preisen und Vergleichstabelle (Plan-Woche 5)

Parallel offen und deine Entscheidung: **Markenname, Domain, Social-Handles** (Plan-Woche 2).
