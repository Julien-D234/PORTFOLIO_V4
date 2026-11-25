import { notFound } from "next/navigation";
import { GameEditor } from "@/components/admin/game-editor";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireAdmin } from "@/server/guards";

export default async function AdminNewGamePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{dict.admin.games.editor.titleNew}</h1>
      <GameEditor lang={lang} labels={dict.admin.games.editor} listPath={`/${lang}/admin/games`} />
    </div>
  );
}
