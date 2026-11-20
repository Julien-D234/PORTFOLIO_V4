"use client";

import { useState, type FormEvent } from "react";
import type { Messages } from "@/i18n/dictionaries";
import { isValidEmail } from "@/lib/auth-forms";

type Labels = Messages["admin"]["users"]["new"];

export function NewUserForm({ labels, lang }: { labels: Labels; lang: string }) {
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLink(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();
    if (!isValidEmail(email) || !name) {
      setError(labels.error);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?lang=${lang}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = (await res.json().catch(() => null)) as { link?: string; error?: string } | null;
      if (!res.ok || !data?.link) {
        setError(labels.error);
      } else {
        setLink(data.link);
      }
    } catch {
      setError(labels.error);
    }
    setLoading(false);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const field = "border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-2 text-15px";

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-13px">
        {labels.email}
        <input name="email" type="email" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {labels.name}
        <input name="name" required className={field} />
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
      {link ? (
        <div className="flex flex-col gap-2 border-2 border-(--ink) rounded-(--r) bg-(--card) p-3 text-13px shadow-[4px_4px_0_var(--shadow-c)]">
          <span>{labels.linkLabel}</span>
          <code className="break-all">{link}</code>
          <button
            type="button"
            onClick={copy}
            className="self-start border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px shadow-[4px_4px_0_var(--shadow-c)]"
          >
            {copied ? labels.copied : labels.copy}
          </button>
        </div>
      ) : null}
    </form>
  );
}
