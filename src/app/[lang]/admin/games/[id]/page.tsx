import { notFound } from "next/navigation";
import { GameEditor, type GameEditorInitial } from "@/components/admin/game-editor";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getGameAdmin } from "@/server/games/queries";

export default async function AdminGamePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  const game = await getGameAdmin(getDb(), id);
  if (!game) notFound();
  const initial: GameEditorInitial = {
    gameId: game.id,
    slug: game.slug,
    kind: game.kind === "internal" ? "internal" : "iframe",
    status: game.status === "published" ? "published" : "draft",
    url: game.url ?? "",
    module: game.module ?? "",
    titleFr: game.title.fr ?? "",
    titleEn: game.title.en ?? "",
    summaryFr: game.summary.fr ?? "",
    summaryEn: game.summary.en ?? "",
    position: game.position,
    maxScore: game.limits.maxScore?.toString() ?? "",
    maxSessionSec: game.limits.maxSessionSec?.toString() ?? "",
    maxPayloadBytes: game.limits.maxPayloadBytes?.toString() ?? "",
    maxStatsPerMin: game.limits.maxStatsPerMin?.toString() ?? "",
    hasApiKey: game.hasApiKey,
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{dict.admin.games.editor.titleEdit}</h1>
      <GameEditor lang={lang} labels={dict.admin.games.editor} listPath={`/${lang}/admin/games`} initial={initial} />
    </div>
  );
}
