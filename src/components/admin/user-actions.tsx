"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Messages } from "@/i18n/dictionaries";

type Labels = Messages["admin"]["users"]["actions"];

type Props = {
  labels: Labels;
  lang: string;
  userId: string;
  email: string;
  isAdmin: boolean;
  banned: boolean;
  locked: boolean;
};

const DURATIONS = ["3600", "86400", "604800", "2592000", "0"] as const;

export function UserActions({ labels, lang, userId, email, isAdmin, banned, locked }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<(typeof DURATIONS)[number]>("86400");

  async function call(path: string, body: unknown, fallback: string): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.refresh();
        return true;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      const code = data?.error ?? "";
      if (code === "SELF_ACTION") setError(labels.errors.selfAction);
      else if (code === "LAST_ADMIN") setError(labels.errors.lastAdmin);
      else if (code === "RATE_LIMITED") setError(labels.errors.rateLimited);
      else if (code === "NOT_FOUND") setError(labels.errors.notFound);
      else if (code === "FORBIDDEN") setError(labels.errors.forbidden);
      else setError(fallback);
      return false;
    } catch {
      setError(labels.errors.network);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px shadow-[4px_4px_0_var(--shadow-c)] disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-13px">{labels.setRole}</label>
        <select
          disabled={busy}
          defaultValue={isAdmin ? "admin" : "user"}
          onChange={(e) => void call(`/api/auth/admin/set-role`, { userId, role: e.target.value }, labels.errors.network)}
          className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        {locked ? (
          <button type="button" disabled={busy} className={btn} onClick={() => void call(`/api/admin/users/${userId}/unlock`, {}, labels.errors.network)}>
            {labels.unlock}
          </button>
        ) : null}
        <button type="button" disabled={busy} className={btn} onClick={() => void call(`/api/auth/admin/revoke-user-sessions`, { userId }, labels.errors.network)}>
          {labels.revoke}
        </button>
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => void call(`/api/admin/users/${userId}/invitation?lang=${lang}`, {}, labels.errors.network)}
        >
          {labels.regenerate}
        </button>
        {banned ? (
          <button type="button" disabled={busy} className={btn} onClick={() => void call(`/api/auth/admin/unban-user`, { userId }, labels.errors.network)}>
            {labels.unban}
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <input
              placeholder={labels.banReason}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px"
            />
            <select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value as (typeof DURATIONS)[number])}
              className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {labels.durations[d]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              className={btn}
              onClick={() =>
                void call(
                  `/api/auth/admin/ban-user`,
                  { userId, banReason: banReason || undefined, banExpiresIn: Number(banDuration) || undefined },
                  labels.errors.network,
                )
              }
            >
              {labels.ban}
            </button>
          </span>
        )}
        <span className="flex items-center gap-1">
          <input
            placeholder={labels.confirmDelete}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px"
          />
          <button
            type="button"
            disabled={busy || confirmEmail !== email}
            className={btn}
            style={{ color: "var(--bad)" }}
            onClick={() => void call(`/api/auth/admin/remove-user`, { userId }, labels.errors.network)}
          >
            {labels.delete}
          </button>
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-13px" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
