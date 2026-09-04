"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type SessionState = {
  error?: string;
  created?: number;
  /** Zeitpunkte, an denen schon ein Termin lag. */
  skipped?: number;
};

const WEEKDAYS = ["0", "1", "2", "3", "4", "5", "6"];

/**
 * Legt eine Serie von Trainingsterminen an.
 *
 * Bei vier Einheiten pro Woche wären das rund 17 Einzelformulare im Monat —
 * deshalb ist die Serie der Regelweg und die Einzelanlage nur ein Sonderfall
 * (Zeitraum von einem Tag, ein Wochentag).
 */
export async function createSessions(
  _prev: SessionState,
  formData: FormData
): Promise<SessionState> {
  await requireAdmin();
  const supabase = await createClient();

  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const time = String(formData.get("time") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const duration = Number(formData.get("duration_minutes") ?? 60);
  const fieldCapacity = Number(formData.get("field_capacity") ?? 8);
  const gkCapacity = Number(formData.get("gk_capacity") ?? 2);
  const weekdays = WEEKDAYS.filter((d) => formData.get(`weekday_${d}`) === "on");

  if (!from || !to || !time || !location) {
    return { error: "Zeitraum, Uhrzeit und Ort sind nötig." };
  }
  // Die Zeitrechnung liegt bewusst in der Datenbank: Die Uhrzeit ist als
  // deutsche Ortszeit gemeint. In JavaScript aus der Serverzeit gebaut, haenge
  // das Ergebnis davon ab, in welcher Zone der Server laeuft — auf Vercel ist
  // das UTC. Postgres rechnet ausserdem die Zeitumstellung korrekt um.
  const { data, error } = await supabase
    .rpc("create_training_series", {
      p_from: from,
      p_to: to,
      p_time: time,
      p_weekdays: weekdays.map(Number),
      p_location: location,
      p_duration: duration,
      p_field: fieldCapacity,
      p_gk: gkCapacity,
    })
    .single<{ angelegt: number; uebersprungen: number }>();

  if (error) {
    const code = error.message.match(/ALTIOR_([A-Z_]+)/)?.[1];
    switch (code) {
      case "BAD_RANGE":
        return { error: "Das Enddatum liegt vor dem Startdatum." };
      case "RANGE_TOO_LONG":
        return { error: "Bitte lege hoechstens ein Jahr auf einmal an." };
      case "NO_WEEKDAY":
        return { error: "Waehle mindestens einen Wochentag." };
      case "FORBIDDEN":
        return { error: "Dafuer fehlen dir die Rechte." };
      default:
        return { error: "Die Termine konnten nicht angelegt werden." };
    }
  }

  if (!data || data.angelegt === 0) {
    return {
      error:
        "Im gewaehlten Zeitraum wurde nichts angelegt — entweder liegt dort kein passender Wochentag oder es gibt bereits Termine zu diesen Zeiten.",
    };
  }

  revalidatePath("/admin/termine");
  revalidatePath("/termine");
  return { created: data.angelegt, skipped: data.uebersprungen };
}

export async function cancelSession(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  await supabase
    .from("training_sessions")
    .update({ status: "cancelled", cancellation_reason: reason })
    .eq("id", id);

  revalidatePath("/admin/termine");
  revalidatePath("/termine");
}

export async function deleteSession(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  // Nur löschen, solange niemand gebucht hat — sonst absagen statt löschen.
  const { count } = await supabase
    .from("training_bookings")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id)
    .eq("status", "confirmed");

  if ((count ?? 0) > 0) return;

  await supabase.from("training_sessions").delete().eq("id", id);
  revalidatePath("/admin/termine");
  revalidatePath("/termine");
}
