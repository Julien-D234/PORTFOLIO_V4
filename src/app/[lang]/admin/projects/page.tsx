import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireAdmin } from "@/server/guards";
import { listProjectsAdmin } from "@/server/projects/queries";
import { getDb } from "@/server/db";

export default async function AdminProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  const l = dict.admin.projects.list;
  const items = await listProjectsAdmin(getDb());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-18px">{l.title}</h1>
        <Link
          href={`/${lang}/admin/projects/new`}
          className="border-2 border-(--ink) rounded-(--r) bg-(--acc) px-3 py-1 text-15px"
          style={{ color: "var(--on-acc)" }}
        >
          + {l.new}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-14px" style={{ color: "var(--mut)" }}>
          {l.empty}
        </p>
      ) : (
        <table className="w-full border-2 border-(--ink) rounded-(--r) bg-(--card) text-13px shadow-[4px_4px_0_var(--shadow-c)]">
          <thead>
            <tr className="text-left">
              <th className="p-2">{l.slug}</th>
              <th className="p-2">{l.status}</th>
              <th className="p-2">{l.position}</th>
              <th className="p-2">{l.tags}</th>
              <th className="p-2">{l.updated}</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.project.id} className="border-t border-(--line)">
                <td className="p-2">
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover.thumbUrl}
                      alt=""
                      className="mr-2 inline-block h-8 w-12 rounded-(--r) border-2 border-(--ink) object-cover align-middle"
                    />
                  ) : null}
                  <code>{item.project.slug}</code>
                </td>
                <td className="p-2">
                  {item.project.status === "published" ? l.published : l.draft}
                </td>
                <td className="p-2">{item.project.position}</td>
                <td className="p-2">{item.tags.join(", ")}</td>
                <td className="p-2">{item.project.updatedAt.toISOString().slice(0, 10)}</td>
                <td className="p-2">
                  <Link href={`/${lang}/admin/projects/${item.project.id}`} style={{ color: "var(--acc)" }}>
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
