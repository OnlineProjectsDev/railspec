// /app/(rs)/fabrication/deriveFabricationParts.ts

export type PostFace = "P1" | "P2" | "P3" | "P4"

export type FabricationPostDrilling = Partial<Record<PostFace, number[]>> & {
  special?: Partial<Record<"SF" | "WF", Partial<Record<PostFace, number[]>>>>
}

export type FabricationPart =
  | FabricationExtrusionPart
  | FabricationGlassPart
  | FabricationComponentPart

export type FabricationExtrusionSubtype =
  | "post"
  | "toprail"
  | "midrail"
  | "vertical"

export type FabricationExtrusionPart = {
  kind: "extrusion"

  subtype: FabricationExtrusionSubtype

  sourceId: string
  sourcePostId?: number
  sourceBayId?: string
  sourceSegmentId?: string

  partName: string

  sourceX?: number
  sourceY?: number
  sourceZ?: number

  drillingDirX?: number
  drillingDirZ?: number

  planeCenterLength?: number
  length?: number
  height?: number

  hml: number
  hmr: number
  vml: number
  vmr: number

  drillingData?: FabricationPostDrilling
  drilling?: string
}

export type FabricationGlassPart = {
  kind: "glass"

  sourceId: string
  sourcePostId?: number
  sourceBayId?: string
  sourceSegmentId?: string

  partName: string

  width: number
  height: number
  thickness: number

  glassType?: string
  polish?: string

  topEdgeAngle?: number
  bottomEdgeAngle?: number
  leftEdgeAngle?: number
  rightEdgeAngle?: number
}

export type FabricationComponentPart = {
  kind: "component"

  sourceId: string
  sourcePostId?: number
  sourceBayId?: string
  sourceSegmentId?: string

  partName: string
  qty: number
  details?: string
}