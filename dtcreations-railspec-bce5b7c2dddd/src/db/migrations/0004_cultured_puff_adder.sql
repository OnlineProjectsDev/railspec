ALTER TABLE "balconies" ALTER COLUMN "balcony_no" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "drop" varchar DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "color" jsonb DEFAULT '{"hex":11184810,"name":"TBD"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "foundation_array" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "posts_array" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "panel_mm" integer DEFAULT 1020;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "ffl_mm" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "balconies" ADD COLUMN "ffl_use" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "balconies" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "balconies" DROP COLUMN "length_mm";--> statement-breakpoint
ALTER TABLE "balconies" DROP COLUMN "width_mm";--> statement-breakpoint
ALTER TABLE "balconies" DROP COLUMN "angle_deg";--> statement-breakpoint
ALTER TABLE "balconies" DROP COLUMN "wind";