// /lib/reducer/actions.ts
import type { Action as LegacyAction } from "./legacy"
import type {
  BoundaryBayRefMode,
  FloorEdgeRefType,
  FloorEdgeType,
  FramelessCornerType,
  PostsToolId,
  RootState,
} from "../types"

export type TemplateAction =
  | { type: "LOAD_TEMPLATE"; templateId: string }
  | { type: "SET_LASER_HEIGHT_LIST_EDIT_MODE"; value: boolean }
  | { type: "SET_FLOOR_CORNER_POST_HOST"; cornerIndex: number; value: "left" | "right" }

export type FloorAction =
  | { type: "SELECT_FLOOR_VERTEX"; index: number | null }
  | { type: "MOVE_FLOOR_VERTEX"; index: number; x: number; z: number }
  | { type: "ADD_FLOOR_VERTEX_AFTER"; index: number; x: number; z: number }
  | { type: "DELETE_FLOOR_VERTEX"; index: number }
  | { type: "TOGGLE_FLOOR_CLOSED" }
  | { type: "INSERT_FLOOR_VERTEX"; afterIndex: number; x: number; z: number }
  // ===== Floor edge meta =====
  | { type: "SET_FLOOR_EDGE_OFFSET"; edgeIndex: number; offset: number }
  | { type: "SET_FLOOR_EDGE_REF_TYPE"; edgeIndex: number; refType: FloorEdgeRefType }
  | { type: "CYCLE_FLOOR_EDGE_REF_TYPE"; edgeIndex: number }
  | { type: "SET_FLOOR_EDGE_TYPE"; edgeIndex: number; edgeType: FloorEdgeType }
  | { type: "SET_FLOOR_EDGE_THICKNESS"; edgeIndex: number; thickness: number | null }
  | { type: "SET_FLOOR_EDGE_HEIGHT"; edgeIndex: number; height: number | null }
  // ===== Balcony generation controls =====
  | { type: "SET_MAX_POST_SPACING"; value: number }
  | { type: "SET_MIN_POST_LENGTH"; value: number }
  | { type: "SET_MIN_BARRIER_HEIGHT"; value: number }
  | { type: "SET_MAX_BARRIER_HEIGHT"; value: number }
  | { type: "SET_MAX_PANEL_HEIGHT"; value: number }
  | { type: "SET_MAX_BOTTOM_GAP"; value: number }
  // ===== Manual derive trigger =====
  | { type: "DERIVE_BALUSTRADE_FROM_FLOOR" }
  | { type: "UPDATE_TOPRAIL_END_EXTENSION"; end: "start" | "end"; value: number; runIndex?: number }
  | {
      type: "SET_TOPRAIL_TERMINATION_TYPE"
      end: "start" | "end"
      value: "EC" | "WC"
      runIndex?: number
    }
  | { type: "SET_FLOOR_EDGE_LENGTH"; edgeIndex: number; length: number }
  | { type: "SET_FLOOR_EDGE_LOCKED_LENGTH"; edgeIndex: number; lockedLength: number | null }
  | { type: "SET_FLOOR_CORNER_ANGLE"; cornerIndex: number; angle: number }
  | { type: "SET_FLOOR_CORNER_LOCKED_ANGLE"; cornerIndex: number; lockedAngle: number | null }
  | { type: "SET_FLOOR_VERTEX_LASER_HEIGHT"; vertexIndex: number; laserHeight: number | null }
  | { type: "MOVE_FLOOR_VERTEX_DRAG"; index: number; x: number; z: number }
  | { type: "UPDATE_FOUNDATION_FFL_HEIGHT"; fflHeight: number }
  | { type: "SET_SEGMENT_PANEL_HEIGHT"; segmentId: string; value: number }
  | { type: "SET_SEGMENT_BOUNDARY_START_BAY_REF_MODE"; segmentId: string; value: BoundaryBayRefMode }
  | { type: "SET_SEGMENT_BOUNDARY_END_BAY_REF_MODE"; segmentId: string; value: BoundaryBayRefMode }

export type PostsToolAction =
  | { type: "SET_POSTS_TOOL"; tool: PostsToolId | null }
  | { type: "ADD_MID_POST_ON_SEGMENT"; segId: string; wx: number; wz: number }
  | { type: "ADD_POSTS_TO_MAX_SPACING_ON_SEGMENT"; segId: string; wx: number; wz: number }
  | { type: "DELETE_POST"; id: string }
  | { type: "TOGGLE_AUTO_TOP_EXCLUDE_POSTS"; ids: string[] }
  | { type: "TOGGLE_BAY_SUPPRESSION"; bayId: string }
  | { type: "SET_BAY_BOTTOM_REF_MODE"; bayId: string; value: BoundaryBayRefMode }
  | { type: "SET_POST_ANCHORAGE"; id: string; anchorage: string }
  | { type: "RESET_POST_ANCHORAGE"; id: string }

export type BalustradeTopologyAction =
  | { type: "SPLIT_BALUSTRADE_AT_POST"; postId: string }
  | { type: "JOIN_BALUSTRADE_AT_VERTEX"; runIndex: number; vertexIndex: number }

export type FramelessGeometryAction = 
  | { type: "SET_FRAMELESS_SPIGOT_TYPE"; value: RootState["balcony"]["framelessSpigotType"] }
  | { type: "SET_FRAMELESS_GLASS_BOTTOM_OFFSET"; value: number }
  | { type: "SET_FRAMELESS_TOPRAIL_TYPE"; value: RootState["balcony"]["framelessToprailType"] }
  | { type: "SET_FRAMELESS_TOPRAIL_OFFSET_FROM_GLASS_TOP"; value: number }
  | { type: "SET_FRAMELESS_TOPRAIL_HEIGHT"; value: number }
  | {
      type: "SET_FRAMELESS_CORNER_TYPE"
      segmentId: string
      end: "start" | "end"
      value: FramelessCornerType
    }
  | {
      type: "SET_FRAMELESS_CORNER_GAP"
      segmentId: string
      end: "start" | "end"
      value: number
    }

export type Action =
  | LegacyAction
  | FloorAction
  | PostsToolAction
  | BalustradeTopologyAction
  | FramelessGeometryAction
  | TemplateAction