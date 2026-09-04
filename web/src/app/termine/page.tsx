import { createClient } from "@/lib/supabase/server";
import { brand, capacity, deadlines, formatPrice } from "@/lib/brand";

export const metadata = { title: "Nächste Termine" };

// Termine ändern sich laufend — nicht zwischenspeichern.
export const dynamic = "force-dynamic";

type Session = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  location: string;
  field_capacity: number;
  gk_capacity: number;
  field_booked: number;
  gk_booked: number;
  prices: { amount_cents: number } | null;
};

const dayFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Berlin",
});

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

/** Balkenanzeige nach dem Farbsystem: Grün belegt, Grau frei. */
function Occupancy({ booked, total }: { booked: number; total: number }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-3 ${i < booked ? "bg-pitch" : "bg-before"}`}
        />
      ))}
    </span>
  );
}

function Slots({
  label,
  booked,
  total,
}: {
  label: string;
  booked: number;
  total: number;
}) {
  const free = total - booked;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <div className="flex items-center gap-2.5">
        <Occupancy booked={booked} total={total} />
        <span className="tabular font-mono text-sm text-ink-soft">
          {booked}/{total}
        </span>
      </div>
      <span className="text-xs text-ink-soft">
        {free === 0 ? "ausgebucht" : `noch ${free} frei`}
      </span>
    </div>
  );
}

export default async function TerminePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("training_sessions")
    .select(
      "id, starts_at, duration_minutes, location, field_capacity, gk_capacity, field_booked, gk_booked, prices(amount_cents)"
    )
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(12)
    .overrideTypes<Session[]>();

  if (error) {
    return (
      <div className="border border-line bg-surface p-6">
        <p className="text-ink-soft">
          Die Termine lassen sich gerade nicht laden. Bitte versuche es in
          einigen Minuten erneut.
        </p>
      </div>
    );
  }

  const sessions = data ?? [];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Pro Player Training</span>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Nächste Termine
        </h1>
        <p className="max-w-[62ch] text-ink-soft">
          {capacity.field} Feldspieler, {capacity.goalkeeper} Torhüter, ein
          Trainer. Buchbar bis {deadlines.bookingClosesHoursBefore} Stunden vor
          Beginn, kostenfrei stornierbar bis{" "}
          {deadlines.freeCancellationHoursBefore} Stunden vorher.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="border border-line bg-surface p-6">
          <p className="text-ink-soft">
            Zurzeit sind keine Termine veröffentlicht. Die nächsten Einheiten
            stehen in Kürze hier.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {sessions.map((s) => {
            const start = new Date(s.starts_at);
            const end = new Date(
              start.getTime() + s.duration_minutes * 60_000
            );
            const full =
              s.field_booked >= s.field_capacity &&
              s.gk_booked >= s.gk_capacity;

            return (
              <li
                key={s.id}
                className="grid grid-cols-1 gap-5 border-b border-line py-6 sm:grid-cols-[9rem_1fr_auto] sm:items-center"
              >
                <div className="flex flex-col">
                  <span className="tabular font-mono text-sm font-medium">
                    {dayFormat.format(start)}
                  </span>
                  <span className="tabular font-mono text-lg">
                    {timeFormat.format(start)}–{timeFormat.format(end)}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <span className="text-sm text-ink-soft">{s.location}</span>
                  <div className="flex gap-8">
                    <Slots
                      label="Feldspieler"
                      booked={s.field_booked}
                      total={s.field_capacity}
                    />
                    <Slots
                      label="Torhüter"
                      booked={s.gk_booked}
                      total={s.gk_capacity}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                  {s.prices ? (
                    <span className="tabular font-mono text-lg">
                      {formatPrice(s.prices.amount_cents)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={full}
                    className="border border-pitch bg-pitch px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-ink-soft"
                  >
                    {full ? "Ausgebucht" : "Buchen"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-ink-soft">
        Du hast Fragen zu einem Termin? Schreib an{" "}
        <a href={`mailto:${brand.email}`} className="text-pitch underline">
          {brand.email}
        </a>
        .
      </p>
    </div>
  );
}
