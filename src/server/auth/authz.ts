export type Role = "user" | "admin";

export interface AuthzUser {
  role?: string | null;
  banned?: boolean | null;
  banExpires?: Date | null;
  mustChangePassword?: boolean | null;
}

export type AuthzDecision =
  | { ok: true }
  | { ok: false; reason: "banned" | "role" | "must_change_password" };

export function authorize(
  user: AuthzUser | null | undefined,
  opts: { role?: Role; allowMustChangePassword?: boolean; now?: Date } = {},
): AuthzDecision {
  if (!user) return { ok: false, reason: "role" };
  const now = opts.now ?? new Date();
  if (user.banned && (!user.banExpires || user.banExpires.getTime() > now.getTime())) {
    return { ok: false, reason: "banned" };
  }
  if (opts.role) {
    if (!hasRole(user.role, opts.role)) return { ok: false, reason: "role" };
  }
  if (user.mustChangePassword && !opts.allowMustChangePassword) {
    return { ok: false, reason: "must_change_password" };
  }
  return { ok: true };
}

export function hasRole(roleValue: string | null | undefined, role: Role): boolean {
  return (roleValue ?? "user").split(",").map((r) => r.trim()).includes(role);
}
