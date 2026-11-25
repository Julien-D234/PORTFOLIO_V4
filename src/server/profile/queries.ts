import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { Locale } from "@/i18n/config";
import * as schema from "../db/schema";
import { auditLog, user } from "../db/schema";

export type ProfileDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export async function setUserLocale(db: ProfileDb, userId: string, locale: Locale, ip?: string) {
  const rows = await db
    .update(user)
    .set({ locale, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning();
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId: userId,
    action: "profile.locale_changed",
    targetId: userId,
    metadata: JSON.stringify({ locale }),
    ip: ip ?? null,
  });
  return rows[0] ?? null;
}
