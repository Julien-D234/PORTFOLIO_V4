import { getDb } from "@/server/db";
import { errorResponse, HttpError, json } from "@/server/http";
import { verifyGameToken } from "@/server/games/jwt";
import { refreshSession } from "@/server/games/mutations";
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
    if (!(await allowRequest(`game-refresh:${claims.sid}`, 30, 60_000))) {
      throw new HttpError(429, "RATE_LIMITED");
    }
    const db = getDb();
    const game = await db.query.game.findFirst({ where: (g, { eq }) => eq(g.slug, slug) });
    if (!game || game.id !== claims.game || game.status !== "published") throw new HttpError(404, "GAME_NOT_FOUND");
    const refreshed = await refreshSession(db, token);
    if (!refreshed) throw new HttpError(410, "SESSION_CLOSED");
    return json({ token: refreshed.token });
  } catch (e) {
    return errorResponse(e);
  }
}
