import { deleteProjectSchema } from "@/lib/project-schema";
import { adminPost, json } from "@/server/admin/api";
import { getDb } from "@/server/db";
import { errorResponse, HttpError } from "@/server/http";
import { deleteProject } from "@/server/projects/mutations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, body } = await adminPost(request, { rateLimitKey: "admin:project-delete", limit: 10 });
    const { id } = await params;
    const parsed = deleteProjectSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT");
    const row = await deleteProject(getDb(), id, parsed.data.slugConfirm, user.id);
    return json({ deleted: true, slug: row.slug });
  } catch (e) {
    return errorResponse(e);
  }
}
