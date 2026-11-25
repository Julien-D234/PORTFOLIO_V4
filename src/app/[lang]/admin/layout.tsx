import Link from "next/link";
import type { ReactNode } from "react";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/server/guards";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  await requireAdmin();
  const dict = await getDictionary(lang);
  const nav = dict.admin.nav;
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-3 py-1 text-15px shadow-[4px_4px_0_var(--shadow-c)]"
      style={{ color: "var(--txt)" }}
    >
      {label}
    </Link>
  );
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 p-6">
      <nav className="flex flex-wrap gap-2">
        {link(`/${lang}/admin`, nav.dashboard)}
        {link(`/${lang}/admin/users`, nav.users)}
        {link(`/${lang}/admin/projects`, nav.projects)}
        {link(`/${lang}/admin/games`, nav.games)}
        {link(`/${lang}/admin/audit`, nav.audit)}
        {link(`/${lang}/profile`, nav.profile)}
      </nav>
      {children}
    </main>
  );
}
