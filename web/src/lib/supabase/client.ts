import { createBrowserClient } from "@supabase/ssr";

/** Supabase-Zugriff aus Client-Komponenten. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
