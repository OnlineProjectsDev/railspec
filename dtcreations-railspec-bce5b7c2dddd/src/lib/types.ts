// /lib/types.ts
import type { WindLoad } from "./jobDesignRules"

export type Vec2 = {
  x: number
  z: number
}

export type Vec3Range = {
  x: number
  yBottom: number
  yTop: number
  z: number
}

export type Mode = "substrate" | "balustrade"
export type ViewMode = "2d" | "3d"
export type ConstraintMode = "single" | "even"
export type GizmoTool = "translate" | "rotate" | "extend" | "anchor"

export type BoundaryBayRefMode = "segment" | "linked"
export type BayRakeMode = "none" | "between_segments"
export type CornerPostHost = "left" | "right"

export type FramelessCornerType =
  | "symmetric"
  | "this_segment_dominant"
  | "other_segment_dominant"

export type BayOverride = {
  suppressed?: boolean
  bottomRefMode?: BoundaryBayRefMode
  rakeMode?: BayRakeMode
}

export type DesignCode =
  | "RD-D1"
  | "RD-D2"
  | "RD-D3"
  | "RD-D3SLATS"
  | "RD-D4"
  | "RD-D4SLATS"
  | "RD-D5"
  | "RD-D6"
  | "RD-D7"
  | "RD-D8"
  | "RD-D9"
  | "RD-D10"
  | "RD-D11"
  | "RD-D12"
  | "RD-D13"

export type KnownAnchorageType =
  | "BP"
  | "BPST"
  | "DP"
  | "CD"
  | "SFI"
  | "SFO"
  | "WF"
  | "Spigot_RDTF"
  | "Spigot_SQTF"
  | "Spigot_RDCD"
  | "Spigot_SQCD"
  | "Spigot_HDTF"
  | "Spigot_HDCD"
  | "Spigot_SF"

export type AnchorageType = KnownAnchorageType | string

export type KnownToprailType =
  | "Elite"
  | "Visage"
  | "Slenderline"
  | "Oval"
  | "Round"
  | "None"
  | "25mm Round"
  | "25mm Square"
  | "38mm Round"
  | "38mm Handrail"

export type ToprailType = KnownToprailType | string

export type ToprailTerminationType = "EC" | "WC"

export type KnownInfillType =
  | "6.38mm Clear Laminate"
  | "6.38mm Translucent"
  | "6.38mm Sand Blasted"
  | "6.38mm Grey"
  | "9.52mm Clear Laminate"
  | "9.52mm Translucent"
  | "9.52mm Sand Blasted"
  | "9.52mm Grey"
  | "10mm Clear Laminate"
  | "10mm Translucent"
  | "12mm Clear Laminate"
  | "12mm Translucent"
  | "12mm Cerafic Coated"
  | "12mm Grey"
  | "13.52mm Clear Laminate"
  | "13.52mm Translucent"
  | "13.52mm Cerafic Coated"
  | "13.52mm Grey"
  | "Balusters Default Spaced"
  | "Balusters Equally Spaced"
  | "Slats Default Spaced"
  | "Slats Equally Spaced"
  | "Slats 9mm Spacers"
  | "Slats 5mm Spacers"
  | "Empty"
  | "Midrail"

export type InfillType = KnownInfillType | string

export type ColourValue = {
  hex: number
  name: string
}

export type Balcony = {
  id: string
  balustradePath: Vec2[]
  balustradePaths?: Vec2[][]
  laserLevelY: number
  topY: number
  minPostLength: number
  endExtensions?: { start?: number; end?: number }
  endExtensionsByRun?: Record<number, { start?: number; end?: number }>
  toprailTerminationTypes?: { start?: ToprailTerminationType; end?: ToprailTerminationType }
  toprailTerminationTypesByRun?: Record<number, { start?: ToprailTerminationType; end?: ToprailTerminationType }>
  maxPostSpacing: number
  minBarrierHeight: number
  maxBarrierHeight: number
  maxPanelHeight: number
  maxBottomGap: number
  panelHeight: number
  autoTopExcludePostIds?: string[]
  segmentEdgeTypeById?: Record<string, FloorEdgeType>

  runBoundarySourceEdgeIndicesByRun?: Record<
    number,
    {
      start?: number
      end?: number
    }
  >
  runBoundarySourceOffsetsByRun?: Record<
    number,
    {
      start?: number
      end?: number
    }
  >
  segmentSourceOffsetById?: Record<string, number>
  cornerPostHostByRun?: Record<number, Record<number, CornerPostHost>>
  segmentLowWallPlacementById?: Record<
    string,
    "inside" | "on_wall" | "outside"
  >

  /**
   * Derived vertical profile for each balustrade segment.
   *
   * Values use the same convention as post.height / corner.laserHeight:
   * - positive = down from laser
   * - negative = up from laser
   *
   * World Y at any endpoint is:
   *   y = laserLevelY - laserHeight
   */
  segmentHeightProfilesById?: Record<
    string,
    {
      startLaserHeight: number
      endLaserHeight: number
      sourceEdgeIndex?: number
    }
  >

  segmentConstraintsById?: Record<
    string,
    {
      maxPostSpacing: number
      minBarrierHeight: number
      maxBarrierHeight: number
      maxPanelHeight: number
      maxBottomGap: number
      panelHeight: number
      boundaryStartBayRefMode: BoundaryBayRefMode
      boundaryEndBayRefMode: BoundaryBayRefMode
      edgeType?: FloorEdgeType
      cornerStartType?: FramelessCornerType
      cornerEndType?: FramelessCornerType
      cornerStartGap?: number
      cornerEndGap?: number
    }
  >

  bayOverridesById?: Record<string, BayOverride>

  framelessSpigotType?: FramelessSpigotType | null
  framelessGlassBottomOffset?: number
  framelessToprailType?: FramelessToprailType | null
  framelessToprailOffsetFromGlassTop?: number
  framelessToprailHeight?: number
}

export type Segment = {
  id: string
  start: Vec2
  end: Vec2
  length: number
  direction: Vec2
  maxPostSpacing: number
  minBarrierHeight: number
  maxBarrierHeight: number
  maxPanelHeight: number
  maxBottomGap: number
  panelHeight: number
  boundaryStartBayRefMode: BoundaryBayRefMode
  boundaryEndBayRefMode: BoundaryBayRefMode
  cornerStartType?: FramelessCornerType
  cornerEndType?: FramelessCornerType
  cornerStartGap?: number
  cornerEndGap?: number
}
export type Post = {
  id: string
  segmentId: string
  position: Vec3Range
  referencePosition: Vec2

  // Installation measurement parameter:
  // height is POSITIVE down from laser plane (y=laserLevelY), NEGATIVE up.
  // yBottom is derived as: yBottom = laserLevelY - height
  height: number

  /**
   * Additional anchorage reference laser-heights for side-fixed / wall-fixed systems.
   *
   * Values use the same convention as `height` and corner `laserHeight`:
   * - positive = down from laser
   * - negative = up from laser
   *
   * These are anchorage-specific vertical reference levels only.
   * They do not replace `height` / `position.yBottom`.
   */
  anchorageLaserHeights: number[]

  rotationY: number
  anchorage: AnchorageType
  anchorageOverride?: boolean

  profile: {
    type: "square"
    size: number
  }
  spacingMode: "even" | "custom"
}

export type DragBehavior = "single" | "even"

export type DebugFlags = {
  showMitrePlanes: boolean
}

export type RootState = {
  mode: Mode
  editorContext: "sandbox" | "project"
  view: ViewMode
  snapEnabled: boolean
  constraintMode: ConstraintMode
  gizmoTool: GizmoTool

  design: DesignCode
  anchorage: AnchorageType
  toprail: ToprailType
  infill: InfillType
  color: ColourValue

  /**
   * Current job/default wind-load input used for design-rule lookups.
   */
  windLoad: WindLoad

  postsTool: PostsToolId | null
  foundation: Foundation
  selectedFloorVertexIndex: number | null
  balcony: Balcony
  posts: Post[]
  selectedPostIds: string[]
  dragBehavior: DragBehavior
  laserHeightListEditMode: boolean
  hasDerivedBalustrade: boolean

  debug: DebugFlags
}

export type FloorEdgeRefType = "include" | "exclude"

export type FloorEdgeType = "floor" | "wall" | "hob" | "low_wall"

export type FramelessToprailType =
  | "None"
  | "25mm Round"
  | "25mm Square"
  | "38mm Round"
  | "38mm Handrail"

export type FramelessSpigotType =
  | "Spigot_RDTF"
  | "Spigot_SQTF"
  | "Spigot_RDCD"
  | "Spigot_SQCD"
  | "Spigot_HDTF"
  | "Spigot_HDCD"
  | "Spigot_SF"

export type FloorEdgeMeta = {
  offset: number
  refType: FloorEdgeRefType
  lockedLength?: number | null
  edgeType?: FloorEdgeType
  thickness?: number | null
  height?: number | null
}

export type FloorCornerMeta = {
  lockedAngle?: number | null
  laserHeight?: number | null
  cornerPostHost?: CornerPostHost
}

export type Floor = {
  id: string
  vertices: Vec2[]
  closed: boolean
  edges?: FloorEdgeMeta[]
  corners?: FloorCornerMeta[]
}

export type Foundation = {
  floor: Floor
  edgeTypeDefaults?: FloorEdgeTypeDefaults
  fflHeight: number
  fflY: number
}

export type Edge = {
  id: string
  a: Vec2
  b: Vec2
  length: number
  dir: Vec2
}

export type FloorEdgeTypeDefaults = Partial<
  Record<
    FloorEdgeType,
    {
      offset: number
      thickness: number | null
      height: number | null
    }
  >
>

export type EdgeSelection = {
  edgeIds: string[]
  reversedById?: Record<string, boolean>
}

export type BalustradeSource =
  | { mode: "manual"; path: Vec2[] }
  | { mode: "edges"; selection: EdgeSelection }

export type OffsetSpec = {
  enabled: boolean
  distance: number
  side: "left" | "right"
}

export type PostsToolId = "add_mid_post" | "delete_post" | "add_posts_to_spacing"