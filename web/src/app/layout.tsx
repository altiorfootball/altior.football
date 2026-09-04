import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { Lockup, Mark } from "@/components/Mark";
import { brand } from "@/lib/brand";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.claim}`,
    template: `%s · ${brand.name}`,
  },
  description:
    "Individuelle Spielerentwicklung in Münster. Wir messen, wo du stehst — und in zwölf Wochen noch einmal.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className={`${plexSans.variable} ${plexMono.variable} font-sans`}>
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link href="/" aria-label={`${brand.name} Startseite`}>
              <Lockup />
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/termine" className="hover:text-pitch">
                Termine
              </Link>
              <Link href="/profil" className="hover:text-pitch">
                Mein Profil
              </Link>
              <Link
                href="/registrieren"
                className="border border-pitch px-4 py-1.5 text-pitch"
              >
                Registrieren
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>

        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Mark size={20} />
              <span className="text-sm text-ink-soft">
                {brand.name} · {brand.city}
              </span>
            </div>
            {/* Übersetzt den lateinischen Namen — kein zweiter Claim. */}
            <span className="eyebrow">{brand.nameGloss}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
