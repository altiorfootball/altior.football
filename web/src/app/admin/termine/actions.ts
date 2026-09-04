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
  if (weekdays.length === 0) {
    return { error: "Wähle mindestens einen Wochentag." };
  }

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (end < start) {
    return { error: "Das Enddatum liegt vor dem Startdatum." };
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days > 366) {
    return { error: "Bitte lege höchstens ein Jahr auf einmal an." };
  }

  const { data: price } = await supabase
    .from("prices")
    .select("id, products!inner(key)")
    .eq("products.key", "training")
    .eq("audience", "standard")
    .is("valid_to", null)
    .limit(1)
    .maybeSingle();

  const wanted = new Set(weekdays.map(Number));
  const rows: {
    starts_at: string;
    duration_minutes: number;
    location: string;
    field_capacity: number;
    gk_capacity: number;
    price_id: string | null;
  }[] = [];

  for (let i = 0; i <= days; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    if (!wanted.has(day.getDay())) continue;

    const [hh, mm] = time.split(":").map(Number);
    // Termine werden in deutscher Ortszeit gedacht und als Zeitpunkt
    // gespeichert — sonst verschiebt sich alles bei der Zeitumstellung.
    const local = new Date(day);
    local.setHours(hh, mm, 0, 0);

    rows.push({
      starts_at: local.toISOString(),
      duration_minutes: duration,
      location,
      field_capacity: fieldCapacity,
      gk_capacity: gkCapacity,
      price_id: price?.id ?? null,
    });
  }

  if (rows.length === 0) {
    return { error: "Im gewählten Zeitraum liegt kein passender Wochentag." };
  }

  // Bereits belegte Zeitpunkte auslassen. Zwei Trainings zur selben Zeit kann
  // niemand leiten — und ohne diese Prüfung entstünden Doppel, sobald eine
  // Serie über bestehende Termine gelegt wird.
  const { data: existing } = await supabase
    .from("training_sessions")
    .select("starts_at")
    .gte("starts_at", rows[0].starts_at)
    .lte("starts_at", rows[rows.length - 1].starts_at)
    .neq("status", "cancelled");

  const taken = new Set(
    (existing ?? []).map((e) => new Date(e.starts_at).getTime())
  );
  const fresh = rows.filter((r) => !taken.has(new Date(r.starts_at).getTime()));
  const skipped = rows.length - fresh.length;

  if (fresh.length === 0) {
    return {
      error:
        "Zu allen diesen Zeitpunkten gibt es bereits Termine. Es wurde nichts angelegt.",
    };
  }

  const { error } = await supabase.from("training_sessions").insert(fresh);
  if (error) {
    return { error: "Die Termine konnten nicht angelegt werden." };
  }

  revalidatePath("/admin/termine");
  revalidatePath("/termine");
  return { created: fresh.length, skipped };
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
