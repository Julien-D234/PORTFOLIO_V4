import { locales } from "@/i18n/config";

const localePrefix = new RegExp(`^/(${locales.join("|")})(?:/|$)`);

export function safeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback;
  if (!target.startsWith("/")) return fallback;
  if (target.startsWith("//")) return fallback;
  if (target.includes("\\")) return fallback;
  if (target.includes("..")) return fallback;
  if (!localePrefix.test(target)) return fallback;
  return target;
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
