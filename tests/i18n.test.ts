import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

function keys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => keys(v, `${prefix}${k}.`));
  }
  return [prefix.replace(/\.$/, "")];
}

describe("i18n", () => {
  it("fr.json et en.json ont exactement les mêmes clés", () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it("les dictionnaires ne sont pas vides", () => {
    expect(keys(fr).length).toBeGreaterThan(0);
  });
});
