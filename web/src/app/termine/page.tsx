import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brand, capacity, deadlines, formatPrice } from "@/lib/brand";
import { BookButton, CancelButton, WaitlistButton } from "./SessionActions";

export const metadata = { title: "Nächste Termine" };

// Termine und Belegung ändern sich laufend — nicht zwischenspeichern.
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

const HOUR = 3_600_000;

/** Belegung als Balken: Grün belegt, Grau frei — dasselbe Farbsystem wie die Marke. */
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
  mine,
}: {
  label: string;
  booked: number;
  total: number;
  mine: boolean;
}) {
  const free = total - booked;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">
        {label}
        {mine ? " · deine Plätze" : null}
      </span>
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

export default async function TerminePage({
  searchParams,
}: {
  searchParams: Promise<{ storno?: string }>;
}) {
  const { storno } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Wer angemeldet ist, sieht seinen eigenen Stand: Position, Kontingent und
  // welche Termine bereits gebucht sind.
  let player: { id: string; player_type: string } | null = null;
  let quota: { used: number; total: number } | null = null;
  const bookedBySession = new Map<string, string>();
  const waitlisted = new Set<string>();

  if (user) {
    const { data: p } = await supabase
      .from("players")
      .select("id, player_type")
      .eq("profile_id", user.id)
      .maybeSingle();
    player = p;

    if (player) {
      const [{ data: periods }, { data: bookings }, { data: waits }] =
        await Promise.all([
          supabase
            .from("entitlement_periods")
            .select("trainings_used, trainings_total, memberships!inner(status)")
            .eq("memberships.status", "active")
            .order("period_start", { ascending: false })
            .limit(1),
          supabase
            .from("training_bookings")
            .select("id, session_id")
            .eq("player_id", player.id)
            .eq("status", "confirmed"),
          supabase
            .from("waitlist_entries")
            .select("session_id")
            .eq("player_id", player.id),
        ]);

      const period = periods?.[0];
      if (period) {
        quota = { used: period.trainings_used, total: period.trainings_total };
      }
      bookings?.forEach((b) => bookedBySession.set(b.session_id, b.id));
      waits?.forEach((w) => waitlisted.add(w.session_id));
    }
  }

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
  const isKeeper = player?.player_type === "goalkeeper";

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

      {storno ? (
        <p
          role="status"
          className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm"
        >
          {storno === "verfallen"
            ? "Storniert. Die Frist von 24 Stunden war abgelaufen — das Training bleibt aus deinem Kontingent verbraucht."
            : "Storniert. Das Training ist wieder in deinem Kontingent."}
        </p>
      ) : null}

      {quota ? (
        <div className="flex flex-wrap items-center gap-4 border border-line bg-surface px-5 py-4">
          <span className="eyebrow">Dein Kontingent im Monat</span>
          <Occupancy booked={quota.used} total={quota.total} />
          <span className="tabular font-mono text-sm">
            {quota.used} von {quota.total} genutzt
          </span>
          {quota.used >= quota.total ? (
            <span className="text-xs text-ink-soft">
              aufgebraucht — Reset am Monatsersten
            </span>
          ) : null}
        </div>
      ) : null}

      {user && !player ? (
        <p className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          Bevor du buchen kannst, brauchst du ein Spielerprofil.{" "}
          <Link href="/profil" className="text-pitch underline">
            Jetzt anlegen
          </Link>
        </p>
      ) : null}

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
            const end = new Date(start.getTime() + s.duration_minutes * 60_000);

            const bookingId = bookedBySession.get(s.id);
            const msToStart = start.getTime() - Date.now();
            const bookable =
              msToStart > deadlines.bookingClosesHoursBefore * HOUR;
            const cancelFree =
              msToStart > deadlines.freeCancellationHoursBefore * HOUR;

            // Ob ein Platz frei ist, hängt an der Position des Spielers —
            // ein Feldspieler kann keinen Torhüterplatz belegen.
            const mySlotFree = isKeeper
              ? s.gk_booked < s.gk_capacity
              : s.field_booked < s.field_capacity;

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
                      mine={!!player && !isKeeper}
                    />
                    <Slots
                      label="Torhüter"
                      booked={s.gk_booked}
                      total={s.gk_capacity}
                      mine={!!player && isKeeper}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {s.prices ? (
                    <span className="tabular font-mono text-lg">
                      {formatPrice(s.prices.amount_cents)}
                    </span>
                  ) : null}

                  {bookingId ? (
                    <>
                      <span className="text-sm font-medium text-pitch">
                        Gebucht
                      </span>
                      <CancelButton
                        bookingId={bookingId}
                        freeUntil={cancelFree}
                      />
                    </>
                  ) : !player ? (
                    <Link
                      href={user ? "/profil" : "/registrieren"}
                      className="border border-pitch bg-pitch px-5 py-2 text-sm font-medium text-white"
                    >
                      Buchen
                    </Link>
                  ) : !bookable ? (
                    <span className="text-sm text-ink-soft">
                      Buchungsschluss vorbei
                    </span>
                  ) : mySlotFree ? (
                    <BookButton sessionId={s.id} />
                  ) : waitlisted.has(s.id) ? (
                    <span className="text-sm text-ink-soft">
                      Auf der Warteliste
                    </span>
                  ) : (
                    <WaitlistButton sessionId={s.id} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-ink-soft">
        Fragen zu einem Termin? Schreib an{" "}
        <a href={`mailto:${brand.email}`} className="text-pitch underline">
          {brand.email}
        </a>
        .
      </p>
    </div>
  );
}
