"use server";

import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/checkout";
import { mailCancellationReceived } from "@/lib/email/templates";

export type CancellationState = {
  error?: string;
  /** Zeitpunkt des Eingangs — maßgeblich für die Wirksamkeit der Kündigung. */
  receivedAt?: string;
  /** Ging die gesetzlich verlangte Bestätigung in Textform raus? */
  confirmationSent?: boolean;
};

const CONTRACT_LABEL: Record<string, string> = {
  membership: "Pro Player Membership",
  career_support: "Career Support",
  unbekannt: "nicht näher bezeichnet",
};

/** Letzter Tag des laufenden Monats — dann endet eine Mitgliedschaft. */
function endOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toLocaleDateString("de-DE", { dateStyle: "long" });
}

/**
 * Nimmt eine Kündigungserklärung über den gesetzlichen Kündigungsbutton
 * entgegen (§ 312k BGB).
 *
 * Bewusst ohne Anmeldung und ohne automatische Ausführung: Würde allein
 * anhand der E-Mail sofort gekündigt, könnte jeder fremde Verträge beenden.
 * Das Gesetz verlangt die sofortige Bestätigung des Eingangs und die
 * Wirksamkeit zum Erklärungsdatum — nicht die automatische Ausführung.
 */
export async function submitCancellation(
  _prev: CancellationState,
  formData: FormData
): Promise<CancellationState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const contractType = String(formData.get("contract_type") ?? "unbekannt");
  const contractHint = String(formData.get("contract_hint") ?? "").trim() || null;

  if (!firstName || !lastName || !email) {
    return { error: "Bitte gib Vorname, Nachname und E-Mail-Adresse an." };
  }

  const supabase = await createClient();

  // Über eine Datenbankfunktion statt direktem INSERT: Der Zeitstempel muss
  // zurückkommen, das Lesen der Tabelle ist aber dem Betreiber vorbehalten.
  const { data, error } = await supabase
    .rpc("submit_cancellation", {
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_contract_type: contractType,
      p_contract_hint: contractHint,
      p_message: String(formData.get("message") ?? "").trim() || null,
    })
    .single<{ request_id: string; received_at: string }>();

  if (error || !data) {
    const code = error?.message.match(/ALTIOR_([A-Z_]+)/)?.[1];
    if (code === "BAD_EMAIL") {
      return { error: "Diese E-Mail-Adresse sieht nicht gültig aus." };
    }
    if (code === "INCOMPLETE") {
      return { error: "Bitte gib Vorname, Nachname und E-Mail-Adresse an." };
    }
    return {
      error:
        "Die Kündigung konnte nicht entgegengenommen werden. Bitte schreib an kontakt@altior.football — auch das ist eine wirksame Kündigung.",
    };
  }

  // Die Bestätigung in Textform ist gesetzlich verlangt (§ 312k Abs. 4 BGB).
  // Scheitert sie, bleibt die Kündigung trotzdem wirksam — der Fehlschlag
  // wird aber festgehalten, damit er nicht still verschwindet.
  const mail = await mailCancellationReceived({
    to: email,
    firstName,
    lastName,
    contractLabel: CONTRACT_LABEL[contractType] ?? CONTRACT_LABEL.unbekannt,
    contractHint,
    receivedAt: data.received_at,
    effectiveOn: contractType === "membership" ? endOfMonth() : null,
  });

  await adminDb().rpc("mark_cancellation_confirmed", {
    p_id: data.request_id,
    p_error: mail.sent ? null : (mail.error ?? "unbekannter Fehler"),
  });

  return { receivedAt: data.received_at, confirmationSent: mail.sent };
}
