import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-6 border-b border-line pb-4">
        <span className="eyebrow">Verwaltung</span>
        <nav className="flex gap-5 text-sm">
          <Link href="/admin" className="hover:text-pitch">
            Übersicht
          </Link>
          <Link href="/admin/termine" className="hover:text-pitch">
            Termine
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
