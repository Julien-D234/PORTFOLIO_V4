import { projectInputSchema } from "@/lib/project-schema";
import { adminPost, json } from "@/server/admin/api";
import { getDb } from "@/server/db";
import { errorResponse, HttpError } from "@/server/http";
import { updateProject } from "@/server/projects/mutations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, body } = await adminPost(request, { rateLimitKey: "admin:project-update", limit: 60 });
    const { id } = await params;
    const parsed = projectInputSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const row = await updateProject(getDb(), id, user.id, parsed.data);
    return json({ id: row.id, slug: row.slug, status: row.status });
  } catch (e) {
    return errorResponse(e);
  }
}
