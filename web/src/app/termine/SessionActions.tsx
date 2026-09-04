"use client";

import { useActionState } from "react";
import {
  bookSession,
  cancelBooking,
  joinWaitlist,
  type BookingResult,
} from "./actions";

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
