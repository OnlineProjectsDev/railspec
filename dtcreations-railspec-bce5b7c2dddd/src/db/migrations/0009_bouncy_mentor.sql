CREATE TABLE "devlog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" varchar(500),
	"body" text,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"version" varchar(30),
	"affected_versions" jsonb DEFAULT 'null'::jsonb,
	"target_version" varchar(30),
	"tags" jsonb DEFAULT 'null'::jsonb,
	"created_by" varchar(255),
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devlog_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"label" varchar(80) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"kind" varchar(30),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "powdercoat_colours" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar NOT NULL,
	"name" varchar NOT NULL,
	"hex" varchar(7) NOT NULL,
	"finish_type" varchar,
	"range" varchar,
	"supplier" varchar,
	"image_url" varchar,
	"texture_url" varchar,
	"exterior_rating" boolean DEFAULT true NOT NULL,
	"interior_only" boolean DEFAULT false NOT NULL,
	"marine_rating" boolean DEFAULT false NOT NULL,
	"warranty_years" integer DEFAULT 0 NOT NULL,
	"cost_group" varchar DEFAULT 'standard' NOT NULL,
	"is_custom_order" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"allowed_designs" jsonb DEFAULT 'null'::jsonb,
	"allowed_infill_types" jsonb DEFAULT 'null'::jsonb,
	"allowed_toprails" jsonb DEFAULT 'null'::jsonb,
	"allowed_anchorages" jsonb DEFAULT 'null'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "powdercoat_colours_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'glass_default'
  ) THEN
    EXECUTE 'ALTER TABLE "jobs" RENAME COLUMN "glass_default" TO "infill_default"';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN IF NOT EXISTS "foundation_array_raw" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN IF NOT EXISTS  "posts_array_raw" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS  "max_height_default" integer DEFAULT 1050;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS  "max_post_spacing" integer DEFAULT 1280;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS  "powdercoat_colour_id" integer;--> statement-breakpoint
ALTER TABLE "devlog_links" ADD CONSTRAINT "devlog_links_entry_id_devlog_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."devlog_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_devlog_entries_type" ON "devlog_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_devlog_entries_status" ON "devlog_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_devlog_entries_published_at" ON "devlog_entries" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_devlog_entries_updated_at" ON "devlog_entries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_devlog_entries_version" ON "devlog_entries" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_devlog_entries_pinned" ON "devlog_entries" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "idx_devlog_links_entry" ON "devlog_links" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "idx_devlog_links_sort" ON "devlog_links" USING btree ("sort_order");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_powdercoat_colour_id_powdercoat_colours_id_fk" FOREIGN KEY ("powdercoat_colour_id") REFERENCES "public"."powdercoat_colours"("id") ON DELETE no action ON UPDATE no action;