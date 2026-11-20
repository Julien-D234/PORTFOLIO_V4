import { notFound } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { requireUser } from "@/server/guards";

export default async function ChangePasswordPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireUser({ allowMustChangePassword: true });
  const dict = await getDictionary(lang);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <ChangePasswordForm labels={dict.auth.changePassword} lang={lang} />
    </main>
  );
}
