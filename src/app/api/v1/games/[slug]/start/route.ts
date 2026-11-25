import { startSchema } from "@/lib/game-schema";
import { getDb } from "@/server/db";
import { clientIp, errorResponse, HttpError, json, readJson } from "@/server/http";
import { verifyApiKeyForSlug, startSession } from "@/server/games/mutations";
import { allowRequest } from "@/server/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const key = request.headers.get("x-api-key");
    if (!key) throw new HttpError(401, "MISSING_API_KEY");
    const game = await verifyApiKeyForSlug(getDb(), slug, key);
    if (!game) throw new HttpError(401, "INVALID_API_KEY");
    if (!(await allowRequest(`game-start:${game.id}:${clientIp(request)}`, 30, 60_000))) {
      throw new HttpError(429, "RATE_LIMITED");
    }
    const parsed = startSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const started = await startSession(getDb(), game.id, parsed.data.userId);
    return json({ token: started.token, sessionId: started.sessionId, expiresAt: started.expiresAt }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
