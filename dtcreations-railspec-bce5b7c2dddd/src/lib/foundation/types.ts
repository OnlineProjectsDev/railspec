// /lib/foundation/types.ts
import type { Floor, Vec2, FloorEdgeMeta } from "../types"

export type EdgeId = string

export type FloorEdge = {
  id: EdgeId
  a: Vec2
  b: Vec2
  index: number // edge order in the polygon

  // Optional convenience (can be filled when deriving edges)
  meta?: FloorEdgeMeta
}

export type FoundationState = {
  floor: Floor | null
  selectedEdgeIds: EdgeId[]
}