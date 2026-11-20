import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getDictionary } from "@/i18n/dictionaries";
import { safeRedirect } from "@/lib/auth-forms";
import { isLocale } from "@/lib/locale";
import { getSessionUser } from "@/server/guards";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const redirectTo = safeRedirect(typeof sp.redirect === "string" ? sp.redirect : undefined, `/${lang}`);
  const user = await getSessionUser();
  if (user) redirect(redirectTo);
  const dict = await getDictionary(lang);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <LoginForm labels={dict.auth.login} lang={lang} redirectTo={redirectTo} />
    </main>
  );
}
