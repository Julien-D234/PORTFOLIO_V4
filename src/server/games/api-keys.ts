import crypto from "node:crypto";

export function newApiKey(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

export function apiKeyMatches(key: string, hash: string): boolean {
  const a = Buffer.from(hashApiKey(key), "utf8");
  const b = Buffer.from(hash, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
