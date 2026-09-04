"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AGE, ageRules } from "@/lib/age";

export type RegisterState = { error?: string };

export async function register(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "");

  if (!email || !password || !firstName || !lastName || !dateOfBirth) {
    return { error: "Bitte fülle alle Felder aus." };
  }

  if (password.length < 8) {
    return { error: "Das Passwort braucht mindestens 8 Zeichen." };
  }

  // Dieselbe Prüfung läuft zusätzlich in der Datenbank. Hier steht sie,
  // damit der Spieler eine verständliche Antwort bekommt statt eines
  // Datenbankfehlers.
  const rules = ageRules(dateOfBirth);
  if (Number.isNaN(rules.age)) {
    return { error: "Bitte gib ein gültiges Geburtsdatum an." };
  }
  if (rules.tooYoung) {
    return {
      error: `Eine Registrierung ist ab ${AGE.minimum} Jahren möglich.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Das Geburtsdatum wandert mit ins Konto, damit es die E-Mail-Bestätigung
      // übersteht. Seine endgültige Heimat ist das Spielerprofil.
      data: {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/profil`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return {
        error:
          "Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich stattdessen an.",
      };
    }
    return { error: "Die Registrierung hat nicht geklappt. Versuche es bitte erneut." };
  }

  // Ist die E-Mail-Bestätigung aktiv, entsteht beim Anlegen noch keine Sitzung.
  // Dann darf nicht auf das Profil weitergeleitet werden — dort wäre der Spieler
  // nicht angemeldet und ländete kommentarlos wieder auf der Anmeldeseite.
  if (!data.session) {
    redirect(`/registrieren/bestaetigen?email=${encodeURIComponent(email)}`);
  }

  redirect("/profil");
}
