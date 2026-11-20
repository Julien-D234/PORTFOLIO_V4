export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export function isPasswordPolicyOk(password: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}
