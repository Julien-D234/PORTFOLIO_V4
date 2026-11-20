import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    role: text("role").notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true, mode: "date" }),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    locale: text("locale").notNull().default("fr"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    uniqueIndex("user_email_unique").on(t.email),
    uniqueIndex("user_email_lower_unique").on(sql`lower(${t.email})`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (t) => [uniqueIndex("session_token_unique").on(t.token), index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const rateLimit = pgTable(
  "rate_limit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull().default(0),
    lastRequest: bigint("last_request", { mode: "number" }).notNull().default(0),
  },
  (t) => [uniqueIndex("rate_limit_key_unique").on(t.key)],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdBy: text("created_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invitation_token_hash_unique").on(t.tokenHash),
    index("invitation_user_idx").on(t.userId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetId: text("target_id"),
    metadata: text("metadata"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_action_idx").on(t.action)],
);

export const mediaFile = pgTable("media_file", {
  id: text("id").primaryKey(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  thumbSizeBytes: integer("thumb_size_bytes").notNull(),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    url: text("url"),
    repoUrl: text("repo_url"),
    coverMediaId: text("cover_media_id").references(() => mediaFile.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("project_slug_unique").on(t.slug),
    index("project_status_position_idx").on(t.status, t.position),
  ],
);

export const projectTranslation = pgTable(
  "project_translation",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull().default(""),
    coverAlt: text("cover_alt"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("project_translation_project_locale_unique").on(t.projectId, t.locale),
    index("project_translation_locale_idx").on(t.locale),
  ],
);

export type LocaleText = Partial<Record<"fr" | "en", string>>;

export const projectImage = pgTable(
  "project_image",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaFile.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    alt: jsonb("alt").$type<LocaleText>().notNull().default({}),
    caption: jsonb("caption").$type<LocaleText>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("project_image_project_idx").on(t.projectId, t.position)],
);

export const tag = pgTable(
  "tag",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tag_name_unique").on(t.name),
    uniqueIndex("tag_name_lower_unique").on(sql`lower(${t.name})`),
  ],
);

export const projectTag = pgTable(
  "project_tag",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.tagId] }), index("project_tag_tag_idx").on(t.tagId)],
);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type MediaFile = typeof mediaFile.$inferSelect;
export type Project = typeof project.$inferSelect;
export type ProjectTranslation = typeof projectTranslation.$inferSelect;
export type ProjectImage = typeof projectImage.$inferSelect;
export type Tag = typeof tag.$inferSelect;
