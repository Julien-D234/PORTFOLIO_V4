import { describe, expect, it } from "vitest";
import { gameInputSchema, statsSchema, GAME_LIMITS_DEFAULTS } from "@/lib/game-schema";
import { apiKeyMatches, hashApiKey, newApiKey } from "@/server/games/api-keys";
import { issueGameToken, verifyGameToken } from "@/server/games/jwt";
import {
  createGame,
  deleteGame,
  recordStat,
  refreshSession,
  setGameStatus,
  startSession,
  updateGame,
  verifyApiKeyForSlug,
} from "@/server/games/mutations";
import { getUserGameStats, listPublishedGames } from "@/server/games/queries";
import { createTestEnv, createUser, type TestEnv } from "./helpers/auth-env";
import { TEST_SECRET } from "./helpers/auth-env";

process.env.BETTER_AUTH_SECRET ??= TEST_SECRET;

let env: TestEnv;
async function getEnv() {
  if (!env) env = await createTestEnv();
  return env;
}

const baseGame = {
  slug: "mon-jeu",
  kind: "iframe" as const,
  url: "https://games.example.fr/mon-jeu",
  title: { fr: "Mon jeu", en: "My game" },
  summary: { fr: "Résumé" },
  position: 0,
  limits: {},
};

describe("jwt jeux", () => {
  const claims = { userId: "u1", gameId: "g1", sessionId: "s1" };
  it("issue/vérifie un aller-retour", () => {
    const token = issueGameToken(claims, 600, 1_000_000);
    const out = verifyGameToken(token, 1_000_000 + 1000);
    expect(out?.sub).toBe("u1");
    expect(out?.game).toBe("g1");
    expect(out?.sid).toBe("s1");
  });
  it("refuse un ticket trafiqué, un mauvais algo, un ticket expiré", () => {
    const token = issueGameToken(claims, 600, 1_000_000);
    const [h, p, s] = token.split(".");
    expect(verifyGameToken(`${h}.${p}.${s.slice(0, -2)}aa`, 1_000_000)).toBeNull();
    expect(verifyGameToken(`${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${p}.${s}`, 1_000_000)).toBeNull();
    expect(verifyGameToken(token, 1_000_000 + 601_000)).toBeNull();
    expect(verifyGameToken("garbage", 1_000_000)).toBeNull();
  });
});

describe("clés API", () => {
  it("hash + comparaison en temps constant", () => {
    const key = newApiKey();
    const hash = hashApiKey(key);
    expect(hash).not.toBe(key);
    expect(apiKeyMatches(key, hash)).toBe(true);
    expect(apiKeyMatches(key + "x", hash)).toBe(false);
  });
});

describe("gameInputSchema", () => {
  it("exige une URL https pour iframe, un module pour internal", () => {
    expect(gameInputSchema.safeParse(baseGame).success).toBe(true);
    expect(gameInputSchema.safeParse({ ...baseGame, url: "http://x.fr" }).success).toBe(false);
    expect(gameInputSchema.safeParse({ ...baseGame, url: null, kind: "internal", module: "snake" }).success).toBe(true);
    expect(gameInputSchema.safeParse({ ...baseGame, url: null, kind: "internal" }).success).toBe(false);
    expect(gameInputSchema.safeParse({ ...baseGame, slug: "Bad Slug" }).success).toBe(false);
  });
  it("valide le payload de stats", () => {
    expect(statsSchema.safeParse({ score: 10, durationSec: 30 }).success).toBe(true);
    expect(statsSchema.safeParse({ score: -1, durationSec: 30 }).success).toBe(false);
    expect(statsSchema.safeParse({ score: Number.NaN, durationSec: 30 }).success).toBe(false);
  });
});

describe("mutations jeux (PGlite)", () => {
  it("crée un jeu (clé affichée une fois, hash stocké), refuse le slug pris, publie", async () => {
    const e = await getEnv();
    const actorId = await createUser(e, { email: "admin-jeux@test.fr", password: "Mot-de-passe-123!", role: "admin" });
    const { game: g, apiKey } = await createGame(e.db, actorId, gameInputSchema.parse(baseGame));
    expect(apiKey.length).toBeGreaterThanOrEqual(32);
    expect(g.apiKeyHash).not.toBe(apiKey);
    expect(g.status).toBe("draft");
    await expect(createGame(e.db, actorId, gameInputSchema.parse(baseGame))).rejects.toMatchObject({ code: "SLUG_TAKEN" });
    expect((await verifyApiKeyForSlug(e.db, "mon-jeu", apiKey))?.id).toBe(g.id);
    expect(await verifyApiKeyForSlug(e.db, "mon-jeu", "mauvaise-cle")).toBeNull();
    expect(await listPublishedGames(e.db, "fr")).toEqual([]);
    await setGameStatus(e.db, g.id, "published", actorId);
    const list = await listPublishedGames(e.db, "fr");
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Mon jeu");
    // repli EN -> fr
    const listEn = await listPublishedGames(e.db, "en");
    expect(listEn[0].title).toBe("My game");
    return { game: g, actorId };
  });

  it("cycle session : start -> stats -> refresh -> stats, plafonds, session expirée", async () => {
    const e = await getEnv();
    const actorId = await createUser(e, { email: "admin-jeux2@test.fr", password: "Mot-de-passe-123!", role: "admin" });
    const playerId = await createUser(e, { email: "joueur@test.fr", password: "Mot-de-passe-123!" });
    const { game: g } = await createGame(e.db, actorId, gameInputSchema.parse({
      ...baseGame, slug: "cycle", limits: { maxScore: 100, maxSessionSec: 300 },
    }));
    await setGameStatus(e.db, g.id, "published", actorId);

    const T0 = 1_700_000_000_000;
    const started = await startSession(e.db, g.id, playerId, T0);
    const claims = verifyGameToken(started.token, T0);
    expect(claims?.sid).toBe(started.sessionId);

    // stat OK
    await recordStat(e.db, started.token, { score: 42, durationSec: 60, details: { niveau: 2 } }, "127.0.0.1", T0 + 60_000);
    // refresh OK tant que la session est ouverte
    const refreshed = await refreshSession(e.db, started.token, T0 + 100_000);
    expect(refreshed?.token).toBeTruthy();
    await recordStat(e.db, refreshed!.token, { score: 80, durationSec: 100 }, null, T0 + 100_000);

    // plafond de score
    await expect(
      recordStat(e.db, started.token, { score: 101, durationSec: 10 }, null, T0 + 110_000),
    ).rejects.toMatchObject({ code: "SCORE_TOO_HIGH" });
    // durée incohérente (plus que le temps écoulé + marge)
    await expect(
      recordStat(e.db, started.token, { score: 5, durationSec: 100_000 }, null, T0 + 110_000),
    ).rejects.toMatchObject({ code: "DURATION_INVALID" });
    // payload trop gros
    await expect(
      recordStat(e.db, started.token, { score: 5, durationSec: 10, details: { x: "y".repeat(9000) } }, null, T0 + 110_000),
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    // ticket expiré -> 401
    await expect(
      recordStat(e.db, started.token, { score: 5, durationSec: 10 }, null, T0 + 700_000),
    ).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    // session expirée (maxSessionSec=300) mais ticket encore valide à T0+400 -> 410
    await expect(
      recordStat(e.db, started.token, { score: 5, durationSec: 10 }, null, T0 + 400_000),
    ).rejects.toMatchObject({ code: "SESSION_CLOSED" });
    expect(await refreshSession(e.db, started.token, T0 + 400_000)).toBeNull();

    // stats visibles dans le profil
    const stats = await getUserGameStats(e.db, playerId, "fr");
    expect(stats).toHaveLength(1);
    expect(stats[0].slug).toBe("cycle");
    expect(stats[0].bestScore).toBe(80);
    expect(stats[0].sessions).toBe(1);

    // update + regenerate clé + delete par slug
    const upd = await updateGame(e.db, g.id, actorId, gameInputSchema.parse({ ...baseGame, slug: "cycle", limits: { maxScore: 100, maxSessionSec: 300 } }), { regenerateApiKey: true });
    expect(upd.apiKey).toBeTruthy();
    expect(await verifyApiKeyForSlug(e.db, "cycle", upd.apiKey!)).not.toBeNull();
    await expect(deleteGame(e.db, g.id, "mauvais", actorId)).rejects.toMatchObject({ code: "SLUG_MISMATCH" });
    await deleteGame(e.db, g.id, "cycle", actorId);
    expect(await listPublishedGames(e.db, "fr")).toHaveLength(1); // il reste mon-jeu
  });

  it("défauts de limites appliqués", () => {
    expect(GAME_LIMITS_DEFAULTS.maxSessionSec).toBe(4 * 3600);
  });
});
