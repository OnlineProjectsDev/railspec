// /lib/editor-persistence/types.ts
import type {
  Balcony,
  ColourValue,
  DesignCode,
  Foundation,
  InfillType,
  Post,
  ToprailType,
  AnchorageType,
} from "@/lib/types"
import type { WindLoad } from "@/lib/jobDesignRules"

export type EditorConfigState = {
  design: DesignCode
  anchorage: AnchorageType
  toprail: ToprailType
  infill: InfillType
  color: ColourValue
  windLoad: WindLoad

  metadata?: Record<string, unknown>
  notes?: string | null
}

export type FoundationPersistedState = {
  foundation: Foundation

  metadata?: Record<string, unknown>
  notes?: string | null
}

export type BalustradePersistedState = {
  balcony: Balcony
  posts: Post[]
  hasDerivedBalustrade: boolean

  metadata?: Record<string, unknown>
  notes?: string | null
}

export type BalconyEditorStateRecord = {
  editorConfig: EditorConfigState
  foundationState: FoundationPersistedState
  balustradeState: BalustradePersistedState
  version: number
}

export type JobStageDefaults = {
  design_default?: DesignCode
  anchorage_default?: AnchorageType
  toprail_default?: ToprailType
  infill_default?: InfillType
  powdercoatColourId?: number | null

  wind_load: WindLoad

  constraints: {
    minBarrierHeight: number
    maxBarrierHeight: number

    panelHeight: number
    maxPanelHeight: number

    maxPostSpacing: number
    maxBottomGap: number
    minPostLength: number

    laserLevelY: number
    topY?: number
  }

  template?: {
    preset?: string
  }
}