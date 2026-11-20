import { z } from "zod";
import { locales } from "@/i18n/config";

export const LIMITS = {
  title: 120,
  summary: 200,
  description: 10_000,
  alt: 200,
  caption: 300,
  url: 300,
  tag: 30,
  tags: 15,
  gallery: 30,
  slug: 80,
  position: 9999,
} as const;

export const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const mediaIdRegex = /^[0-9a-f]{32}$/;

const httpsUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname.includes(".") && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "HTTPS_ONLY");

const optionalUrl = httpsUrl.nullish();

const localeText = (max: number) =>
  z
    .object({
      fr: z.string().trim().max(max).optional(),
      en: z.string().trim().max(max).optional(),
    })
    .strict();

export const galleryImageSchema = z.object({
  mediaId: z.string().regex(mediaIdRegex),
  position: z.number().int().min(0).max(LIMITS.position),
  alt: localeText(LIMITS.alt),
  caption: localeText(LIMITS.caption),
});

export const translationSchema = z.object({
  locale: z.enum(locales),
  title: z.string().trim().min(1).max(LIMITS.title),
  summary: z.string().trim().min(1).max(LIMITS.summary),
  description: z.string().max(LIMITS.description).default(""),
  coverAlt: z.string().trim().max(LIMITS.alt).nullish(),
});

export const projectInputSchema = z
  .object({
    slug: z.string().trim().toLowerCase().min(1).max(LIMITS.slug).regex(slugRegex, "SLUG_INVALID"),
    url: optionalUrl,
    repoUrl: optionalUrl,
    position: z.number().int().min(0).max(LIMITS.position).default(0),
    coverMediaId: z.string().regex(mediaIdRegex).nullish(),
    translations: z
      .array(translationSchema)
      .min(1)
      .max(locales.length)
      .refine((list) => new Set(list.map((t) => t.locale)).size === list.length, "DUPLICATE_LOCALE"),
    tags: z.array(z.string().trim().min(1).max(LIMITS.tag)).max(LIMITS.tags).default([]),
    gallery: z.array(galleryImageSchema).max(LIMITS.gallery).default([]),
  })
  .strict();

export const deleteProjectSchema = z.object({
  slugConfirm: z.string().min(1).max(LIMITS.slug),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
export type TranslationInput = z.infer<typeof translationSchema>;
