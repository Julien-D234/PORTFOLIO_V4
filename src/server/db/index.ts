import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { requireEnv } from "../env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __portfolioDb: { pool: pg.Pool; db: Db } | undefined;
}

export function getDb(): Db {
  if (!globalThis.__portfolioDb) {
    const max = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10);
    const pool = new pg.Pool({
      connectionString: requireEnv("DATABASE_URL"),
      max: Number.isFinite(max) && max > 0 ? max : 10,
    });
    globalThis.__portfolioDb = { pool, db: drizzle(pool, { schema }) };
  }
  return globalThis.__portfolioDb.db;
}

export async function closeDb(): Promise<void> {
  if (globalThis.__portfolioDb) {
    await globalThis.__portfolioDb.pool.end();
    globalThis.__portfolioDb = undefined;
  }
}
