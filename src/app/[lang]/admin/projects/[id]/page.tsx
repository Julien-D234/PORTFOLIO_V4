import { notFound } from "next/navigation";
import { ProjectEditor, type EditorInitial } from "@/components/admin/project-editor";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getProjectAdmin } from "@/server/projects/queries";
import { thumbUrl } from "@/server/projects/public";

export default async function AdminProjectPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  const detail = await getProjectAdmin(getDb(), id);
  if (!detail) notFound();
  const initial: EditorInitial = {
    projectId: detail.project.id,
    slug: detail.project.slug,
    status: detail.project.status as "draft" | "published",
    url: detail.project.url,
    repoUrl: detail.project.repoUrl,
    position: detail.project.position,
    coverMediaId: detail.project.coverMediaId,
    coverThumbUrl: detail.cover ? thumbUrl(detail.cover.id) : null,
    tags: detail.tags.map((t) => t.name).join(", "),
    translations: {
      fr: { title: "", summary: "", description: "", coverAlt: "" },
      en: { title: "", summary: "", description: "", coverAlt: "" },
    },
    gallery: detail.gallery.map((g) => ({
      mediaId: g.mediaId,
      thumbUrl: thumbUrl(g.mediaId),
      alt: { fr: g.alt.fr ?? "", en: g.alt.en ?? "" },
      caption: { fr: g.caption.fr ?? "", en: g.caption.en ?? "" },
    })),
  };
  for (const t of detail.translations) {
    initial.translations[t.locale as "fr" | "en"] = {
      title: t.title,
      summary: t.summary,
      description: t.description,
      coverAlt: t.coverAlt ?? "",
    };
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{dict.admin.projects.editor.titleEdit}</h1>
      <ProjectEditor
        lang={lang}
        labels={dict.admin.projects.editor}
        listPath={`/${lang}/admin/projects`}
        initial={initial}
      />
    </div>
  );
}
