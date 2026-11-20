"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Messages } from "@/i18n/dictionaries";
import { LIMITS } from "@/lib/project-schema";

type EditorLabels = Messages["admin"]["projects"]["editor"];
type LocaleTab = "fr" | "en";

interface EditorTranslation {
  title: string;
  summary: string;
  description: string;
  coverAlt: string;
}

export interface EditorGalleryItem {
  mediaId: string;
  thumbUrl: string;
  alt: Record<LocaleTab, string>;
  caption: Record<LocaleTab, string>;
}

export interface EditorInitial {
  projectId?: string;
  slug: string;
  status: "draft" | "published";
  url: string | null;
  repoUrl: string | null;
  position: number;
  coverMediaId: string | null;
  coverThumbUrl: string | null;
  tags: string;
  translations: Record<LocaleTab, EditorTranslation>;
  gallery: EditorGalleryItem[];
}

interface FormState {
  slug: string;
  url: string;
  repoUrl: string;
  position: number;
  coverMediaId: string | null;
  coverThumbUrl: string | null;
  tags: string;
  translations: Record<LocaleTab, EditorTranslation>;
  gallery: EditorGalleryItem[];
}

function emptyForm(): FormState {
  return {
    slug: "",
    url: "",
    repoUrl: "",
    position: 0,
    coverMediaId: null,
    coverThumbUrl: null,
    tags: "",
    translations: {
      fr: { title: "", summary: "", description: "", coverAlt: "" },
      en: { title: "", summary: "", description: "", coverAlt: "" },
    },
    gallery: [],
  };
}

function formFromInitial(initial: EditorInitial): FormState {
  return {
    slug: initial.slug,
    url: initial.url ?? "",
    repoUrl: initial.repoUrl ?? "",
    position: initial.position,
    coverMediaId: initial.coverMediaId,
    coverThumbUrl: initial.coverThumbUrl,
    tags: initial.tags,
    translations: initial.translations,
    gallery: initial.gallery,
  };
}

function errLabel(labels: EditorLabels, code: string): string {
  return (labels.errors as Record<string, string>)[code] ?? code;
}

function buildPayload(form: FormState): Record<string, unknown> {
  const translations = (["fr", "en"] as const)
    .map((locale) => {
      const t = form.translations[locale];
      return {
        locale,
        title: t.title,
        summary: t.summary,
        description: t.description,
        coverAlt: t.coverAlt || null,
      };
    })
    .filter((t) => t.locale === "fr" || t.title || t.summary || t.description || t.coverAlt);
  return {
    slug: form.slug,
    url: form.url || null,
    repoUrl: form.repoUrl || null,
    position: Number(form.position) || 0,
    coverMediaId: form.coverMediaId || null,
    translations,
    tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
    gallery: form.gallery.map((g, i) => ({
      mediaId: g.mediaId,
      position: i,
      alt: { fr: g.alt.fr, en: g.alt.en },
      caption: { fr: g.caption.fr, en: g.caption.en },
    })),
  };
}

export function ProjectEditor({
  lang,
  labels,
  listPath,
  initial,
}: {
  lang: string;
  labels: EditorLabels;
  listPath: string;
  initial?: EditorInitial;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => (initial ? formFromInitial(initial) : emptyForm()));
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [tab, setTab] = useState<LocaleTab>("fr");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const projectId = initial?.projectId;

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

  function patchTranslation(locale: LocaleTab, partial: Partial<EditorTranslation>) {
    setForm((f) => ({
      ...f,
      translations: { ...f.translations, [locale]: { ...f.translations[locale], ...partial } },
    }));
    setDirty(true);
    setSaved(false);
  }

  function patchGalleryItem(index: number, partial: Partial<EditorGalleryItem>) {
    setForm((f) => {
      const gallery = f.gallery.map((g, i) => (i === index ? { ...g, ...partial } : g));
      return { ...f, gallery };
    });
    setDirty(true);
    setSaved(false);
  }

  function moveGalleryItem(index: number, dir: -1 | 1) {
    setForm((f) => {
      const gallery = [...f.gallery];
      const j = index + dir;
      if (j < 0 || j >= gallery.length) return f;
      [gallery[index], gallery[j]] = [gallery[j], gallery[index]];
      return { ...f, gallery };
    });
    setDirty(true);
    setSaved(false);
  }

  async function upload(file: File): Promise<{ id: string; thumbUrl: string }> {
    const res = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    });
    const data = (await res.json().catch(() => null)) as { id?: string; thumbUrl?: string; error?: string } | null;
    if (!res.ok || !data?.id) throw new Error(data?.error ?? "INTERNAL");
    return { id: data.id, thumbUrl: data.thumbUrl ?? `/media/${data.id}?v=thumb` };
  }

  async function onUploadCover(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const media = await upload(file);
      patch({ coverMediaId: media.id, coverThumbUrl: media.thumbUrl });
    } catch (e) {
      setError(errLabel(labels, e instanceof Error ? e.message : "INTERNAL"));
    }
    setUploading(false);
  }

  async function onUploadGallery(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const media = await upload(file);
      setForm((f) => ({
        ...f,
        gallery: [
          ...f.gallery,
          { mediaId: media.id, thumbUrl: media.thumbUrl, alt: { fr: "", en: "" }, caption: { fr: "", en: "" } },
        ],
      }));
      setDirty(true);
      setSaved(false);
    } catch (e) {
      setError(errLabel(labels, e instanceof Error ? e.message : "INTERNAL"));
    }
    setUploading(false);
  }

  async function postJson(url: string, body: unknown): Promise<{ res: Response; data: { error?: string; id?: string } | null }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; id?: string } | null;
    return { res, data };
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const url = projectId ? `/api/admin/projects/${projectId}` : "/api/admin/projects";
      const { res, data } = await postJson(url, buildPayload(form));
      if (!res.ok) {
        setError(errLabel(labels, data?.error ?? "INTERNAL"));
      } else {
        setDirty(false);
        setSaved(true);
        if (!projectId && data?.id) {
          router.push(`/${lang}/admin/projects/${data.id}`);
          router.refresh();
        }
      }
    } catch {
      setError(errLabel(labels, "INTERNAL"));
    }
    setSaving(false);
  }

  async function onTogglePublish() {
    if (!projectId) return;
    setError(null);
    const { res, data } = await postJson(
      `/api/admin/projects/${projectId}/${status === "published" ? "unpublish" : "publish"}`,
      {},
    );
    if (!res.ok) setError(errLabel(labels, data?.error ?? "INTERNAL"));
    else {
      setStatus(status === "published" ? "draft" : "published");
      router.refresh();
    }
  }

  async function onDelete() {
    if (!projectId || confirmSlug !== form.slug) return;
    setError(null);
    const { res, data } = await postJson(`/api/admin/projects/${projectId}/delete`, { slugConfirm: confirmSlug });
    if (!res.ok) setError(errLabel(labels, data?.error ?? "INTERNAL"));
    else router.push(listPath);
  }

  const field = "w-full border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-2 text-15px";
  const smallField = "border-2 border-(--ink) rounded-(--r) bg-(--card) px-2 py-1 text-13px";
  const btn =
    "border-2 border-(--ink) rounded-(--r) bg-(--card) px-3 py-1 text-14px shadow-[4px_4px_0_var(--shadow-c)] disabled:opacity-60";
  const t = form.translations[tab];
  const f = labels.fields;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <a href={listPath} style={{ color: "var(--acc)" }} className="text-13px">
          ← {labels.back}
        </a>
      </div>

      <div className="flex gap-2" role="tablist">
        {(["fr", "en"] as const).map((locale) => (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={tab === locale}
            onClick={() => setTab(locale)}
            className={btn}
            style={tab === locale ? { background: "var(--hl)", color: "var(--on-hl)" } : undefined}
          >
            {labels.tabs[locale]}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-13px">
        {f.title} ({tab})
        <input
          className={field}
          maxLength={LIMITS.title}
          value={t.title}
          onChange={(e) => patchTranslation(tab, { title: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {f.summary} ({tab})
        <input
          className={field}
          maxLength={LIMITS.summary}
          value={t.summary}
          onChange={(e) => patchTranslation(tab, { summary: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {f.description} ({tab})
        <textarea
          className={field}
          rows={8}
          maxLength={LIMITS.description}
          value={t.description}
          onChange={(e) => patchTranslation(tab, { description: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-13px">
        {f.coverAlt} ({tab})
        <input
          className={field}
          maxLength={LIMITS.alt}
          value={t.coverAlt}
          onChange={(e) => patchTranslation(tab, { coverAlt: e.target.value })}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-13px">
          {f.slug}
          <input
            className={field}
            maxLength={LIMITS.slug}
            value={form.slug}
            onChange={(e) => patch({ slug: e.target.value.toLowerCase() })}
          />
        </label>
        <label className="flex flex-col gap-1 text-13px">
          {f.position}
          <input
            className={field}
            type="number"
            min={0}
            max={LIMITS.position}
            value={form.position}
            onChange={(e) => patch({ position: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-1 text-13px">
          {f.url}
          <input
            className={field}
            type="url"
            maxLength={LIMITS.url}
            placeholder="https://…"
            value={form.url}
            onChange={(e) => patch({ url: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-13px">
          {f.repoUrl}
          <input
            className={field}
            type="url"
            maxLength={LIMITS.url}
            placeholder="https://…"
            value={form.repoUrl}
            onChange={(e) => patch({ repoUrl: e.target.value })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-13px">
        {f.tags}
        <input
          className={field}
          maxLength={LIMITS.tag * LIMITS.tags}
          value={form.tags}
          onChange={(e) => patch({ tags: e.target.value })}
        />
      </label>

      <fieldset className="flex flex-col gap-2 border-2 border-(--ink) rounded-(--r) bg-(--card) p-3 shadow-[4px_4px_0_var(--shadow-c)]">
        <legend className="px-1 text-13px">{f.cover}</legend>
        {form.coverThumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.coverThumbUrl}
            alt=""
            className="h-32 w-56 rounded-(--r) border-2 border-(--ink) object-cover"
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={uploading} onClick={() => coverInput.current?.click()}>
            {uploading ? labels.actions.uploading : labels.actions.upload}
          </button>
          {form.coverMediaId ? (
            <button type="button" className={btn} onClick={() => patch({ coverMediaId: null, coverThumbUrl: null })}>
              {labels.actions.removeImage}
            </button>
          ) : null}
        </div>
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => onUploadCover(e.target.files?.[0] ?? null)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-2 border-(--ink) rounded-(--r) bg-(--card) p-3 shadow-[4px_4px_0_var(--shadow-c)]">
        <legend className="px-1 text-13px">{f.gallery}</legend>
        {form.gallery.map((g, i) => (
          <div key={g.mediaId} className="flex flex-col gap-2 border-t border-(--line) pt-2 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.thumbUrl}
                alt=""
                className="h-16 w-24 rounded-(--r) border-2 border-(--ink) object-cover"
              />
              <div className="flex flex-wrap gap-1">
                <button type="button" className={smallField} onClick={() => moveGalleryItem(i, -1)}>
                  ←
                </button>
                <button type="button" className={smallField} onClick={() => moveGalleryItem(i, 1)}>
                  →
                </button>
                <button type="button" className={smallField} onClick={() => patchGalleryItem(i, { mediaId: g.mediaId })}>
                  #{i + 1}
                </button>
                <button
                  type="button"
                  className={smallField}
                  style={{ color: "var(--bad)" }}
                  onClick={() =>
                    setForm((f2) => ({ ...f2, gallery: f2.gallery.filter((_, j) => j !== i) }))
                  }
                >
                  {labels.actions.removeImage}
                </button>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-12px">
              {f.alt} ({tab})
              <input
                className={smallField}
                maxLength={LIMITS.alt}
                value={g.alt[tab]}
                onChange={(e) =>
                  patchGalleryItem(i, { alt: { ...g.alt, [tab]: e.target.value } })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-12px">
              {f.caption} ({tab})
              <input
                className={smallField}
                maxLength={LIMITS.caption}
                value={g.caption[tab]}
                onChange={(e) =>
                  patchGalleryItem(i, { caption: { ...g.caption, [tab]: e.target.value } })
                }
              />
            </label>
          </div>
        ))}
        <div>
          <button type="button" className={btn} disabled={uploading} onClick={() => galleryInput.current?.click()}>
            {uploading ? labels.actions.uploading : labels.actions.upload}
          </button>
          <input
            ref={galleryInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onUploadGallery(e.target.files?.[0] ?? null)}
          />
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-13px" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}

      {showDelete && projectId ? (
        <div className="flex flex-col gap-2 border-2 border-(--bad) rounded-(--r) bg-(--card) p-3">
          <label className="flex flex-col gap-1 text-13px">{labels.actions.deleteConfirm}</label>
          <div className="flex flex-wrap gap-2">
            <input
              className={smallField}
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
            />
            <button
              type="button"
              className={btn}
              style={{ background: "var(--bad)", color: "#fff" }}
              disabled={confirmSlug !== form.slug}
              onClick={onDelete}
            >
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
          <button
            type="button"
            className={btn}
            style={{ background: "var(--acc)", color: "var(--on-acc)" }}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? labels.actions.saving : labels.actions.save}
          </button>
          {saved ? <span className="text-13px" style={{ color: "var(--ok)" }}>{labels.actions.saved}</span> : null}
          {dirty ? <span className="text-13px" style={{ color: "var(--warn)" }}>{labels.actions.unsaved}</span> : null}
          {projectId ? (
            <>
              <button type="button" className={btn} onClick={onTogglePublish}>
                {status === "published" ? labels.actions.unpublish : labels.actions.publish}
              </button>
              <button
                type="button"
                className={btn}
                style={{ color: "var(--bad)" }}
                onClick={() => setShowDelete((v) => !v)}
              >
                {labels.actions.delete}
              </button>
            </>
          ) : null}
          <span className="ml-auto text-12px" style={{ color: "var(--mut)" }}>
            {status === "published" ? labels.status.published : labels.status.draft}
          </span>
        </div>
      </div>
    </div>
  );
}
