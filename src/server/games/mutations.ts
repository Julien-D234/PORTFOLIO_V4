import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { GameInput, StatsInput } from "@/lib/game-schema";
import { GAME_LIMITS_DEFAULTS } from "@/lib/game-schema";
import { auditLog, game, gameSession, gameStat, user } from "../db/schema";
import { HttpError } from "../http";
import { apiKeyMatches, hashApiKey, newApiKey } from "./api-keys";
import { issueGameToken, verifyGameToken, type GameTokenClaims } from "./jwt";
import type { GamesDb } from "./queries";

export function gameIdOk(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function gameLimitsOf(row: typeof game.$inferSelect) {
  return { ...GAME_LIMITS_DEFAULTS, ...(row.limits ?? {}) };
}

async function slugTaken(db: GamesDb, slug: string, exceptId?: string): Promise<boolean> {
  const rows = await db.select({ id: game.id }).from(game).where(eq(game.slug, slug)).limit(1);
  return rows.length > 0 && rows[0].id !== exceptId;
}

export async function createGame(db: GamesDb, actorId: string, input: GameInput) {
  if (await slugTaken(db, input.slug)) throw new HttpError(409, "SLUG_TAKEN");
  const apiKey = newApiKey();
  const id = crypto.randomUUID();
  await db.insert(game).values({
    id,
    slug: input.slug,
    kind: input.kind,
    url: input.url ?? null,
    module: input.module ?? null,
    title: input.title,
    summary: input.summary,
    status: "draft",
    position: input.position,
    apiKeyHash: hashApiKey(apiKey),
    limits: input.limits,
  });
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "game_created",
    targetId: id,
    metadata: JSON.stringify({ slug: input.slug }),
  });
  const row = (await db.select().from(game).where(eq(game.id, id)).limit(1))[0];
  return { game: row, apiKey };
}

export async function updateGame(
  db: GamesDb,
  id: string,
  actorId: string,
  input: GameInput,
  opts: { regenerateApiKey?: boolean } = {},
) {
  if (!gameIdOk(id)) throw new HttpError(400, "INVALID_ID");
  const rows = await db.select().from(game).where(eq(game.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, "GAME_NOT_FOUND");
  if (input.slug !== existing.slug && (await slugTaken(db, input.slug, id))) throw new HttpError(409, "SLUG_TAKEN");
  const apiKey = opts.regenerateApiKey ? newApiKey() : null;
  await db
    .update(game)
    .set({
      slug: input.slug,
      kind: input.kind,
      url: input.url ?? null,
      module: input.module ?? null,
      title: input.title,
      summary: input.summary,
      position: input.position,
      limits: input.limits,
      ...(apiKey ? { apiKeyHash: hashApiKey(apiKey) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(game.id, id));
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "game_updated",
    targetId: id,
    metadata: JSON.stringify({ slug: input.slug, keyRegenerated: Boolean(apiKey) }),
  });
  const row = (await db.select().from(game).where(eq(game.id, id)).limit(1))[0];
  return { game: row, apiKey };
}

export async function setGameStatus(db: GamesDb, id: string, status: "published" | "draft", actorId: string) {
  if (!gameIdOk(id)) throw new HttpError(400, "INVALID_ID");
  const rows = await db.select().from(game).where(eq(game.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, "GAME_NOT_FOUND");
  if (status === "published" && !existing.title?.fr?.trim()) throw new HttpError(422, "MISSING_FR_TITLE");
  await db.update(game).set({ status, updatedAt: new Date() }).where(eq(game.id, id));
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: status === "published" ? "game_published" : "game_unpublished",
    targetId: id,
    metadata: JSON.stringify({ slug: existing.slug }),
  });
  return { ...existing, status };
}

export async function deleteGame(db: GamesDb, id: string, slugConfirm: string, actorId: string) {
  if (!gameIdOk(id)) throw new HttpError(400, "INVALID_ID");
  const rows = await db.select().from(game).where(eq(game.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, "GAME_NOT_FOUND");
  if (slugConfirm !== existing.slug) throw new HttpError(422, "SLUG_MISMATCH");
  await db.delete(game).where(eq(game.id, id));
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "game_deleted",
    targetId: id,
    metadata: JSON.stringify({ slug: existing.slug }),
  });
  return existing;
}

export async function verifyApiKeyForSlug(db: GamesDb, slug: string, key: string | null) {
  if (!key) return null;
  const g = await db.select().from(game).where(eq(game.slug, slug)).limit(1);
  const row = g[0];
  if (!row || !apiKeyMatches(key, row.apiKeyHash)) return null;
  return row;
}

export async function startSession(db: GamesDb, gameId: string, userId: string, nowMs: number = Date.now()) {
  const games = await db.select().from(game).where(eq(game.id, gameId)).limit(1);
  const g = games[0];
  if (!g) throw new HttpError(404, "GAME_NOT_FOUND");
  const users = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!users[0]) throw new HttpError(404, "USER_NOT_FOUND");
  const limits = gameLimitsOf(g);
  const startedAt = new Date(nowMs);
  const expiresAt = new Date(nowMs + limits.maxSessionSec * 1000);
  const sessionId = crypto.randomUUID();
  await db.insert(gameSession).values({
    id: sessionId,
    gameId: g.id,
    userId,
    startedAt,
    expiresAt,
  });
  const token = issueGameToken({ userId, gameId: g.id, sessionId }, undefined, nowMs);
  return { sessionId, token, expiresAt };
}

async function openSession(db: GamesDb, claims: GameTokenClaims, nowMs: number) {
  const rows = await db
    .select()
    .from(gameSession)
    .where(and(eq(gameSession.id, claims.sid), eq(gameSession.gameId, claims.game)))
    .limit(1);
  const session = rows[0];
  if (!session || session.userId !== claims.sub) return null;
  if (session.endedAt || session.expiresAt.getTime() <= nowMs) return null;
  return session;
}

export async function refreshSession(db: GamesDb, token: string, nowMs: number = Date.now()) {
  const claims = verifyGameToken(token, nowMs);
  if (!claims) return null;
  const session = await openSession(db, claims, nowMs);
  if (!session) return null;
  return { token: issueGameToken({ userId: claims.sub, gameId: claims.game, sessionId: claims.sid }, undefined, nowMs) };
}

export async function recordStat(
  db: GamesDb,
  token: string,
  input: StatsInput,
  ip: string | null,
  nowMs: number = Date.now(),
) {
  const claims = verifyGameToken(token, nowMs);
  if (!claims) throw new HttpError(401, "INVALID_TOKEN");
  const session = await openSession(db, claims, nowMs);
  if (!session) throw new HttpError(410, "SESSION_CLOSED");
  const games = await db.select().from(game).where(eq(game.id, claims.game)).limit(1);
  const g = games[0];
  if (!g) throw new HttpError(404, "GAME_NOT_FOUND");
  const limits = gameLimitsOf(g);
  if (input.score > limits.maxScore) throw new HttpError(422, "SCORE_TOO_HIGH");
  const elapsedSec = Math.floor((nowMs - session.startedAt.getTime()) / 1000);
  if (input.durationSec > elapsedSec + 300 || input.durationSec > limits.maxSessionSec) {
    throw new HttpError(422, "DURATION_INVALID");
  }
  const payload = input.details ?? {};
  if (JSON.stringify(payload).length > limits.maxPayloadBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
  await db.insert(gameStat).values({
    id: crypto.randomUUID(),
    sessionId: session.id,
    gameId: g.id,
    userId: claims.sub,
    score: input.score,
    durationSec: input.durationSec,
    payload,
    ip,
  });
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId: claims.sub,
    action: "game_stat",
    targetId: g.id,
    metadata: JSON.stringify({ slug: g.slug, score: input.score, sid: session.id }),
    ip,
  });
  return { ok: true };
}
