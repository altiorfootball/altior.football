"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type BookingResult = { error?: string; ok?: string };

/**
 * Übersetzt die Fehlerkennungen der Datenbankfunktionen in Sätze, die ein
 * Spieler versteht. Die Kennung steht vorn, damit die Zuordnung nicht an
 * Formulierungen hängt.
 */
function translate(message: string): string {
  const code = message.match(/ALTIOR_([A-Z_]+)/)?.[1];

  switch (code) {
    case "NO_PLAYER":
      return "Für dein Konto gibt es noch kein Spielerprofil. Lege es zuerst an.";
    case "NO_CONSENT":
      return "Für Spieler unter 18 Jahren fehlt die Zustimmung eines Elternteils. Ergänze sie in deinem Profil.";
    case "NO_SESSION":
      return "Diesen Termin gibt es nicht mehr.";
    case "CANCELLED":
      return "Dieser Termin findet nicht statt.";
    case "TOO_LATE":
      return "Dieser Termin ist nicht mehr buchbar — Buchungsschluss ist zwei Stunden vor Beginn.";
    case "ALREADY_BOOKED":
      return "Du hast diesen Termin bereits gebucht.";
    case "FULL_GK":
      return "Die Torhüterplätze sind belegt. Du kannst auf die Warteliste.";
    case "FULL_FIELD":
      return "Die Feldspielerplätze sind belegt. Du kannst auf die Warteliste.";
    case "NEEDS_PAYMENT":
      return "Dein Monatskontingent ist aufgebraucht. Einzelbuchungen sind bald möglich.";
    case "NOT_FOUND":
      return "Diese Buchung gibt es nicht.";
    case "NOT_CONFIRMED":
      return "Diese Buchung ist bereits storniert.";
    default:
      return "Das hat nicht geklappt. Versuche es bitte erneut.";
  }
}

export async function bookSession(
  _prev: BookingResult,
  formData: FormData
): Promise<BookingResult> {
  const supabase = await createClient();
  const sessionId = String(formData.get("session_id") ?? "");

  const { error } = await supabase.rpc("book_training_session", {
    p_session_id: sessionId,
  });

  if (error) return { error: translate(error.message) };

  revalidatePath("/termine");
  return { ok: "Gebucht. Du bekommst gleich eine Bestätigung." };
}

export async function cancelBooking(
  _prev: BookingResult,
  formData: FormData
): Promise<BookingResult> {
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id") ?? "");

  const { data, error } = await supabase.rpc("cancel_training_booking", {
    p_booking_id: bookingId,
  });

  if (error) return { error: translate(error.message) };

  revalidatePath("/termine");

  // Die Meldung wandert in die Adresse statt in den Zustand des Buttons:
  // Nach dem Stornieren verschwindet die Schaltfläche und hätte ihre eigene
  // Meldung mitgenommen. Gerade der Unterschied zwischen zurückgebuchtem und
  // verfallenem Kontingent darf dem Spieler nicht entgehen.
  redirect(
    data === "cancelled_late" ? "/termine?storno=verfallen" : "/termine?storno=zurueck"
  );
}

export async function joinWaitlist(
  _prev: BookingResult,
  formData: FormData
): Promise<BookingResult> {
  const supabase = await createClient();
  const sessionId = String(formData.get("session_id") ?? "");

  const { error } = await supabase.rpc("join_waitlist", {
    p_session_id: sessionId,
  });

  if (error) return { error: translate(error.message) };

  revalidatePath("/termine");
  return { ok: "Du stehst auf der Warteliste. Wir melden uns, wenn ein Platz frei wird." };
}
