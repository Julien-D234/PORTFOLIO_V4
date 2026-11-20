import { adminPost, json } from "@/server/admin/api";
import { unlockUser } from "@/server/admin/queries";
import { errorResponse, HttpError } from "@/server/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, ip } = await adminPost(request, { rateLimitKey: "admin:unlock", limit: 30 });
    const ok = await unlockUser(user.id, id, ip);
    if (!ok) throw new HttpError(404, "NOT_FOUND");
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
