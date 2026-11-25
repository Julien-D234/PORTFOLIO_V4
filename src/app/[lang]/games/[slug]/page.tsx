import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameLauncher } from "@/components/games/launcher";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/guards";
import { startSession } from "@/server/games/mutations";
import { getPublishedGame } from "@/server/games/queries";
import { pickLocaleText } from "@/server/projects/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const game = await getPublishedGame(getDb(), slug);
  if (!game) return {};
  return { title: pickLocaleText(game.title, lang) ?? game.slug };
}

export default async function GamePage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser();
  const dict = await getDictionary(lang);
  const db = getDb();
  const game = await getPublishedGame(db, slug);
  if (!game) notFound();
  const title = pickLocaleText(game.title, lang) ?? game.slug;
  const started = await startSession(db, game.id, user.id);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 p-6">
      <Link href={`/${lang}/games`} className="text-13px" style={{ color: "var(--acc)" }}>
        ← {dict.games.back}
      </Link>
      <h1 className="text-24px">{title}</h1>
      <p className="text-13px" style={{ color: "var(--mut)" }}>
        {dict.games.hint}
      </p>
      <GameLauncher kind={game.kind} url={game.url} module={game.module} token={started.token} labels={dict.games} />
    </div>
  );
}
