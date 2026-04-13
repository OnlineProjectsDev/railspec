CREATE TABLE "balcony_editor_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "balcony_editor_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"editor_balcony_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"editor_config" jsonb NOT NULL,
	"foundation_state" jsonb NOT NULL,
	"balustrade_state" jsonb NOT NULL,
	"version" integer NOT NULL,
	"changed_by" varchar,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balcony_editor_state" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "balcony_editor_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"editor_balcony_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"editor_config" jsonb NOT NULL,
	"foundation_state" jsonb NOT NULL,
	"balustrade_state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editor_balconies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "editor_balconies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"drop" varchar DEFAULT 'A' NOT NULL,
	"balcony_no" varchar NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"geometry_notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_stages" ALTER COLUMN "defaults" SET DEFAULT '{"design_default":"RD-D1","anchorage_default":"BP","toprail_default":"Elite","infill_default":"6.38mm Clear Laminate","powdercoatColourId":null,"wind_load":{"bldg_height":30,"wind_region":"A","terrain_category":2},"constraints":{"minBarrierHeight":1020,"maxBarrierHeight":1050,"panelHeight":950,"maxPanelHeight":1000,"maxPostSpacing":1280,"maxBottomGap":100,"minPostLength":1020,"laserLevelY":0,"topY":1020},"template":{"preset":"default-rectangular"}}'::jsonb;--> statement-breakpoint
ALTER TABLE "balcony_editor_revisions" ADD CONSTRAINT "balcony_editor_revisions_editor_balcony_id_editor_balconies_id_fk" FOREIGN KEY ("editor_balcony_id") REFERENCES "public"."editor_balconies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balcony_editor_revisions" ADD CONSTRAINT "balcony_editor_revisions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balcony_editor_revisions" ADD CONSTRAINT "balcony_editor_revisions_job_stage_id_job_stages_id_fk" FOREIGN KEY ("job_stage_id") REFERENCES "public"."job_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balcony_editor_state" ADD CONSTRAINT "balcony_editor_state_editor_balcony_id_editor_balconies_id_fk" FOREIGN KEY ("editor_balcony_id") REFERENCES "public"."editor_balconies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balcony_editor_state" ADD CONSTRAINT "balcony_editor_state_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balcony_editor_state" ADD CONSTRAINT "balcony_editor_state_job_stage_id_job_stages_id_fk" FOREIGN KEY ("job_stage_id") REFERENCES "public"."job_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_balconies" ADD CONSTRAINT "editor_balconies_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_balconies" ADD CONSTRAINT "editor_balconies_job_stage_id_job_stages_id_fk" FOREIGN KEY ("job_stage_id") REFERENCES "public"."job_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_balcony_editor_revisions_editor_balcony" ON "balcony_editor_revisions" USING btree ("editor_balcony_id");--> statement-breakpoint
CREATE INDEX "idx_balcony_editor_revisions_stage" ON "balcony_editor_revisions" USING btree ("job_stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_balcony_editor_state_editor_balcony" ON "balcony_editor_state" USING btree ("editor_balcony_id");--> statement-breakpoint
CREATE INDEX "idx_balcony_editor_state_job" ON "balcony_editor_state" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_balcony_editor_state_stage" ON "balcony_editor_state" USING btree ("job_stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_editor_stage_balcony_no" ON "editor_balconies" USING btree ("job_stage_id","balcony_no");--> statement-breakpoint
CREATE INDEX "idx_editor_balconies_job" ON "editor_balconies" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_editor_balconies_stage" ON "editor_balconies" USING btree ("job_stage_id");--> statement-breakpoint
CREATE INDEX "idx_editor_balconies_job_stage_no" ON "editor_balconies" USING btree ("job_id","job_stage_id","balcony_no");