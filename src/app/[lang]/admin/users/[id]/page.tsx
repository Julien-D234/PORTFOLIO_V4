import { notFound } from "next/navigation";
import { UserActions } from "@/components/admin/user-actions";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getUserWithSessions } from "@/server/admin/queries";
import { requireAdmin } from "@/server/guards";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const current = await requireAdmin();
  const u = await getUserWithSessions(id);
  if (!u) notFound();
  const dict = await getDictionary(lang);
  const d = dict.admin.users.detail;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">
        {d.title} — {u.email}
      </h1>
      <p className="text-13px" style={{ color: "var(--mut)" }}>
        {u.name} · {u.role} · {u.createdAt.toISOString()}
      </p>
      <h2 className="text-15px">{d.sessions}</h2>
      {u.sessions.length === 0 ? (
        <p className="text-13px">{d.noSessions}</p>
      ) : (
        <ul className="text-13px">
          {u.sessions.map((s) => (
            <li key={s.id}>
              {s.createdAt.toISOString()} — {s.ipAddress ?? "—"} — {s.userAgent ?? "—"}
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-15px">{d.actions}</h2>
      {current.id === u.id ? (
        <p className="text-13px">{d.self}</p>
      ) : (
        <UserActions
          labels={dict.admin.users.actions}
          lang={lang}
          userId={u.id}
          email={u.email}
          isAdmin={(u.role ?? "").split(",").includes("admin")}
          banned={u.banned}
          locked={u.locked}
        />
      )}
    </div>
  );
}
