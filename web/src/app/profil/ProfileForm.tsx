"use client";

import { useActionState, useState } from "react";
import { createPlayerProfile, type ProfileState } from "./actions";
import { Field, Select, ErrorNote, Submit } from "@/components/Field";
import { AGE, ageRules } from "@/lib/age";

function latestAllowedBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - AGE.minimum);
  return d.toISOString().slice(0, 10);
}

export function ProfileForm({ initialDob = "" }: { initialDob?: string }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    createPlayerProfile,
    {}
  );
  const [dob, setDob] = useState(initialDob);

  const rules = dob ? ageRules(dob) : null;
  const showGuardian = rules?.needsGuardianContract ?? false;

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <section className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold">Zur Person</h2>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Geburtsdatum</span>
          <input
            name="date_of_birth"
            type="date"
            required
            max={latestAllowedBirthDate()}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pitch"
          />
          {rules && !rules.tooYoung ? (
            <span className="text-xs text-ink-soft tabular">
              {rules.age} Jahre
            </span>
          ) : null}
        </label>

        <Select
          label="Position"
          name="player_type"
          required
          hint="Entscheidet, welches Platzkontingent du beim Training belegst — 8 Feldspieler, 2 Torhüter."
          options={[
            { value: "field", label: "Feldspieler" },
            { value: "goalkeeper", label: "Torhüter" },
          ]}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Genaue Position"
            name="position"
            placeholder="z. B. Innenverteidiger"
          />
          <Select
            label="Starker Fuß"
            name="strong_foot"
            options={[
              { value: "left", label: "links" },
              { value: "right", label: "rechts" },
              { value: "both", label: "beidfüßig" },
            ]}
          />
        </div>

        <Field label="Größe in cm" name="height_cm" type="number" placeholder="175" />
      </section>

      <section className="flex flex-col gap-5 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Dein Verein</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Verein" name="club" placeholder="z. B. Preußen Münster" />
          <Field label="Mannschaft" name="team" placeholder="z. B. U17" />
        </div>
        <Field label="Spielklasse" name="league" placeholder="z. B. Westfalenliga" />
      </section>

      <section className="flex flex-col gap-5 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Deine Ziele</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Woran willst du arbeiten?
            <span className="ml-1.5 font-normal text-ink-soft">optional</span>
          </span>
          <textarea
            name="development_goals"
            rows={3}
            placeholder="z. B. Erster Kontakt unter Druck, Abschluss aus der Distanz"
            className="border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pitch"
          />
          <span className="text-xs text-ink-soft">
            Wird beim ersten Assessment gemeinsam geschärft — du musst es jetzt
            nicht perfekt treffen.
          </span>
        </label>
      </section>

      {showGuardian ? (
        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Angaben der Eltern</h2>
            <p className="max-w-[62ch] text-sm text-ink-soft">
              {rules && rules.age < AGE.ownConsent
                ? "Unter 16 Jahren müssen deine Eltern der Verarbeitung deiner Daten zustimmen, und sie sind Vertragspartner für alle Buchungen."
                : "Unter 18 Jahren sind deine Eltern Vertragspartner und bekommen die Rechnungen."}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Vorname" name="guardian_first_name" required />
            <Field label="Nachname" name="guardian_last_name" required />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="E-Mail" name="guardian_email" type="email" required />
            <Field label="Telefon" name="guardian_phone" type="tel" />
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="guardian_consent"
              className="mt-1 accent-[var(--pitch)]"
            />
            <span className="text-sm">
              Ein Elternteil stimmt der Anmeldung und der Verarbeitung der Daten
              zu.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="photo_consent"
              className="mt-1 accent-[var(--pitch)]"
            />
            <span className="text-sm">
              Foto- und Videoaufnahmen im Training dürfen verwendet werden.
              <span className="ml-1.5 text-ink-soft">
                Freiwillig, jederzeit widerrufbar.
              </span>
            </span>
          </label>
        </section>
      ) : null}

      <div>
        <Submit>Profil speichern</Submit>
      </div>
    </form>
  );
}
