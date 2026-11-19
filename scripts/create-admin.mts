import crypto from "node:crypto";
import readline from "node:readline";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../src/server/db/schema";
import { hashPassword, isPasswordPolicyOk } from "../src/server/auth/password";
import { dbUrl } from "./lib.mts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const original = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (s: string) => {
    if (s.includes(query)) original(s);
    else original("*");
  };
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl._writeToOutput = original;
      rl.close();
      resolve(answer);
    });
  });
}

const email = (arg("email") ?? "").toLowerCase().trim();
const name = (arg("name") ?? "").trim();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
  console.error("Usage: npm run create-admin -- --email X --name \"Nom\"");
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD ?? "";
if (!password) {
  password = await promptHidden("Mot de passe (12-128 car.) : ");
  const confirm = await promptHidden("Confirmer le mot de passe : ");
  if (password !== confirm) {
    console.error("Les mots de passe ne correspondent pas.");
    process.exit(1);
  }
}
if (!isPasswordPolicyOk(password)) {
  console.error(`Politique de mot de passe: ${12}-${128} caractères requis.`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl(), max: 1 });
try {
  const db = drizzle(pool, { schema });
  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
  if (existing) {
    console.error(`Un compte existe déjà pour ${email}.`);
    process.exit(1);
  }
  const id = crypto.randomUUID();
  await db.insert(schema.user).values({
    id,
    name,
    email,
    emailVerified: true,
    role: "admin",
    mustChangePassword: false,
  });
  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(password),
  });
  await db.insert(schema.auditLog).values({
    id: crypto.randomUUID(),
    action: "admin.created",
    targetId: id,
    metadata: JSON.stringify({ email, via: "cli" }),
  });
  console.log(`Admin créé: ${email}`);
} finally {
  await pool.end();
}
