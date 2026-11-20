"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Messages } from "@/i18n/dictionaries";
import { isValidEmail } from "@/lib/auth-forms";

type Labels = Messages["auth"]["login"];

export function LoginForm({ labels, lang, redirectTo }: { labels: Labels; lang: string; redirectTo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!isValidEmail(email)) {
      setError(labels.errors.validation);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const sessionRes = await fetch("/api/auth/get-session");
        const session = (await sessionRes.json().catch(() => null)) as { user?: { mustChangePassword?: boolean } } | null;
        if (session?.user?.mustChangePassword) {
          router.push(`/${lang}/change-password`);
        } else {
          router.push(redirectTo);
        }
        return;
      }
      if (res.status === 429) setError(labels.errors.rateLimited);
      else if (res.status === 401) setError(labels.errors.invalidCredentials);
      else if (res.status === 403) setError(labels.errors.unavailable);
      else setError(labels.errors.network);
    } catch {
      setError(labels.errors.network);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4 border-2 border-(--ink) rounded-(--r) bg-(--card) p-6 shadow-[4px_4px_0_var(--shadow-c)]">
      <h1 className="text-18px">{labels.title}</h1>
      <label className="flex flex-col gap-1 text-13px">
        {labels.email}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-2 text-15px"
        />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {labels.password}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-2 text-15px"
        />
      </label>
      {error ? (
        <p role="alert" className="text-13px" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="border-2 border-(--ink) rounded-(--r) bg-(--acc) px-3 py-2 text-15px disabled:opacity-60"
        style={{ color: "var(--on-acc)" }}
      >
        {loading ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
