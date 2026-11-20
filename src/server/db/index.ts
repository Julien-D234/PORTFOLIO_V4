import { drizzle } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import pg from "pg";
import { requireEnv } from "../env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;
type AnyDb = Db | PgliteDatabase<typeof schema>;

declare global {
  var __portfolioDb: AnyDb | undefined;
  var __portfolioPool: pg.Pool | undefined;
}

export function getDb(): Db {
  if (!globalThis.__portfolioDb) {
    const max = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10);
    const pool = new pg.Pool({
      connectionString: requireEnv("DATABASE_URL"),
      max: Number.isFinite(max) && max > 0 ? max : 10,
    });
    globalThis.__portfolioPool = pool;
    globalThis.__portfolioDb = drizzle(pool, { schema });
  }
  return globalThis.__portfolioDb as Db;
}

export function setDbOverride(db: AnyDb | undefined): void {
  globalThis.__portfolioDb = db;
}

export async function closeDb(): Promise<void> {
  if (globalThis.__portfolioPool) {
    await globalThis.__portfolioPool.end();
    globalThis.__portfolioPool = undefined;
  }
  globalThis.__portfolioDb = undefined;
}
