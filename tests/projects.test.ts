import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { LIMITS, projectInputSchema, slugRegex } from "@/lib/project-schema";
import { mediaFile, project, projectImage, tag } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import {
  createProject,
  deleteProject,
  setProjectStatus,
  updateProject,
} from "@/server/projects/mutations";
import { getPublishedProject, listPublishedProjects } from "@/server/projects/public";
import { createTestEnv, createUser, type TestEnv } from "./helpers/auth-env";

let env: TestEnv;
let actorId: string;

beforeAll(async () => {
  env = await createTestEnv();
  actorId = await createUser(env, { email: "admin-projets@test.fr", password: "Mot-de-passe-123!", role: "admin" });
});

async function makeMedia(id: string) {
  await env.db.insert(mediaFile).values({
    id,
    width: 1920,
    height: 1080,
    sizeBytes: 1000,
    thumbSizeBytes: 200,
    uploadedBy: actorId,
  });
}

function rawInput(over: Record<string, unknown> = {}) {
  return {
    slug: "mon-projet",
    position: 0,
    translations: [
      { locale: "fr", title: "Mon projet", summary: "Un résumé", description: "Description FR", coverAlt: "couverture" },
    ],
    tags: ["Web", "web"],
    gallery: [],
    ...over,
  };
}

function input(over: Record<string, unknown> = {}) {
  return projectInputSchema.parse(rawInput(over));
}

describe("projectInputSchema (Zod)", () => {
  it("valide un slug propre et refuse les autres", () => {
    expect(slugRegex.test("mon-projet-2")).toBe(true);
    expect(slugRegex.test("Mon Projet")).toBe(false);
    expect(slugRegex.test("-leading")).toBe(false);
    expect(slugRegex.test("double--tiret")).toBe(false);
    expect(projectInputSchema.safeParse(rawInput({ slug: "Invalide!" })).success).toBe(false);
  });

  it("exige https sans credentials pour url / repoUrl", () => {
    expect(projectInputSchema.safeParse(rawInput({ url: "http://example.fr" })).success).toBe(false);
    expect(projectInputSchema.safeParse(rawInput({ url: "https://user:pass@example.fr" })).success).toBe(false);
    expect(projectInputSchema.safeParse(rawInput({ url: "https://example.fr/projet" })).success).toBe(true);
  });

  it("applique les limites et refuse les doublons de langue", () => {
    expect(
      projectInputSchema.safeParse(rawInput({ translations: [{ locale: "fr", title: "x".repeat(LIMITS.title + 1), summary: "s" }] })).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse(
        rawInput({
          translations: [
            { locale: "fr", title: "t", summary: "s" },
            { locale: "fr", title: "t2", summary: "s2" },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse(rawInput({ gallery: Array.from({ length: LIMITS.gallery + 1 }, (_, i) => ({ mediaId: "a".repeat(32), position: i, alt: {}, caption: {} })) })).success,
    ).toBe(false);
  });
});

describe("mutations projets (PGlite)", () => {
  it("crée un brouillon, refuse le slug pris, publie, liste, détaille avec repli fr", async () => {
    const row = await createProject(env.db, actorId, input());
    expect(row.status).toBe("draft");

    await expect(createProject(env.db, actorId, input())).rejects.toMatchObject({ code: "SLUG_TAKEN" });
    expect(await listPublishedProjects(env.db, "fr")).toEqual([]);
    expect(await getPublishedProject(env.db, "fr", "mon-projet")).toBeNull();

    const published = await setProjectStatus(env.db, row.id, "published", actorId);
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBeTruthy();

    const list = await listPublishedProjects(env.db, "fr");
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Mon projet");
    expect(list[0].tags).toEqual(["Web"]);

    const en = await getPublishedProject(env.db, "en", "mon-projet");
    expect(en?.title).toBe("Mon projet");
    expect(en?.description).toBe("Description FR");
    expect(en?.coverAlt).toBe("couverture");
  });

  it("refuse la publication sans contenu fr", async () => {
    const row = await createProject(
      env.db,
      actorId,
      input({
        slug: "sans-fr",
        translations: [{ locale: "en", title: "EN only", summary: "summary" }],
      }),
    );
    await expect(setProjectStatus(env.db, row.id, "published", actorId)).rejects.toMatchObject({
      code: "MISSING_FR_CONTENT",
    });
  });

  it("met à jour (traduction en, galerie) et nettoie les médias orphelins", async () => {
    const m1 = "a".repeat(32);
    const m2 = "b".repeat(32);
    await makeMedia(m1);
    await makeMedia(m2);
    const row = await createProject(env.db, actorId, input({ slug: "maj", gallery: [{ mediaId: m1, position: 0, alt: { fr: "alt1" }, caption: { en: "cap1" } }] }));

    await expect(
      updateProject(env.db, row.id, actorId, input({ slug: "maj", gallery: [{ mediaId: "c".repeat(32), position: 0, alt: {}, caption: {} }] })),
    ).rejects.toMatchObject({ code: "INVALID_MEDIA" });

    await updateProject(
      env.db,
      row.id,
      actorId,
      input({
        slug: "maj",
        coverMediaId: m2,
        translations: [
          { locale: "fr", title: "Maj", summary: "s", description: "d" },
          { locale: "en", title: "Updated", summary: "s-en", description: "d-en" },
        ],
        gallery: [{ mediaId: m2, position: 0, alt: { fr: "alt2" }, caption: {} }],
      }),
    );

    const en = await getPublishedProject(env.db, "en", "maj");
    expect(en).toBeNull();
    await setProjectStatus(env.db, row.id, "published", actorId);
    const detail = await getPublishedProject(env.db, "en", "maj");
    expect(detail?.title).toBe("Updated");
    expect(detail?.gallery).toHaveLength(1);
    expect(detail?.gallery[0].alt).toBe("alt2");
    expect(detail?.gallery[0].caption).toBeNull();
    expect(detail?.cover?.id).toBe(m2);

    const orphan = await env.db.select().from(mediaFile).where(eq(mediaFile.id, m1));
    expect(orphan).toHaveLength(0);

    const tags = await env.db.select().from(tag);
    expect(tags.map((t) => t.name).sort()).toEqual(["Web"]);
  });

  it("supprime uniquement avec le bon slug et efface les médias orphelins", async () => {
    const m = "d".repeat(32);
    await makeMedia(m);
    const row = await createProject(env.db, actorId, input({ slug: "a-supprimer", coverMediaId: m }));
    await expect(deleteProject(env.db, row.id, "mauvais-slug", actorId)).rejects.toMatchObject({
      code: "SLUG_MISMATCH",
    });
    await deleteProject(env.db, row.id, "a-supprimer", actorId);
    expect(await env.db.select().from(project).where(eq(project.id, row.id))).toHaveLength(0);
    expect(await env.db.select().from(mediaFile).where(eq(mediaFile.id, m))).toHaveLength(0);
    expect(await env.db.select().from(projectImage).where(eq(projectImage.projectId, row.id))).toHaveLength(0);
  });

  it("404 sur projet inconnu", async () => {
    await expect(
      setProjectStatus(env.db, crypto.randomUUID(), "published", actorId),
    ).rejects.toBeInstanceOf(HttpError);
  });
});
