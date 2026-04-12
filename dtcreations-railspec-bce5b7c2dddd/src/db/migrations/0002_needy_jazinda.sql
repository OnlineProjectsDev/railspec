CREATE TABLE "balconies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "balconies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"balcony_no" integer NOT NULL,
	"name" varchar,
	"length_mm" integer,
	"width_mm" integer,
	"angle_deg" integer,
	"height_mm" integer DEFAULT 1020,
	"design" varchar DEFAULT 'RD-D1',
	"anchorage" varchar DEFAULT 'BP',
	"toprail" varchar DEFAULT 'Elite',
	"infill" varchar DEFAULT '6.38mm Clear Laminated',
	"wind" jsonb DEFAULT '{"bldg_height":30,"wind_region":"A","terrain_category":2}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balcony_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "balcony_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"balcony_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"job_stage_id" integer NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"changed_by" varchar,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_stages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_stages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_id" integer NOT NULL,
	"stage" integer NOT NULL,
	"defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_number" integer NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"customer_id" integer NOT NULL,
	"project_status" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"address1" varchar NOT NULL,
	"address2" varchar,
	"city" varchar NOT NULL,
	"zip" varchar(10) NOT NULL,
	"measurer" varchar DEFAULT 'unassigned' NOT NULL,
	"design_default" varchar DEFAULT 'RD-D1' NOT NULL,
	"anchorage_default" varchar DEFAULT 'BP' NOT NULL,
	"toprail_default" varchar DEFAULT 'Elite' NOT NULL,
	"glass_default" varchar DEFAULT '6.38mm Clear Laminated' NOT NULL,
	"wind_load" jsonb DEFAULT '{"bldg_height":30,"wind_region":"A","terrain_category":2}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "state" SET DATA TYPE varchar(3);--> statement-breakpoint
ALTER TABLE "balconies" ADD CONSTRAINT "balconies_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balconies" ADD CONSTRAINT "balconies_job_stage_id_job_stages_id_fk" FOREIGN KEY ("job_stage_id") REFERENCES "public"."job_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balcony_revisions" ADD CONSTRAINT "balcony_revisions_balcony_id_balconies_id_fk" FOREIGN KEY ("balcony_id") REFERENCES "public"."balconies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_stages" ADD CONSTRAINT "job_stages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stage_balcony_no" ON "balconies" USING btree ("job_stage_id","balcony_no");--> statement-breakpoint
CREATE INDEX "idx_balconies_job" ON "balconies" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_balconies_stage" ON "balconies" USING btree ("job_stage_id");--> statement-breakpoint
CREATE INDEX "idx_balconies_job_stage_no" ON "balconies" USING btree ("job_id","job_stage_id","balcony_no");--> statement-breakpoint
CREATE INDEX "idx_balcony_revisions_balcony" ON "balcony_revisions" USING btree ("balcony_id");--> statement-breakpoint
CREATE INDEX "idx_balcony_revisions_stage" ON "balcony_revisions" USING btree ("job_stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_job_stages_job_stage" ON "job_stages" USING btree ("job_id","stage");--> statement-breakpoint
CREATE INDEX "idx_job_stages_job" ON "job_stages" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_jobs_jobnum_stage" ON "jobs" USING btree ("job_number","stage");