import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { listUsers } from "@/server/admin/queries";
import { requireAdmin } from "@/server/guards";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const { rows, total, perPage } = await listUsers({ search, page });
  const pages = Math.max(1, Math.ceil(total / perPage));
  const u = dict.admin.users;
  const statusOf = (r: (typeof rows)[number]) =>
    r.banned ? u.statusBanned : r.locked ? u.statusLocked : u.statusActive;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-18px">{u.title}</h1>
        <Link
          href={`/${lang}/admin/users/new`}
          className="border-2 border-(--ink) rounded-(--r) bg-(--acc) px-3 py-1 text-15px"
          style={{ color: "var(--on-acc)" }}
        >
          + {u.new.title}
        </Link>
      </div>
      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder={u.search}
          className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-15px"
        />
        <button
          type="submit"
          className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-3 py-1 text-15px shadow-[4px_4px_0_var(--shadow-c)]"
        >
          {u.search}
        </button>
      </form>
      <table className="w-full border-2 border-(--ink) rounded-(--r) bg-(--card) text-13px shadow-[4px_4px_0_var(--shadow-c)]">
        <thead>
          <tr className="text-left">
            <th className="p-2">{u.email}</th>
            <th className="p-2">{u.name}</th>
            <th className="p-2">{u.role}</th>
            <th className="p-2">{u.status}</th>
            <th className="p-2">{u.created}</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-(--line)">
              <td className="p-2">
                {r.email}
                {r.mustChangePassword ? ` (${u.mustChange})` : ""}
              </td>
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.role}</td>
              <td className="p-2">{statusOf(r)}</td>
              <td className="p-2">{r.createdAt.toISOString().slice(0, 10)}</td>
              <td className="p-2">
                <Link href={`/${lang}/admin/users/${r.id}`} style={{ color: "var(--acc)" }}>
                  {u.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 text-13px">
        {page > 1 ? (
          <Link href={`/${lang}/admin/users?q=${encodeURIComponent(search)}&page=${page - 1}`}>{u.prev}</Link>
        ) : null}
        <span>
          {u.page} {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={`/${lang}/admin/users?q=${encodeURIComponent(search)}&page=${page + 1}`}>{u.next}</Link>
        ) : null}
      </div>
    </div>
  );
}
