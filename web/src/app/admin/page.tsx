import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Verwaltung" };
export const dynamic = "force-dynamic";

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border border-line bg-surface p-5">
      <span className="eyebrow">{label}</span>
      <span className="tabular font-mono text-3xl">{value}</span>
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </div>
  );
}

export default async function AdminPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [players, upcoming, bookings] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase
      .from("training_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("starts_at", now),
    supabase
      .from("training_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hallo {profile?.first_name ?? ""}
        </h1>
        <p className="text-sm text-ink-soft">
          Deine Steuerzentrale. Sie wächst mit jedem Baustein mit.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Spieler" value={players.count ?? 0} />
        <Tile
          label="Kommende Termine"
          value={upcoming.count ?? 0}
          hint="geplant, noch nicht gelaufen"
        />
        <Tile
          label="Buchungen"
          value={bookings.count ?? 0}
          hint="bestätigt"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <span className="eyebrow">Was als Nächstes dazukommt</span>
        <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
          <li>Buchung mit Überbuchungsschutz und Warteliste (Woche 9–10)</li>
          <li>Memberships und Kontingente (Woche 11)</li>
          <li>Stripe und Lexware Office (Woche 12–13)</li>
        </ul>
        <div className="pt-2">
          <Link
            href="/admin/termine"
            className="border border-pitch bg-pitch px-5 py-2.5 text-sm font-medium text-white"
          >
            Termine verwalten
          </Link>
        </div>
      </div>
    </div>
  );
}
