import { deleteGameSchema } from "@/lib/game-schema";
import { adminPost, json } from "@/server/admin/api";
import { getDb } from "@/server/db";
import { errorResponse, HttpError } from "@/server/http";
import { deleteGame } from "@/server/games/mutations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, body } = await adminPost(request, { rateLimitKey: "admin:game-delete", limit: 10 });
    const { id } = await params;
    const parsed = deleteGameSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const row = await deleteGame(getDb(), id, parsed.data.slugConfirm, user.id);
    return json({ deleted: true, slug: row.slug });
  } catch (e) {
    return errorResponse(e);
  }
}
