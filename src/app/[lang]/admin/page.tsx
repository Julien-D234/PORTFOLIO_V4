import Link from "next/link";
import { notFound } from "next/navigation";
import { countUsers, listAudit } from "@/server/admin/queries";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireAdmin } from "@/server/guards";

export default async function AdminDashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  const users = await countUsers();
  const lastAudit = await listAudit({ perPage: 5 });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{dict.admin.dashboard.title}</h1>
      <p>
        {dict.admin.dashboard.usersCount} : <strong>{users}</strong>
      </p>
      <p>
        <Link href={`/${lang}/admin/audit`} style={{ color: "var(--acc)" }}>
          {dict.admin.dashboard.auditLink}
        </Link>
      </p>
      <ul className="text-13px" style={{ color: "var(--mut)" }}>
        {lastAudit.rows.map((r) => (
          <li key={r.id}>
            {r.createdAt.toISOString()} — {r.action} — {r.targetId ?? "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}
