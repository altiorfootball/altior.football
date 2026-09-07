"use client";

import { useActionState, useEffect } from "react";
import { subscribe, type SubscribeState } from "./checkout";

/** Mitgliedschaft abschließen. Der Preis steht auf dem Knopf. */
export function SubscribeButton({
  plan,
  price,
}: {
  plan: string;
  price: string;
}) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(
    subscribe,
    {}
  );

  // Die Bezahlseite liegt bei Stripe, also auf einer fremden Adresse. Der
  // Browser muss selbst dorthin wechseln.
  useEffect(() => {
    if (state.url) window.location.href = state.url;
  }, [state.url]);

  const busy = pending || !!state.url;

  return (
    <div className="flex flex-col gap-2">
      <form action={action}>
        <input type="hidden" name="plan" value={plan} />
        <button
          type="submit"
          disabled={busy}
          className="w-full border border-pitch bg-pitch px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed"
        >
          {busy ? "Weiter zur Zahlung…" : `Für ${price} / Monat`}
        </button>
      </form>
      {state.error ? (
        <p role="alert" className="text-xs text-ink-soft">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
