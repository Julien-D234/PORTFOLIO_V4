import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { listPublishedGames } from "@/server/games/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.games.title, description: dict.games.subtitle };
}

export default async function GamesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const games = await listPublishedGames(getDb(), lang);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-24px">{dict.games.title}</h1>
      <p className="text-14px" style={{ color: "var(--mut)" }}>
        {dict.games.subtitle}
      </p>
      {games.length === 0 ? (
        <p className="text-14px" style={{ color: "var(--mut)" }}>
          {dict.games.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {games.map((g) => (
            <li
              key={g.id}
              className="flex flex-col gap-2 border-2 border-(--ink) rounded-(--r) bg-(--card) p-4 shadow-[4px_4px_0_var(--shadow-c)]"
            >
              <h2 className="text-18px">{g.title}</h2>
              {g.summary ? (
                <p className="text-14px" style={{ color: "var(--mut)" }}>
                  {g.summary}
                </p>
              ) : null}
              <Link href={`/${lang}/games/${g.slug}`} className="btn self-start">
                {dict.games.play} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
