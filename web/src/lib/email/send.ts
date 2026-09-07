import { Resend } from "resend";

/**
 * Versand der System-Mails.
 *
 * Zwei Grundsätze:
 *
 * 1. **Ein Fehler beim Versand darf den Vorgang nicht kippen.** Wer bezahlt
 *    hat, ist gebucht — auch wenn die Bestätigung hängen bleibt. Deshalb
 *    wirft diese Funktion nicht, sondern meldet den Fehlschlag zurück.
 * 2. **Fehlschläge bleiben sichtbar.** Sie werden protokolliert, damit eine
 *    fehlende Bestätigung nicht still verschwindet — bei der Kündigung ist
 *    die Bestätigung in Textform gesetzlich verlangt (§ 312k BGB).
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export type MailResult = { sent: boolean; id?: string; error?: string };

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Kopie an den Betreiber — für Vertragsvorgänge. */
  copyToOperator?: boolean;
}): Promise<MailResult> {
  const resend = getClient();

  if (!resend) {
    // Noch kein Schlüssel hinterlegt: nicht scheitern, aber sichtbar machen.
    console.warn(
      `[Mail nicht versandt — RESEND_API_KEY fehlt] an ${options.to}: ${options.subject}`
    );
    return { sent: false, error: "RESEND_API_KEY fehlt" };
  }

  const operator = process.env.MAIL_OPERATOR;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM ?? "ALTIOR <no-reply@altior.football>",
      to: Array.isArray(options.to) ? options.to : [options.to],
      bcc: options.copyToOperator && operator ? [operator] : undefined,
      replyTo: process.env.MAIL_REPLY_TO ?? "kontakt@altior.football",
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error(`[Mail fehlgeschlagen] ${options.subject}:`, error.message);
      return { sent: false, error: error.message };
    }

    return { sent: true, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unbekannter Fehler";
    console.error(`[Mail fehlgeschlagen] ${options.subject}:`, message);
    return { sent: false, error: message };
  }
}
