// /lib/editor-persistence/initializeEditorState.ts
import type {
  BalustradePersistedState,
  EditorConfigState,
  FoundationPersistedState,
  JobStageDefaults,
} from "@/lib/editor-persistence/types"
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults"
import { editorTemplates, initialState } from "@/lib/state"
import type { Balcony, ColourValue, RootState } from "@/lib/types"

function resolveTemplateId(defaults: JobStageDefaults): string {
  return defaults.template?.preset ?? DEFAULT_JOB_STAGE_DEFAULTS.template?.preset ?? "default-rectangular"
}

function resolveColor(defaults: JobStageDefaults): ColourValue {
  return {
    hex: 0xaaaaaa,
    name: "TBD",
  }
}

function resolveConstraints(defaults: JobStageDefaults) {
  return defaults.constraints ?? DEFAULT_JOB_STAGE_DEFAULTS.constraints ?? {
    laserLevelY: 0,
    topY: 1020,
    minPostLength: 1020,
    maxPostSpacing: 1280,
    minBarrierHeight: 1020,
    maxBarrierHeight: 1200,
    maxPanelHeight: 1000,
    maxBottomGap: 100,
    panelHeight: 950,
  }
}

export function buildInitialEditorConfigState(defaults?: JobStageDefaults): EditorConfigState {
  const resolved = defaults ?? DEFAULT_JOB_STAGE_DEFAULTS

  return {
    design: resolved.design_default ?? "RD-D1",
    anchorage: resolved.anchorage_default ?? "BP",
    toprail: resolved.toprail_default ?? "Elite",
    infill: resolved.infill_default ?? "6.38mm Clear Laminate",
    color: resolveColor(resolved),
    windLoad: resolved.wind_load ?? DEFAULT_JOB_STAGE_DEFAULTS.wind_load,
    metadata: {},
    notes: null,
  }
}

export function buildInitialFoundationState(defaults?: JobStageDefaults): FoundationPersistedState {
  const resolved = defaults ?? DEFAULT_JOB_STAGE_DEFAULTS
  const constraints = resolveConstraints(resolved)
  const templateId = resolveTemplateId(resolved)
  const template = editorTemplates.find((t) => t.id === templateId) ?? editorTemplates[0]

  const foundation = template.foundation ?? {
    floor: {
      id: "floor-1",
      vertices: [],
      closed: false,
    },
    edgeTypeDefaults: {
      floor: { offset: 90, thickness: null, height: null },
      wall: { offset: 90, thickness: 150, height: 1800 },
      hob: { offset: -75, thickness: 150, height: 150 },
      low_wall: { offset: 23, thickness: 150, height: 400 },
    },
    fflHeight: 0,
    fflY: 0,
  }

  return {
    foundation: {
      ...foundation,
      fflHeight: foundation.fflHeight ?? 0,
      fflY: foundation.fflY ?? (constraints.laserLevelY ?? 0),
    },
    metadata: {},
    notes: null,
  }
}

export function buildInitialBalustradeState(defaults?: JobStageDefaults): BalustradePersistedState {
  const resolved = defaults ?? DEFAULT_JOB_STAGE_DEFAULTS
  const constraints = resolveConstraints(resolved)
  const templateId = resolveTemplateId(resolved)
  const template = editorTemplates.find((t) => t.id === templateId) ?? editorTemplates[0]
  const balconySeed = template.balcony ?? {}

  const balcony: Balcony = {
    ...initialState.balcony,
    ...balconySeed,
    id: balconySeed.id ?? initialState.balcony.id ?? "balcony-1",
    balustradePath: balconySeed.balustradePath ?? initialState.balcony.balustradePath,
    laserLevelY: constraints.laserLevelY ?? balconySeed.laserLevelY ?? initialState.balcony.laserLevelY,
    topY: constraints.topY ?? constraints.minBarrierHeight ?? balconySeed.topY ?? initialState.balcony.topY,
    minPostLength: constraints.minPostLength ?? balconySeed.minPostLength ?? initialState.balcony.minPostLength,
    maxPostSpacing: constraints.maxPostSpacing ?? balconySeed.maxPostSpacing ?? initialState.balcony.maxPostSpacing,
    minBarrierHeight: constraints.minBarrierHeight ?? balconySeed.minBarrierHeight ?? initialState.balcony.minBarrierHeight,
    maxBarrierHeight: constraints.maxBarrierHeight ?? balconySeed.maxBarrierHeight ?? initialState.balcony.maxBarrierHeight,
    maxPanelHeight: constraints.maxPanelHeight ?? balconySeed.maxPanelHeight ?? initialState.balcony.maxPanelHeight,
    maxBottomGap: constraints.maxBottomGap ?? balconySeed.maxBottomGap ?? initialState.balcony.maxBottomGap,
    panelHeight: constraints.panelHeight ?? balconySeed.panelHeight ?? initialState.balcony.panelHeight,
  }

  return {
    balcony,
    posts: [],
    hasDerivedBalustrade: false,
    metadata: {},
    notes: null,
  }
}

export function buildInitialPersistedEditorState(defaults?: JobStageDefaults) {
  return {
    editorConfig: buildInitialEditorConfigState(defaults),
    foundationState: buildInitialFoundationState(defaults),
    balustradeState: buildInitialBalustradeState(defaults),
    version: 1,
  }
}

export function hydrateRootStateFromPersisted(args: {
  persisted: {
    editorConfig: EditorConfigState
    foundationState: FoundationPersistedState
    balustradeState: BalustradePersistedState
  }
  uiState: Pick<
    RootState,
    | "mode"
    | "editorContext"
    | "view"
    | "snapEnabled"
    | "constraintMode"
    | "gizmoTool"
    | "postsTool"
    | "selectedFloorVertexIndex"
    | "selectedPostIds"
    | "dragBehavior"
    | "laserHeightListEditMode"
    | "hasDerivedBalustrade"
    | "debug"
  >
}): RootState {
  const { persisted, uiState } = args

  return {
    ...uiState,
    design: persisted.editorConfig.design,
    anchorage: persisted.editorConfig.anchorage,
    toprail: persisted.editorConfig.toprail,
    infill: persisted.editorConfig.infill,
    color: persisted.editorConfig.color,
    windLoad: persisted.editorConfig.windLoad,
    foundation: persisted.foundationState.foundation,
    balcony: persisted.balustradeState.balcony,
    posts: persisted.balustradeState.posts,
    hasDerivedBalustrade:
      typeof persisted.balustradeState.hasDerivedBalustrade === "boolean"
        ? persisted.balustradeState.hasDerivedBalustrade
        : persisted.balustradeState.posts.length > 0,
  }
}