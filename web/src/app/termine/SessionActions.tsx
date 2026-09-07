"use client";

import { useActionState, useEffect } from "react";
import {
  bookSession,
  cancelBooking,
  joinWaitlist,
  type BookingResult,
} from "./actions";
import { checkoutSession, type CheckoutResult } from "./checkout";

const buttonBase =
  "border px-5 py-2 text-sm font-medium disabled:cursor-not-allowed";
const primary = `${buttonBase} border-pitch bg-pitch text-white`;
const quiet = `${buttonBase} border-line bg-transparent text-ink-soft`;

function Feedback({ state }: { state: BookingResult }) {
  if (!state.error && !state.ok) return null;
  return (
    <p
      role="status"
      className="max-w-[42ch] border-l-2 border-pitch bg-surface px-3 py-2 text-xs"
    >
      {state.error ?? state.ok}
    </p>
  );
}

/** Buchen — wenn ein Platz frei ist und der Termin noch offen ist. */
export function BookButton({
  sessionId,
  disabled,
}: {
  sessionId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<BookingResult, FormData>(
    bookSession,
    {}
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <input type="hidden" name="session_id" value={sessionId} />
        <button type="submit" className={primary} disabled={disabled || pending}>
          {pending ? "Einen Moment…" : "Buchen"}
        </button>
      </form>
      <Feedback state={state} />
    </div>
  );
}

/** Stornieren — der Hinweis auf die Frist steht am Button, nicht im Kleingedruckten. */
export function CancelButton({
  bookingId,
  freeUntil,
}: {
  bookingId: string;
  freeUntil: boolean;
}) {
  const [state, action, pending] = useActionState<BookingResult, FormData>(
    cancelBooking,
    {}
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <button type="submit" className={quiet} disabled={pending}>
          {pending ? "Einen Moment…" : "Stornieren"}
        </button>
      </form>
      <span className="text-xs text-ink-soft">
        {freeUntil
          ? "kostenfrei stornierbar"
          : "Frist abgelaufen — Kontingent verfällt"}
      </span>
      <Feedback state={state} />
    </div>
  );
}

/**
 * Kostenpflichtig buchen — wenn kein Kontingent mehr da ist.
 *
 * Der Preis steht auf dem Knopf. Wer klickt, soll wissen, dass jetzt
 * bezahlt wird und nicht ein Guthaben verbraucht.
 */
export function PayButton({
  sessionId,
  price,
}: {
  sessionId: string;
  price: string;
}) {
  const [state, action, pending] = useActionState<CheckoutResult, FormData>(
    checkoutSession,
    {}
  );

  // Die Bezahlseite liegt bei Stripe, also auf einer fremden Adresse. Der
  // Browser muss selbst dorthin wechseln.
  useEffect(() => {
    if (state.url) window.location.href = state.url;
  }, [state.url]);

  const busy = pending || !!state.url;

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <input type="hidden" name="session_id" value={sessionId} />
        <button type="submit" className={primary} disabled={busy}>
          {busy ? "Weiter zur Zahlung…" : `Für ${price} buchen`}
        </button>
      </form>
      <Feedback state={state} />
    </div>
  );
}

/** Warteliste — erscheint erst, wenn die passende Platzart belegt ist. */
export function WaitlistButton({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState<BookingResult, FormData>(
    joinWaitlist,
    {}
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <input type="hidden" name="session_id" value={sessionId} />
        <button type="submit" className={quiet} disabled={pending}>
          {pending ? "Einen Moment…" : "Auf die Warteliste"}
        </button>
      </form>
      <Feedback state={state} />
    </div>
  );
}
