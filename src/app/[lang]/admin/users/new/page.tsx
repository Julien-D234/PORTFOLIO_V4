import { notFound } from "next/navigation";
import { NewUserForm } from "@/components/admin/new-user-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireAdmin } from "@/server/guards";

export default async function AdminNewUserPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireAdmin();
  const dict = await getDictionary(lang);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-18px">{dict.admin.users.new.title}</h1>
      <NewUserForm labels={dict.admin.users.new} lang={lang} />
    </div>
  );
}
