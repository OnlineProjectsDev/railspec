// /lib/segments.ts
import { Balcony, Segment } from "./types"

export function deriveSegments(balcony: Balcony): Segment[] {
  const segments: Segment[] = []
  const vertices = balcony.balustradePath

  const prefix = balcony.id || "balcony"

  for (let i = 0; i < vertices.length - 1; i++) {
    const start = vertices[i]
    const end = vertices[i + 1]

    const dx = end.x - start.x
    const dz = end.z - start.z

    const length = Math.hypot(dx, dz)
    if (length < 1e-6) continue

    segments.push({
      id: `${prefix}-seg-${i}`,
      start,
      end,
      length,
      direction: {
        x: dx / length,
        z: dz / length,
      },

      // For now segment constraints inherit the current global balcony values.
      maxPostSpacing: balcony.maxPostSpacing,
      minBarrierHeight: balcony.minBarrierHeight,
      maxBarrierHeight: balcony.maxBarrierHeight,
      maxPanelHeight: balcony.maxPanelHeight,
      maxBottomGap: balcony.maxBottomGap,

      // First-pass segment defaults for bays / infill
      panelHeight: balcony.panelHeight,
      boundaryStartBayRefMode: "segment",
      boundaryEndBayRefMode: "segment",
    })
  }

  return segments
}