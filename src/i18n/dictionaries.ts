import { defaultLocale, locales, type Locale } from "./config";

const loaders = {
  fr: () => import("../../messages/fr.json").then((m) => m.default),
  en: () => import("../../messages/en.json").then((m) => m.default),
} as const;

export type Messages = Awaited<ReturnType<(typeof loaders)["fr"]>>;

export async function getDictionary(locale: string): Promise<Messages> {
  const key = (locales as readonly string[]).includes(locale) ? (locale as Locale) : defaultLocale;
  return loaders[key]();
}
