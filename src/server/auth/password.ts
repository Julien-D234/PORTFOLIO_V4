import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, {
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify(hash, password);
  } catch {
    return false;
  }
}

export function isPasswordPolicyOk(password: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}
