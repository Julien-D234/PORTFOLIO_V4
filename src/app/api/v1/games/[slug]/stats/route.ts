import { statsSchema } from "@/lib/game-schema";
import { getDb } from "@/server/db";
import { clientIp, errorResponse, HttpError, json, readJson } from "@/server/http";
import { gameLimitsOf, recordStat } from "@/server/games/mutations";
import { verifyGameToken } from "@/server/games/jwt";
import { allowRequest } from "@/server/rate-limit";

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const token = bearer(request);
    if (!token) throw new HttpError(401, "MISSING_TOKEN");
    const claims = verifyGameToken(token);
    if (!claims) throw new HttpError(401, "INVALID_TOKEN");
    const db = getDb();
    const game = await db.query.game.findFirst({ where: (g, { eq }) => eq(g.slug, slug) });
    if (!game || game.id !== claims.game || game.status !== "published") throw new HttpError(404, "GAME_NOT_FOUND");
    const limits = gameLimitsOf(game);
    if (!(await allowRequest(`game-stats:${claims.sub}:${claims.game}`, limits.maxStatsPerMin, 60_000))) {
      throw new HttpError(429, "RATE_LIMITED");
    }
    const parsed = statsSchema.safeParse(await readJson(request, limits.maxPayloadBytes + 4096));
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const result = await recordStat(db, token, parsed.data, clientIp(request));
    return json(result, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
