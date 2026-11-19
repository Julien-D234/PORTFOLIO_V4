import "server-only";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export function authSecret(): string {
  const value = requireEnv("BETTER_AUTH_SECRET");
  if (value.length < 32) throw new Error("BETTER_AUTH_SECRET doit faire au moins 32 caractères");
  return value;
}
