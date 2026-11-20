import { requireApi } from "@/server/guards";
import { getDb } from "@/server/db";
import { errorResponse, HttpError, isSameOrigin, json } from "@/server/http";
import { setProjectStatus } from "@/server/projects/mutations";
import { allowRequest } from "@/server/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApi("admin");
    if (!isSameOrigin(request)) throw new HttpError(403, "FORBIDDEN");
    const ok = await allowRequest(`admin:project-unpublish:${user.id}`, 30, 60_000);
    if (!ok) throw new HttpError(429, "RATE_LIMITED");
    const { id } = await params;
    const row = await setProjectStatus(getDb(), id, "draft", user.id);
    return json({ id: row.id, status: row.status });
  } catch (e) {
    return errorResponse(e);
  }
}
