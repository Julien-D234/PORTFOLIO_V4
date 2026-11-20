import { notFound } from "next/navigation";
import { WelcomeForm } from "@/components/welcome-form";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";

export default async function WelcomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <WelcomeForm labels={dict.welcome} lang={lang} />
    </main>
  );
}
