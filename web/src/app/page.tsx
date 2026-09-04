import Link from "next/link";
import { Mark } from "@/components/Mark";
import { brand, capacity } from "@/lib/brand";

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-6">
        <Mark size={64} />
        <h1 className="max-w-[18ch] text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {brand.claim}
        </h1>
        <p className="max-w-[58ch] text-lg text-ink-soft">
          Individuelle Spielerentwicklung in {brand.city}. Wir messen, wo du
          stehst — und in zwölf Wochen noch einmal.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/termine"
            className="border border-pitch bg-pitch px-5 py-2.5 text-sm font-medium text-white"
          >
            Nächste Termine
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-10">
        <span className="eyebrow">Warum überhaupt</span>
        <div className="grid gap-8 sm:grid-cols-2">
          <p className="text-ink-soft">
            Im Verein trainieren zwanzig Spieler gleichzeitig. Ein Trainer, zwei
            Stunden, ein Platz. Er muss eine Mannschaft entwickeln, Taktik
            einstudieren, das Wochenende vorbereiten. Er macht das gut. Aber er
            kann nicht für jeden Einzelnen wissen, woran genau er arbeiten
            müsste.
          </p>
          <p className="text-ink-soft">
            Das ist kein Vorwurf. Das ist Mathematik. Bei uns sind es{" "}
            <span className="tabular font-mono text-ink">
              {capacity.field} Feldspieler
            </span>{" "}
            und{" "}
            <span className="tabular font-mono text-ink">
              {capacity.goalkeeper} Torhüter
            </span>
            . Nie mehr. Und der Vergleich bist nicht du gegen die anderen,
            sondern du gegen dich selbst, drei Monate vorher.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-10">
        <span className="eyebrow">Muss mein Sohn dafür den Verein wechseln?</span>
        <p className="max-w-[62ch] text-ink-soft">
          Nein. Das Angebot ergänzt das Vereinstraining, es ersetzt es nicht.
        </p>
      </section>
    </div>
  );
}
