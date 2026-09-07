"use client";

import { useActionState } from "react";
import { grantMembership, type GrantState } from "./actions";
import { Select, ErrorNote, Submit } from "@/components/Field";

type PlayerOption = {
  id: string;
  player_type: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

export function GrantMembership({ players }: { players: PlayerOption[] }) {
  const [state, action] = useActionState<GrantState, FormData>(
    grantMembership,
    {}
  );

  const options = players.map((p) => {
    const name = p.profiles
      ? `${p.profiles.first_name ?? ""} ${p.profiles.last_name ?? ""}`.trim()
      : "";
    const role = p.player_type === "goalkeeper" ? "TW" : "Feld";
    return { value: p.id, label: `${name || "Ohne Namen"} · ${role}` };
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.ok ? (
        <p className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          {state.ok}
        </p>
      ) : null}

      {options.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Noch keine Spieler mit Profil vorhanden.
        </p>
      ) : (
        <>
          <Select label="Spieler" name="player_id" required options={options} />
          <Select
            label="Stufe"
            name="plan"
            required
            hint="Gold ist auf 10 aktive Plätze begrenzt."
            options={[
              { value: "bronze", label: "Bronze · 59 € · 2 Trainings" },
              { value: "silver", label: "Silver · 129 € · 4 Trainings + 1 Online Session" },
              { value: "gold", label: "Gold · 269 € · 4 Trainings + 1 Online Session + 1 Videoanalyse" },
            ]}
          />
          <div className="pt-1">
            <Submit>Membership vergeben</Submit>
          </div>
        </>
      )}
    </form>
  );
}
