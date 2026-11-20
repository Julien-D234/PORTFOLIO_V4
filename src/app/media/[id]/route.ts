import fs from "node:fs/promises";
import { authorize } from "@/server/auth/authz";
import { getDb } from "@/server/db";
import { getSessionUser } from "@/server/guards";
import { filePathFor, isMediaPublic, mediaIdOk, type MediaVariant } from "@/server/media";

export const runtime = "nodejs";

const NOT_FOUND = new Response("not found", { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mediaIdOk(id)) return NOT_FOUND;
  const variant: MediaVariant = new URL(request.url).searchParams.get("v") === "thumb" ? "thumb" : "full";
  const db = getDb();
  if (!(await isMediaPublic(db, id))) {
    const user = await getSessionUser();
    if (!authorize(user, { role: "admin" }).ok) return NOT_FOUND;
  }
  let data: Buffer;
  try {
    data = await fs.readFile(filePathFor(id, variant));
  } catch {
    return NOT_FOUND;
  }
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "content-type": "image/webp",
      "content-length": String(data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
