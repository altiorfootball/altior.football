import { brand } from "@/lib/brand";

/**
 * Gerüst für alle System-Mails.
 *
 * Bewusst ohne Bilder und ohne Weblayout: Bildblocker sind in E-Mail-
 * Programmen die Regel, und ein Logo, das als graues Kästchen ankommt,
 * schadet mehr als es nützt. Die Marke trägt hier die Sprache, nicht das Bild.
 *
 * Farben aus dem Corporate Design, als feste Werte — E-Mail-Programme
 * verstehen keine CSS-Variablen.
 */

const PITCH = "#1f6b47";
const INK = "#121a16";
const INK_SOFT = "#4a5a50";
const PAPER = "#f2f4f1";
const LINE = "#d6ddd6";

export type Block =
  | { kind: "text"; content: string }
  | { kind: "heading"; content: string }
  /** Hervorgehobene Angabe, etwa ein Termin oder ein Zeitpunkt. */
  | { kind: "fact"; label: string; value: string }
  | { kind: "note"; content: string }
  | { kind: "button"; label: string; href: string };

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderHtml(opts: {
  preview: string;
  blocks: Block[];
}): string {
  const body = opts.blocks
    .map((b) => {
      switch (b.kind) {
        case "heading":
          return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:${INK};line-height:1.3;">${escape(b.content)}</h1>`;
        case "text":
          return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${escape(b.content)}</p>`;
        case "note":
          return `<p style="margin:0 0 16px;padding:12px 16px;border-left:2px solid ${PITCH};background:#ffffff;font-size:14px;line-height:1.55;color:${INK_SOFT};">${escape(b.content)}</p>`;
        case "fact":
          return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;width:100%;border:1px solid ${LINE};background:#ffffff;"><tr><td style="padding:14px 16px;"><div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${INK_SOFT};font-family:'Courier New',monospace;">${escape(b.label)}</div><div style="margin-top:6px;font-size:17px;color:${INK};font-family:'Courier New',monospace;">${escape(b.value)}</div></td></tr></table>`;
        case "button":
          return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="background:${PITCH};"><a href="${b.href}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">${escape(b.label)}</a></td></tr></table>`;
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escape(brand.name)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(opts.preview)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${PAPER};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding-bottom:24px;">
  <span style="font-size:17px;font-weight:700;letter-spacing:2.2px;color:${INK};">${escape(brand.name)}</span>
</td></tr>
<tr><td>${body}</td></tr>
<tr><td style="padding-top:24px;border-top:1px solid ${LINE};">
  <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${INK_SOFT};">
    ${escape(brand.name)} · ${escape(brand.city)} · <a href="mailto:${brand.email}" style="color:${PITCH};">${escape(brand.email)}</a>
  </p>
  <p style="margin:0;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${INK_SOFT};font-family:'Courier New',monospace;">
    ${escape(brand.nameGloss)}
  </p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Textfassung. Nicht optional: Manche Programme zeigen nur sie an, Filter
 * bewerten Mails ohne Textteil schlechter — und bei der Kündigung ist die
 * Bestätigung „in Textform" gesetzlich verlangt.
 */
export function renderText(blocks: Block[]): string {
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case "heading":
          return `${b.content}\n${"-".repeat(Math.min(b.content.length, 60))}`;
        case "text":
        case "note":
          return b.content;
        case "fact":
          return `${b.label.toUpperCase()}: ${b.value}`;
        case "button":
          return `${b.label}: ${b.href}`;
      }
    })
    .join("\n\n");

  return `${brand.name}\n\n${body}\n\n—\n${brand.name} · ${brand.city}\n${brand.email}\n${brand.nameGloss}\n`;
}
