"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/checkout";
import {
  mailBookingConfirmed,
  mailBookingCancelled,
} from "@/lib/email/templates";

/**
 * Holt Empfaenger und Termindaten fuer die Bestaetigungsmail.
 *
 * Ueber den vollen Zugriff, weil die Mail auch dann rausgehen soll, wenn der
 * Zeilenschutz einzelne Felder verbergen wuerde.
 */
async function bookingMailData(bookingId: string) {
  const { data } = await adminDb()
    .from("training_bookings")
    .select(
      "training_sessions(starts_at, location), players(profiles(email, first_name))"
    )
    .eq("id", bookingId)
    .single<{
      training_sessions: { starts_at: string; location: string } | null;
      players: { profiles: { email: string; first_name: string | null } | null } | null;
    }>();

  const email = data?.players?.profiles?.email;
  const session = data?.training_sessions;
  if (!email || !session) return null;

  return {
    email,
    firstName: data?.players?.profiles?.first_name ?? null,
    startsAt: session.starts_at,
    location: session.location,
  };
}

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

  const { data: bookingId, error } = await supabase.rpc(
    "book_training_session",
    { p_session_id: sessionId }
  );

  if (error) return { error: translate(error.message) };

  // Der Versand darf die Buchung nicht kippen: Wer gebucht hat, ist gebucht,
  // auch wenn die Bestaetigung haengen bleibt.
  if (bookingId) {
    const m = await bookingMailData(bookingId as string);
    if (m) {
      await mailBookingConfirmed({
        to: m.email,
        firstName: m.firstName,
        startsAt: m.startsAt,
        location: m.location,
        paid: false,
      });
    }
  }

  revalidatePath("/termine");
  return { ok: "Gebucht. Du bekommst gleich eine Bestätigung." };
}

export async function cancelBooking(
  _prev: BookingResult,
  formData: FormData
): Promise<BookingResult> {
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id") ?? "");

  // Termindaten vor dem Stornieren holen — danach ist die Zuordnung
  // umstaendlicher.
  const mailData = await bookingMailData(bookingId);

  const { data, error } = await supabase.rpc("cancel_training_booking", {
    p_booking_id: bookingId,
  });

  if (error) return { error: translate(error.message) };

  if (mailData) {
    await mailBookingCancelled({
      to: mailData.email,
      firstName: mailData.firstName,
      startsAt: mailData.startsAt,
      inTime: data === "cancelled_in_time",
    });
  }

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
