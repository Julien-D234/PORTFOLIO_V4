import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) yield p;
  }
}

describe("matrice d'accès structurelle", () => {
  it("chaque page/layout admin appelle requireAdmin", () => {
    const dir = path.join(root, "src/app/[lang]/admin");
    const files = [...walk(dir)];
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src.includes("requireAdmin"), `${f} doit appeler requireAdmin`).toBe(true);
    }
  });

  it("chaque route api/admin passe par requireApi(\"admin\") + isSameOrigin et n'exporte pas PUT/PATCH/DELETE", () => {
    const dir = path.join(root, "src/app/api/admin");
    const files = [...walk(dir)];
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      const ok = src.includes('requireApi("admin")') || src.includes("adminPost");
      expect(ok, `${f} doit appeler requireApi("admin") (directement ou via adminPost) avant tout accès BDD`).toBe(true);
      const okOrigin = src.includes("isSameOrigin") || src.includes("adminPost");
      expect(okOrigin, `${f} doit vérifier isSameOrigin sur les POST`).toBe(true);
      expect(
        /export\s+(const|async function)\s+(PUT|PATCH|DELETE)\b/.test(src),
        `${f} ne doit exporter ni PUT ni PATCH ni DELETE (POST uniquement)`,
      ).toBe(false);
    }
  });

  it("chaque route api/profile passe par requireApi + isSameOrigin et n'exporte pas PUT/PATCH/DELETE", () => {
    const dir = path.join(root, "src/app/api/profile");
    const files = [...walk(dir)];
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src.includes("requireApi("), `${f} doit appeler requireApi(...) avant tout accès BDD`).toBe(true);
      expect(src.includes("isSameOrigin"), `${f} doit vérifier isSameOrigin sur les POST`).toBe(true);
      expect(
        /export\s+(const|async function)\s+(PUT|PATCH|DELETE)\b/.test(src),
        `${f} ne doit exporter ni PUT ni PATCH ni DELETE (POST uniquement)`,
      ).toBe(false);
    }
  });

  it("le matcher du proxy exclut bien api et media/", () => {
    const src = fs.readFileSync(path.join(root, "src/proxy.ts"), "utf8");
    expect(src).toContain("api");
    expect(src).toContain("media/");
  });
});
