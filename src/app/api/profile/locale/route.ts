import { localeCookie } from "@/i18n/config";
import { localeSchema } from "@/lib/profile-schema";
import { getDb } from "@/server/db";
import { requireApi } from "@/server/guards";
import { clientIp, errorResponse, HttpError, isSameOrigin, json, readJson } from "@/server/http";
import { setUserLocale } from "@/server/profile/queries";
import { allowRequest } from "@/server/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireApi();
    if (!isSameOrigin(request)) throw new HttpError(403, "FORBIDDEN");
    const ok = await allowRequest(`profile-locale:${user.id}`, 10, 60_000);
    if (!ok) throw new HttpError(429, "RATE_LIMITED");
    const parsed = localeSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "INVALID_LOCALE");
    await setUserLocale(getDb(), user.id, parsed.data.locale, clientIp(request));
    const cookie = `${localeCookie}=${parsed.data.locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    return json({ ok: true, locale: parsed.data.locale }, 200, { "set-cookie": cookie });
  } catch (e) {
    return errorResponse(e);
  }
}
