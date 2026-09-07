"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MembershipState = { error?: string };

function translate(message: string): string {
  const code = message.match(/ALTIOR_([A-Z_]+)/)?.[1];
  switch (code) {
    case "NO_PLAYER":
      return "Für dein Konto gibt es noch kein Spielerprofil.";
    case "NO_MEMBERSHIP":
      return "Du hast kein aktives Membership.";
    case "CANCELLED_MEMBERSHIP":
      return "Dein Membership ist bereits gekündigt. Ein Wechsel ist dann nicht mehr möglich.";
    case "NO_PLAN":
      return "Diese Stufe gibt es nicht.";
    case "SAME_PLAN":
      return "Du bist bereits in dieser Stufe.";
    case "PLAN_FULL":
      return "Diese Stufe ist derzeit ausgebucht.";
    default:
      return "Das hat nicht geklappt. Versuche es bitte erneut.";
  }
}

export async function changePlan(
  _prev: MembershipState,
  formData: FormData
): Promise<MembershipState> {
  const supabase = await createClient();
  const plan = String(formData.get("plan") ?? "");

  const { data, error } = await supabase.rpc("change_membership_plan", {
    p_new_plan: plan,
  });

  if (error) return { error: translate(error.message) };

  revalidatePath("/mitgliedschaft");
  redirect(
    data === "sofort"
      ? "/mitgliedschaft?wechsel=sofort"
      : "/mitgliedschaft?wechsel=monatsende"
  );
}

export async function cancelMembership(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_membership");

  if (error) redirect("/mitgliedschaft?fehler=1");

  revalidatePath("/mitgliedschaft");
  redirect("/mitgliedschaft?gekuendigt=1");
}
