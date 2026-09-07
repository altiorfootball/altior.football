"use server";

import { createClient } from "@/lib/supabase/server";

export type CancellationState = {
  error?: string;
  /** Zeitpunkt des Eingangs — maßgeblich für die Wirksamkeit der Kündigung. */
  receivedAt?: string;
};

/**
 * Nimmt eine Kündigungserklärung über den gesetzlichen Kündigungsbutton
 * entgegen (§ 312k BGB).
 *
 * Bewusst ohne Anmeldung und ohne automatische Ausführung: Würde allein
 * anhand der E-Mail sofort gekündigt, könnte jeder fremde Verträge beenden.
 * Das Gesetz verlangt die sofortige Bestätigung des Eingangs und die
 * Wirksamkeit zum Erklärungsdatum — der Zeitstempel hält beides fest.
 */
export async function submitCancellation(
  _prev: CancellationState,
  formData: FormData
): Promise<CancellationState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const contractType = String(formData.get("contract_type") ?? "unbekannt");

  if (!firstName || !lastName || !email) {
    return { error: "Bitte gib Vorname, Nachname und E-Mail-Adresse an." };
  }

  const supabase = await createClient();

  // Ueber eine Datenbankfunktion statt direktem INSERT: Der Zeitstempel muss
  // zurueckkommen, das Lesen der Tabelle ist aber dem Betreiber vorbehalten.
  const { data, error } = await supabase.rpc("submit_cancellation", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_contract_type: contractType,
    p_contract_hint: String(formData.get("contract_hint") ?? "").trim() || null,
    p_message: String(formData.get("message") ?? "").trim() || null,
  });

  if (error || !data) {
    const code = error?.message.match(/ALTIOR_([A-Z_]+)/)?.[1];
    if (code === "BAD_EMAIL") {
      return { error: "Diese E-Mail-Adresse sieht nicht gueltig aus." };
    }
    if (code === "INCOMPLETE") {
      return { error: "Bitte gib Vorname, Nachname und E-Mail-Adresse an." };
    }
    return {
      error:
        "Die Kuendigung konnte nicht entgegengenommen werden. Bitte schreib an kontakt@altior.football — auch das ist eine wirksame Kuendigung.",
    };
  }

  return { receivedAt: data as string };
}
