import { asc, eq, inArray } from "drizzle-orm";
import {
  mediaFile,
  project,
  projectImage,
  projectTag,
  projectTranslation,
  tag,
  type Project,
  type ProjectImage,
  type ProjectTranslation,
  type Tag,
} from "../db/schema";
import type { MediaDb } from "../media";
import { thumbUrl } from "./public";

export interface AdminProjectListItem {
  project: Project;
  translations: ProjectTranslation[];
  tags: string[];
  cover: { id: string; thumbUrl: string } | null;
  galleryCount: number;
}

export interface AdminProjectDetail {
  project: Project;
  translations: ProjectTranslation[];
  tags: Tag[];
  cover: typeof mediaFile.$inferSelect | null;
  gallery: (ProjectImage & { media: typeof mediaFile.$inferSelect })[];
}

export async function listProjectsAdmin(db: MediaDb): Promise<AdminProjectListItem[]> {
  const rows = await db
    .select()
    .from(project)
    .orderBy(asc(project.position), asc(project.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const translations = await db
    .select()
    .from(projectTranslation)
    .where(inArray(projectTranslation.projectId, ids));
  const tagRows = await db
    .select({ projectId: projectTag.projectId, name: tag.name })
    .from(projectTag)
    .innerJoin(tag, eq(tag.id, projectTag.tagId))
    .where(inArray(projectTag.projectId, ids));
  const galleryCounts = await db
    .select({ projectId: projectImage.projectId, count: projectImage.id })
    .from(projectImage)
    .where(inArray(projectImage.projectId, ids));
  const coverIds = rows.map((r) => r.coverMediaId).filter((v): v is string => Boolean(v));
  const covers = coverIds.length
    ? await db.select().from(mediaFile).where(inArray(mediaFile.id, coverIds))
    : [];
  const coverMap = new Map(covers.map((c) => [c.id, c]));
  const trMap = new Map<string, ProjectTranslation[]>();
  for (const t of translations) {
    const list = trMap.get(t.projectId) ?? [];
    list.push(t);
    trMap.set(t.projectId, list);
  }
  const tagMap = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = tagMap.get(row.projectId) ?? [];
    list.push(row.name);
    tagMap.set(row.projectId, list);
  }
  const countMap = new Map<string, number>();
  for (const row of galleryCounts) {
    countMap.set(row.projectId, (countMap.get(row.projectId) ?? 0) + 1);
  }
  return rows.map((row) => {
    const cover = row.coverMediaId ? coverMap.get(row.coverMediaId) : undefined;
    return {
      project: row,
      translations: trMap.get(row.id) ?? [],
      tags: tagMap.get(row.id) ?? [],
      cover: cover ? { id: cover.id, thumbUrl: thumbUrl(cover.id) } : null,
      galleryCount: countMap.get(row.id) ?? 0,
    };
  });
}

export async function getProjectAdmin(db: MediaDb, id: string): Promise<AdminProjectDetail | null> {
  const rows = await db.select().from(project).where(eq(project.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const translations = await db
    .select()
    .from(projectTranslation)
    .where(eq(projectTranslation.projectId, id));
  const tagRows = await db
    .select({ tag })
    .from(projectTag)
    .innerJoin(tag, eq(tag.id, projectTag.tagId))
    .where(eq(projectTag.projectId, id));
  const cover = row.coverMediaId
    ? (await db.select().from(mediaFile).where(eq(mediaFile.id, row.coverMediaId)).limit(1))[0] ?? null
    : null;
  const gallery = await db
    .select({ img: projectImage, media: mediaFile })
    .from(projectImage)
    .innerJoin(mediaFile, eq(mediaFile.id, projectImage.mediaId))
    .where(eq(projectImage.projectId, id))
    .orderBy(asc(projectImage.position));
  return {
    project: row,
    translations,
    tags: tagRows.map((r) => r.tag),
    cover,
    gallery: gallery.map(({ img, media }) => ({ ...img, media })),
  };
}
