import { sql } from "drizzle-orm";
import { getDb } from "./db";

export async function allowRequest(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const fullKey = `app:${key}`;
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit (id, key, count, last_request)
    VALUES (gen_random_uuid()::text, ${fullKey}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN ${now} - rate_limit.last_request > ${windowMs} THEN 1 ELSE rate_limit.count + 1 END,
      last_request = ${now}
    RETURNING count
  `);
  const count = Number(result.rows[0]?.count ?? 1);
  return count <= limit;
}
