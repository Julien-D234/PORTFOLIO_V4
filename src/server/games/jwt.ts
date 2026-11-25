import crypto from "node:crypto";
import { authSecret } from "../env";

const ALG = "HS256";
export const GAME_TOKEN_TTL_SEC = 600;

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string): Buffer {
  const key = crypto.createHash("sha256").update(`${authSecret()}:game-jwt-v1`).digest();
  return crypto.createHmac("sha256", key).update(data).digest();
}

export interface GameTokenClaims {
  sub: string;
  game: string;
  sid: string;
  jti: string;
  iat: number;
  exp: number;
}

export function issueGameToken(
  claims: { userId: string; gameId: string; sessionId: string },
  ttlSec: number = GAME_TOKEN_TTL_SEC,
  nowMs: number = Date.now(),
): string {
  const now = Math.floor(nowMs / 1000);
  const header = b64url(JSON.stringify({ alg: ALG, typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: claims.userId,
      game: claims.gameId,
      sid: claims.sessionId,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + ttlSec,
    }),
  );
  const signature = b64url(hmac(`${header}.${payload}`));
  return `${header}.${payload}.${signature}`;
}

export function verifyGameToken(token: string, nowMs: number = Date.now()): GameTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  let header: unknown;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if ((header as { alg?: unknown })?.alg !== ALG) return null;
  const expected = hmac(`${headerB64}.${payloadB64}`);
  let given: Buffer;
  try {
    given = Buffer.from(signatureB64, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let claims: GameTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as GameTokenClaims;
  } catch {
    return null;
  }
  if (
    typeof claims.sub !== "string" ||
    typeof claims.game !== "string" ||
    typeof claims.sid !== "string" ||
    typeof claims.jti !== "string" ||
    typeof claims.exp !== "number"
  ) {
    return null;
  }
  if (claims.exp * 1000 <= nowMs) return null;
  return claims;
}
