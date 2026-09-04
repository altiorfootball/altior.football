import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "./SessionForm";
import { cancelSession, deleteSession } from "./actions";

export const metadata = { title: "Termine verwalten" };
export const dynamic = "force-dynamic";

const dayFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "Europe/Berlin",
});

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export default async function AdminTerminePage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select(
      "id, starts_at, duration_minutes, location, field_capacity, gk_capacity, field_booked, gk_booked, status"
    )
    .gte("starts_at", new Date(Date.now() - 86_400_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(60);

  const list = sessions ?? [];
  const upcoming = list.filter((s) => s.status === "scheduled");

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Termine anlegen
          </h1>
          <p className="max-w-[62ch] text-sm text-ink-soft">
            Wochentage, Uhrzeit und Zeitraum wählen — das System legt alle
            passenden Termine auf einmal an.
          </p>
        </div>
        <div className="border border-line bg-surface p-6">
          <SessionForm />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Kommende Termine
          </h2>
          <span className="tabular font-mono text-sm text-ink-soft">
            {upcoming.length} geplant
          </span>
        </div>

        {list.length === 0 ? (
          <p className="border border-line bg-surface p-6 text-sm text-ink-soft">
            Noch keine Termine angelegt.
          </p>
        ) : (
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[46rem] border-collapse bg-surface">
              <thead>
                <tr className="border-b border-line">
                  <th className="eyebrow px-4 py-3 text-left">Termin</th>
                  <th className="eyebrow px-4 py-3 text-left">Ort</th>
                  <th className="eyebrow px-4 py-3 text-left">Feld</th>
                  <th className="eyebrow px-4 py-3 text-left">TW</th>
                  <th className="eyebrow px-4 py-3 text-left">Status</th>
                  <th className="eyebrow px-4 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const start = new Date(s.starts_at);
                  const hasBookings = s.field_booked + s.gk_booked > 0;

                  return (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <span className="tabular font-mono text-sm">
                          {dayFormat.format(start)} · {timeFormat.format(start)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-soft">
                        {s.location}
                      </td>
                      <td className="tabular px-4 py-3 font-mono text-sm">
                        {s.field_booked}/{s.field_capacity}
                      </td>
                      <td className="tabular px-4 py-3 font-mono text-sm">
                        {s.gk_booked}/{s.gk_capacity}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {s.status === "scheduled" ? (
                          <span className="text-pitch">geplant</span>
                        ) : s.status === "cancelled" ? (
                          <span className="text-ink-soft">abgesagt</span>
                        ) : (
                          <span className="text-ink-soft">gelaufen</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.status !== "scheduled" ? null : hasBookings ? (
                          // Gebuchte Termine werden abgesagt, nicht gelöscht —
                          // sonst verschwinden Buchungen spurlos.
                          <form action={cancelSession} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              type="submit"
                              className="text-sm text-ink-soft underline"
                            >
                              Absagen
                            </button>
                          </form>
                        ) : (
                          <form action={deleteSession} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              type="submit"
                              className="text-sm text-ink-soft underline"
                            >
                              Löschen
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
