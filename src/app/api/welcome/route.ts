import { acceptInvitation } from "@/server/admin/invitations";
import { welcomeSchema } from "@/server/admin/schemas";
import { clientIp, errorResponse, HttpError, json, readJson } from "@/server/http";
import { allowRequest } from "@/server/rate-limit";
import { getAuth } from "@/server/guards";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    if (!(await allowRequest(`welcome:${ip}`, 10, 60_000))) {
      throw new HttpError(429, "RATE_LIMITED");
    }
    const body = await readJson(request);
    const parsed = welcomeSchema.safeParse(body);
    if (!parsed.success) return json({ error: "INVALID_LINK" }, 400);
    const result = await acceptInvitation(parsed.data.token, parsed.data.password, ip);
    if (!result.ok) {
      return json({ error: result.error }, 400);
    }
    const signIn = await getAuth().api.signInEmail({
      body: { email: result.email, password: parsed.data.password },
      headers: new Headers(),
      asResponse: true,
    });
    const setCookie = signIn.headers.get("set-cookie");
    return json(
      { ok: true },
      200,
      setCookie ? { "set-cookie": setCookie } : {},
    );
  } catch (e) {
    return errorResponse(e);
  }
}
