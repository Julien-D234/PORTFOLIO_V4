import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import sharp from "sharp";
import * as schema from "../db/schema";
import { mediaFile, project, projectImage, type MediaFile } from "../db/schema";
import { HttpError } from "../http";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const MAX_DIMENSION = 1920;
export const THUMB_DIMENSION = 480;
export const MIN_DIMENSION = 100;

export type MediaDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export function mediaDir(): string {
  return path.resolve(process.env.MEDIA_DIR?.trim() || ".media");
}

export function mediaIdOk(id: string): boolean {
  return /^[0-9a-f]{32}$/.test(id);
}

export function newMediaId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export type MediaVariant = "full" | "thumb";

export function filePathFor(id: string, variant: MediaVariant): string {
  return path.join(mediaDir(), `${id}${variant === "thumb" ? ".thumb" : ""}.webp`);
}

export function detectImageKind(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export interface ProcessedImage {
  width: number;
  height: number;
  full: Buffer;
  thumb: Buffer;
  sizeBytes: number;
  thumbSizeBytes: number;
}

export async function processImage(buf: Buffer): Promise<ProcessedImage> {
  const kind = detectImageKind(buf);
  if (!kind) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE");
  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buf, { limitInputPixels: MAX_PIXELS }).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    throw new HttpError(422, "INVALID_IMAGE");
  }
  if (!width || !height) throw new HttpError(422, "INVALID_IMAGE");
  if (width * height > MAX_PIXELS) throw new HttpError(422, "IMAGE_TOO_LARGE");
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) throw new HttpError(422, "IMAGE_TOO_SMALL");
  const pipeline = (max: number, quality: number) =>
    sharp(buf, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
  type Out = { data: Buffer; info: { width: number; height: number } };
  let full: Out;
  let thumb: Out;
  try {
    [full, thumb] = await Promise.all([pipeline(MAX_DIMENSION, 82), pipeline(THUMB_DIMENSION, 80)]);
  } catch {
    throw new HttpError(422, "INVALID_IMAGE");
  }
  return {
    width: full.info.width,
    height: full.info.height,
    full: full.data,
    thumb: thumb.data,
    sizeBytes: full.data.length,
    thumbSizeBytes: thumb.data.length,
  };
}

export async function storeMedia(db: MediaDb, buf: Buffer, uploadedBy: string): Promise<MediaFile> {
  const processed = await processImage(buf);
  const id = newMediaId();
  await fs.mkdir(mediaDir(), { recursive: true });
  try {
    await fs.writeFile(filePathFor(id, "full"), processed.full);
    await fs.writeFile(filePathFor(id, "thumb"), processed.thumb);
    const [row] = await db
      .insert(mediaFile)
      .values({
        id,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.sizeBytes,
        thumbSizeBytes: processed.thumbSizeBytes,
        uploadedBy,
      })
      .returning();
    return row;
  } catch (e) {
    await fs.rm(filePathFor(id, "full"), { force: true });
    await fs.rm(filePathFor(id, "thumb"), { force: true });
    throw e;
  }
}

export async function deleteMediaFile(id: string): Promise<void> {
  await fs.rm(filePathFor(id, "full"), { force: true });
  await fs.rm(filePathFor(id, "thumb"), { force: true });
}

export async function deleteMediaIfOrphan(db: MediaDb, id: string): Promise<boolean> {
  const coverRef = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.coverMediaId, id))
    .limit(1);
  if (coverRef.length > 0) return false;
  const imgRef = await db
    .select({ id: projectImage.id })
    .from(projectImage)
    .where(eq(projectImage.mediaId, id))
    .limit(1);
  if (imgRef.length > 0) return false;
  await db.delete(mediaFile).where(eq(mediaFile.id, id));
  await deleteMediaFile(id);
  return true;
}

export async function isMediaPublic(db: MediaDb, id: string): Promise<boolean> {
  const cover = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.coverMediaId, id), eq(project.status, "published")))
    .limit(1);
  if (cover.length > 0) return true;
  const img = await db
    .select({ id: projectImage.id })
    .from(projectImage)
    .innerJoin(project, eq(projectImage.projectId, project.id))
    .where(and(eq(projectImage.mediaId, id), eq(project.status, "published")))
    .limit(1);
  return img.length > 0;
}
