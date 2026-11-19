import { describe, expect, it } from "vitest";
import { localeFromPath, localizedPath, parseAcceptLanguage, pickLocale } from "@/lib/locale";

describe("localeFromPath", () => {
  it("extrait la langue du premier segment", () => {
    expect(localeFromPath("/fr")).toBe("fr");
    expect(localeFromPath("/en/projects")).toBe("en");
  });

  it("renvoie null sans langue valide", () => {
    expect(localeFromPath("/")).toBeNull();
    expect(localeFromPath("/de/projets")).toBeNull();
    expect(localeFromPath("/frx")).toBeNull();
  });
});

describe("parseAcceptLanguage", () => {
  it("respecte les pondérations q", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.5")).toBe("fr");
    expect(parseAcceptLanguage("de-DE,es;q=0.5")).toBeNull();
  });

  it("renvoie null sans en-tête", () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage("")).toBeNull();
  });
});

describe("pickLocale", () => {
  it("le cookie valide gagne", () => {
    expect(pickLocale("en", "fr-FR")).toBe("en");
  });

  it("sinon Accept-Language, sinon défaut fr", () => {
    expect(pickLocale("xx", "en-US")).toBe("en");
    expect(pickLocale(undefined, null)).toBe("fr");
    expect(pickLocale(null, "de")).toBe("fr");
  });
});

describe("localizedPath", () => {
  it("préfixe la langue", () => {
    expect(localizedPath("fr", "/")).toBe("/fr");
    expect(localizedPath("en", "/projects")).toBe("/en/projects");
  });
});
