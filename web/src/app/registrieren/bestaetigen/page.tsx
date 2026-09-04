import Link from "next/link";
import { Mark } from "@/components/Mark";

export const metadata = { title: "E-Mail bestätigen" };

export default async function BestaetigenPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Mark size={40} />
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        Prüf kurz dein Postfach
      </h1>
      <p className="text-ink-soft">
        Wir haben eine Bestätigungsmail
        {email ? (
          <>
            {" "}
            an <span className="font-medium text-ink">{email}</span>
          </>
        ) : null}{" "}
        geschickt. Klick auf den Link darin — danach legst du dein Spielerprofil
        an.
      </p>
      <p className="text-sm text-ink-soft">
        Nichts angekommen? Schau im Spam-Ordner nach. Die Mail kann ein paar
        Minuten brauchen.
      </p>
      <div className="border-t border-line pt-6">
        <Link href="/anmelden" className="text-sm text-pitch underline">
          Zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
