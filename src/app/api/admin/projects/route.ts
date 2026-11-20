import { projectInputSchema } from "@/lib/project-schema";
import { adminPost, json } from "@/server/admin/api";
import { getDb } from "@/server/db";
import { errorResponse, HttpError } from "@/server/http";
import { createProject } from "@/server/projects/mutations";

export async function POST(request: Request) {
  try {
    const { user, body } = await adminPost(request, { rateLimitKey: "admin:project-create", limit: 30 });
    const parsed = projectInputSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const row = await createProject(getDb(), user.id, parsed.data);
    return json({ id: row.id, slug: row.slug, status: row.status }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
