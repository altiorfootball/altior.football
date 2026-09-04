"use client";

import { useActionState } from "react";
import { createSessions, type SessionState } from "./actions";
import { Field, ErrorNote, Submit } from "@/components/Field";
import { capacity } from "@/lib/brand";

const WEEKDAYS = [
  { value: "1", label: "Mo" },
  { value: "2", label: "Di" },
  { value: "3", label: "Mi" },
  { value: "4", label: "Do" },
  { value: "5", label: "Fr" },
  { value: "6", label: "Sa" },
  { value: "0", label: "So" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function inWeeks(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

export function SessionForm() {
  const [state, formAction] = useActionState<SessionState, FormData>(
    createSessions,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.created ? (
        <p className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
          <span className="tabular font-mono">{state.created}</span> Termine
          angelegt.
          {state.skipped ? (
            <>
              {" "}
              <span className="tabular font-mono">{state.skipped}</span>{" "}
              übersprungen, weil dort schon ein Termin lag.
            </>
          ) : null}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Wochentage</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <label
              key={d.value}
              className="flex cursor-pointer items-center gap-2 border border-line bg-surface px-3 py-2 text-sm has-checked:border-pitch has-checked:text-pitch"
            >
              <input
                type="checkbox"
                name={`weekday_${d.value}`}
                className="accent-[var(--pitch)]"
              />
              {d.label}
            </label>
          ))}
        </div>
        <span className="text-xs text-ink-soft">
          Laut Product Master sind 4 Einheiten pro Woche geplant.
        </span>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Von" name="from" type="date" required defaultValue={today()} />
        <Field label="Bis" name="to" type="date" required defaultValue={inWeeks(4)} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Uhrzeit" name="time" type="time" required defaultValue="18:00" />
        <Field
          label="Dauer in Minuten"
          name="duration_minutes"
          type="number"
          required
          defaultValue="60"
        />
      </div>

      <Field
        label="Ort"
        name="location"
        required
        defaultValue="Sportpark Sentruper Höhe, Münster"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Plätze Feldspieler"
          name="field_capacity"
          type="number"
          required
          defaultValue={String(capacity.field)}
        />
        <Field
          label="Plätze Torhüter"
          name="gk_capacity"
          type="number"
          required
          defaultValue={String(capacity.goalkeeper)}
        />
      </div>

      <div className="pt-1">
        <Submit>Termine anlegen</Submit>
      </div>
    </form>
  );
}
