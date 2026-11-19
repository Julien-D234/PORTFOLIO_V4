import { APIError } from "better-auth/api";
import { afterEach, describe, expect, it } from "vitest";
import { cookieOf, createTestEnv, createUser, signIn, type TestEnv } from "./helpers/auth-env";

let env: TestEnv | undefined;

afterEach(async () => {
  if (env) {
    await env.client.close();
    env = undefined;
  }
});

async function setup() {
  env = await createTestEnv();
  return env;
}

describe("auth — socle", () => {
  it("désactive l'inscription publique", async () => {
    const e = await setup();
    await expect(
      e.auth.api.signUpEmail({
        body: { email: "a@b.dev", password: "aaaaaaaaaaaa", name: "A" },
        headers: new Headers(),
      }),
    ).rejects.toBeInstanceOf(APIError);
  });

  it("sign-in: mauvais mot de passe → 401, bon mot de passe → session + cookie", async () => {
    const e = await setup();
    await createUser(e, { email: "u@b.dev", password: "motdepasse-solide-1" });

    await expect(signIn(e, "u@b.dev", "mauvais-mot-de-passe")).resolves.toMatchObject({ status: 401 });

    const res = await signIn(e, "u@b.dev", "motdepasse-solide-1");
    expect(res.status).toBe(200);
    expect(cookieOf(res)).toContain("session_token");
  });

  it("verrouille le compte après 10 échecs (15 min), même avec le bon mot de passe", async () => {
    const e = await setup();
    const id = await createUser(e, { email: "lock@b.dev", password: "motdepasse-solide-2" });

    const outcome = (p: Promise<Response>) =>
      p.then((r) => r.status, (err) => (err instanceof APIError ? err.status : "thrown"));

    for (let i = 0; i < 10; i++) {
      expect([401, "UNAUTHORIZED"]).toContain(await outcome(signIn(e, "lock@b.dev", "mauvais-mot-de-passe")));
    }
    const u = await e.db.query.user.findFirst({ where: (t, { eq }) => eq(t.id, id) });
    expect(u?.failedLoginCount).toBe(10);
    expect(u?.lockedUntil).not.toBeNull();

    expect([401, "UNAUTHORIZED"]).toContain(await outcome(signIn(e, "lock@b.dev", "motdepasse-solide-2")));
  });

  it("un succès réinitialise le compteur d'échecs", async () => {
    const e = await setup();
    const id = await createUser(e, { email: "reset@b.dev", password: "motdepasse-solide-3" });
    await signIn(e, "reset@b.dev", "mauvais-1");
    await signIn(e, "reset@b.dev", "mauvais-2");
    await signIn(e, "reset@b.dev", "motdepasse-solide-3");
    const u = await e.db.query.user.findFirst({ where: (t, { eq }) => eq(t.id, id) });
    expect(u?.failedLoginCount).toBe(0);
    expect(u?.lockedUntil).toBeNull();
  });
});

describe("auth — garde-fous admin", () => {
  async function setupAdmin() {
    const e = await setup();
    const adminId = await createUser(e, { email: "admin@b.dev", password: "motdepasse-admin-1", role: "admin" });
    const targetId = await createUser(e, { email: "target@b.dev", password: "motdepasse-user-11" });
    const res = await signIn(e, "admin@b.dev", "motdepasse-admin-1");
    const headers = new Headers({ cookie: cookieOf(res) });
    return { e, adminId, targetId, headers };
  }

  it("bloque l'impersonation (403)", async () => {
    const { e, targetId, headers } = await setupAdmin();
    await expect(
      e.auth.api.impersonateUser({ body: { userId: targetId }, headers }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
  });

  it("SELF_ACTION: un admin ne peut pas se bannir / supprimer / rétrograder", async () => {
    const { e, adminId, headers } = await setupAdmin();
    await expect(e.auth.api.banUser({ body: { userId: adminId }, headers })).rejects.toMatchObject({
      body: { message: "SELF_ACTION" },
    });
    await expect(e.auth.api.removeUser({ body: { userId: adminId }, headers })).rejects.toMatchObject({
      body: { message: "SELF_ACTION" },
    });
    await expect(
      e.auth.api.setRole({ body: { userId: adminId, role: "user" }, headers }),
    ).rejects.toMatchObject({ body: { message: "SELF_ACTION" } });
    const ok = await e.auth.api.setRole({ body: { userId: adminId, role: "admin" }, headers });
    expect(ok).toBeTruthy();
  });

  it("politique de mot de passe appliquée aux endpoints admin (PASSWORD_POLICY)", async () => {
    const { e, headers } = await setupAdmin();
    await expect(
      e.auth.api.createUser({
        body: { email: "new@b.dev", password: "court", name: "New", role: "user" },
        headers,
      }),
    ).rejects.toMatchObject({ body: { message: "PASSWORD_POLICY" } });
    const ok = await e.auth.api.createUser({
      body: { email: "new@b.dev", password: "motdepasse-valide-1", name: "New", role: "user" },
      headers,
    });
    expect(ok.user.email).toBe("new@b.dev");
  });

  it("un non-admin ne peut pas appeler les endpoints admin", async () => {
    const { e } = await setupAdmin();
    const res = await signIn(e, "target@b.dev", "motdepasse-user-11");
    const userHeaders = new Headers({ cookie: cookieOf(res) });
    await expect(
      e.auth.api.listUsers({ headers: userHeaders, query: {} }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
  });
});
