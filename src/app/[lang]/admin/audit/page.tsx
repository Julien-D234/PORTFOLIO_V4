import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { listAudit, listAuditActions } from "@/server/admin/queries";
import { requireAdmin } from "@/server/guards";

export default async function AdminAuditPage({
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
  const action = typeof sp.action === "string" && sp.action !== "" ? sp.action : undefined;
  const targetId = typeof sp.target === "string" && sp.target !== "" ? sp.target : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const [data, actions] = await Promise.all([listAudit({ action, targetId, page }), listAuditActions()]);
  const a = dict.admin.audit;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{a.title}</h1>
      <form method="get" className="flex gap-2 text-13px">
        <select name="action" defaultValue={action ?? ""} className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1">
          <option value="">{a.all}</option>
          {actions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
        <input
          name="target"
          defaultValue={targetId ?? ""}
          placeholder={a.target}
          className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1"
        />
        <button type="submit" className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1">
          OK
        </button>
      </form>
      {data.rows.length === 0 ? (
        <p className="text-13px">{a.empty}</p>
      ) : (
        <table className="w-full border-2 border-(--ink) rounded-(--r) bg-(--card) text-13px shadow-[4px_4px_0_var(--shadow-c)]">
          <thead>
            <tr className="text-left">
              <th className="p-2">{a.date}</th>
              <th className="p-2">{a.action}</th>
              <th className="p-2">{a.actor}</th>
              <th className="p-2">{a.target}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-(--line)">
                <td className="p-2">{r.createdAt.toISOString()}</td>
                <td className="p-2">{r.action}</td>
                <td className="p-2">{r.actorId ?? "—"}</td>
                <td className="p-2">{r.targetId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
