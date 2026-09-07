import { renderHtml, renderText, type Block } from "./layout";
import { sendMail, type MailResult } from "./send";
import { brand, capacity, deadlines } from "@/lib/brand";

/**
 * Die Vorlagen folgen der Ansprache-Regel aus MARKE.md, Abschnitt 11:
 *
 *   Wer trainiert, wird geduzt. Wer bezahlt oder unterschreibt, wird gesiezt.
 *
 * Deshalb sind Buchungs- und Trainingsmails in „du", Vertrags- und
 * Kündigungsmails in „Sie".
 */

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const date = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeZone: "Europe/Berlin",
});

function deliver(
  to: string | string[],
  subject: string,
  preview: string,
  blocks: Block[],
  copyToOperator = false
): Promise<MailResult> {
  return sendMail({
    to,
    subject,
    html: renderHtml({ preview, blocks }),
    text: renderText(blocks),
    copyToOperator,
  });
}

/* ------------------------------------------------------------------ */
/* Spieler — „du"                                                      */
/* ------------------------------------------------------------------ */

export function mailBookingConfirmed(opts: {
  to: string;
  firstName: string | null;
  startsAt: string;
  location: string;
  paid: boolean;
  amountLabel?: string;
}): Promise<MailResult> {
  const anrede = opts.firstName ? `Hallo ${opts.firstName},` : "Hallo,";
  const blocks: Block[] = [
    { kind: "heading", content: "Dein Platz ist gebucht" },
    { kind: "text", content: anrede },
    {
      kind: "text",
      content: opts.paid
        ? `deine Zahlung ist eingegangen und dein Platz im Training steht.`
        : `dein Platz im Training steht. Er wurde aus deinem Monatskontingent gebucht.`,
    },
    { kind: "fact", label: "Termin", value: dateTime.format(new Date(opts.startsAt)) },
    { kind: "fact", label: "Ort", value: opts.location },
  ];

  if (opts.paid && opts.amountLabel) {
    blocks.push({ kind: "fact", label: "Bezahlt", value: opts.amountLabel });
  }

  blocks.push(
    {
      kind: "text",
      content: `Es trainieren höchstens ${capacity.field} Feldspieler und ${capacity.goalkeeper} Torhüter. Bring etwas zu trinken mit.`,
    },
    {
      kind: "note",
      content: `Kostenfrei stornieren kannst du bis ${deadlines.freeCancellationHoursBefore} Stunden vor Beginn. Danach bleibt das Training aus deinem Kontingent verbraucht.`,
    },
    { kind: "button", label: "Meine Termine", href: `https://${brand.domain}/termine` }
  );

  return deliver(
    opts.to,
    `Gebucht: Training am ${date.format(new Date(opts.startsAt))}`,
    "Dein Platz im Training steht.",
    blocks
  );
}

export function mailBookingCancelled(opts: {
  to: string;
  firstName: string | null;
  startsAt: string;
  inTime: boolean;
}): Promise<MailResult> {
  const anrede = opts.firstName ? `Hallo ${opts.firstName},` : "Hallo,";

  return deliver(
    opts.to,
    `Storniert: Training am ${date.format(new Date(opts.startsAt))}`,
    "Deine Buchung ist storniert.",
    [
      { kind: "heading", content: "Buchung storniert" },
      { kind: "text", content: anrede },
      { kind: "text", content: "deine Buchung wurde storniert." },
      { kind: "fact", label: "Termin", value: dateTime.format(new Date(opts.startsAt)) },
      {
        kind: "note",
        content: opts.inTime
          ? "Du hast rechtzeitig storniert — das Training ist wieder in deinem Kontingent."
          : `Die Frist von ${deadlines.freeCancellationHoursBefore} Stunden war abgelaufen. Das Training bleibt aus deinem Kontingent verbraucht.`,
      },
      { kind: "button", label: "Neuen Termin buchen", href: `https://${brand.domain}/termine` },
    ]
  );
}

/* ------------------------------------------------------------------ */
/* Vertrag — „Sie"                                                     */
/* ------------------------------------------------------------------ */

export function mailMembershipStarted(opts: {
  to: string;
  planName: string;
  priceLabel: string;
  trainings: number;
}): Promise<MailResult> {
  return deliver(
    opts.to,
    `Ihre Mitgliedschaft ${opts.planName} ist aktiv`,
    `Mitgliedschaft ${opts.planName} aktiv.`,
    [
      { kind: "heading", content: `Mitgliedschaft ${opts.planName}` },
      { kind: "text", content: "vielen Dank — die Mitgliedschaft ist ab sofort aktiv." },
      { kind: "fact", label: "Stufe", value: opts.planName },
      { kind: "fact", label: "Beitrag", value: `${opts.priceLabel} pro Monat` },
      {
        kind: "fact",
        label: "Kontingent im Monat",
        value: `${opts.trainings} Pro Player Trainings`,
      },
      {
        kind: "note",
        content:
          "Das Kontingent wird zum Monatsersten zurückgesetzt. Nicht genutzte Einheiten verfallen und werden nicht übertragen.",
      },
      {
        kind: "text",
        content:
          "Die Mitgliedschaft ist monatlich kündbar, ohne Frist. Eine Kündigung wird zum Ende des laufenden Monats wirksam.",
      },
      { kind: "button", label: "Zur Mitgliedschaft", href: `https://${brand.domain}/mitgliedschaft` },
    ],
    true
  );
}

/**
 * Eingangsbestätigung einer Kündigung.
 *
 * § 312k Abs. 4 BGB verlangt, den Inhalt der Erklärung sowie Datum und
 * Uhrzeit des Eingangs unverzüglich in Textform zu bestätigen. Eine Anzeige
 * auf dem Bildschirm genügt dafür nicht — deshalb ist diese Mail Pflicht und
 * kein Zusatz.
 */
export function mailCancellationReceived(opts: {
  to: string;
  firstName: string;
  lastName: string;
  contractLabel: string;
  contractHint: string | null;
  receivedAt: string;
  effectiveOn: string | null;
}): Promise<MailResult> {
  const blocks: Block[] = [
    { kind: "heading", content: "Eingang Ihrer Kündigung" },
    { kind: "text", content: `Guten Tag ${opts.firstName} ${opts.lastName},` },
    {
      kind: "text",
      content:
        "wir bestätigen den Eingang Ihrer Kündigung. Nachfolgend der Inhalt Ihrer Erklärung sowie Datum und Uhrzeit des Eingangs.",
    },
    { kind: "fact", label: "Eingegangen am", value: dateTime.format(new Date(opts.receivedAt)) },
    { kind: "fact", label: "Gekündigter Vertrag", value: opts.contractLabel },
  ];

  if (opts.contractHint) {
    blocks.push({ kind: "fact", label: "Ihre Angaben", value: opts.contractHint });
  }

  blocks.push({
    kind: "fact",
    label: "Vertragsende",
    value:
      opts.effectiveOn ??
      "wird Ihnen nach Prüfung mitgeteilt",
  });

  blocks.push(
    {
      kind: "note",
      content:
        "Für die Wirksamkeit Ihrer Kündigung ist der oben genannte Zeitpunkt des Eingangs maßgeblich, nicht der Zeitpunkt unserer Bearbeitung.",
    },
    {
      kind: "text",
      content:
        "Eine Mitgliedschaft endet zum Ende des laufenden Monats; bis dahin können Sie das Kontingent voll nutzen. Beim Career Support gilt die vereinbarte Mindestlaufzeit, danach ist er monatlich kündbar.",
    },
    {
      kind: "text",
      content: `Wenn etwas nicht stimmt, antworten Sie einfach auf diese E-Mail oder schreiben Sie an ${brand.email}.`,
    }
  );

  return deliver(
    opts.to,
    "Eingangsbestätigung Ihrer Kündigung",
    "Wir bestätigen den Eingang Ihrer Kündigung.",
    blocks,
    // Kopie an den Betreiber: die Kündigung muss bearbeitet werden.
    true
  );
}
