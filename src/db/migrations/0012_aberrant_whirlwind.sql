CREATE TABLE "shop_drawing_revision_sheets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_drawing_revision_sheets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"revision_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"editor_balcony_id" integer,
	"sheet_key" varchar NOT NULL,
	"sheet_type" varchar DEFAULT 'balcony' NOT NULL,
	"sheet_order" integer DEFAULT 0 NOT NULL,
	"sheet_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sheet_edits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_drawing_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_drawing_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"revision_code" varchar NOT NULL,
	"notes" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"fabrication_snapshot" jsonb DEFAULT 'null'::jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "max_height_default" SET DEFAULT 1200;--> statement-breakpoint
ALTER TABLE "shop_drawing_revision_sheets" ADD CONSTRAINT "shop_drawing_revision_sheets_revision_id_shop_drawing_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."shop_drawing_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_drawing_revision_sheets" ADD CONSTRAINT "shop_drawing_revision_sheets_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_drawing_revision_sheets" ADD CONSTRAINT "shop_drawing_revision_sheets_job_stage_id_job_stages_id_fk" FOREIGN KEY ("job_stage_id") REFERENCES "public"."job_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_drawing_revision_sheets" ADD CONSTRAINT "shop_drawing_revision_sheets_editor_balcony_id_editor_balconies_id_fk" FOREIGN KEY ("editor_balcony_id") REFERENCES "public"."editor_balconies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_drawing_revisions" ADD CONSTRAINT "shop_drawing_revisions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_drawing_revisions" ADD CONSTRAINT "shop_drawing_revisions_job_stage_id_job_stages_id_fk" FOREIGN KEY ("job_stage_id") REFERENCES "public"."job_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_shop_drawing_revision_sheet_key" ON "shop_drawing_revision_sheets" USING btree ("revision_id","sheet_key") WHERE "shop_drawing_revision_sheets"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revision_sheets_revision" ON "shop_drawing_revision_sheets" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revision_sheets_stage" ON "shop_drawing_revision_sheets" USING btree ("job_stage_id");--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revision_sheets_editor_balcony" ON "shop_drawing_revision_sheets" USING btree ("editor_balcony_id");--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revision_sheets_order" ON "shop_drawing_revision_sheets" USING btree ("revision_id","sheet_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_shop_drawing_revision_stage_code" ON "shop_drawing_revisions" USING btree ("job_stage_id","revision_code");--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revisions_job" ON "shop_drawing_revisions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revisions_stage" ON "shop_drawing_revisions" USING btree ("job_stage_id");--> statement-breakpoint
CREATE INDEX "idx_shop_drawing_revisions_current" ON "shop_drawing_revisions" USING btree ("job_stage_id","is_current");