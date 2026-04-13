// /lib/reducer/legacy.ts
import { RootState, ConstraintMode, GizmoTool, Post, DebugFlags } from "../types"
import { generatePosts } from "../generation"

export type Action =
  | { type: "SET_DRAG_BEHAVIOR"; value: "single" | "even" }
  | { type: "SET_VIEW"; view: "2d" | "3d" }
  | { type: "SET_MODE"; mode: "substrate" | "balustrade" }
  | { type: "SET_CONSTRAINT_MODE"; mode: ConstraintMode }
  | { type: "SET_GIZMO_TOOL"; tool: GizmoTool }
  | { type: "TOGGLE_SNAP" }
  | { type: "SELECT_POST"; id: string }
  | { type: "SELECT_MULTIPLE"; ids: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "UPDATE_BALCONY_PATH"; path: RootState["balcony"]["balustradePath"] }
  | { type: "REGENERATE_POSTS"; spacing: number }
  | { type: "UPDATE_POST_POSITION"; id: string; x?: number; z?: number }
  | { type: "UPDATE_POST_HEIGHT"; id: string; yBottom?: number; yTop?: number }
  | { type: "UPDATE_POST_HEIGHT_PARAM"; id: string; height: number }
  | { type: "UPDATE_BALCONY_LASER_LEVEL"; laserLevelY: number }
  | { type: "UPDATE_BALCONY_TOP_Y"; topY: number }
  | { type: "UPDATE_POST_ROTATION"; id: string; rotationY: number }
  | { type: "TOGGLE_DEBUG_FLAG"; key: keyof DebugFlags }
  | { type: "UPDATE_TOPRAIL_END_EXTENSION"; end: "start" | "end"; value?: number }

// function applyAutoTopAndDeriveY(state: RootState, posts: Post[]): RootState {
//   const laser = state.balcony.laserLevelY
//   const minLen = state.balcony.minPostLength

//   let requiredTop = -Infinity
//   for (const p of posts) {
//     const yBottom = laser - p.height
//     const req = yBottom + minLen
//     if (req > requiredTop) requiredTop = req
//   }
//   if (!Number.isFinite(requiredTop)) requiredTop = state.balcony.topY

//   const solvedTopY = Math.max(state.balcony.topY, requiredTop)

//   const derivedPosts = posts.map((p) => {
//     const yBottom = laser - p.height
//     const yTop = solvedTopY
//     return {
//       ...p,
//       position: {
//         ...p.position,
//         yBottom,
//         yTop,
//       },
//     }
//   })

//   return {
//     ...state,
//     balcony: { ...state.balcony, topY: solvedTopY },
//     posts: derivedPosts,
//   }
// }

export function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view }

    case "SET_MODE":
      return { ...state, mode: action.mode }

    case "SET_CONSTRAINT_MODE":
      return { ...state, constraintMode: action.mode }

    case "SET_GIZMO_TOOL":
      return { ...state, gizmoTool: action.tool }

    case "TOGGLE_SNAP":
      return { ...state, snapEnabled: !state.snapEnabled }

    case "SELECT_POST":
      return { ...state, selectedPostIds: [action.id] }

    case "SELECT_MULTIPLE":
      return { ...state, selectedPostIds: action.ids }

    case "CLEAR_SELECTION":
      return { ...state, selectedPostIds: [] }

    case "TOGGLE_DEBUG_FLAG":
      return {
        ...state,
        debug: {
          ...state.debug,
          [action.key]: !state.debug[action.key],
        },
      }

    case "UPDATE_BALCONY_PATH": {
      return {
        ...state,
        balcony: { ...state.balcony, balustradePath: action.path },
      }
    }

    // case "UPDATE_BALCONY_LASER_LEVEL": {
    //   const next = {
    //     ...state,
    //     balcony: { ...state.balcony, laserLevelY: action.laserLevelY },
    //   }
    //   return applyAutoTopAndDeriveY(next, next.posts)
    // }

    // case "UPDATE_BALCONY_TOP_Y": {
    //   const next = {
    //     ...state,
    //     balcony: { ...state.balcony, topY: action.topY },
    //   }
    //   return applyAutoTopAndDeriveY(next, next.posts)
    // }

    // case "REGENERATE_POSTS": {
    //   const rawPosts = generatePosts(state.balcony, action.spacing)
    //   const next = { ...state, posts: rawPosts, selectedPostIds: [] }
    //   return applyAutoTopAndDeriveY(next, next.posts)
    // }

    case "UPDATE_POST_POSITION": {
      const updatedPosts = state.posts.map((post) => {
        if (post.id !== action.id) return post
        return {
          ...post,
          position: {
            ...post.position,
            x: action.x ?? post.position.x,
            z: action.z ?? post.position.z,
          },
          spacingMode: state.constraintMode === "single" ? "custom" : post.spacingMode,
        }
      })
      return { ...state, posts: updatedPosts }
    }

    // case "UPDATE_POST_HEIGHT_PARAM": {
    //   const updatedPosts = state.posts.map((post) => {
    //     if (post.id !== action.id) return post
    //     return { ...post, height: action.height }
    //   })
    //   const next = { ...state, posts: updatedPosts }
    //   return applyAutoTopAndDeriveY(next, next.posts)
    // }

    // case "UPDATE_POST_HEIGHT": {
    //   let nextState: RootState = state

    //   if (typeof action.yBottom === "number") {
    //     const laser = state.balcony.laserLevelY
    //     const newHeight = laser - action.yBottom
    //     const updatedPosts = state.posts.map((post) => (post.id === action.id ? { ...post, height: newHeight } : post))
    //     nextState = { ...nextState, posts: updatedPosts }
    //   }

    //   if (typeof action.yTop === "number") {
    //     nextState = { ...nextState, balcony: { ...nextState.balcony, topY: action.yTop } }
    //   }

    //   return applyAutoTopAndDeriveY(nextState, nextState.posts)
    // }

    case "UPDATE_POST_ROTATION": {
      const updatedPosts = state.posts.map((post) => (post.id === action.id ? { ...post, rotationY: action.rotationY } : post))
      return { ...state, posts: updatedPosts }
    }

    case "SET_DRAG_BEHAVIOR":
      return { ...state, dragBehavior: action.value }

    // case "UPDATE_TOPRAIL_END_EXTENSION": {
    //     const curr = state.balcony.endExtensions ?? {}
    //     const nextExt = { ...curr }

    //     if (typeof action.value === "number") nextExt[action.end] = action.value
    //     else delete nextExt[action.end]

    //     return {
    //         ...state,
    //         balcony: {
    //         ...state.balcony,
    //         endExtensions: Object.keys(nextExt).length ? nextExt : undefined,
    //         },
    //     }
    // }

    default:
      return state
  }
}