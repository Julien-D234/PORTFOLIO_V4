import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { acceptInvitation, createInvitedUser, issueInvitation } from "@/server/admin/invitations";
import { escapeLike } from "@/server/admin/queries";
import { setDbOverride } from "@/server/db";
import * as schema from "@/server/db/schema";
import { allowRequest } from "@/server/rate-limit";
import { createTestEnv, createUser, type TestEnv } from "./helpers/auth-env";

let env: TestEnv | undefined;

beforeEach(async () => {
  env = await createTestEnv();
  setDbOverride(env.db);
});

afterEach(async () => {
  setDbOverride(undefined);
  if (env) {
    await env.client.close();
    env = undefined;
  }
});

describe("invitations", () => {
  it("crée un invité, refuse un mauvais mdp sans consommer, active avec le bon, rejette le rejeu", async () => {
    const e = env!;
    const adminId = await createUser(e, { email: "a@b.dev", password: "motdepasse-admin-1", role: "admin" });
    const { userId, token } = await createInvitedUser(adminId, "invite@b.dev", "Invité");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const bad = await acceptInvitation(token, "court");
    expect(bad).toEqual({ ok: false, error: "PASSWORD_POLICY" });
    let inv = await e.db.query.invitation.findFirst({ where: eq(schema.invitation.userId, userId) });
    expect(inv?.usedAt).toBeNull();

    const ok = await acceptInvitation(token, "motdepasse-invite-1");
    expect(ok.ok).toBe(true);
    inv = await e.db.query.invitation.findFirst({ where: eq(schema.invitation.userId, userId) });
    expect(inv?.usedAt).not.toBeNull();
    const u = await e.db.query.user.findFirst({ where: eq(schema.user.id, userId) });
    expect(u?.mustChangePassword).toBe(false);
    expect(u?.emailVerified).toBe(true);

    expect(await acceptInvitation(token, "motdepasse-invite-1")).toEqual({ ok: false, error: "INVALID_LINK" });
    expect(await acceptInvitation("x".repeat(43), "motdepasse-invite-1")).toEqual({ ok: false, error: "INVALID_LINK" });
    expect(await acceptInvitation("!!!", "motdepasse-invite-1")).toEqual({ ok: false, error: "INVALID_LINK" });
  });

  it("la régénération invalide l'ancien lien", async () => {
    const e = env!;
    const adminId = await createUser(e, { email: "a@b.dev", password: "motdepasse-admin-1", role: "admin" });
    const { userId, token } = await createInvitedUser(adminId, "i2@b.dev", "I2");
    const regen = await issueInvitation(adminId, userId);
    expect(regen?.token).toBeTruthy();
    expect(await acceptInvitation(token, "motdepasse-invite-1")).toEqual({ ok: false, error: "INVALID_LINK" });
    expect((await acceptInvitation(regen!.token, "motdepasse-invite-2")).ok).toBe(true);
  });

  it("un compte banni ne peut pas activer son invitation (réponse identique)", async () => {
    const e = env!;
    const adminId = await createUser(e, { email: "a@b.dev", password: "motdepasse-admin-1", role: "admin" });
    const { userId, token } = await createInvitedUser(adminId, "banni@b.dev", "Banni");
    await e.db.update(schema.user).set({ banned: true }).where(eq(schema.user.id, userId));
    expect(await acceptInvitation(token, "motdepasse-invite-1")).toEqual({ ok: false, error: "INVALID_LINK" });
  });
});

describe("rate-limit applicatif", () => {
  it("autorise jusqu'à la limite puis bloque", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await allowRequest("test-key", 5, 60_000)).toBe(true);
    }
    expect(await allowRequest("test-key", 5, 60_000)).toBe(false);
  });
});

describe("escapeLike", () => {
  it("\u00e9chappe les caract\u00e8res sp\u00e9ciaux de LIKE", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
    expect(escapeLike("' OR 1=1--")).toBe("' OR 1=1--");
  });
});
