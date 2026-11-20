import { adminPost, createUserSchema, json } from "@/server/admin/api";
import { createInvitedUser } from "@/server/admin/invitations";
import { errorResponse, HttpError, invitationLink } from "@/server/http";
import { isLocale } from "@/lib/locale";

export async function POST(request: Request) {
  try {
    const { user, body, ip } = await adminPost(request, { rateLimitKey: "admin:create-user", limit: 20 });
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const email = parsed.data.email.toLowerCase().trim();
    const existing = await createInvitedUser(user.id, email, parsed.data.name.trim(), ip);
    const lang = isLocale(new URL(request.url).searchParams.get("lang") ?? "")
      ? (new URL(request.url).searchParams.get("lang") as string)
      : "fr";
    return json(
      { userId: existing.userId, link: invitationLink(lang, existing.token) },
      201,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
