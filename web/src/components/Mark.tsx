/**
 * ALTIOR — Bildmarke
 * Grundlage: docs/CORPORATE-DESIGN.md, Abschnitt 1
 *
 * Zwei aufsteigende Balken. Der linke, gedämpfte ist der Ausgangswert aus dem
 * ersten Assessment, der rechte der Stand nach dem Re-Assessment. Beide
 * Oberkanten laufen parallel — der Sprung dazwischen ist die Entwicklung.
 *
 * Diese Datei ist die einzige Stelle, an der das Zeichen definiert ist.
 * Ein späterer Austausch der Marke betrifft nur sie.
 */

type MarkProps = {
  /** Kantenlänge in Pixeln. Funktioniert ab 16 px. */
  size?: number;
  /**
   * "duo" zeigt beide Farben und ist die Regelfassung.
   * "solid" zeichnet beide Balken in der aktuellen Textfarbe — für Stickerei,
   * App-Icon und alles Einfarbige. Lesbar bleibt es, weil sich die Balken in
   * der Höhe unterscheiden und nicht nur in der Farbe.
   */
  variant?: "duo" | "solid";
  className?: string;
  /** Nur setzen, wenn das Zeichen allein steht und nicht neben der Wortmarke. */
  title?: string;
};

export function Mark({ size = 32, variant = "duo", className, title }: MarkProps) {
  const past = variant === "duo" ? "var(--before)" : "currentColor";
  const now = variant === "duo" ? "var(--pitch)" : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <polygon points="16,58 44,46 44,82 16,82" fill={past} />
      <polygon points="56,34 84,22 84,82 56,82" fill={now} />
    </svg>
  );
}

/** Zeichen und Wortmarke nebeneinander — die Regelfassung für Kopfzeilen. */
export function Lockup({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} title="ALTIOR" />
      <span
        className="font-bold text-ink"
        style={{ letterSpacing: "0.13em", fontSize: size * 0.62 }}
      >
        ALTIOR
      </span>
    </span>
  );
}
