import "server-only";
import { defaultLocale } from "@/i18n/config";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authorize, type Role } from "./auth/authz";
import { createAuth } from "./auth/create-auth";
import { getDb } from "./db";

declare global {
  var __auth: ReturnType<typeof createAuth> | undefined;
}

export function getAuth() {
  if (!globalThis.__auth) globalThis.__auth = createAuth(getDb());
  return globalThis.__auth;
}

function langOf(h: Headers): string {
  return h.get("x-locale") === "en" ? "en" : defaultLocale;
}

export async function getSessionUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser() {
  const h = await headers();
  const lang = langOf(h);
  const user = await getSessionUser();
  if (!user) redirect(`/${lang}/login`);
  const decision = authorize(user, {});
  if (!decision.ok && decision.reason === "banned") redirect(`/${lang}/login`);
  if (!decision.ok && decision.reason === "must_change_password") redirect(`/${lang}/change-password`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const decision = authorize(user, { role: "admin" });
  if (!decision.ok) notFound();
  return user;
}

export async function requireApi(role?: Role) {
  const user = await getSessionUser();
  const json = (body: Record<string, string>, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  if (!user) throw json({ error: "UNAUTHORIZED" }, 401);
  const decision = authorize(user, { role });
  if (!decision.ok) {
    if (decision.reason === "must_change_password") throw json({ error: "MUST_CHANGE_PASSWORD" }, 403);
    throw json({ error: "FORBIDDEN" }, 403);
  }
  return user;
}
