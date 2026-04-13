// /zod-schemas/job.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { jobs } from "@/db/schema";
import { z } from "zod";

// For AU postcodes (4 digits)
const auPostcode = z.union([ z.string().regex(/^\d{4}$/), z.literal("") ]);
// or: z.string().regex(/^\d{4}$/).or(z.literal(""))

// If you accept a placeholder "(New)" for id on the form:
const idField = z.union([z.number(), z.literal("(New)")]);

export const insertJobSchema = createInsertSchema(jobs, {
  // IMPORTANT: coerce number-like inputs from form strings
  id: idField,                                 // form accepts number or "(New)"
  job_number: () => z.coerce.number().int().positive().describe("Job number is required"),
  stage:      () => z.coerce.number().int().min(1, "Stage is required (default 1)").max(8),
  customerId: () => z.coerce.number().int().positive().or(z.nan()).or(z.literal(0)),

  address1: (s) => s.min(1, "Address is required"),
  city:     (s) => s.min(1, "City is required"),
  zip: () => auPostcode,

  // optional fields: keep them, but don’t force the user to send them
  address2: () => z.string().nullable().optional(),
  measurer: () => z.string().optional(),
  project_status: () => z.coerce.number().int().nonnegative().optional(),
  height_default: () => z.coerce.number().int().min(130).max(1800).default(1020),
  max_height_default: () => z.coerce.number().int().min(130).max(1800).default(1200),
  max_post_spacing: () => z.coerce.number().int().min(200).max(1280).default(1280),
  design_default: () => z.string().optional(),
  anchorage_default: () => z.string().optional(),
  toprail_default: () => z.string().optional(),
  infill_default: () => z.string().optional(),
  powdercoatColourId: () => z.coerce.number().int().optional().nullable(),
  
  wind_load: () =>
  z.object({
      bldg_height: z.coerce.number().int().positive(),
      wind_region: z.enum(["A", "B", "C", "D"]),
      terrain_category: z.coerce.number().int().min(1).max(3),
    })
    .default({ bldg_height: 30, wind_region: "A", terrain_category: 2 }),

  notes: () => z.string().nullable().optional(),

  // createdAt/updatedAt come from DB defaults; omit from form
  createdAt: () => z.date().optional(),
  updatedAt: () => z.date().optional(),
});

export const selectJobSchema = createSelectSchema(jobs);

export type insertJobSchemaType = z.infer<typeof insertJobSchema>;
export type selectJobSchemaType = z.infer<typeof selectJobSchema>;