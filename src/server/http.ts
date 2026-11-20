import { requireEnv } from "./env";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(requireEnv("BETTER_AUTH_URL")).origin;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(len) && len > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "INVALID_JSON");
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof Response) return e;
  if (e instanceof HttpError) return json({ error: e.code }, e.status);
  console.error(e);
  return json({ error: "INTERNAL" }, 500);
}

export function invitationLink(lang: string, token: string): string {
  const origin = new URL(requireEnv("BETTER_AUTH_URL")).origin;
  return `${origin}/${lang}/welcome#token=${token}`;
}
