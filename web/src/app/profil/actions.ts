"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AGE, ageRules } from "@/lib/age";

export type ProfileState = { error?: string };

export async function createPlayerProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an." };
  }

  const dateOfBirth = String(formData.get("date_of_birth") ?? "");
  const playerType = String(formData.get("player_type") ?? "");

  if (!dateOfBirth || !playerType) {
    return { error: "Bitte gib Geburtsdatum und Position an." };
  }

  const rules = ageRules(dateOfBirth);
  if (rules.tooYoung) {
    return { error: `Eine Registrierung ist ab ${AGE.minimum} Jahren möglich.` };
  }

  const guardianFirstName = String(formData.get("guardian_first_name") ?? "").trim();
  const guardianLastName = String(formData.get("guardian_last_name") ?? "").trim();
  const guardianEmail = String(formData.get("guardian_email") ?? "").trim();
  const guardianConsent = formData.get("guardian_consent") === "on";

  // Unter 18 sind die Eltern Vertragspartner (Paragraf 106 BGB), unter 16
  // müssen sie zusätzlich in die Datenverarbeitung einwilligen (DSGVO Art. 8).
  if (rules.needsGuardianContract) {
    if (!guardianFirstName || !guardianLastName || !guardianEmail) {
      return {
        error:
          "Für Spieler unter 18 Jahren brauchen wir die Kontaktdaten eines Elternteils.",
      };
    }
    if (!guardianConsent) {
      return {
        error:
          "Ohne die Zustimmung eines Elternteils können wir das Profil nicht anlegen.",
      };
    }
  }

  const heightRaw = String(formData.get("height_cm") ?? "").trim();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      profile_id: user.id,
      date_of_birth: dateOfBirth,
      player_type: playerType,
      position: String(formData.get("position") ?? "").trim() || null,
      club: String(formData.get("club") ?? "").trim() || null,
      team: String(formData.get("team") ?? "").trim() || null,
      league: String(formData.get("league") ?? "").trim() || null,
      strong_foot: String(formData.get("strong_foot") ?? "") || null,
      height_cm: heightRaw ? Number(heightRaw) : null,
      development_goals:
        String(formData.get("development_goals") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (playerError || !player) {
    // Der Mindestalter-Trigger der Datenbank meldet sich hier, falls die
    // Prüfung oben umgangen wurde.
    if (playerError?.message.includes("10 Jahren")) {
      return { error: `Eine Registrierung ist ab ${AGE.minimum} Jahren möglich.` };
    }
    if (playerError?.code === "23505") {
      return { error: "Für dieses Konto gibt es bereits ein Spielerprofil." };
    }
    return { error: "Das Profil konnte nicht gespeichert werden." };
  }

  if (rules.needsGuardianContract) {
    const { error: guardianError } = await supabase.from("guardians").insert({
      player_id: player.id,
      first_name: guardianFirstName,
      last_name: guardianLastName,
      email: guardianEmail,
      phone: String(formData.get("guardian_phone") ?? "").trim() || null,
      // Unter 18 ist der Elternteil Vertragspartner und damit
      // Rechnungsempfänger.
      is_invoice_recipient: true,
      consent_given_at: new Date().toISOString(),
      photo_consent: formData.get("photo_consent") === "on",
    });

    if (guardianError) {
      return {
        error:
          "Das Profil wurde angelegt, die Elterndaten konnten aber nicht gespeichert werden. Bitte ergänze sie im Profil.",
      };
    }
  }

  revalidatePath("/profil");
  return {};
}
