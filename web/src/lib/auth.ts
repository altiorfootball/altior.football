import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sichert eine Seite gegen Zugriff ohne Anmeldung ab und gibt Konto und
 * Profil zurück.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/anmelden");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

/**
 * Sichert eine Seite gegen Zugriff durch Nicht-Administratoren ab.
 *
 * Die Prüfung hier ist die Bequemlichkeit — die eigentliche Absicherung
 * steht im Zeilenschutz der Datenbank. Auch wenn diese Prüfung fehlte,
 * bekäme ein Spieler über die API keine fremden Daten.
 */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== "admin") redirect("/profil");
  return ctx;
}
