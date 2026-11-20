import { requireApi } from "@/server/guards";
import { clientIp, errorResponse, HttpError, isSameOrigin, json } from "@/server/http";
import { MAX_UPLOAD_BYTES, storeMedia } from "@/server/media";
import { allowRequest } from "@/server/rate-limit";
import { getDb } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApi("admin");
    if (!isSameOrigin(request)) throw new HttpError(403, "FORBIDDEN");
    const ok = await allowRequest(`media-upload:${user.id}:${clientIp(request)}`, 20, 60_000);
    if (!ok) throw new HttpError(429, "RATE_LIMITED");
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
    const buf = Buffer.from(await request.arrayBuffer());
    if (buf.length === 0) throw new HttpError(400, "EMPTY_BODY");
    if (buf.length > MAX_UPLOAD_BYTES) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
    const row = await storeMedia(getDb(), buf, user.id);
    return json(
      {
        id: row.id,
        width: row.width,
        height: row.height,
        url: `/media/${row.id}`,
        thumbUrl: `/media/${row.id}?v=thumb`,
      },
      201,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
