import { gameInputSchema } from "@/lib/game-schema";
import { z } from "zod";
import { adminPost, json } from "@/server/admin/api";
import { getDb } from "@/server/db";
import { errorResponse, HttpError } from "@/server/http";
import { updateGame } from "@/server/games/mutations";

const updateSchema = z.object({
  game: gameInputSchema,
  regenerateApiKey: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, body } = await adminPost(request, { rateLimitKey: "admin:game-update", limit: 60 });
    const { id } = await params;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const { game, apiKey } = await updateGame(getDb(), id, user.id, parsed.data.game, {
      regenerateApiKey: parsed.data.regenerateApiKey,
    });
    return json({ id: game.id, slug: game.slug, status: game.status, apiKey: apiKey ?? undefined });
  } catch (e) {
    return errorResponse(e);
  }
}
