"use client";

import { useActionState, useState } from "react";
import { changePlan, cancelMembership, type MembershipState } from "./actions";

const PLANS = [
  { key: "bronze", label: "Bronze" },
  { key: "silver", label: "Silver" },
  { key: "gold", label: "Gold" },
] as const;

/**
 * Stufenwechsel. Der Hinweis, wann der Wechsel greift, steht am Button —
 * ein Downgrade wirkt erst zum Monatsende, und das soll niemanden überraschen.
 */
export function PlanSwitcher({ currentKey }: { currentKey: string }) {
  const [state, action] = useActionState<MembershipState, FormData>(
    changePlan,
    {}
  );

  const rank = (k: string) => PLANS.findIndex((p) => p.key === k);

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="text-lg font-semibold">Stufe wechseln</h2>

      {state.error ? (
        <p role="alert" className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {PLANS.filter((p) => p.key !== currentKey).map((p) => {
          const isUpgrade = rank(p.key) > rank(currentKey);
          return (
            <form key={p.key} action={action}>
              <input type="hidden" name="plan" value={p.key} />
              <button
                type="submit"
                className="flex flex-col items-start gap-0.5 border border-line bg-surface px-5 py-3 text-left hover:border-pitch"
              >
                <span className="text-sm font-medium">
                  Wechsel zu {p.label}
                </span>
                <span className="text-xs text-ink-soft">
                  {isUpgrade ? "gilt ab sofort" : "gilt ab dem nächsten Monat"}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Kündigung im angemeldeten Bereich. Der gesetzlich vorgeschriebene
 * Kündigungsbutton nach § 312k BGB liegt zusätzlich öffentlich unter
 * /kuendigung — er muss ohne Anmeldung erreichbar sein.
 */
export function CancelMembership() {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 className="text-lg font-semibold">Mitgliedschaft kündigen</h2>
      <p className="max-w-[62ch] text-sm text-ink-soft">
        Monatlich kündbar, ohne Frist. Die Kündigung wird zum Ende des laufenden
        Monats wirksam. Bis dahin kannst du dein Kontingent voll nutzen.
      </p>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <form action={cancelMembership}>
            <button
              type="submit"
              className="border border-pitch bg-pitch px-5 py-2 text-sm font-medium text-white"
            >
              Jetzt verbindlich kündigen
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-sm text-ink-soft underline"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="border border-line bg-transparent px-5 py-2 text-sm text-ink-soft hover:border-pitch"
          >
            Mitgliedschaft kündigen
          </button>
        </div>
      )}
    </section>
  );
}
