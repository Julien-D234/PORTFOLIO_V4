import { asc, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { Locale } from "@/i18n/config";
import * as schema from "../db/schema";
import { game, gameSession, gameStat } from "../db/schema";
import { pickLocaleText } from "../projects/public";

export type GamesDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export interface PublicGame {
  id: string;
  slug: string;
  kind: string;
  position: number;
  title: string;
  summary: string;
}

export async function listPublishedGames(db: GamesDb, locale: Locale): Promise<PublicGame[]> {
  const rows = await db
    .select()
    .from(game)
    .where(eq(game.status, "published"))
    .orderBy(asc(game.position), asc(game.createdAt));
  return rows.map((g) => ({
    id: g.id,
    slug: g.slug,
    kind: g.kind,
    position: g.position,
    title: pickLocaleText(g.title, locale) ?? g.slug,
    summary: pickLocaleText(g.summary, locale) ?? "",
  }));
}

export async function getPublishedGame(db: GamesDb, slug: string) {
  const rows = await db.select().from(game).where(eq(game.slug, slug)).limit(1);
  const row = rows[0];
  if (!row || row.status !== "published") return null;
  return row;
}

export async function getGameBySlug(db: GamesDb, slug: string) {
  const rows = await db.select().from(game).where(eq(game.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function listGamesAdmin(db: GamesDb) {
  return db.select().from(game).orderBy(asc(game.position), asc(game.createdAt));
}

export async function getGameAdmin(db: GamesDb, id: string) {
  const rows = await db.select().from(game).where(eq(game.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, apiKeyHash: undefined as unknown as string, hasApiKey: Boolean(row.apiKeyHash) };
}

export interface UserGameStats {
  gameId: string;
  slug: string;
  title: string;
  bestScore: number;
  sessions: number;
  lastPlayedAt: Date | null;
}

export async function getUserGameStats(db: GamesDb, userId: string, locale: Locale): Promise<UserGameStats[]> {
  const rows = await db
    .select({
      gameId: gameStat.gameId,
      bestScore: sql<number>`max(${gameStat.score})`,
      stats: sql<number>`count(*)`,
      lastPlayedAt: sql<string | null>`max(${gameStat.createdAt})`,
    })
    .from(gameStat)
    .where(eq(gameStat.userId, userId))
    .groupBy(gameStat.gameId);
  if (rows.length === 0) return [];
  const games = await db.select().from(game).where(inArray(game.id, rows.map((r) => r.gameId)));
  const byId = new Map(games.map((g) => [g.id, g]));
  const sessions = await db
    .select({ gameId: gameSession.gameId, count: sql<number>`count(*)` })
    .from(gameSession)
    .where(eq(gameSession.userId, userId))
    .groupBy(gameSession.gameId);
  const sessionCount = new Map(sessions.map((s) => [s.gameId, Number(s.count)]));
  return rows
    .map((r) => {
      const g = byId.get(r.gameId);
      if (!g) return null;
      return {
        gameId: r.gameId,
        slug: g.slug,
        title: pickLocaleText(g.title, locale) ?? g.slug,
        bestScore: Number(r.bestScore ?? 0),
        sessions: sessionCount.get(r.gameId) ?? 0,
        lastPlayedAt: r.lastPlayedAt ? new Date(r.lastPlayedAt) : null,
      };
    })
    .filter((r): r is UserGameStats => r !== null)
    .sort((a, b) => (b.lastPlayedAt?.getTime() ?? 0) - (a.lastPlayedAt?.getTime() ?? 0));
}

