"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Messages } from "@/i18n/dictionaries";
import { isPasswordPolicyOk } from "@/lib/password-policy";

type Labels = Messages["welcome"];

function tokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/#token=([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function WelcomeForm({ labels, lang }: { labels: Labels; lang: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const token = tokenFromHash();
    if (!token) {
      setError(labels.errors.invalidLink);
      return;
    }
    if (password !== confirm) {
      setError(labels.errors.mismatch);
      return;
    }
    if (!isPasswordPolicyOk(password)) {
      setError(labels.errors.passwordPolicy);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/welcome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        window.history.replaceState(null, "", window.location.pathname);
        router.push(`/${lang}`);
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (data?.error === "PASSWORD_POLICY") setError(labels.errors.passwordPolicy);
      else if (data?.error === "RATE_LIMITED") setError(labels.errors.rateLimited);
      else setError(labels.errors.invalidLink);
    } catch {
      setError(labels.errors.network);
    }
    setLoading(false);
  }

  const field = "border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-2 text-15px";

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4 border-2 border-(--ink) rounded-(--r) bg-(--card) p-6 shadow-[4px_4px_0_var(--shadow-c)]">
      <h1 className="text-18px">{labels.title}</h1>
      <label className="flex flex-col gap-1 text-13px">
        {labels.password}
        <input name="password" type="password" autoComplete="new-password" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {labels.confirm}
        <input name="confirm" type="password" autoComplete="new-password" required className={field} />
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
