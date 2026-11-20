import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "../auth/password";
import { isPasswordPolicyOk } from "@/lib/password-policy";
import { getDb } from "../db";
import * as schema from "../db/schema";

export const INVITATION_TTL_MS = 48 * 3600 * 1000;

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function audit(action: string, actorId: string | null, targetId: string | null, metadata?: Record<string, unknown>, ip?: string | null) {
  const db = getDb();
  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action,
    targetId,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ip: ip ?? null,
  });
}

export async function createInvitedUser(actorId: string, email: string, name: string, ip?: string | null) {
  const db = getDb();
  const id = crypto.randomUUID();
  const unknownPassword = crypto.randomBytes(32).toString("base64url");
  await db.insert(schema.user).values({
    id,
    name,
    email,
    emailVerified: false,
    role: "user",
    mustChangePassword: true,
  });
  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(unknownPassword),
  });
  const token = newToken();
  await db.insert(schema.invitation).values({
    id: crypto.randomUUID(),
    userId: id,
    tokenHash: hashToken(token),
    createdBy: actorId,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });
  await audit("user.created", actorId, id, { email }, ip);
  await audit("invitation.created", actorId, id, { email }, ip);
  return { userId: id, token };
}

export async function issueInvitation(actorId: string, userId: string, ip?: string | null) {
  const db = getDb();
  const u = await db.query.user.findFirst({ where: eq(schema.user.id, userId) });
  if (!u) return null;
  await db
    .delete(schema.invitation)
    .where(and(eq(schema.invitation.userId, userId), isNull(schema.invitation.usedAt)));
  const token = newToken();
  await db.insert(schema.invitation).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    createdBy: actorId,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });
  await audit("invitation.regenerated", actorId, userId, { email: u.email }, ip);
  return { token };
}

export type AcceptResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: "INVALID_LINK" | "PASSWORD_POLICY" };

export async function acceptInvitation(token: string, password: string, ip?: string | null): Promise<AcceptResult> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { ok: false, error: "INVALID_LINK" };
  if (!isPasswordPolicyOk(password)) return { ok: false, error: "PASSWORD_POLICY" };
  const db = getDb();
  const inv = await db.query.invitation.findFirst({
    where: eq(schema.invitation.tokenHash, hashToken(token)),
  });
  if (!inv || inv.usedAt || inv.expiresAt.getTime() <= Date.now()) return { ok: false, error: "INVALID_LINK" };
  const u = await db.query.user.findFirst({ where: eq(schema.user.id, inv.userId) });
  if (!u || u.banned) return { ok: false, error: "INVALID_LINK" };
  const consumed = await db
    .update(schema.invitation)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.invitation.id, inv.id), isNull(schema.invitation.usedAt)))
    .returning({ id: schema.invitation.id });
  if (consumed.length === 0) return { ok: false, error: "INVALID_LINK" };
  await db
    .update(schema.account)
    .set({ password: await hashPassword(password), updatedAt: new Date() })
    .where(and(eq(schema.account.userId, u.id), eq(schema.account.providerId, "credential")));
  await db
    .update(schema.user)
    .set({
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, u.id));
  await audit("invitation.used", u.id, u.id, { email: u.email }, ip);
  return { ok: true, userId: u.id, email: u.email };
}
