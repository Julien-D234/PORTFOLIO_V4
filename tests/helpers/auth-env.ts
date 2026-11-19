import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuth } from "@/server/auth/create-auth";
import { hashPassword } from "@/server/auth/password";
import * as schema from "@/server/db/schema";

export const TEST_SECRET = "test-secret-test-secret-test-secret-32";

export async function createTestEnv() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  const auth = createAuth(db, { baseURL: "http://localhost:3000", secret: TEST_SECRET });
  return { auth, db, client };
}

export type TestEnv = Awaited<ReturnType<typeof createTestEnv>>;

export async function createUser(
  env: TestEnv,
  opts: { email: string; password: string; role?: string; mustChangePassword?: boolean },
) {
  const id = crypto.randomUUID();
  await env.db.insert(schema.user).values({
    id,
    name: opts.email,
    email: opts.email,
    emailVerified: true,
    role: opts.role ?? "user",
    mustChangePassword: opts.mustChangePassword ?? false,
  });
  await env.db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(opts.password),
  });
  return id;
}

export async function signIn(env: TestEnv, email: string, password: string) {
  return env.auth.api.signInEmail({
    body: { email, password },
    headers: new Headers(),
    asResponse: true,
  });
}

export function cookieOf(res: Response): string {
  return res.headers.get("set-cookie") ?? "";
}
