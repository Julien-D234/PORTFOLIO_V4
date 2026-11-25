import { z } from "zod";
import { slugRegex } from "@/lib/project-schema";

export const GAME_KINDS = ["iframe", "internal"] as const;

export const GAME_LIMITS_DEFAULTS = {
  maxScore: 1_000_000,
  maxSessionSec: 4 * 3600,
  maxPayloadBytes: 8192,
  maxStatsPerMin: 120,
} as const;

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname.includes(".") && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "HTTPS_ONLY");

const localeText = (max: number) =>
  z
    .object({
      fr: z.string().trim().max(max).optional(),
      en: z.string().trim().max(max).optional(),
    })
    .strict();

export const gameLimitsSchema = z
  .object({
    maxScore: z.number().finite().positive().max(1e12).optional(),
    maxSessionSec: z.number().int().positive().max(24 * 3600).optional(),
    maxPayloadBytes: z.number().int().positive().max(65536).optional(),
    maxStatsPerMin: z.number().int().positive().max(10000).optional(),
  })
  .strict()
  .partial();

export const gameInputSchema = z
  .object({
    slug: z.string().trim().toLowerCase().min(1).max(80).regex(slugRegex, "SLUG_INVALID"),
    kind: z.enum(GAME_KINDS),
    url: httpsUrl.nullish(),
    module: z.string().trim().max(80).regex(/^[a-z0-9-]+$/, "MODULE_INVALID").nullish(),
    title: localeText(120).default({}),
    summary: localeText(300).default({}),
    position: z.number().int().min(0).max(9999).default(0),
    limits: gameLimitsSchema.default({}),
  })
  .strict()
  .refine((v) => (v.kind === "iframe" ? Boolean(v.url) : Boolean(v.module)), "KIND_TARGET_REQUIRED");

export const deleteGameSchema = z.object({
  slugConfirm: z.string().min(1).max(80),
});

export const startSchema = z.object({
  userId: z.string().uuid(),
});

export const statsSchema = z.object({
  score: z.number().finite().min(0).max(1e12),
  durationSec: z.number().int().min(0).max(24 * 3600),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type GameInput = z.infer<typeof gameInputSchema>;
export type StatsInput = z.infer<typeof statsSchema>;
