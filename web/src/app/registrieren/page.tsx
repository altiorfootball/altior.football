"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type RegisterState } from "./actions";
import { Field, ErrorNote, Submit } from "@/components/Field";
import { AGE } from "@/lib/age";

/** Spätestes Geburtsdatum, das die Mindestaltersgrenze erfüllt. */
function latestAllowedBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - AGE.minimum);
  return d.toISOString().slice(0, 10);
}

export default function RegistrierenPage() {
  const [state, formAction] = useActionState<RegisterState, FormData>(
    register,
    {}
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Konto anlegen</span>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Registrieren
        </h1>
        <p className="text-ink-soft">
          Danach legst du dein Spielerprofil an. Beides dauert zusammen keine
          zwei Minuten.
        </p>
      </header>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Vorname" name="first_name" required autoComplete="given-name" />
          <Field label="Nachname" name="last_name" required autoComplete="family-name" />
        </div>

        <Field
          label="Geburtsdatum"
          name="date_of_birth"
          type="date"
          required
          max={latestAllowedBirthDate()}
          hint={`Training ist ab ${AGE.minimum} Jahren möglich.`}
        />

        <Field
          label="E-Mail"
          name="email"
          type="email"
          required
          autoComplete="email"
        />

        <Field
          label="Passwort"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          hint="Mindestens 8 Zeichen."
        />

        <div className="pt-2">
          <Submit>Konto anlegen</Submit>
        </div>
      </form>

      <p className="text-sm text-ink-soft">
        Du hast schon ein Konto?{" "}
        <Link href="/anmelden" className="text-pitch underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
