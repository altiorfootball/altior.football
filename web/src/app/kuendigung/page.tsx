"use client";

import { useActionState } from "react";
import { submitCancellation, type CancellationState } from "./actions";
import { Field, Select, ErrorNote } from "@/components/Field";
import { Mark } from "@/components/Mark";
import { brand } from "@/lib/brand";

const stamp = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export default function KuendigungPage() {
  const [state, formAction] = useActionState<CancellationState, FormData>(
    submitCancellation,
    {}
  );

  // Eingangsbestätigung in Textform, wie sie § 312k verlangt.
  if (state.receivedAt) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Mark size={40} />
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Kündigung eingegangen
        </h1>
        <div className="flex flex-col gap-3 border border-line bg-surface p-6">
          <span className="eyebrow">Eingang</span>
          <span className="tabular font-mono text-lg">
            {stamp.format(new Date(state.receivedAt))}
          </span>
          <p className="text-sm text-ink-soft">
            Dieser Zeitpunkt ist für die Wirksamkeit deiner Kündigung
            maßgeblich.
          </p>
        </div>
        {state.confirmationSent ? (
          <p className="text-sm text-ink-soft">
            Die Bestätigung ist zusätzlich an deine E-Mail-Adresse
            unterwegs.
          </p>
        ) : (
          <p className="border-l-2 border-pitch bg-surface px-4 py-3 text-sm">
            Die Bestätigung per E-Mail konnte gerade nicht zugestellt werden.
            Deine Kündigung ist trotzdem wirksam — der oben genannte Zeitpunkt
            zählt. Wir melden uns.
          </p>
        )}

        <p className="max-w-[62ch] text-ink-soft">
          Eine Mitgliedschaft endet zum Ende des laufenden Monats. Bis dahin
          kannst du dein Kontingent voll nutzen — der Monat ist bezahlt. Beim
          Career Support gilt die vereinbarte Mindestlaufzeit; danach ist er
          monatlich kündbar.
        </p>
        <p className="text-sm text-ink-soft">
          Fragen? Schreib an{" "}
          <a href={`mailto:${brand.email}`} className="text-pitch underline">
            {brand.email}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Verträge hier kündigen</span>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Kündigung
        </h1>
        <p className="max-w-[62ch] text-ink-soft">
          Hier kannst du deine Mitgliedschaft oder deinen Career Support
          kündigen — ohne Anmeldung. Fülle die Felder aus und bestätige unten.
          Den Eingang bestätigen wir dir sofort.
        </p>
      </header>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Vorname" name="first_name" required autoComplete="given-name" />
          <Field label="Nachname" name="last_name" required autoComplete="family-name" />
        </div>

        <Field
          label="E-Mail-Adresse"
          name="email"
          type="email"
          required
          autoComplete="email"
          hint="Die Adresse, mit der du dich angemeldet hast."
        />

        <Select
          label="Was möchtest du kündigen?"
          name="contract_type"
          required
          options={[
            { value: "membership", label: "Pro Player Membership" },
            { value: "career_support", label: "Career Support" },
            { value: "unbekannt", label: "Weiß ich nicht genau" },
          ]}
        />

        <Field
          label="Weitere Angaben zum Vertrag"
          name="contract_hint"
          placeholder="z. B. Stufe oder Beginn der Mitgliedschaft"
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Nachricht
            <span className="ml-1.5 font-normal text-ink-soft">optional</span>
          </span>
          <textarea
            name="message"
            rows={3}
            className="border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pitch"
          />
        </label>

        <div className="border-t border-line pt-6">
          <button
            type="submit"
            className="border border-pitch bg-pitch px-6 py-3 text-sm font-medium text-white"
          >
            Jetzt kündigen
          </button>
        </div>
      </form>
    </div>
  );
}
