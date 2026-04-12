// /lib/derive/deriveBalustradeModel.ts
import type { BalustradeSource, Foundation, OffsetSpec, Vec2 } from "../types"
import { deriveFloorEdges } from "../foundation/deriveEdges"
import { derivePathFromEdgeSelection } from "../balustrade/derivePathFromEdges"
import { offsetPolyline } from "../balustrade/offset/offsetPath"
import { deriveSegments } from "../segments"

export type DerivedBalustradeModel = {
  floorEdges: ReturnType<typeof deriveFloorEdges>
  sourcePath: Vec2[]
  balustradePath: Vec2[]
  segments: ReturnType<typeof deriveSegments>
  warnings: string[]
}

export function deriveBalustradeModel(args: {
  foundation: Foundation
  balustradeSource: BalustradeSource
  offsetSpec: OffsetSpec
}): DerivedBalustradeModel {
  const floorEdges = deriveFloorEdges(args.foundation.floor)

  let sourcePath: Vec2[] = []
  const warnings: string[] = []

  if (args.balustradeSource.mode === "manual") {
    sourcePath = args.balustradeSource.path
  } else {
    const res = derivePathFromEdgeSelection(floorEdges, args.balustradeSource.selection)
    sourcePath = res.path
    warnings.push(...res.warnings)
  }

  const balustradePath = offsetPolyline(sourcePath, args.offsetSpec)

  const segments = deriveSegments({
      id: "derived",
      balustradePath,
      laserLevelY: 0,
      topY: 0,
      minPostLength: 1000,
      maxPostSpacing: 1280,
      minBarrierHeight: 1000,
      maxBarrierHeight: 1200,
      maxPanelHeight: 1000,
      maxBottomGap: 100,
      panelHeight: 950
  })

  return { floorEdges, sourcePath, balustradePath, segments, warnings }
}