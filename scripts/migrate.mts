import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { dbUrl } from "./lib.mts";

if (!fs.existsSync("drizzle")) {
  console.log("Aucune migration : dossier drizzle/ absent, rien à appliquer.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: dbUrl(), max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("Migrations appliquées.");
} finally {
  await pool.end();
}
