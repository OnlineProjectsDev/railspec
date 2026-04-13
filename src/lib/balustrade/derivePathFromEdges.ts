// /lib/balustrade/derivePathFromEdges.ts
import type { Edge, EdgeSelection, Vec2 } from "../types"

export type DerivePathResult = {
  path: Vec2[]
  warnings: string[]

  /**
   * Maps each derived path segment to the selected source edge id that created it.
   *
   * Example:
   * - path has N points
   * - pathSegmentEdgeIds has N-1 items
   * - path segment [path[i] -> path[i+1]] came from pathSegmentEdgeIds[i]
   */
  pathSegmentEdgeIds: string[]
}

export function derivePathFromEdgeSelection(edges: Edge[], selection: EdgeSelection): DerivePathResult {
  const byId = new Map(edges.map((e) => [e.id, e] as const))
  const warnings: string[] = []
  const path: Vec2[] = []
  const pathSegmentEdgeIds: string[] = []

  for (const edgeId of selection.edgeIds) {
    const e = byId.get(edgeId)
    if (!e) {
      warnings.push(`Missing edge: ${edgeId}`)
      continue
    }

    const reversed = !!selection.reversedById?.[edgeId]
    const a = reversed ? e.b : e.a
    const b = reversed ? e.a : e.b

    if (!path.length) {
      path.push({ x: a.x, z: a.z }, { x: b.x, z: b.z })
      pathSegmentEdgeIds.push(edgeId)
      continue
    }

    const last = path[path.length - 1]
    const snapDist = Math.hypot(a.x - last.x, a.z - last.z)

    if (snapDist > 1e-3) {
      warnings.push(`Edge ${edgeId} does not connect to previous (gap ${snapDist.toFixed(2)}mm)`)
    }

    path.push({ x: b.x, z: b.z })
    pathSegmentEdgeIds.push(edgeId)
  }

  return { path, warnings, pathSegmentEdgeIds }
}