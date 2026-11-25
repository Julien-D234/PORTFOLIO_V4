CREATE TABLE "game" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'iframe' NOT NULL,
	"url" text,
	"module" text,
	"title" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"api_key_hash" text NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_session" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_stat" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" double precision DEFAULT 0 NOT NULL,
	"duration_sec" integer,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_stat" ADD CONSTRAINT "game_stat_session_id_game_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_stat" ADD CONSTRAINT "game_stat_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_stat" ADD CONSTRAINT "game_stat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_slug_unique" ON "game" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "game_status_position_idx" ON "game" USING btree ("status","position");--> statement-breakpoint
CREATE INDEX "game_session_game_idx" ON "game_session" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_session_user_idx" ON "game_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_stat_game_user_idx" ON "game_stat" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "game_stat_session_idx" ON "game_stat" USING btree ("session_id");