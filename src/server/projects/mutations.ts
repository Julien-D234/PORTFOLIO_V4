import crypto from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { ProjectInput } from "@/lib/project-schema";
import { auditLog, mediaFile, project, projectImage, projectTag, projectTranslation, tag } from "../db/schema";
import { HttpError } from "../http";
import { deleteMediaIfOrphan, type MediaDb } from "../media";


export const projectIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function projectIdOk(id: string): boolean {
  return projectIdRegex.test(id);
}

async function resolveTagIds(db: MediaDb, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const existing = await db
      .select({ id: tag.id })
      .from(tag)
      .where(sql`lower(${tag.name}) = ${name.toLowerCase()}`)
      .limit(1);
    if (existing[0]) {
      ids.push(existing[0].id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(tag).values({ id, name });
    ids.push(id);
  }
  return [...new Set(ids)];
}

async function assertMediaExist(db: MediaDb, ids: (string | null | undefined)[]): Promise<void> {
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (wanted.length === 0) return;
  const rows = await db.select({ id: mediaFile.id }).from(mediaFile).where(inArray(mediaFile.id, wanted));
  if (rows.length !== wanted.length) throw new HttpError(422, "INVALID_MEDIA");
}

async function writeTranslations(db: MediaDb, projectId: string, input: ProjectInput) {
  await db.delete(projectTranslation).where(eq(projectTranslation.projectId, projectId));
  for (const t of input.translations) {
    await db.insert(projectTranslation).values({
      id: crypto.randomUUID(),
      projectId,
      locale: t.locale,
      title: t.title,
      summary: t.summary,
      description: t.description,
      coverAlt: t.coverAlt?.trim() ? t.coverAlt.trim() : null,
      updatedAt: new Date(),
    });
  }
}

async function writeTags(db: MediaDb, projectId: string, names: string[]) {
  await db.delete(projectTag).where(eq(projectTag.projectId, projectId));
  for (const tagId of await resolveTagIds(db, names)) {
    await db.insert(projectTag).values({ projectId, tagId });
  }
}

async function writeGallery(db: MediaDb, projectId: string, input: ProjectInput) {
  await db.delete(projectImage).where(eq(projectImage.projectId, projectId));
  const sorted = [...input.gallery].sort((a, b) => a.position - b.position);
  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i];
    await db.insert(projectImage).values({
      id: crypto.randomUUID(),
      projectId,
      mediaId: g.mediaId,
      position: i,
      alt: g.alt,
      caption: g.caption,
    });
  }
}

export async function createProject(db: MediaDb, actorId: string, input: ProjectInput) {
  const existing = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.slug, input.slug))
    .limit(1);
  if (existing.length > 0) throw new HttpError(409, "SLUG_TAKEN");
  await assertMediaExist(db, [input.coverMediaId, ...input.gallery.map((g) => g.mediaId)]);
  return db.transaction(async (rawTx) => {
    const tx = rawTx as unknown as MediaDb;
    const [row] = await tx
      .insert(project)
      .values({
        id: crypto.randomUUID(),
        slug: input.slug,
        status: "draft",
        url: input.url ?? null,
        repoUrl: input.repoUrl ?? null,
        position: input.position,
        coverMediaId: input.coverMediaId ?? null,
      })
      .returning();
    await writeTranslations(tx, row.id, input);
    await writeTags(tx, row.id, input.tags);
    await writeGallery(tx, row.id, input);
    await tx.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId,
      action: "project_created",
      targetId: row.id,
      metadata: JSON.stringify({ slug: input.slug }),
    });
    return row;
  });
}

export async function updateProject(db: MediaDb, id: string, actorId: string, input: ProjectInput) {
  if (!projectIdOk(id)) throw new HttpError(400, "INVALID_ID");
  const rows = await db.select().from(project).where(eq(project.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, "PROJECT_NOT_FOUND");
  if (input.slug !== existing.slug) {
    const clash = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.slug, input.slug))
      .limit(1);
    if (clash.length > 0) throw new HttpError(409, "SLUG_TAKEN");
  }
  await assertMediaExist(db, [input.coverMediaId, ...input.gallery.map((g) => g.mediaId)]);
  const oldMediaIds = [
    existing.coverMediaId,
    ...(
      await db.select({ mediaId: projectImage.mediaId }).from(projectImage).where(eq(projectImage.projectId, id))
    ).map((r) => r.mediaId),
  ].filter((v): v is string => Boolean(v));
  const row = await db.transaction(async (rawTx) => {
    const tx = rawTx as unknown as MediaDb;
    const [updated] = await tx
      .update(project)
      .set({
        slug: input.slug,
        url: input.url ?? null,
        repoUrl: input.repoUrl ?? null,
        position: input.position,
        coverMediaId: input.coverMediaId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(project.id, id))
      .returning();
    await writeTranslations(tx, id, input);
    await writeTags(tx, id, input.tags);
    await writeGallery(tx, id, input);
    await tx.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId,
      action: "project_updated",
      targetId: id,
      metadata: JSON.stringify({ slug: input.slug }),
    });
    return updated;
  });
  for (const mediaId of oldMediaIds) await deleteMediaIfOrphan(db, mediaId);
  return row;
}

export async function setProjectStatus(
  db: MediaDb,
  id: string,
  status: "published" | "draft",
  actorId: string,
) {
  if (!projectIdOk(id)) throw new HttpError(400, "INVALID_ID");
  const rows = await db.select().from(project).where(eq(project.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, "PROJECT_NOT_FOUND");
  if (status === "published") {
    const fr = await db
      .select()
      .from(projectTranslation)
      .where(and(eq(projectTranslation.projectId, id), eq(projectTranslation.locale, "fr")))
      .limit(1);
    const t = fr[0];
    if (!t || !t.title.trim() || !t.summary.trim()) throw new HttpError(422, "MISSING_FR_CONTENT");
  }
  const [row] = await db
    .update(project)
    .set({
      status,
      publishedAt: status === "published" ? (existing.publishedAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(project.id, id))
    .returning();
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: status === "published" ? "project_published" : "project_unpublished",
    targetId: id,
    metadata: JSON.stringify({ slug: existing.slug }),
  });
  return row;
}

export async function deleteProject(db: MediaDb, id: string, slugConfirm: string, actorId: string) {
  if (!projectIdOk(id)) throw new HttpError(400, "INVALID_ID");
  const rows = await db.select().from(project).where(eq(project.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, "PROJECT_NOT_FOUND");
  if (slugConfirm !== existing.slug) throw new HttpError(422, "SLUG_MISMATCH");
  const mediaIds = [
    existing.coverMediaId,
    ...(
      await db.select({ mediaId: projectImage.mediaId }).from(projectImage).where(eq(projectImage.projectId, id))
    ).map((r) => r.mediaId),
  ].filter((v): v is string => Boolean(v));
  await db.delete(project).where(eq(project.id, id));
  for (const mediaId of mediaIds) await deleteMediaIfOrphan(db, mediaId);
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "project_deleted",
    targetId: id,
    metadata: JSON.stringify({ slug: existing.slug }),
  });
  return existing;
}
