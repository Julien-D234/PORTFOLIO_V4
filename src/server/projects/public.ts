import { asc, eq, inArray } from "drizzle-orm";
import { defaultLocale, type Locale } from "@/i18n/config";
import {
  mediaFile,
  project,
  projectImage,
  projectTag,
  projectTranslation,
  tag,
  type LocaleText,
} from "../db/schema";
import type { MediaDb } from "../media";

export interface PublicMedia {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export interface PublicProjectSummary {
  id: string;
  slug: string;
  position: number;
  url: string | null;
  repoUrl: string | null;
  publishedAt: Date | null;
  title: string;
  summary: string;
  coverAlt: string | null;
  cover: PublicMedia | null;
  tags: string[];
}

export interface PublicGalleryImage extends PublicMedia {
  position: number;
  alt: string | null;
  caption: string | null;
}


export interface PublicProjectDetail extends PublicProjectSummary {
  description: string;
  gallery: PublicGalleryImage[];
}

export function mediaUrl(id: string): string {
  return `/media/${id}`;
}

export function thumbUrl(id: string): string {
  return `/media/${id}?v=thumb`;
}

export function pickLocaleText(value: LocaleText | null | undefined, locale: Locale): string | null {
  if (!value) return null;
  const raw = value[locale] ?? value[defaultLocale] ?? value.fr ?? value.en;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function toPublicMedia(row: typeof mediaFile.$inferSelect): PublicMedia {
  return { id: row.id, url: mediaUrl(row.id), thumbUrl: thumbUrl(row.id), width: row.width, height: row.height };
}

interface TranslationPair {
  current: typeof projectTranslation.$inferSelect | undefined;
  fallback: typeof projectTranslation.$inferSelect | undefined;
}

function mergeTranslation(pair: TranslationPair) {
  const cur = pair.current;
  const fb = pair.fallback;
  const pick = (curVal: string | null | undefined, fbVal: string | null | undefined) => {
    const a = curVal?.trim();
    if (a) return a;
    const b = fbVal?.trim();
    return b ? b : "";
  };
  return {
    title: pick(cur?.title, fb?.title),
    summary: pick(cur?.summary, fb?.summary),
    description: pick(cur?.description, fb?.description) ?? "",
    coverAlt: pick(cur?.coverAlt, fb?.coverAlt) || null,
  };
}

async function loadTranslations(db: MediaDb, projectIds: string[], locale: Locale) {
  const map = new Map<string, TranslationPair>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select()
    .from(projectTranslation)
    .where(inArray(projectTranslation.projectId, projectIds));
  for (const id of projectIds) {
    const cur = locale === defaultLocale ? undefined : rows.find((r) => r.projectId === id && r.locale === locale);
    const fb = rows.find((r) => r.projectId === id && r.locale === defaultLocale);
    map.set(id, { current: cur, fallback: fb });
  }
  return map;
}

async function loadTags(db: MediaDb, projectIds: string[]) {
  const map = new Map<string, string[]>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select({ projectId: projectTag.projectId, name: tag.name })
    .from(projectTag)
    .innerJoin(tag, eq(tag.id, projectTag.tagId))
    .where(inArray(projectTag.projectId, projectIds));
  for (const row of rows) {
    const list = map.get(row.projectId) ?? [];
    list.push(row.name);
    map.set(row.projectId, list);
  }
  return map;
}

export async function listPublishedProjects(db: MediaDb, locale: Locale): Promise<PublicProjectSummary[]> {
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.status, "published"))
    .orderBy(asc(project.position), asc(project.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const translations = await loadTranslations(db, ids, locale);
  const tags = await loadTags(db, ids);
  const coverIds = rows.map((r) => r.coverMediaId).filter((v): v is string => Boolean(v));
  const covers = coverIds.length
    ? await db.select().from(mediaFile).where(inArray(mediaFile.id, coverIds))
    : [];
  const coverMap = new Map(covers.map((c) => [c.id, c]));
  return rows.map((row) => {
    const t = mergeTranslation(translations.get(row.id) ?? { current: undefined, fallback: undefined });
    const cover = row.coverMediaId ? coverMap.get(row.coverMediaId) : undefined;
    return {
      id: row.id,
      slug: row.slug,
      position: row.position,
      url: row.url,
      repoUrl: row.repoUrl,
      publishedAt: row.publishedAt,
      title: t.title,
      summary: t.summary,
      coverAlt: t.coverAlt,
      cover: cover ? toPublicMedia(cover) : null,
      tags: tags.get(row.id) ?? [],
    };
  });
}

export async function getPublishedProject(
  db: MediaDb,
  locale: Locale,
  slug: string,
): Promise<PublicProjectDetail | null> {
  const rows = await db.select().from(project).where(eq(project.slug, slug)).limit(1);
  const row = rows[0];
  if (!row || row.status !== "published") return null;
  const translations = await loadTranslations(db, [row.id], locale);
  const tags = await loadTags(db, [row.id]);
  const cover = row.coverMediaId
    ? (await db.select().from(mediaFile).where(eq(mediaFile.id, row.coverMediaId)).limit(1))[0]
    : undefined;
  const images = await db
    .select({ img: projectImage, media: mediaFile })
    .from(projectImage)
    .innerJoin(mediaFile, eq(mediaFile.id, projectImage.mediaId))
    .where(eq(projectImage.projectId, row.id))
    .orderBy(asc(projectImage.position));
  const t = mergeTranslation(translations.get(row.id) ?? { current: undefined, fallback: undefined });
  return {
    id: row.id,
    slug: row.slug,
    position: row.position,
    url: row.url,
    repoUrl: row.repoUrl,
    publishedAt: row.publishedAt,
    title: t.title,
    summary: t.summary,
    coverAlt: t.coverAlt,
    cover: cover ? toPublicMedia(cover) : null,
    tags: tags.get(row.id) ?? [],
    description: t.description,
    gallery: images.map(({ img, media }) => ({
      ...toPublicMedia(media),
      position: img.position,
      alt: pickLocaleText(img.alt, locale),
      caption: pickLocaleText(img.caption, locale),
    })),
  };
}
