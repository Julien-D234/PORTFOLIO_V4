"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Messages } from "@/i18n/dictionaries";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-policy";

type Labels = Messages["auth"]["changePassword"];

export function ChangePasswordForm({ labels, lang }: { labels: Labels; lang: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("current") ?? "");
    const newPassword = String(fd.get("new") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (newPassword !== confirm) {
      setError(labels.errors.mismatch);
      return;
    }
    if (newPassword === currentPassword) {
      setError(labels.errors.same);
      return;
    }
    if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
      setError(labels.errors.policy);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
      });
      if (res.ok) {
        setSuccess(true);
        router.push(`/${lang}`);
        return;
      }
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      if (res.status === 429) setError(labels.errors.rateLimited);
      else if (res.status === 401 || body?.code === "INVALID_PASSWORD") setError(labels.errors.invalidCurrent);
      else if (body?.code === "PASSWORD_TOO_SHORT" || body?.code === "PASSWORD_TOO_LONG" || body?.code === "PASSWORD_POLICY") {
        setError(labels.errors.policy);
      } else setError(labels.errors.network);
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
        {labels.current}
        <input name="current" type="password" autoComplete="current-password" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {labels.new}
        <input name="new" type="password" autoComplete="new-password" required className={field} />
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
      {success ? (
        <p role="status" className="text-13px" style={{ color: "var(--ok)" }}>
          {labels.success}
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
