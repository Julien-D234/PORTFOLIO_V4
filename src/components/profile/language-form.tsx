"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";

type Labels = Messages["profile"];

export function LanguageForm({ lang, current, labels }: { lang: string; current: string; labels: Labels }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const btn =
    "border-2 border-(--ink) rounded-(--r) bg-(--card) px-3 py-1 text-14px shadow-[4px_4px_0_var(--shadow-c)] disabled:opacity-60";

  async function choose(locale: Locale) {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        const code = data?.error ?? "INTERNAL";
        setError((labels.errors as Record<string, string>)[code] ?? code);
        setLoading(false);
        return;
      }
      if (locale !== lang) router.push(`/${locale}/profile`);
      else router.refresh();
    } catch {
      setError(labels.errors.INTERNAL);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-13px" style={{ color: "var(--mut)" }}>
        {labels.language.hint} — {labels.language.current} : <strong>{current}</strong>
      </p>
      <div className="flex gap-2">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            className={btn}
            disabled={loading}
            aria-pressed={locale === current}
            style={locale === current ? { background: "var(--hl)", color: "var(--on-hl)" } : undefined}
            onClick={() => choose(locale)}
          >
            {labels.language[locale]}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-13px" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
