"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Messages } from "@/i18n/dictionaries";

type Labels = Messages["auth"]["signOut"];

export function SignOutButton({ labels, lang }: { labels: Labels; lang: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      router.push(`/${lang}`);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-3 py-2 text-15px shadow-[4px_4px_0_var(--shadow-c)] disabled:opacity-60"
      style={{ color: "var(--txt)" }}
    >
      {labels.label}
    </button>
  );
}
