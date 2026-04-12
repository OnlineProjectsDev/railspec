// /zod-schemas/editorState.ts
import { z } from "zod"

export const colourValueSchema = z.object({
  hex: z.number(),
  name: z.string(),
})

export const windLoadSchema = z.object({
  bldg_height: z.number().int().positive(),
  wind_region: z.enum(["A", "B", "C", "D"]),
  terrain_category: z.number().int().min(1).max(3),
})

export const editorConfigSchema = z.object({
  design: z.string(),
  anchorage: z.string(),
  toprail: z.string(),
  infill: z.string(),
  color: colourValueSchema,
  windLoad: windLoadSchema,

  metadata: z.record(z.string(), z.any()).optional(),
  notes: z.string().nullable().optional(),
})

export const foundationStateSchema = z.object({
  foundation: z.any(),

  metadata: z.record(z.string(), z.any()).optional(),
  notes: z.string().nullable().optional(),
})

export const balustradeStateSchema = z.object({
  balcony: z.any(),
  posts: z.array(z.any()),

  metadata: z.record(z.string(), z.any()).optional(),
  notes: z.string().nullable().optional(),
})

export const balconyEditorStateSchema = z.object({
  editorConfig: editorConfigSchema,
  foundationState: foundationStateSchema,
  balustradeState: balustradeStateSchema,
  version: z.number().int().min(1),
})

export const jobStageDefaultsSchema = z.object({
  design_default: z.string().optional(),
  anchorage_default: z.string().optional(),
  toprail_default: z.string().optional(),
  infill_default: z.string().optional(),
  powdercoatColourId: z.number().int().nullable().optional(),

  wind_load: windLoadSchema,

  constraints: z.object({
    minBarrierHeight: z.number().int(),
    maxBarrierHeight: z.number().int(),

    panelHeight: z.number().int(),
    maxPanelHeight: z.number().int(),

    maxPostSpacing: z.number().int(),
    maxBottomGap: z.number().int(),
    minPostLength: z.number().int(),

    laserLevelY: z.number().int(),
    topY: z.number().int().optional(),
  }),

  template: z.object({
    preset: z.string().optional(),
  }).optional(),
})

export type EditorConfigStateSchemaType = z.infer<typeof editorConfigSchema>
export type FoundationStateSchemaType = z.infer<typeof foundationStateSchema>
export type BalustradeStateSchemaType = z.infer<typeof balustradeStateSchema>
export type BalconyEditorStateSchemaType = z.infer<typeof balconyEditorStateSchema>
export type JobStageDefaultsSchemaType = z.infer<typeof jobStageDefaultsSchema>