import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/brand";
import { PlanSwitcher, CancelMembership } from "./MembershipActions";
import { SubscribeButton } from "./SubscribeButton";

export const metadata = { title: "Mitgliedschaft" };
export const dynamic = "force-dynamic";

type Plan = {
  key: string;
  name: string;
  trainings_per_month: number;
  online_sessions_per_month: number;
  video_analyses_per_month: number;
};

type MembershipRow = {
  id: string;
  status: string;
  started_at: string;
  cancelled_at: string | null;
  ends_at: string | null;
  membership_plans: Plan | null;
};

type PlanRow = Plan & {
  max_seats: number | null;
  products: { prices: { amount_cents: number }[] } | null;
};

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

/** Kontingent als Balken: Grün genutzt, Grau offen — das Farbsystem der Marke. */
function Quota({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-2 border border-line bg-surface p-4">
      <span className="eyebrow">{label}</span>
      <span className="inline-flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-6 ${i < used ? "bg-pitch" : "bg-before"}`}
          />
        ))}
      </span>
      <span className="tabular font-mono text-sm">
        {used} von {total} genutzt
      </span>
    </div>
  );
}

export default async function MitgliedschaftPage({
  searchParams,
}: {
  searchParams: Promise<{
    wechsel?: string;
    gekuendigt?: string;
    fehler?: string;
    abgeschlossen?: string;
    abgebrochen?: string;
  }>;
}) {
  const { wechsel, gekuendigt, fehler, abgeschlossen, abgebrochen } =
    await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/anmelden");

  const { data: player } = await supabase
    .from("players")
    .select("id, player_type")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!player) redirect("/profil");

  const { data: membership } = await supabase
    .from("memberships")
    .select(
      "id, status, started_at, cancelled_at, ends_at, membership_plans!memberships_plan_id_fkey(key, name, trainings_per_month, online_sessions_per_month, video_analyses_per_month)"
    )
    .eq("player_id", player.id)
    .eq("status", "active")
    .maybeSingle()
    .overrideTypes<MembershipRow>();

  const { data: plans } = await supabase
    .from("membership_plans")
    .select(
      "key, name, trainings_per_month, online_sessions_per_month, video_analyses_per_month, max_seats, products(prices(amount_cents))"
    )
    .overrideTypes<PlanRow[]>();

  let period = null;
  if (membership) {
    const { data: p } = await supabase
      .from("entitlement_periods")
      .select(
        "trainings_used, trainings_total, online_sessions_used, online_sessions_total, video_analyses_used, video_analyses_total, period_end"
      )
      .eq("membership_id", membership.id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    period = p;
  }

  const plan = membership?.membership_plans;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Pro Player Membership</span>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Deine Mitgliedschaft
        </h1>
      </header>

      {abgeschlossen ? (
        <p role="status" className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          Mitgliedschaft abgeschlossen. Dein Kontingent für diesen Monat steht
          bereit.
        </p>
      ) : null}

      {abgebrochen ? (
        <p role="status" className="border-l-2 border-line bg-surface px-4 py-3 text-sm">
          Abgebrochen — es wurde nichts abgebucht.
        </p>
      ) : null}

      {wechsel ? (
        <p role="status" className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          {wechsel === "sofort"
            ? "Stufe gewechselt. Dein Kontingent gilt ab sofort."
            : "Wechsel vorgemerkt. Er wird zum Monatsende wirksam — bis dahin gilt deine bisherige Stufe, die du bereits bezahlt hast."}
        </p>
      ) : null}

      {gekuendigt ? (
        <p role="status" className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          Gekündigt. Dein Kontingent bleibt bis zum Monatsende nutzbar — der
          Monat ist bezahlt.
        </p>
      ) : null}

      {fehler ? (
        <p role="alert" className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          Das hat nicht geklappt. Versuche es bitte erneut.
        </p>
      ) : null}

      {!membership || !plan ? (
        <div className="flex flex-col gap-6">
          <p className="max-w-[62ch] text-ink-soft">
            Du hast noch keine Mitgliedschaft. Einzelne Trainings kannst du
            trotzdem buchen — mit einer Mitgliedschaft wird es günstiger und du
            hast deinen Platz sicher.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {plans?.map((p) => {
              const cents = p.products?.prices?.[0]?.amount_cents;
              return (
                <div
                  key={p.key}
                  className="flex flex-col gap-3 border border-line bg-surface p-5"
                >
                  <span className="text-lg font-semibold">{p.name}</span>
                  {cents ? (
                    <span className="tabular font-mono text-2xl">
                      {formatPrice(cents)}
                      <span className="text-sm text-ink-soft"> / Monat</span>
                    </span>
                  ) : null}
                  <ul className="flex flex-col gap-1 text-sm text-ink-soft">
                    <li>{p.trainings_per_month} Pro Player Trainings</li>
                    {p.online_sessions_per_month > 0 ? (
                      <li>{p.online_sessions_per_month} Online Development Session</li>
                    ) : null}
                    {p.video_analyses_per_month > 0 ? (
                      <li>{p.video_analyses_per_month} Videoanalyse</li>
                    ) : null}
                  </ul>
                  {p.max_seats ? (
                    <span className="text-xs text-ink-soft">
                      begrenzt auf {p.max_seats} Plätze
                    </span>
                  ) : null}
                  {cents ? (
                    <div className="mt-1">
                      <SubscribeButton plan={p.key} price={formatPrice(cents)} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="text-sm text-ink-soft">
            Monatlich kündbar, ohne Frist. Zahlung per Lastschrift oder Karte.
            Fragen? Schreib an{" "}
            <a href="mailto:kontakt@altior.football" className="text-pitch underline">
              kontakt@altior.football
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-4 border border-line bg-surface px-5 py-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Aktuelle Stufe</span>
              <span className="text-2xl font-semibold">{plan.name}</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="eyebrow">Mitglied seit</span>
              <span className="tabular font-mono text-sm">
                {dateFormat.format(new Date(membership.started_at))}
              </span>
            </div>
          </div>

          {membership.cancelled_at && membership.ends_at ? (
            <p className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
              Gekündigt am{" "}
              {dateFormat.format(new Date(membership.cancelled_at))}. Deine
              Mitgliedschaft endet am{" "}
              <span className="tabular font-mono">
                {dateFormat.format(new Date(membership.ends_at))}
              </span>
              . Bis dahin kannst du dein Kontingent voll nutzen.
            </p>
          ) : null}

          {period ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold">Dein Kontingent</h2>
                <span className="text-xs text-ink-soft">
                  Reset am Monatsersten, Ungenutztes verfällt
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Quota
                  label="Pro Player Training"
                  used={period.trainings_used}
                  total={period.trainings_total}
                />
                <Quota
                  label="Online Session"
                  used={period.online_sessions_used}
                  total={period.online_sessions_total}
                />
                <Quota
                  label="Videoanalyse"
                  used={period.video_analyses_used}
                  total={period.video_analyses_total}
                />
              </div>
              <Link href="/termine" className="text-sm text-pitch underline">
                Zu den nächsten Terminen
              </Link>
            </section>
          ) : null}

          {!membership.cancelled_at ? (
            <>
              <PlanSwitcher currentKey={plan.key} />
              <CancelMembership />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
