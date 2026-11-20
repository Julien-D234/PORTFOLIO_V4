import { notFound } from "next/navigation";
import { ProjectEditor } from "@/components/admin/project-editor";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireAdmin } from "@/server/guards";

export default async function AdminNewProjectPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{dict.admin.projects.editor.titleNew}</h1>
      <ProjectEditor lang={lang} labels={dict.admin.projects.editor} listPath={`/${lang}/admin/projects`} />
    </div>
  );
}
