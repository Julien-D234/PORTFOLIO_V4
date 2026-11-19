import { describe, expect, it } from "vitest";
import { authorize, hasRole } from "@/server/auth/authz";

const base = { role: "user", banned: false, banExpires: null, mustChangePassword: false };
const now = new Date("2026-11-19T12:00:00Z");

describe("authorize", () => {
  it("accepte un user simple sans rôle requis", () => {
    expect(authorize(base, { now })).toEqual({ ok: true });
  });

  it("refuse sans utilisateur", () => {
    expect(authorize(null, { now })).toEqual({ ok: false, reason: "role" });
  });

  it("refuse le rôle admin pour un user", () => {
    expect(authorize(base, { role: "admin", now })).toEqual({ ok: false, reason: "role" });
  });

  it("accepte un admin pour le rôle admin", () => {
    expect(authorize({ ...base, role: "admin" }, { role: "admin", now })).toEqual({ ok: true });
  });

  it("gère les rôles multiples 'user,admin' élément par élément", () => {
    const u = { ...base, role: "user,admin" };
    expect(authorize(u, { role: "admin", now })).toEqual({ ok: true });
    expect(authorize({ ...base, role: "admin,user" }, { role: "user", now })).toEqual({ ok: true });
    expect(hasRole("user,admin", "admin")).toBe(true);
    expect(hasRole("user,administrator", "admin")).toBe(false);
  });

  it("refuse un compte banni, sauf si le bannissement a expiré", () => {
    const banned = { ...base, banned: true, banExpires: null };
    expect(authorize(banned, { now })).toEqual({ ok: false, reason: "banned" });
    const expired = { ...base, banned: true, banExpires: new Date("2026-11-01T00:00:00Z") };
    expect(authorize(expired, { now })).toEqual({ ok: true });
  });

  it("refuse mustChangePassword sauf si explicitement autorisé", () => {
    const u = { ...base, mustChangePassword: true };
    expect(authorize(u, { now })).toEqual({ ok: false, reason: "must_change_password" });
    expect(authorize(u, { now, allowMustChangePassword: true })).toEqual({ ok: true });
  });
});
