import { APIError } from "better-auth/api";
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { authSecret, requireEnv } from "../env";
import { hashPassword, isPasswordPolicyOk, verifyPassword } from "./password";

export const LOCKOUT_THRESHOLD = 10;
export const LOCKOUT_MS = 15 * 60 * 1000;

export type AuthDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const ADMIN_PASSWORD_PATHS = ["/admin/create-user", "/admin/set-user-password"];
const SELF_ACTION_PATHS = ["/admin/ban-user", "/admin/remove-user", "/admin/set-role"];

export interface CreateAuthOptions {
  baseURL?: string;
  secret?: string;
}

interface HookCtx {
  path: string;
  body: Record<string, unknown>;
  headers?: HeadersInit;
  context: { returned?: unknown };
}

const asHook = (ctx: unknown): HookCtx => ctx as HookCtx;

interface AuthRef {
  api: {
    getSession(args: { headers: HeadersInit }): Promise<{ user: { id: string } } | null>;
  };
}

export function createAuth(db: AuthDb, opts: CreateAuthOptions = {}) {
  const baseURL = opts.baseURL ?? requireEnv("BETTER_AUTH_URL");
  const secret = opts.secret ?? authSecret();
  const secure = baseURL.startsWith("https://");

  const ref: { auth: AuthRef | null } = { auth: null };

  async function audit(
    action: string,
    actorId: string | null,
    targetId: string | null,
    metadata?: Record<string, unknown>,
    ip?: string | null,
  ): Promise<void> {
    await db.insert(schema.auditLog).values({
      id: crypto.randomUUID(),
      actorId,
      action,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip: ip ?? null,
    });
  }

  const securityHooks = {
    id: "security-hooks",
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/admin/impersonate-user",
          handler: async () => {
            throw new APIError("FORBIDDEN", { message: "Impersonation is disabled" });
          },
        },
        {
          matcher: (ctx) => ctx.path === "/sign-in/email",
          handler: async (ctx) => {
            const c = asHook(ctx);
            const email = String(c.body?.email ?? "").toLowerCase();
            if (!email) return;
            const u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
            if (u?.lockedUntil && u.lockedUntil.getTime() > Date.now()) {
              throw new APIError("UNAUTHORIZED", { message: "Invalid email or password" });
            }
          },
        },
        {
          matcher: (ctx) => ADMIN_PASSWORD_PATHS.includes(ctx.path ?? ""),
          handler: async (ctx) => {
            const c = asHook(ctx);
            const password = String(c.body?.password ?? "");
            if (!isPasswordPolicyOk(password)) {
              throw new APIError("BAD_REQUEST", { message: "PASSWORD_POLICY" });
            }
          },
        },
        {
          matcher: (ctx) => SELF_ACTION_PATHS.includes(ctx.path ?? ""),
          handler: async (ctx) => {
            const c = asHook(ctx);
            const session = c.headers && ref.auth ? await ref.auth.api.getSession({ headers: c.headers }) : null;
            const sessionUser = session?.user;
            const targetId = String(c.body?.userId ?? "");
            if (!sessionUser || !targetId) return;
            if (c.path === "/admin/set-role") {
              const roles = String(c.body?.role ?? "").split(",");
              if (targetId === sessionUser.id && !roles.includes("admin")) {
                throw new APIError("FORBIDDEN", { message: "SELF_ACTION" });
              }
            } else if (targetId === sessionUser.id) {
              throw new APIError("FORBIDDEN", { message: "SELF_ACTION" });
            }
            const target = await db.query.user.findFirst({ where: eq(schema.user.id, targetId) });
            if (!target || !(target.role ?? "").split(",").includes("admin")) return;
            const wouldLoseAdmin =
              c.path === "/admin/set-role" ? !String(c.body?.role ?? "").split(",").includes("admin") : true;
            if (!wouldLoseAdmin) return;
            const all = await db.select().from(schema.user);
            const adminCount = all.filter((u) => (u.role ?? "").split(",").includes("admin")).length;
            if (adminCount <= 1) {
              throw new APIError("FORBIDDEN", { message: "LAST_ADMIN" });
            }
          },
        },
      ],
      after: [
        {
          matcher: (ctx) => ctx.path === "/change-password",
          handler: async (ctx) => {
            const c = asHook(ctx);
            if (c.context.returned instanceof APIError) return {};
            const session = c.headers && ref.auth ? await ref.auth.api.getSession({ headers: c.headers }) : null;
            if (session?.user) {
              await db
                .update(schema.user)
                .set({ mustChangePassword: false, updatedAt: new Date() })
                .where(eq(schema.user.id, session.user.id));
            }
            return {};
          },
        },
        {
          matcher: (ctx) => ctx.path === "/sign-in/email",
          handler: async (ctx) => {
            const c = asHook(ctx);
            const email = String(c.body?.email ?? "").toLowerCase();
            if (!email) return {};
            const u = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
            if (!u) return {};
            const failed = c.context.returned instanceof APIError;
            if (failed) {
              const count = (u.failedLoginCount ?? 0) + 1;
              const lockedUntil = count >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MS) : u.lockedUntil;
              await db
                .update(schema.user)
                .set({ failedLoginCount: count, lockedUntil })
                .where(eq(schema.user.id, u.id));
              await audit(
                count >= LOCKOUT_THRESHOLD ? "account_locked" : "login_failed",
                null,
                u.id,
                { email },
                c.headers ? new Headers(c.headers).get("x-forwarded-for") : null,
              );
            } else if ((u.failedLoginCount ?? 0) > 0 || u.lockedUntil) {
              await db
                .update(schema.user)
                .set({ failedLoginCount: 0, lockedUntil: null })
                .where(eq(schema.user.id, u.id));
            }
            return {};
          },
        },
      ],
    },
  } satisfies BetterAuthPlugin;

  const options = {
    baseURL,
    secret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    user: {
      additionalFields: {
        mustChangePassword: { type: "boolean", required: false, defaultValue: false },
        locale: { type: "string", required: false, defaultValue: "fr" },
        failedLoginCount: { type: "number", required: false, defaultValue: 0 },
        lockedUntil: { type: "date", required: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: {
        hash: (password: string) => hashPassword(password),
        verify: ({ hash, password }: { hash: string; password: string }) => verifyPassword(hash, password),
      },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: secure,
      cookiePrefix: secure ? "__Secure-" : "better-auth",
    },
    plugins: [admin({ adminRoles: ["admin"], defaultRole: "user" }), securityHooks],
  } satisfies BetterAuthOptions;

  const auth = betterAuth(options);
  ref.auth = auth;
  return auth;
}
