import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase-Zugriff aus Server-Komponenten.
 *
 * Nutzt den veröffentlichbaren Schlüssel. Welche Zeilen zurückkommen,
 * entscheidet ausschließlich der Zeilenschutz in der Datenbank — nicht
 * dieser Code. Ein Spieler sieht dadurch auch dann nur seine eigenen Daten,
 * wenn die Anwendung einen Fehler hätte.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // In Server-Komponenten ist Schreiben nicht erlaubt. Die
            // Sitzung wird dann von der Middleware aufgefrischt.
          }
        },
      },
    }
  );
}
