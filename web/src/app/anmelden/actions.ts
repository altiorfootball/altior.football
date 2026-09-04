"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte gib E-Mail und Passwort ein." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Bewusst ohne Unterscheidung, ob die E-Mail existiert — sonst ließe sich
    // darüber herausfinden, wer hier ein Konto hat.
    return { error: "E-Mail oder Passwort stimmen nicht." };
  }

  redirect("/profil");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
