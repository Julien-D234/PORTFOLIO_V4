import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { project } from "@/server/db/schema";
import {
  deleteMediaIfOrphan,
  detectImageKind,
  filePathFor,
  isMediaPublic,
  MAX_UPLOAD_BYTES,
  processImage,
  storeMedia,
} from "@/server/media";
import { createTestEnv, createUser, type TestEnv } from "./helpers/auth-env";

let env: TestEnv;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-media-test-"));
  process.env.MEDIA_DIR = tmpDir;
  env = await createTestEnv();
});

afterAll(async () => {
  await env.client.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
  delete process.env.MEDIA_DIR;
});

function makeImage(format: "png" | "jpeg" | "webp", width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    [format]()
    .toBuffer();
}

describe("detectImageKind (octets magiques)", () => {
  it("reconnaît jpeg, png, webp", async () => {
    expect(detectImageKind(await makeImage("jpeg", 120, 120))).toBe("jpeg");
    expect(detectImageKind(await makeImage("png", 120, 120))).toBe("png");
    expect(detectImageKind(await makeImage("webp", 120, 120))).toBe("webp");
  });

  it("refuse SVG, GIF et le contenu quelconque", () => {
    expect(detectImageKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectImageKind(Buffer.from("GIF89a" + "x".repeat(64)))).toBeNull();
    expect(detectImageKind(Buffer.from("hello world"))).toBeNull();
    expect(detectImageKind(Buffer.alloc(0))).toBeNull();
  });
});

describe("processImage (sharp)", () => {
  it("convertit en WebP, conserve les dimensions sous 1920 px et supprime les métadonnées", async () => {
    const out = await processImage(await makeImage("png", 800, 600));
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
    const fullMeta = await sharp(out.full).metadata();
    expect(fullMeta.format).toBe("webp");
    expect(fullMeta.exif).toBeUndefined();
    const thumbMeta = await sharp(out.thumb).metadata();
    expect(thumbMeta.format).toBe("webp");
    expect(thumbMeta.width).toBeLessThanOrEqual(480);
    expect(out.sizeBytes).toBe(out.full.length);
    expect(out.thumbSizeBytes).toBe(out.thumb.length);
  });

  it("réduit une image large à 1920 px de large", async () => {
    const out = await processImage(await makeImage("jpeg", 4000, 1000));
    expect(out.width).toBe(1920);
    expect(out.height).toBe(480);
  });

  it("refuse les bombes de décompression (> 40 Mpx)", async () => {
    const bomb = await makeImage("png", 7000, 7000);
    await expect(processImage(bomb)).rejects.toMatchObject({ status: 422 });
  });

  it("refuse les images trop petites (< 100 px)", async () => {
    await expect(processImage(await makeImage("png", 50, 50))).rejects.toMatchObject({
      code: "IMAGE_TOO_SMALL",
    });
  });

  it("refuse un contenu corrompu malgré une bonne signature", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(256, 7)]);
    await expect(processImage(fake)).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });

  it("refuse SVG/GIF avec 415", async () => {
    await expect(processImage(Buffer.from("<svg></svg>"))).rejects.toMatchObject({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
    await expect(processImage(Buffer.from("GIF89a...."))).rejects.toMatchObject({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });
});

describe("storeMedia / isMediaPublic / deleteMediaIfOrphan (PGlite)", () => {
  it("stocke, publie via un projet, puis nettoie l'orphelin", async () => {
    const userId = await createUser(env, { email: "media@test.fr", password: "Mot-de-passe-123!" });
    const row = await storeMedia(env.db, await makeImage("png", 900, 700), userId);
    expect(row.id).toMatch(/^[0-9a-f]{32}$/);
    await expect(fs.stat(filePathFor(row.id, "full"))).resolves.toBeTruthy();
    await expect(fs.stat(filePathFor(row.id, "thumb"))).resolves.toBeTruthy();

    expect(await isMediaPublic(env.db, row.id)).toBe(false);

    await env.db.insert(project).values({
      id: crypto.randomUUID(),
      slug: "projet-test",
      status: "draft",
      coverMediaId: row.id,
    });
    expect(await isMediaPublic(env.db, row.id)).toBe(false);

    await env.db.update(project).set({ status: "published", publishedAt: new Date() }).where(eq(project.slug, "projet-test"));
    expect(await isMediaPublic(env.db, row.id)).toBe(true);

    expect(await deleteMediaIfOrphan(env.db, row.id)).toBe(false);
    await env.db.delete(project).where(eq(project.slug, "projet-test"));
    expect(await deleteMediaIfOrphan(env.db, row.id)).toBe(true);
    await expect(fs.stat(filePathFor(row.id, "full"))).rejects.toThrow();
    await expect(fs.stat(filePathFor(row.id, "thumb"))).rejects.toThrow();
  });

  it("la limite d'upload est de 5 Mo", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});
