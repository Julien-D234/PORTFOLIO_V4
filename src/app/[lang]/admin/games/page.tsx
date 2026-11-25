import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { listGamesAdmin } from "@/server/games/queries";

export default async function AdminGamesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  const l = dict.admin.games.list;
  const games = await listGamesAdmin(getDb());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-18px">{l.title}</h1>
        <Link
          href={`/${lang}/admin/games/new`}
          className="border-2 border-(--ink) rounded-(--r) bg-(--acc) px-3 py-1 text-15px"
          style={{ color: "var(--on-acc)" }}
        >
          + {l.new}
        </Link>
      </div>
      {games.length === 0 ? (
        <p className="text-14px" style={{ color: "var(--mut)" }}>
          {l.empty}
        </p>
      ) : (
        <table className="w-full border-2 border-(--ink) rounded-(--r) bg-(--card) text-13px shadow-[4px_4px_0_var(--shadow-c)]">
          <thead>
            <tr className="text-left">
              <th className="p-2">{l.slug}</th>
              <th className="p-2">{l.kind}</th>
              <th className="p-2">{l.status}</th>
              <th className="p-2">{l.position}</th>
              <th className="p-2">{l.updated}</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} className="border-t border-(--line)">
                <td className="p-2">
                  <code>{g.slug}</code>
                </td>
                <td className="p-2">{g.kind === "iframe" ? l.iframe : l.internal}</td>
                <td className="p-2">{g.status === "published" ? l.published : l.draft}</td>
                <td className="p-2">{g.position}</td>
                <td className="p-2">{g.updatedAt.toISOString().slice(0, 10)}</td>
                <td className="p-2">
                  <Link href={`/${lang}/admin/games/${g.id}`} style={{ color: "var(--acc)" }}>
                    {l.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
