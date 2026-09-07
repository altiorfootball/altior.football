import { createClient } from "@/lib/supabase/server";
import { GrantMembership } from "./GrantMembership";
import { markProcessed } from "./actions";

export const metadata = { title: "Mitglieder" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "Europe/Berlin",
});

const stamp = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

type PlayerOption = {
  id: string;
  player_type: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type MembershipRow = {
  id: string;
  status: string;
  started_at: string;
  cancelled_at: string | null;
  ends_at: string | null;
  membership_plans: { name: string } | null;
  players: {
    player_type: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

export default async function AdminMitgliederPage() {
  const supabase = await createClient();

  const [{ data: memberships }, { data: players }, { data: requests }] =
    await Promise.all([
      supabase
        .from("memberships")
        .select(
          "id, status, started_at, cancelled_at, ends_at, membership_plans!memberships_plan_id_fkey(name), players(player_type, profiles(first_name, last_name))"
        )
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .overrideTypes<MembershipRow[]>(),
      supabase
        .from("players")
        .select("id, player_type, profiles(first_name, last_name)")
        .order("created_at", { ascending: false })
        .overrideTypes<PlayerOption[]>(),
      supabase
        .from("cancellation_requests")
        .select("id, first_name, last_name, email, contract_type, contract_hint, message, submitted_at, processed_at")
        .is("processed_at", null)
        .order("submitted_at", { ascending: true }),
    ]);

  const open = requests ?? [];

  return (
    <div className="flex flex-col gap-12">
      {open.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Offene Kündigungen
            </h2>
            <span className="tabular font-mono text-sm text-pitch">
              {open.length} unbearbeitet
            </span>
          </div>
          <p className="max-w-[62ch] text-sm text-ink-soft">
            Über den gesetzlichen Kündigungsbutton eingegangen. Der Eingang
            zählt für die Wirksamkeit — auch wenn du erst später bearbeitest.
          </p>

          <div className="flex flex-col border border-line">
            {open.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface p-4 last:border-0"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {r.first_name} {r.last_name}
                  </span>
                  <span className="text-sm text-ink-soft">{r.email}</span>
                  <span className="text-sm text-ink-soft">
                    {r.contract_type === "membership"
                      ? "Pro Player Membership"
                      : r.contract_type === "career_support"
                        ? "Career Support"
                        : "Vertrag unklar"}
                    {r.contract_hint ? ` · ${r.contract_hint}` : ""}
                  </span>
                  {r.message ? (
                    <span className="mt-1 max-w-[52ch] text-sm">{r.message}</span>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="tabular font-mono text-xs text-ink-soft">
                    {stamp.format(new Date(r.submitted_at))}
                  </span>
                  <form action={markProcessed}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="border border-line px-4 py-1.5 text-sm text-ink-soft hover:border-pitch"
                    >
                      Als erledigt markieren
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Membership vergeben
          </h1>
          <p className="max-w-[62ch] text-sm text-ink-soft">
            Vorläufiger Weg, bis die Zahlung über Stripe läuft. Gold ist auf 10
            Plätze begrenzt — darüber weist das System ab.
          </p>
        </div>
        <div className="border border-line bg-surface p-6">
          <GrantMembership players={players ?? []} />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Aktive Mitgliedschaften
          </h2>
          <span className="tabular font-mono text-sm text-ink-soft">
            {memberships?.length ?? 0}
          </span>
        </div>

        {!memberships || memberships.length === 0 ? (
          <p className="border border-line bg-surface p-6 text-sm text-ink-soft">
            Noch keine Mitgliedschaften.
          </p>
        ) : (
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[40rem] border-collapse bg-surface">
              <thead>
                <tr className="border-b border-line">
                  <th className="eyebrow px-4 py-3 text-left">Spieler</th>
                  <th className="eyebrow px-4 py-3 text-left">Position</th>
                  <th className="eyebrow px-4 py-3 text-left">Stufe</th>
                  <th className="eyebrow px-4 py-3 text-left">Seit</th>
                  <th className="eyebrow px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => {
                  const p = m.players?.profiles;
                  return (
                    <tr key={m.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-sm">
                        {p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-soft">
                        {m.players?.player_type === "goalkeeper"
                          ? "Torhüter"
                          : "Feldspieler"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {m.membership_plans?.name ?? "—"}
                      </td>
                      <td className="tabular px-4 py-3 font-mono text-sm">
                        {dateFormat.format(new Date(m.started_at))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {m.cancelled_at && m.ends_at ? (
                          <span className="text-ink-soft">
                            gekündigt, endet {dateFormat.format(new Date(m.ends_at))}
                          </span>
                        ) : (
                          <span className="text-pitch">aktiv</span>
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
