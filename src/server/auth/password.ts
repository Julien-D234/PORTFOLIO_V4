import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

export { PASSWORD_MAX, PASSWORD_MIN, isPasswordPolicyOk } from "@/lib/password-policy";

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
