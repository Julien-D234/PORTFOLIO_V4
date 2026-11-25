import { gameInputSchema } from "@/lib/game-schema";
import { adminPost, json } from "@/server/admin/api";
import { getDb } from "@/server/db";
import { errorResponse, HttpError } from "@/server/http";
import { createGame } from "@/server/games/mutations";

export async function POST(request: Request) {
  try {
    const { user, body } = await adminPost(request, { rateLimitKey: "admin:game-create", limit: 30 });
    const parsed = gameInputSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const { game, apiKey } = await createGame(getDb(), user.id, parsed.data);
    return json({ id: game.id, slug: game.slug, status: game.status, apiKey }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
