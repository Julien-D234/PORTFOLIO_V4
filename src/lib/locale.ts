import { defaultLocale, locales, type Locale } from "@/i18n/config";

export function isLocale(value: string | null | undefined): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

export function localeFromPath(pathname: string): Locale | null {
  const first = pathname.split("/")[1] ?? "";
  return isLocale(first) ? first : null;
}

export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const parsed = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return {
        lang: (tag ?? "").trim().toLowerCase().split("-")[0] ?? "",
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.quality > 0 && entry.lang !== "")
    .sort((a, b) => b.quality - a.quality);
  for (const entry of parsed) {
    if (isLocale(entry.lang)) return entry.lang;
  }
  return null;
}

export function pickLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return parseAcceptLanguage(acceptLanguage) ?? defaultLocale;
}

export function localizedPath(locale: Locale, pathname: string): string {
  const rest = pathname === "/" ? "" : pathname;
  return `/${locale}${rest}`;
}
