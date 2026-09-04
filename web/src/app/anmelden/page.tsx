"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { Field, ErrorNote, Submit } from "@/components/Field";

export default function AnmeldenPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Willkommen zurück</span>
        <h1 className="text-3xl font-semibold tracking-tight">Anmelden</h1>
      </header>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <form action={formAction} className="flex flex-col gap-5">
        <Field label="E-Mail" name="email" type="email" required autoComplete="email" />
        <Field
          label="Passwort"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <div className="pt-2">
          <Submit>Anmelden</Submit>
        </div>
      </form>

      <p className="text-sm text-ink-soft">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="text-pitch underline">
          Registrieren
        </Link>
      </p>
    </div>
  );
}
