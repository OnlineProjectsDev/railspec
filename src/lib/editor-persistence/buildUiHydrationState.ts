// /lib/editor-persistence/buildUiHydrationState.ts
import { initialState } from "@/lib/state"

export function buildEditorUiHydrationState() {
  return {
    mode: initialState.mode,
    editorContext: initialState.editorContext,
    view: initialState.view,
    snapEnabled: initialState.snapEnabled,
    constraintMode: initialState.constraintMode,
    gizmoTool: initialState.gizmoTool,
    postsTool: initialState.postsTool,
    selectedFloorVertexIndex: initialState.selectedFloorVertexIndex,
    selectedPostIds: initialState.selectedPostIds,
    dragBehavior: initialState.dragBehavior,
    laserHeightListEditMode: initialState.laserHeightListEditMode,
    hasDerivedBalustrade: initialState.hasDerivedBalustrade,
    debug: initialState.debug,
  }
}