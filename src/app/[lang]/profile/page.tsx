import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { LanguageForm } from "@/components/profile/language-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireUser } from "@/server/guards";
import { getDb } from "@/server/db";
import { getUserGameStats } from "@/server/games/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.profile.title };
}

export default async function ProfilePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser();
  const dict = await getDictionary(lang);
  const p = dict.profile;
  const gameStats = await getUserGameStats(getDb(), user.id, lang);
  const card = "border-2 border-(--ink) rounded-(--r) bg-(--card) p-4 shadow-[4px_4px_0_var(--shadow-c)]";
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-24px">{p.title}</h1>

      <section className={`${card} flex flex-col gap-2`}>
        <h2 className="text-18px">{p.account.title}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-14px">
          <dt style={{ color: "var(--mut)" }}>{p.account.name}</dt>
          <dd className="m-0">{user.name}</dd>
          <dt style={{ color: "var(--mut)" }}>{p.account.email}</dt>
          <dd className="m-0">{user.email}</dd>
          <dt style={{ color: "var(--mut)" }}>{p.account.role}</dt>
          <dd className="m-0">{user.role ?? "user"}</dd>
          <dt style={{ color: "var(--mut)" }}>{p.account.created}</dt>
          <dd className="m-0">
            <time dateTime={user.createdAt.toISOString()}>{user.createdAt.toISOString().slice(0, 10)}</time>
          </dd>
        </dl>
      </section>

      <section className={`${card} flex flex-col gap-2`}>
        <h2 className="text-18px">{p.language.title}</h2>
        <LanguageForm lang={lang} current={user.locale ?? lang} labels={p} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-18px">{p.password.title}</h2>
        <ChangePasswordForm labels={dict.auth.changePassword} lang={lang} redirectTo={`/${lang}/profile`} />
      </section>

      <section className={`${card} flex flex-col gap-2`}>
        <h2 className="text-18px">{p.stats.title}</h2>
        {gameStats.length === 0 ? (
          <p className="text-14px" style={{ color: "var(--mut)" }}>
            {p.stats.empty}
          </p>
        ) : (
          <table className="w-full text-13px">
            <thead>
              <tr className="text-left">
                <th className="p-1">{p.stats.game}</th>
                <th className="p-1">{p.stats.best}</th>
                <th className="p-1">{p.stats.sessions}</th>
                <th className="p-1">{p.stats.last}</th>
              </tr>
            </thead>
            <tbody>
              {gameStats.map((s) => (
                <tr key={s.gameId} className="border-t border-(--line)">
                  <td className="p-1">
                    <a href={`/${lang}/games/${s.slug}`} style={{ color: "var(--acc)" }}>
                      {s.title}
                    </a>
                  </td>
                  <td className="p-1">{s.bestScore}</td>
                  <td className="p-1">{s.sessions}</td>
                  <td className="p-1">
                    {s.lastPlayedAt ? <time dateTime={s.lastPlayedAt.toISOString()}>{s.lastPlayedAt.toISOString().slice(0, 10)}</time> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
