import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { localeSchema } from "@/lib/profile-schema";
import { auditLog, user } from "@/server/db/schema";
import { setUserLocale } from "@/server/profile/queries";
import { createTestEnv, createUser, type TestEnv } from "./helpers/auth-env";

let env: TestEnv;

async function getEnv() {
  if (!env) env = await createTestEnv();
  return env;
}

describe("localeSchema", () => {
  it("accepte fr et en, refuse le reste", () => {
    expect(localeSchema.safeParse({ locale: "fr" }).success).toBe(true);
    expect(localeSchema.safeParse({ locale: "en" }).success).toBe(true);
    expect(localeSchema.safeParse({ locale: "de" }).success).toBe(false);
    expect(localeSchema.safeParse({ locale: "FR" }).success).toBe(false);
    expect(localeSchema.safeParse({}).success).toBe(false);
    expect(localeSchema.safeParse({ locale: "fr", extra: 1 }).success).toBe(true); // clés inconnues ignorées
  });
});

describe("setUserLocale (PGlite)", () => {
  it("met à jour user.locale et écrit l'audit", async () => {
    const e = await getEnv();
    const id = await createUser(e, { email: "profil@test.fr", password: "Mot-de-passe-123!" });
    const before = await e.db.select().from(user).where(eq(user.id, id));
    expect(before[0].locale).toBe("fr");

    const row = await setUserLocale(e.db, id, "en", "127.0.0.1");
    expect(row?.locale).toBe("en");

    const after = await e.db.select().from(user).where(eq(user.id, id));
    expect(after[0].locale).toBe("en");

    const audits = await e.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "profile.locale_changed"));
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[audits.length - 1].targetId).toBe(id);
    expect(JSON.parse(audits[audits.length - 1].metadata ?? "{}")).toEqual({ locale: "en" });
  });
});
