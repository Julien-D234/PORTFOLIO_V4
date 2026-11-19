import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
} satisfies Config;
