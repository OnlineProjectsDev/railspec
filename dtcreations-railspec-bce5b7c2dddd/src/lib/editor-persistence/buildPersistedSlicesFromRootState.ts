// /lib/editor-persistence/buildPersistedSlicesFromRootState.ts
import type { RootState } from "@/lib/types"
import type {
  EditorConfigState,
  FoundationPersistedState,
  BalustradePersistedState,
} from "@/lib/editor-persistence/types"

export function buildPersistedSlicesFromRootState(state: RootState): {
  editorConfig: EditorConfigState
  foundationState: FoundationPersistedState
  balustradeState: BalustradePersistedState
} {
  return {
    editorConfig: {
      design: state.design,
      anchorage: state.anchorage,
      toprail: state.toprail,
      infill: state.infill,
      color: state.color,
      windLoad: state.windLoad,
    },
    foundationState: {
      foundation: state.foundation,
    },
    balustradeState: {
      balcony: state.balcony,
      posts: state.posts,
      hasDerivedBalustrade: state.hasDerivedBalustrade,
    },
  }
}

export function serializePersistedSlices(value: {
  editorConfig: EditorConfigState
  foundationState: FoundationPersistedState
  balustradeState: BalustradePersistedState
}) {
  return JSON.stringify(value)
}