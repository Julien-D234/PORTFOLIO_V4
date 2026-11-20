import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const userColumnKeys = [
  "id", "name", "email", "emailVerified", "role", "banned", "banReason", "banExpires",
  "mustChangePassword", "locale", "failedLoginCount", "lockedUntil", "createdAt",
] as const;

const userColumns = {
  id: schema.user.id,
  name: schema.user.name,
  email: schema.user.email,
  emailVerified: schema.user.emailVerified,
  role: schema.user.role,
  banned: schema.user.banned,
  banReason: schema.user.banReason,
  banExpires: schema.user.banExpires,
  mustChangePassword: schema.user.mustChangePassword,
  locale: schema.user.locale,
  failedLoginCount: schema.user.failedLoginCount,
  lockedUntil: schema.user.lockedUntil,
  createdAt: schema.user.createdAt,
};

const userColumnsBool = Object.fromEntries(userColumnKeys.map((k) => [k, true])) as Record<(typeof userColumnKeys)[number], true>;

export async function listUsers(opts: { search?: string; page?: number; perPage?: number } = {}) {
  const db = getDb();
  const perPage = Math.min(Math.max(opts.perPage ?? 20, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const clauses = [];
  if (opts.search) {
    const like = `%${escapeLike(opts.search)}%`;
    clauses.push(
      sql`(${schema.user.email} ILIKE ${like} ESCAPE '\\' OR ${schema.user.name} ILIKE ${like} ESCAPE '\\')`,
    );
  }
  const where = clauses.length ? and(...clauses) : undefined;
  const [rows, totalRows] = await Promise.all([
    db
      .select(userColumns)
      .from(schema.user)
      .where(where)
      .orderBy(asc(schema.user.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(schema.user).where(where),
  ]);
  const now = Date.now();
  const withStatus = rows.map((r) => ({ ...r, locked: !!r.lockedUntil && r.lockedUntil.getTime() > now }));
  return { rows: withStatus, total: Number(totalRows[0]?.value ?? 0), page, perPage };
}

export async function getUserWithSessions(id: string) {
  const db = getDb();
  const u = await db.query.user.findFirst({ where: eq(schema.user.id, id), columns: userColumnsBool });
  if (!u) return null;
  const sessions = await db
    .select({
      id: schema.session.id,
      ipAddress: schema.session.ipAddress,
      userAgent: schema.session.userAgent,
      createdAt: schema.session.createdAt,
      expiresAt: schema.session.expiresAt,
      impersonatedBy: schema.session.impersonatedBy,
    })
    .from(schema.session)
    .where(eq(schema.session.userId, id))
    .orderBy(desc(schema.session.createdAt));
  const locked = !!u.lockedUntil && u.lockedUntil.getTime() > Date.now();
  return { ...u, locked, sessions };
}

export async function listAudit(opts: { action?: string; targetId?: string; page?: number; perPage?: number } = {}) {
  const db = getDb();
  const perPage = Math.min(Math.max(opts.perPage ?? 20, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const clauses = [];
  if (opts.action) clauses.push(eq(schema.auditLog.action, opts.action));
  if (opts.targetId) clauses.push(eq(schema.auditLog.targetId, opts.targetId));
  const where = clauses.length ? and(...clauses) : undefined;
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: schema.auditLog.id,
        actorId: schema.auditLog.actorId,
        action: schema.auditLog.action,
        targetId: schema.auditLog.targetId,
        metadata: schema.auditLog.metadata,
        ip: schema.auditLog.ip,
        createdAt: schema.auditLog.createdAt,
      })
      .from(schema.auditLog)
      .where(where)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(schema.auditLog).where(where),
  ]);
  return { rows, total: Number(totalRows[0]?.value ?? 0), page, perPage };
}

export async function listAuditActions(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ action: schema.auditLog.action })
    .from(schema.auditLog)
    .orderBy(asc(schema.auditLog.action));
  return rows.map((r) => r.action);
}

export async function countUsers(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ value: count() }).from(schema.user);
  return Number(rows[0]?.value ?? 0);
}

export async function unlockUser(actorId: string, userId: string, ip?: string | null): Promise<boolean> {
  const db = getDb();
  const res = await db
    .update(schema.user)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(schema.user.id, userId))
    .returning({ id: schema.user.id });
  if (res.length === 0) return false;
  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "user.unlocked",
    targetId: userId,
    ip: ip ?? null,
  });
  return true;
}

export { isNull };
