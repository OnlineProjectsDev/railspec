// /zod-schemas/jobstages.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod"; 
import { jobStages } from "@/db/schema";
import { z } from "zod";
import { jobStageDefaultsSchema } from "@/zod-schemas/editorState";

export const insertJobStagesSchema = createInsertSchema(jobStages, {
  jobId: () =>
    z.coerce.number().int().positive().or(z.nan()).or(z.literal(0)),

  stage: () =>
    z.coerce.number().int().min(1, "Stage is required (default 1)").max(8),

  status: () =>
    z.string().optional(), // ✔ FIXED: varchar, not number

  defaults: () =>
    jobStageDefaultsSchema.optional(),

    notes: () => z.string().nullable().optional(),

});

export const selectJobStagesSchema = createSelectSchema(jobStages, {
  defaults: () =>
    jobStageDefaultsSchema.default({
      wind_load: { bldg_height: 30, wind_region: "A", terrain_category: 2 },
      constraints: {
        minBarrierHeight: 1020,
        maxBarrierHeight: 1050,
        panelHeight: 950,
        maxPanelHeight: 1000,
        maxPostSpacing: 1280,
        maxBottomGap: 100,
        minPostLength: 1020,
        laserLevelY: 0,
        topY: 1020,
      },
    }),
});

export type insertJobStagesSchemaType =
  z.infer<typeof insertJobStagesSchema>;

export type selectJobStagesSchemaType =
  z.infer<typeof selectJobStagesSchema>;

export type selectJobStagesSchemaTypeNoDefaults =
  Omit<selectJobStagesSchemaType, "defaults">;
