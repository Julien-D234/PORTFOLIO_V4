import { requireApi } from "../guards";
import { clientIp, HttpError, isSameOrigin, json, readJson } from "../http";
import { allowRequest } from "../rate-limit";

export { createUserSchema, welcomeSchema } from "./schemas";
export { json };

export async function adminPost(
  request: Request,
  opts: { rateLimitKey?: string; limit?: number; windowMs?: number } = {},
) {
  const user = await requireApi("admin");
  if (!isSameOrigin(request)) throw new HttpError(403, "FORBIDDEN");
  if (opts.rateLimitKey) {
    const ok = await allowRequest(`${opts.rateLimitKey}:${user.id}`, opts.limit ?? 60, opts.windowMs ?? 60_000);
    if (!ok) throw new HttpError(429, "RATE_LIMITED");
  }
  const body = await readJson(request);
  return { user, body, ip: clientIp(request) };
}
