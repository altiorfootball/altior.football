"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type GrantState = { error?: string; ok?: string };

export async function grantMembership(
  _prev: GrantState,
  formData: FormData
): Promise<GrantState> {
  await requireAdmin();
  const supabase = await createClient();

  const playerId = String(formData.get("player_id") ?? "");
  const plan = String(formData.get("plan") ?? "");

  if (!playerId || !plan) {
    return { error: "Bitte wähle Spieler und Stufe." };
  }

  const { error } = await supabase.rpc("grant_membership", {
    p_player_id: playerId,
    p_plan: plan,
  });

  if (error) {
    const code = error.message.match(/ALTIOR_([A-Z_]+)/)?.[1];
    switch (code) {
      case "ALREADY_MEMBER":
        return { error: "Dieser Spieler hat bereits ein aktives Membership." };
      case "PLAN_FULL":
        return { error: "Diese Stufe ist ausgebucht — alle Plätze sind vergeben." };
      case "NO_PLAN":
        return { error: "Diese Stufe gibt es nicht." };
      case "FORBIDDEN":
        return { error: "Dafür fehlen dir die Rechte." };
      default:
        return { error: "Das Membership konnte nicht vergeben werden." };
    }
  }

  revalidatePath("/admin/mitglieder");
  return { ok: "Membership vergeben. Das Kontingent für diesen Monat steht bereit." };
}

/**
 * Markiert eine Kündigung als bearbeitet. Der Eingangszeitpunkt bleibt
 * unverändert — er ist für die Wirksamkeit maßgeblich, nicht die Bearbeitung.
 */
export async function markProcessed(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await supabase
    .from("cancellation_requests")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/mitglieder");
}
