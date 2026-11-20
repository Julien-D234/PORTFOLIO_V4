import { describe, expect, it } from "vitest";
import { isValidEmail, safeRedirect } from "@/lib/auth-forms";

describe("safeRedirect", () => {
  const fallback = "/fr";

  it("accepte les chemins internes préfixés d'une langue connue", () => {
    expect(safeRedirect("/fr", fallback)).toBe("/fr");
    expect(safeRedirect("/fr/projects", fallback)).toBe("/fr/projects");
    expect(safeRedirect("/en/admin", fallback)).toBe("/en/admin");
  });

  it("retombe sur le fallback sinon", () => {
    expect(safeRedirect(null, fallback)).toBe(fallback);
    expect(safeRedirect(undefined, fallback)).toBe(fallback);
    expect(safeRedirect("", fallback)).toBe(fallback);
    expect(safeRedirect("https://evil.com", fallback)).toBe(fallback);
    expect(safeRedirect("//evil.com", fallback)).toBe(fallback);
    expect(safeRedirect("/\\evil.com", fallback)).toBe(fallback);
    expect(safeRedirect("/fr/../admin", fallback)).toBe(fallback);
    expect(safeRedirect("/de/projets", fallback)).toBe(fallback);
    expect(safeRedirect("fr/projects", fallback)).toBe(fallback);
  });
});

describe("isValidEmail", () => {
  it("valide les e-mails simples", () => {
    expect(isValidEmail("a@b.dev")).toBe(true);
    expect(isValidEmail("prenom.nom+tag@exemple.fr")).toBe(true);
  });

  it("rejette les entrées invalides", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("pas-un-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.dev")).toBe(false);
  });
});
