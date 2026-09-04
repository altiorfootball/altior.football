import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { logout } from "../anmelden/actions";
import { ageYears, AGE } from "@/lib/age";

export const metadata = { title: "Mein Profil" };
export const dynamic = "force-dynamic";

const playerTypeLabel: Record<string, string> = {
  field: "Feldspieler",
  goalkeeper: "Torhüter",
};

const footLabel: Record<string, string> = {
  left: "links",
  right: "rechts",
  both: "beidfüßig",
};

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-6 border-b border-line py-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ dob?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/anmelden");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, date_of_birth, player_type, position, club, team, league, strong_foot, height_cm, development_goals"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  const name = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");

  // Noch kein Spielerprofil: zweiter Schritt der Registrierung.
  if (!player) {
    const { dob } = await searchParams;
    // Das Geburtsdatum wurde bei der Registrierung ins Konto geschrieben und
    // überlebt so die E-Mail-Bestätigung.
    const dobFromAccount =
      typeof user.user_metadata?.date_of_birth === "string"
        ? user.user_metadata.date_of_birth
        : "";
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="eyebrow">Schritt 2 von 2</span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Dein Spielerprofil
          </h1>
          <p className="max-w-[62ch] text-ink-soft">
            {name ? `${name}, d` : "D"}amit wir wissen, wo du stehst. Pflicht
            sind nur Geburtsdatum und Position — den Rest kannst du jederzeit
            ergänzen.
          </p>
        </header>
        <ProfileForm initialDob={dob ?? dobFromAccount} />
      </div>
    );
  }

  const age = ageYears(player.date_of_birth);

  const { data: guardians } = await supabase
    .from("guardians")
    .select("first_name, last_name, email, consent_given_at, photo_consent")
    .eq("player_id", player.id);

  const guardian = guardians?.[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Mein Profil</span>
        <h1 className="text-3xl font-semibold tracking-tight">
          {name || profile?.email}
        </h1>
        <p className="text-ink-soft">
          {playerTypeLabel[player.player_type]} · {age} Jahre
        </p>
      </header>

      <section className="flex flex-col">
        <h2 className="mb-2 text-lg font-semibold">Sportlich</h2>
        <Row label="Position" value={playerTypeLabel[player.player_type]} />
        <Row label="Genaue Position" value={player.position} />
        <Row
          label="Starker Fuß"
          value={player.strong_foot ? footLabel[player.strong_foot] : null}
        />
        <Row
          label="Größe"
          value={player.height_cm ? `${player.height_cm} cm` : null}
        />
        <Row label="Verein" value={player.club} />
        <Row label="Mannschaft" value={player.team} />
        <Row label="Spielklasse" value={player.league} />
      </section>

      {player.development_goals ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Entwicklungsziele</h2>
          <p className="text-ink-soft">{player.development_goals}</p>
        </section>
      ) : null}

      {age < AGE.ownContract ? (
        <section className="flex flex-col">
          <h2 className="mb-2 text-lg font-semibold">Eltern</h2>
          {guardian ? (
            <>
              <Row
                label="Name"
                value={`${guardian.first_name} ${guardian.last_name}`}
              />
              <Row label="E-Mail" value={guardian.email} />
              <Row
                label="Zustimmung"
                value={guardian.consent_given_at ? "erteilt" : "fehlt"}
              />
              <Row
                label="Foto und Video"
                value={guardian.photo_consent ? "erlaubt" : "nicht erlaubt"}
              />
            </>
          ) : (
            <p className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
              Für Spieler unter {AGE.ownContract} Jahren fehlen noch die
              Angaben eines Elternteils. Ohne sie sind keine Buchungen möglich.
            </p>
          )}
        </section>
      ) : null}

      <div className="flex items-center gap-6 border-t border-line pt-6">
        <Link
          href="/termine"
          className="border border-pitch bg-pitch px-5 py-2.5 text-sm font-medium text-white"
        >
          Nächste Termine
        </Link>
        <form action={logout}>
          <button type="submit" className="text-sm text-ink-soft underline">
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
