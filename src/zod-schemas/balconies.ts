// zod-schemas/balconies.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { balconies } from "@/db/schema";
import { z } from "zod";
import { FoundationType, PostsType } from "@/app/(rs)/drawingtool/canvas/DropAnalyser";


// Same idea as jobs.ts: allow "(New)" in the form layer
const idField = z.union([z.number(), z.literal("(New)")]);

// Color JSON: { hex: number; name: string }
const colorSchema = z.object({
  hex: z.number(),
  name: z.string(),
});

// For now, keep these as loose JSON arrays/objects.
// You can later replace with strict FoundationType / PostsType shapes.
const jsonArraySchema = z.array(z.any());
const jsonObjectSchema = z.any();

/**
 * Base INSERT schema from drizzle-zod
 * NOTE: we do NOT override `id` here to avoid the DrizzleTypeError.
 */
const baseInsertBalconySchema = createInsertSchema(balconies, {
  jobId: () => z.coerce.number().int().positive(),
  jobStageId: () => z.coerce.number().int().positive(),

  drop: (s) => s.min(1, "Drop is required"),
  balconyNo: (s) => s.min(1, "Balcony number is required"),

  color: () => colorSchema,

  foundationArray: () => jsonArraySchema,
  postsArray: () => jsonArraySchema,

  foundationArrayRaw: () => jsonArraySchema,
  postsArrayRaw: () => jsonArraySchema,

  heightMm: () => z.coerce.number().int().optional(),
  panelMm: () => z.coerce.number().int().optional(),
  fflMm: () => z.coerce.number().int().optional(),
  ffl_use: () => z.coerce.boolean().optional(),

  design: () => z.string().optional(),
  anchorage: () => z.string().optional(),
  toprail: () => z.string().optional(),
  infill: () => z.string().optional(),

  metadata: () => jsonObjectSchema.optional(),
  notes: () => z.string().nullable().optional(),

  version: () => z.coerce.number().int().min(1).optional(),
  isDeleted: () => z.coerce.boolean().optional(),

  // DB timestamps – optional on input, same pattern as jobs.ts
  createdAt: () => z.date().optional(),
  updatedAt: () => z.date().optional(),
});

/**
 * FINAL insert schema exposed to the app.
 * Here we override `id` at Zod level (NOT in drizzle-zod config),
 * so TS is happy and you still get number | "(New)" for the form.
 */
export const insertBalconySchema = baseInsertBalconySchema.extend({
  id: idField.optional(),
});

const FoundationSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  length: z.number(),
  angle: z.number(),
  offset: z.number(),
  sections: z.number(),
  height: z.number(),
  x: z.number(),
  z: z.number(),
  y: z.number(),
});

const PostsSchema = z.object({
  id: z.number().int(),
  post_id: z.number().int(),
  type: z.string(),
  length: z.number(),
  angle: z.number(),
  reversed: z.boolean(),
  height: z.number(),
  x: z.number(),
  z: z.number(),
  y_ref1: z.number(),
  y_ref2: z.number(),
  y_ref3: z.number(),
});

const saveBalconyGeometrySchema = z.object({
  balconyId: z.number().int().positive(),
  foundationArray: z.array(FoundationSchema),
  postsArray: z.array(PostsSchema),
  foundationArrayRaw: z.array(FoundationSchema),
  postsArrayRaw: z.array(PostsSchema),
});

/**
 * SELECT schema (used for data coming *from* the DB)
 */
export const selectBalconySchema = createSelectSchema(balconies, {
  color: () => colorSchema,
  foundationArray: () => jsonArraySchema,
  postsArray: () => jsonArraySchema,
  foundationArrayRaw: () => jsonArraySchema,
  postsArrayRaw: () => jsonArraySchema,
  metadata: () => jsonObjectSchema,
});

export type insertBalconySchemaType = z.infer<typeof insertBalconySchema>;
export type selectBalconySchemaType = z.infer<typeof selectBalconySchema>;

// Optional: light variant if you ever want to omit heavy JSON fields
export type selectBalconySchemaTypeNoHeavy = Omit<
  selectBalconySchemaType,
  "foundationArray" | "postsArray" | "foundationArrayRaw" | "postsArrayRaw" | "metadata"
>;
