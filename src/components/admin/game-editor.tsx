"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Messages } from "@/i18n/dictionaries";

type EditorLabels = Messages["admin"]["games"]["editor"];

export interface GameEditorInitial {
  gameId?: string;
  slug: string;
  kind: "iframe" | "internal";
  status: "draft" | "published";
  url: string;
  module: string;
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  position: number;
  maxScore: string;
  maxSessionSec: string;
  maxPayloadBytes: string;
  maxStatsPerMin: string;
  hasApiKey: boolean;
}

interface FormState {
  slug: string;
  kind: "iframe" | "internal";
  url: string;
  module: string;
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  position: number;
  maxScore: string;
  maxSessionSec: string;
  maxPayloadBytes: string;
  maxStatsPerMin: string;
}

function emptyForm(): FormState {
  return {
    slug: "",
    kind: "iframe",
    url: "",
    module: "",
    titleFr: "",
    titleEn: "",
    summaryFr: "",
    summaryEn: "",
    position: 0,
    maxScore: "",
    maxSessionSec: "",
    maxPayloadBytes: "",
    maxStatsPerMin: "",
  };
}

function formFrom(initial: GameEditorInitial): FormState {
  const { slug, kind, url, module, titleFr, titleEn, summaryFr, summaryEn, position, maxScore, maxSessionSec, maxPayloadBytes, maxStatsPerMin } = initial;
  return { slug, kind, url, module, titleFr, titleEn, summaryFr, summaryEn, position, maxScore, maxSessionSec, maxPayloadBytes, maxStatsPerMin };
}

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

function buildPayload(form: FormState) {
  return {
    slug: form.slug,
    kind: form.kind,
    url: form.url || null,
    module: form.module || null,
    title: { fr: form.titleFr || undefined, en: form.titleEn || undefined },
    summary: { fr: form.summaryFr || undefined, en: form.summaryEn || undefined },
    position: Number(form.position) || 0,
    limits: {
      maxScore: num(form.maxScore),
      maxSessionSec: num(form.maxSessionSec),
      maxPayloadBytes: num(form.maxPayloadBytes),
      maxStatsPerMin: num(form.maxStatsPerMin),
    },
  };
}

function errLabel(labels: EditorLabels, code: string): string {
  return (labels.errors as Record<string, string>)[code] ?? code;
}

export function GameEditor({
  lang,
  labels,
  listPath,
  initial,
}: {
  lang: string;
  labels: EditorLabels;
  listPath: string;
  initial?: GameEditorInitial;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => (initial ? formFrom(initial) : emptyForm()));
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const gameId = initial?.gameId;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function patch(partial: Partial<FormState>) {
    setForm((f) => ({ ...f, ...partial }));
    setDirty(true);
    setSaved(false);
  }

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; id?: string; apiKey?: string } | null;
    return { res, data };
  }

  async function onSave(regenerateApiKey = false) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const url = gameId ? `/api/admin/games/${gameId}` : "/api/admin/games";
      const body = gameId ? { game: buildPayload(form), regenerateApiKey } : buildPayload(form);
      const { res, data } = await postJson(url, body);
      if (!res.ok) setError(errLabel(labels, data?.error ?? "INTERNAL"));
      else {
        setDirty(false);
        setSaved(true);
        if (data?.apiKey) setNewApiKey(data.apiKey);
        if (!gameId && data?.id) {
          router.push(`/${lang}/admin/games/${data.id}`);
          router.refresh();
        }
      }
    } catch {
      setError(errLabel(labels, "INTERNAL"));
    }
    setSaving(false);
  }

  async function onTogglePublish() {
    if (!gameId) return;
    setError(null);
    const { res, data } = await postJson(
      `/api/admin/games/${gameId}/${status === "published" ? "unpublish" : "publish"}`,
      {},
    );
    if (!res.ok) setError(errLabel(labels, data?.error ?? "INTERNAL"));
    else {
      setStatus(status === "published" ? "draft" : "published");
      router.refresh();
    }
  }

  async function onDelete() {
    if (!gameId || confirmSlug !== form.slug) return;
    setError(null);
    const { res, data } = await postJson(`/api/admin/games/${gameId}/delete`, { slugConfirm: confirmSlug });
    if (!res.ok) setError(errLabel(labels, data?.error ?? "INTERNAL"));
    else router.push(listPath);
  }

  const field = "w-full border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-2 text-15px";
  const btn =
    "border-2 border-(--ink) rounded-(--r) bg-(--card) px-3 py-1 text-14px shadow-[4px_4px_0_var(--shadow-c)] disabled:opacity-60";
  const f = labels.fields;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <a href={listPath} style={{ color: "var(--acc)" }} className="text-13px">
          ← {labels.back}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-13px">
          {f.slug}
          <input className={field} maxLength={80} value={form.slug} onChange={(e) => patch({ slug: e.target.value.toLowerCase() })} />
        </label>
        <label className="flex flex-col gap-1 text-13px">
          {f.position}
          <input className={field} type="number" min={0} max={9999} value={form.position} onChange={(e) => patch({ position: Number(e.target.value) || 0 })} />
        </label>
        <label className="flex flex-col gap-1 text-13px">
          {f.kind}
          <select className={field} value={form.kind} onChange={(e) => patch({ kind: e.target.value as "iframe" | "internal" })}>
            <option value="iframe">iframe</option>
            <option value="internal">internal</option>
          </select>
        </label>
        {form.kind === "iframe" ? (
          <label className="flex flex-col gap-1 text-13px">
            {f.url}
            <input className={field} type="url" maxLength={300} placeholder="https://…" value={form.url} onChange={(e) => patch({ url: e.target.value })} />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-13px">
            {f.module}
            <input className={field} maxLength={80} placeholder="snake" value={form.module} onChange={(e) => patch({ module: e.target.value })} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-13px">
          {f.titleFr}
          <input className={field} maxLength={120} value={form.titleFr} onChange={(e) => patch({ titleFr: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-13px">
          {f.titleEn}
          <input className={field} maxLength={120} value={form.titleEn} onChange={(e) => patch({ titleEn: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-13px sm:col-span-2">
          {f.summaryFr}
          <input className={field} maxLength={300} value={form.summaryFr} onChange={(e) => patch({ summaryFr: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-13px sm:col-span-2">
          {f.summaryEn}
          <input className={field} maxLength={300} value={form.summaryEn} onChange={(e) => patch({ summaryEn: e.target.value })} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 border-2 border-(--ink) rounded-(--r) bg-(--card) p-3 shadow-[4px_4px_0_var(--shadow-c)]">
        <legend className="px-1 text-13px">Limites</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-13px">
            {f.maxScore}
            <input className={field} type="number" min={1} value={form.maxScore} onChange={(e) => patch({ maxScore: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-13px">
            {f.maxSessionSec}
            <input className={field} type="number" min={1} value={form.maxSessionSec} onChange={(e) => patch({ maxSessionSec: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-13px">
            {f.maxPayloadBytes}
            <input className={field} type="number" min={1} value={form.maxPayloadBytes} onChange={(e) => patch({ maxPayloadBytes: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-13px">
            {f.maxStatsPerMin}
            <input className={field} type="number" min={1} value={form.maxStatsPerMin} onChange={(e) => patch({ maxStatsPerMin: e.target.value })} />
          </label>
        </div>
      </fieldset>

      {gameId ? (
        <fieldset className="flex flex-col gap-2 border-2 border-(--ink) rounded-(--r) bg-(--card) p-3 shadow-[4px_4px_0_var(--shadow-c)]">
          <legend className="px-1 text-13px">{labels.apikey.title}</legend>
          <p className="text-13px" style={{ color: "var(--mut)" }}>
            {labels.apikey.hint}
          </p>
          {newApiKey ? (
            <div className="flex flex-col gap-1">
              <strong className="text-13px" style={{ color: "var(--warn)" }}>
                {labels.apikey.regenerated}
              </strong>
              <code className="break-all rounded-(--r) border-2 border-(--ink) bg-(--bg) p-2 text-12px">{newApiKey}</code>
            </div>
          ) : null}
          <div>
            <button type="button" className={btn} disabled={saving} onClick={() => onSave(true)}>
              {labels.apikey.regenerate}
            </button>
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-13px" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      {showDelete && gameId ? (
        <div className="flex flex-col gap-2 border-2 border-(--bad) rounded-(--r) bg-(--card) p-3">
          <label className="flex flex-col gap-1 text-13px">{labels.actions.deleteConfirm}</label>
          <div className="flex flex-wrap gap-2">
            <input className="border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px" value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} />
            <button type="button" className={btn} style={{ background: "var(--bad)", color: "#fff" }} disabled={confirmSlug !== form.slug} onClick={onDelete}>
              {labels.actions.deleteConfirmAction}
            </button>
            <button type="button" className={btn} onClick={() => setShowDelete(false)}>
              {labels.actions.deleteCancel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-(--ink) bg-(--card)">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 p-3">
          <button type="button" className={btn} style={{ background: "var(--acc)", color: "var(--on-acc)" }} disabled={saving} onClick={() => onSave(false)}>
            {saving ? labels.actions.saving : labels.actions.save}
          </button>
          {saved ? <span className="text-13px" style={{ color: "var(--ok)" }}>{labels.actions.saved}</span> : null}
          {dirty ? <span className="text-13px" style={{ color: "var(--warn)" }}>{labels.actions.unsaved}</span> : null}
          {gameId ? (
            <>
              <button type="button" className={btn} onClick={onTogglePublish}>
                {status === "published" ? labels.actions.unpublish : labels.actions.publish}
              </button>
              <button type="button" className={btn} style={{ color: "var(--bad)" }} onClick={() => setShowDelete((v) => !v)}>
                {labels.actions.delete}
              </button>
            </>
          ) : null}
          <span className="ml-auto text-12px" style={{ color: "var(--mut)" }}>
            {status === "published" ? "published" : "draft"}
          </span>
        </div>
      </div>
    </div>
  );
}
