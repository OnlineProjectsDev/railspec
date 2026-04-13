// /app/(rs)/shopdrawings-editor/types.ts
import type { RootState } from "@/lib/types"

export type ShopDrawingSheetMeta = {
  jobNumber: string
  stageNumber: string
  drop: string
  balconyNo: string
  balconyLabel: string
  clientName: string
  siteAddressLine: string
  cityLine: string
}

export type ShopDrawingSheetDetails = {
  title1?: string
  title2?: string
  title3?: string
  defaultScale?: string
  defaultColour?: string
  design?: string
  anchorage?: string
  toprail?: string
  infill?: string
  notes?: string
}

export type ShopDrawingPlanPost = {
  id: string
  label: string
  x: number
  z: number
  type: string
  rotationY: number
  length: number
}

export type ShopDrawingPlanSegment = {
  id: string
  runId: string
  start: { x: number; z: number }
  end: { x: number; z: number }
  length: number
}

export type ShopDrawingPlanData = {
  posts: ShopDrawingPlanPost[]
  segments: ShopDrawingPlanSegment[]
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type ShopDrawingPoint2D = {
  x: number
  z: number
}

export type ShopDrawingRender2DBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type ShopDrawingRender2DFloorVertex = {
  x: number
  z: number
}

export type ShopDrawingRender2DOffsetEdge = {
  id: string
  x1: number
  z1: number
  x2: number
  z2: number
  refType: "include" | "exclude"
}

export type ShopDrawingRender2DThickEdge = {
  id: string
  x1: number
  z1: number
  x2: number
  z2: number
  edgeType: string
}

export type ShopDrawingRender2DFloor = {
  closed: boolean
  vertices: ShopDrawingRender2DFloorVertex[]
  offsetEdges: ShopDrawingRender2DOffsetEdge[]
  thickEdges: ShopDrawingRender2DThickEdge[]
}

export type ShopDrawingRender2DPostBody = {
  id: string
  postId: string
  label: string
  center: ShopDrawingPoint2D
  width: number
  depth: number
  rotationY: number
  type: string
}

export type ShopDrawingRender2DBaseplate = {
  id: string
  postId?: string | null
  center: ShopDrawingPoint2D
  width: number
  depth: number
  rotationY: number
  type: string
}

export type ShopDrawingRender2DDressRing = {
  id: string
  postId?: string | null
  center: ShopDrawingPoint2D
  diameter: number
  type: string
}

export type ShopDrawingRender2DSpigot = {
  id: string
  center: ShopDrawingPoint2D
  width: number
  depth: number
  rotationY: number
  type: string
}

export type ShopDrawingRender2DToprail = {
  id: string
  partName: string
  start: ShopDrawingPoint2D
  end: ShopDrawingPoint2D
  center: ShopDrawingPoint2D
  width: number
  height: number
  rotationY: number
  length: number
  leftPlane?: {
    x: number
    z: number
    v_x: number
    v_z: number
  } | null
  rightPlane?: {
    x: number
    z: number
    v_x: number
    v_z: number
  } | null
}

export type ShopDrawingRender2DGlassPanel = {
  id: string
  start: ShopDrawingPoint2D
  end: ShopDrawingPoint2D
  center: ShopDrawingPoint2D
  width: number
  thickness: number
  rotationY: number
  height: number
  label?: string | null
}

export type ShopDrawingRender2DVerticalInfill = {
  id: string
  center: ShopDrawingPoint2D
  width: number
  depth: number
  rotationY: number
  partName: string
  length: number
}

export type ShopDrawingRender2DBottomRail = {
  id: string
  bayId: string
  start: ShopDrawingPoint2D
  end: ShopDrawingPoint2D
  center: ShopDrawingPoint2D
  width: number
  height: number
  rotationY: number
  length: number
}

export type ShopDrawingRender2DPanelLabel = {
  id: string
  label: string
  x: number
  z: number
  rotationDeg: number
  description?: string | null
}

export type ShopDrawingRender2DDimension = {
  id: string
  kind: "segment" | "bay" | "floor-edge" | "angle"
  from: ShopDrawingPoint2D
  to: ShopDrawingPoint2D
  vertex?: ShopDrawingPoint2D
  value: string
  offset: number
  rotationDeg?: number
}

export type ShopDrawingRender2DData = {
  bounds: ShopDrawingRender2DBounds
  floor?: ShopDrawingRender2DFloor | null
  postBodies: ShopDrawingRender2DPostBody[]
  baseplates: ShopDrawingRender2DBaseplate[]
  dressRings: ShopDrawingRender2DDressRing[]
  spigots: ShopDrawingRender2DSpigot[]
  toprails: ShopDrawingRender2DToprail[]
  glassPanels: ShopDrawingRender2DGlassPanel[]
  verticalInfills: ShopDrawingRender2DVerticalInfill[]
  bottomRails: ShopDrawingRender2DBottomRail[]
  panelLabels: ShopDrawingRender2DPanelLabel[]
  dimensions: ShopDrawingRender2DDimension[]
}

export type ShopDrawingRender3DModelPost = {
  id: string
  segmentId: string
  anchorage: string
  rotationY: number
  x: number
  yBottom: number
  yTop: number
  z: number
  size?: number | null
}

export type ShopDrawingRender3DModelToprailPiece = {
  id: string
  runIndex: number
  pieceIndex: number
  start: { x: number; y: number; z: number }
  end: { x: number; y: number; z: number }
  length: number
  partName?: string | null
  width: number
  height: number
}

export type ShopDrawingRender3DModelFloor = {
  closed: boolean
  vertices: ShopDrawingRender2DFloorVertex[]
  fflY?: number | null
  slabThickness?: number | null
  edgeTypes?: Array<{
    edgeType: string
    thickness?: number | null
    height?: number | null
    offset?: number | null
    refType?: "include" | "exclude" | null
  }>
}

export type ShopDrawingRender3DData = {
  model: {
    sourceState?: RootState | null
    posts: ShopDrawingRender3DModelPost[]
    toprailPieces: ShopDrawingRender3DModelToprailPiece[]
    floor?: ShopDrawingRender3DModelFloor | null
    colour?: {
      name: string
      hex: number
    } | null
    design: string
    toprail: string
    infill: string
  }
}

export type ShopDrawingView2D = {
  viewport?: {
    padding?: number | null
  } | null
  overrides?: {
    hiddenDimensionIds?: string[] | null
    labelOffsetsById?: Record<string, { dx: number; dz: number }> | null
    dimensionOffsetsById?: Record<string, number> | null
    showBalustradePathReferenceLines?: boolean | null
    showSegmentLines?: boolean | null
  } | null
}

export type ShopDrawingView3D = {
  camera: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    fov: number
  }
  placement?: {
    x: number
    y: number
    width: number
    height: number
  } | null
}

export type ShopDrawingPostRow = {
  postLabel: string
  type: string
  length: string
  details: string
}

export type ShopDrawingPanelRow = {
  panelLabel: string
  width: string
  height: string
  details: string
}

export type ShopDrawingLegendItem = {
  label: string
  value: string
}

export type ShopDrawingSheetData = {
  id: string
  balconyId: number
  meta: ShopDrawingSheetMeta
  plan: ShopDrawingPlanData
  render2d?: ShopDrawingRender2DData
  render3d?: ShopDrawingRender3DData
  view2d?: ShopDrawingView2D
  view3d?: ShopDrawingView3D
  posts: ShopDrawingPostRow[]
  panels: ShopDrawingPanelRow[]
  legend: ShopDrawingLegendItem[]
  sheetDetails?: ShopDrawingSheetDetails
}