# Anmeldemails über Resend

Supabase verschickt die Registrierungs- und Passwortmails standardmäßig über
seinen eingebauten Versand. Der ist stark begrenzt, und die Mails landen
häufig im Spam. Für echte Kunden muss beides über Resend laufen — genauso wie
die übrigen System-Mails.

Die Vorlagen hier sind mit demselben Gerüst erzeugt wie die Buchungs- und
Kündigungsmails, damit alles gleich aussieht.

---

## Teil 1 — Versand umstellen

**Supabase → Project Settings → Authentication → SMTP Settings**, „Enable
Custom SMTP" einschalten und eintragen:

| Feld | Wert |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | der Resend-API-Schlüssel (`re_…`) — derselbe wie in `.env.local` |
| Sender email | `no-reply@altior.football` |
| Sender name | `ALTIOR` |

> **Der Benutzername lautet buchstäblich `resend`**, nicht die E-Mail-Adresse
> und nicht der Schlüssel. Das ist die Stelle, an der es meistens klemmt.

Als Absenderadresse funktioniert nur eine Adresse der freigeschalteten Domain
`altior.football`. Eine `.de`-Adresse wird abgewiesen, solange diese Domain in
Resend nicht ebenfalls freigeschaltet ist.

### Ratenbegrenzung anheben

**Authentication → Rate Limits**: Der Standardwert für Mails ist bewusst
niedrig, weil er für den eingebauten Versand gilt. Mit eigenem Versand kann er
hoch. Bei einem Assessment Day mit mehreren Anmeldungen innerhalb weniger
Minuten würde der Standardwert sonst greifen und Registrierungen scheitern
lassen.

---

## Teil 2 — Vorlagen einsetzen

**Authentication → Emails**. Für jede Vorlage den Betreff eintragen und den
Inhalt der HTML-Datei vollständig in das Feld kopieren.

| Supabase-Vorlage | Datei | Betreff |
|---|---|---|
| Confirm signup | `01-registrierung-bestaetigen.html` | Bestätige deine Registrierung bei ALTIOR |
| Reset password | `02-passwort-zuruecksetzen.html` | Neues Passwort für dein ALTIOR-Konto |
| Change email address | `03-adresse-aendern.html` | Bestätige deine neue E-Mail-Adresse |

Die Vorlagen enthalten den Platzhalter `{{ .ConfirmationURL }}` — den füllt
Supabase beim Versand. **Nicht ersetzen und nicht entfernen.**

Jede Vorlage nennt den Link zusätzlich im Klartext. Manche Mailprogramme
blockieren Knöpfe, dann lässt sich die Adresse kopieren.

Nicht ausgefüllt bleiben **Magic Link** und **Invite user** — beide Wege
werden nicht genutzt.

---

## Zur Ansprache

Diese Mails duzen. Sie gehen an den Spieler, der ein Konto anlegt oder sein
Passwort zurücksetzt — nicht an den Vertragspartner. Das folgt der Regel aus
`MARKE.md`, Abschnitt 11: **Wer trainiert, wird geduzt. Wer bezahlt oder
unterschreibt, wird gesiezt.**

---

## Prüfen

Nach dem Umstellen mit einer echten Adresse registrieren. Die Mail sollte

- von `no-reply@altior.football` kommen, nicht von `noreply@mail.app.supabase.io`
- im Posteingang landen, nicht im Spam
- deutsch sein und wie die übrigen ALTIOR-Mails aussehen

Kommt sie weiterhin von einer Supabase-Adresse, wurde der eigene Versand nicht
übernommen — dann stimmt meist der Benutzername nicht.
