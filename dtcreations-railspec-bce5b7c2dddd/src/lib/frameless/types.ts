// /lib/frameless/types.ts
import type { FramelessToprailType, RootState } from "@/lib/types"
import type { FramelessDesignCode } from "@/lib/jobDesignRules"

export type FramelessSystemType = FramelessDesignCode

export type FramelessSpigotType =
  | "Spigot_RDTF"
  | "Spigot_SQTF"
  | "Spigot_RDCD"
  | "Spigot_SQCD"
  | "Spigot_HDTF"
  | "Spigot_HDCD"
  | "Spigot_SF"

export type Vec2XZ = {
  x: number
  z: number
}

export type Vec3XYZ = {
  x: number
  y: number
  z: number
}

export type FramelessPanelBase = {
  id: string
  runIndex: number
  segmentId: string
  segmentIndex: number

  start: Vec2XZ
  end: Vec2XZ

  leftPlanePoint: Vec3XYZ
  leftPlaneDir: Vec3XYZ

  rightPlanePoint: Vec3XYZ
  rightPlaneDir: Vec3XYZ

  length: number
}

export type FramelessSpigot = {
  id: string
  panelId: string
  runIndex: number
  segmentId: string
  side: "left" | "right"
  type: FramelessSpigotType
  x: number
  z: number
  supportY: number
  /**
   * Additional anchorage reference laser-heights for side-fixed frameless spigots.
   *
   * Values use the same convention as post.height / corner.laserHeight:
   * - positive = down from laser
   * - negative = up from laser
   */
  anchorageLaserHeights: number[]
}

export type DerivedFramelessPanel = {
  id: string
  runIndex: number
  segmentId: string
  segmentIndex: number

  start: { x: number; z: number }
  end: { x: number; z: number }
  length: number

  leftPlanePoint: { x: number; y: number; z: number }
  leftPlaneDir: { x: number; y: number; z: number }
  rightPlanePoint: { x: number; y: number; z: number }
  rightPlaneDir: { x: number; y: number; z: number }

  glassThickness: number

  leftSpigot: FramelessSpigot
  rightSpigot: FramelessSpigot

  leftSupportY: number
  rightSupportY: number
  controllingSupportY: number

  glassBottomY: number
  glassTopY: number
  glassHeight: number
  targetGlassBottomY: number

  toprailType: string | null
  toprailOffset: number
  toprailBottomY: number
  toprailCenterY: number
  toprailTopY: number
}

export type DerivedFramelessResult = {
  enabled: boolean
  system: FramelessSystemType | null
  panels: DerivedFramelessPanel[]
}

export type FramelessDeriveOptions = {
  system?: FramelessSystemType
  spigotType?: FramelessSpigotType
  glassThickness?: number
  glassBottomOffset?: number
  toprailHeight?: number
  toprailOffsetFromGlassTop?: number
}

export type SupportSampleFn = (args: {
  state: RootState
  x: number
  z: number
  runIndex: number
  segmentId: string
}) => number