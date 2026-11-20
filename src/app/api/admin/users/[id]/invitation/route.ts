import { adminPost, json } from "@/server/admin/api";
import { issueInvitation } from "@/server/admin/invitations";
import { errorResponse, HttpError, invitationLink } from "@/server/http";
import { isLocale } from "@/lib/locale";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, ip } = await adminPost(request, { rateLimitKey: "admin:invitation", limit: 20 });
    const result = await issueInvitation(user.id, id, ip);
    if (!result) throw new HttpError(404, "NOT_FOUND");
    const langParam = new URL(request.url).searchParams.get("lang");
    const lang = isLocale(langParam) ? langParam : "fr";
    return json({ link: invitationLink(lang, result.token) });
  } catch (e) {
    return errorResponse(e);
  }
}
