CREATE TABLE "media_file" (
	"id" text PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"thumb_size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"url" text,
	"repo_url" text,
	"cover_media_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_image" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"media_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"alt" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"caption" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tag" (
	"project_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "project_tag_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "project_translation" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_file" ADD CONSTRAINT "media_file_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_cover_media_id_media_file_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_image" ADD CONSTRAINT "project_image_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_image" ADD CONSTRAINT "project_image_media_id_media_file_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tag" ADD CONSTRAINT "project_tag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tag" ADD CONSTRAINT "project_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_translation" ADD CONSTRAINT "project_translation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_unique" ON "project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_status_position_idx" ON "project" USING btree ("status","position");--> statement-breakpoint
CREATE INDEX "project_image_project_idx" ON "project_image" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_tag_tag_idx" ON "project_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_translation_project_locale_unique" ON "project_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "project_translation_locale_idx" ON "project_translation" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_name_unique" ON "tag" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_name_lower_unique" ON "tag" USING btree (lower("name"));