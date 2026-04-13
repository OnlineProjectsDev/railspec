// /lib/reducer/reducer.ts
import type {
  RootState,
  Floor,
  FloorEdgeMeta,
  FloorEdgeRefType,
  Post,
  FloorCornerMeta,
  FloorEdgeType,
  FloorEdgeTypeDefaults,
  BoundaryBayRefMode,
  CornerPostHost,
} from "../types"
import { reducer as legacyReducer } from "./legacy"
import type { Action } from "./actions"
import { initialState, editorTemplates } from "../state"
import { generatePosts } from "../generation"
import { deriveSegments } from "../segments"
import { deriveFloorOffsetRunsWithEdgeIndices } from "../foundation/deriveEdges"
import { getEdgeVertexHeights } from "../foundation/heightSampling"
import { getMaxPostCentresSpacingMm } from "../jobDesignRules"
import {
  solveSetFloorEdgeLength,
  solveSetFloorCornerAngle,
  normalizeAngle180,
  getFloorCornerAngle,
  getFloorEdgeLength,
  projectFloorLocks,
  validateDeleteFloorVertex,
} from "../math"

function solveMoveFloorVertexDrag(
  vertices: Floor["vertices"],
  closed: boolean,
  dragIndex: number,
  dragX: number,
  dragZ: number,
  edges: FloorEdgeMeta[],
  corners: FloorCornerMeta[] | undefined
): Floor["vertices"] | null {
  if (dragIndex < 0 || dragIndex >= vertices.length) return null

  let cur = vertices.map((p, i) => (i === dragIndex ? { x: dragX, z: dragZ } : p))

  const lockedEdges: { i: number; len: number }[] = []
  for (let i = 0; i < edges.length; i++) {
    const L = edges[i]?.lockedLength
    if (typeof L === "number" && Number.isFinite(L) && L > 0) lockedEdges.push({ i, len: L })
  }

  const lockedCorners: { i: number; ang: number }[] = []
  const cs = corners ?? []
  for (let i = 0; i < cs.length; i++) {
    const A = cs[i]?.lockedAngle
    if (typeof A === "number" && Number.isFinite(A) && Math.abs(A) > 0.5 && Math.abs(A) <= 180) {
      lockedCorners.push({ i, ang: A })
    }
  }

  if (!lockedEdges.length && !lockedCorners.length) return cur

  for (let pass = 0; pass < 4; pass++) {
    for (const e of lockedEdges) {
      const solved = solveSetFloorEdgeLength(cur, closed, e.i, e.len, edges, corners, dragIndex)
      if (!solved) return null
      cur = solved
    }

    for (const c of lockedCorners) {
      const solved = solveSetFloorCornerAngle(cur, closed, c.i, c.ang, edges, corners, dragIndex)
      if (!solved) return null
      cur = solved
    }
  }

  const EPS = 1e-3
  const dv = cur[dragIndex]
  if (!dv) return null
  if (Math.abs(dv.x - dragX) > EPS || Math.abs(dv.z - dragZ) > EPS) return null

  return cur
}

function clampFloorVerticesForClosed(vertices: RootState["foundation"]["floor"]["vertices"], closed: boolean) {
  const min = closed ? 3 : 2
  if (vertices.length >= min) return vertices
  return vertices
}

function getFloorEdgeCount(verticesLen: number, closed: boolean) {
  if (verticesLen <= 0) return 0
  return closed ? verticesLen : Math.max(0, verticesLen - 1)
}

function defaultEdgeMeta(): FloorEdgeMeta {
  return {
    offset: 0,
    refType: "include",
    lockedLength: null,
    edgeType: "floor",
    thickness: null,
    height: null,
  }
}

function ensureFloorEdges(floor: Floor, nextVerticesLen: number, nextClosed: boolean) {
  const targetCount = getFloorEdgeCount(nextVerticesLen, nextClosed)
  const existing = floor.edges ?? []
  const next: FloorEdgeMeta[] = []

  for (let i = 0; i < targetCount; i++) {
    next.push(existing[i] ? { ...existing[i] } : defaultEdgeMeta())
  }

  return next
}

function coerceEdgeTypeForRefType(
  refType: FloorEdgeRefType,
  edgeType: FloorEdgeType
): FloorEdgeType {
  if (refType === "exclude") {
    return edgeType === "wall" || edgeType === "floor" ? edgeType : "wall"
  }
  return edgeType === "floor" || edgeType === "hob" || edgeType === "low_wall"
    ? edgeType
    : "floor"
}

function cycleRefType(t: FloorEdgeRefType): FloorEdgeRefType {
  return t === "include" ? "exclude" : "include"
}

function getSegmentCalculatedBarrierHeightMm(state: RootState, segId: string): number | null {
  const profile = state.balcony.segmentHeightProfilesById?.[segId]
  const topY = state.balcony.topY

  if (!profile) return null
  if (!Number.isFinite(profile.startLaserHeight) || !Number.isFinite(profile.endLaserHeight)) return null
  if (!Number.isFinite(topY)) return null

  const laser = state.balcony.laserLevelY ?? 0

  const startBottomY = laser - Number(profile.startLaserHeight)
  const endBottomY = laser - Number(profile.endLaserHeight)

  const startHeight = topY - startBottomY
  const endHeight = topY - endBottomY

  const h = Math.max(startHeight, endHeight)
  return Number.isFinite(h) ? h : null
}

function getEffectiveSegmentMaxPostSpacing(state: RootState, segId: string) {
  const globalMax = state.balcony.maxPostSpacing

  const rulesMax = getMaxPostCentresSpacingMm({
    design: state.design,
    wind: state.windLoad,
    balustradeHeightMm: getSegmentCalculatedBarrierHeightMm(state, segId),
  })

  if (Number.isFinite(rulesMax) && (rulesMax as number) > 0) {
    return Math.min(globalMax, rulesMax as number)
  }

  return globalMax
}

function applyAutoTopAndDeriveY(state: RootState, posts: Post[]): RootState {
  const laser = state.balcony.laserLevelY
  const minLen = state.balcony.minPostLength
  const fflY = Number.isFinite(state.foundation.fflY) ? state.foundation.fflY : 0
  const excluded = new Set(state.balcony.autoTopExcludePostIds ?? [])

  let requiredTop = -Infinity

  for (const p of posts) {
    if (excluded.has(p.id)) continue
    const yBottom = laser - p.height
    const req = yBottom + minLen
    if (req > requiredTop) requiredTop = req
  }

  const reqFromFfl = fflY + minLen
  if (reqFromFfl > requiredTop) requiredTop = reqFromFfl

  if (!Number.isFinite(requiredTop)) requiredTop = state.balcony.topY

  const solvedTopY = Math.max(state.balcony.topY, requiredTop)

  const derivedPosts = posts.map((p) => {
    const yBottom = laser - p.height
    const yTop = solvedTopY
    return {
      ...p,
      position: { ...p.position, yBottom, yTop },
    }
  })

  const nextState: RootState = {
    ...state,
    balcony: { ...state.balcony, topY: solvedTopY },
    posts: derivedPosts,
  }

  return syncSegmentConstraintsFromBalcony(nextState)
}

function getBalustradeVertexPoint(
  balcony: RootState["balcony"],
  runIndex: number,
  vertexIndex: number
) {
  const runs = getBalustradeRuns(balcony)
  const run = runs[runIndex]
  if (!run) return null
  const v = run[vertexIndex]
  if (!v) return null
  return { x: v.x, z: v.z }
}

function parseVertexPostId(postId: string): { runIndex: number; vertexIndex: number } | null {
  const base = postId.match(/^post-v-(\d+)$/)
  if (base) return { runIndex: 0, vertexIndex: Number(base[1]) }

  const multi = postId.match(/^post-r(\d+)-v-(\d+)$/)
  if (multi) return { runIndex: Number(multi[1]), vertexIndex: Number(multi[2]) }

  return null
}

function toggleIds(cur: string[] | undefined, ids: string[]) {
  const set = new Set((cur ?? []).filter(Boolean))
  for (const id of ids) {
    if (!id) continue
    if (set.has(id)) set.delete(id)
    else set.add(id)
  }
  return Array.from(set)
}

function defaultCornerMeta(): FloorCornerMeta {
  return {
    lockedAngle: null,
    laserHeight: null,
    cornerPostHost: "left",
  }
}

function ensureFloorCorners(floor: Floor, nextVerticesLen: number) {
  const existing = floor.corners ?? []
  const next: FloorCornerMeta[] = []

  for (let i = 0; i < nextVerticesLen; i++) {
    next.push(existing[i] ? { ...existing[i] } : defaultCornerMeta())
  }

  return next
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function norm2(x: number, y: number) {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

function dot2(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by
}

function polygonSignedArea(vertices: { x: number; z: number }[]) {
  if (!vertices.length) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    sum += a.x * b.z - b.x * a.z
  }
  return sum / 2
}

function classifyLowWallPlacement(params: {
  floor: Floor
  edgeIndex: number
  segmentOffset: number
}): "inside" | "on_wall" | "outside" {
  const meta = params.floor.edges?.[params.edgeIndex]
  const thickness = Number(meta?.thickness ?? 0)
  const s = Number(params.segmentOffset ?? 0)

  if (!Number.isFinite(thickness) || Math.abs(thickness) <= 1e-6) {
    return "on_wall"
  }

  const bandMin = Math.min(0, -thickness)
  const bandMax = Math.max(0, -thickness)
  const EPS = 1e-6

  if (s >= bandMin - EPS && s <= bandMax + EPS) {
    return "on_wall"
  }

  // For closed floors, inside depends on winding.
  // CCW => interior is LEFT of edge, CW => interior is RIGHT of edge.
  // Offsets in deriveEdges are along RIGHT normal, so:
  //   CW  => positive offset is interior
  //   CCW => negative offset is interior
  if (!params.floor.closed || params.floor.vertices.length < 3) {
    return "on_wall"
  }

  const area = polygonSignedArea(params.floor.vertices)
  const insideIsPositive = area < 0

  if (insideIsPositive) {
    return s > bandMax ? "outside" : "inside"
  }

  return s < bandMin ? "outside" : "inside"
}

function isFramelessDesign(design?: string | null) {
  return design === "RD-D10" || design === "RD-D11" || design === "RD-D12" || design === "RD-D13"
}

function isFramelessSpigotType(value: string | null | undefined): value is RootState["balcony"]["framelessSpigotType"] extends infer T
  ? Exclude<T, null | undefined>
  : never {
  switch (value) {
    case "Spigot_RDTF":
    case "Spigot_SQTF":
    case "Spigot_RDCD":
    case "Spigot_SQCD":
    case "Spigot_HDTF":
    case "Spigot_HDCD":
    case "Spigot_SF":
      return true
    default:
      return false
  }
}

function isFramelessToprailType(value: string | null | undefined): value is RootState["balcony"]["framelessToprailType"] extends infer T
  ? Exclude<T, null | undefined>
  : never {
  switch (value) {
    case "None":
    case "25mm Round":
    case "25mm Square":
    case "38mm Round":
    case "38mm Handrail":
      return true
    default:
      return false
  }
}

function getDefaultAnchorageForPost(state: RootState, post: Post | { segmentId: string }) {
  const globalAnchorage = state.anchorage ?? "BP"

  if (isFramelessDesign(state.design)) {
    return globalAnchorage
  }

  const edgeType = state.balcony.segmentEdgeTypeById?.[post.segmentId]
  if (edgeType !== "low_wall") {
    return globalAnchorage
  }

  const placement = state.balcony.segmentLowWallPlacementById?.[post.segmentId] ?? "on_wall"

  if (placement === "inside") return "SFI"
  if (placement === "outside") return "SFO"
  return globalAnchorage
}

function getAdjacentSegmentId(
  balcony: RootState["balcony"],
  segId: string,
  end: "start" | "end"
): string | null {
  const parsed = parseSegmentId(segId, balcony.id)
  if (!parsed) return null

  const runs = getBalustradeRuns(balcony)
  const run = runs[parsed.runIndex]
  if (!run) return null

  const segCount = Math.max(0, run.length - 1)
  if (segCount < 2) return null

  if (end === "start") {
    const prevSegInRun = parsed.segInRun - 1
    if (prevSegInRun < 0) return null
    return `${getRunPrefix(balcony.id, parsed.runIndex)}-seg-${prevSegInRun}`
  }

  const nextSegInRun = parsed.segInRun + 1
  if (nextSegInRun >= segCount) return null
  return `${getRunPrefix(balcony.id, parsed.runIndex)}-seg-${nextSegInRun}`
}

function getBoundaryRefMode(
  balcony: RootState["balcony"],
  segId: string,
  end: "start" | "end"
) {
  const c = balcony.segmentConstraintsById?.[segId]
  return end === "start"
    ? c?.boundaryStartBayRefMode ?? "segment"
    : c?.boundaryEndBayRefMode ?? "segment"
}

function segmentIsComparableLowWall(state: RootState, segId: string | null | undefined) {
  if (!segId) return false
  return state.balcony.segmentEdgeTypeById?.[segId] === "low_wall"
}

function getLowWallGroupingValue(state: RootState, segId: string | null | undefined) {
  if (!segId) return null
  if (!segmentIsComparableLowWall(state, segId)) return null

  const profile = state.balcony.segmentHeightProfilesById?.[segId]
  if (!profile) return null

  if (!Number.isFinite(profile.startLaserHeight) || !Number.isFinite(profile.endLaserHeight)) {
    return null
  }

  const rawEdgeIndex = profile.sourceEdgeIndex
  if (!Number.isFinite(rawEdgeIndex)) return null

  const edgeIndex = Number(rawEdgeIndex)
  const lowWallHeight = state.foundation.floor.edges?.[edgeIndex]?.height
  if (!Number.isFinite(lowWallHeight)) return null

  const floorLaserHeight = Math.max(
    Number(profile.startLaserHeight),
    Number(profile.endLaserHeight)
  )

  return floorLaserHeight + Number(lowWallHeight)
}

function getGroupedLowWallSegmentIds(state: RootState, seedSegId: string | null | undefined) {
  const seedValue = getLowWallGroupingValue(state, seedSegId)
  if (!Number.isFinite(seedValue)) return new Set<string>()

  const grouped = new Set<string>()
  const edgeTypes = state.balcony.segmentEdgeTypeById ?? {}

  for (const segId of Object.keys(edgeTypes)) {
    if (!segmentIsComparableLowWall(state, segId)) continue

    const value = getLowWallGroupingValue(state, segId)
    if (!Number.isFinite(value)) continue

    if (Math.abs(Number(value) - Number(seedValue)) < 20) {
      grouped.add(segId)
    }
  }

  return grouped
}

function getComparableLowWallSegmentIdsForPost(
  state: RootState,
  post: Post | { segmentId: string; position?: { x: number; z: number } | null },
  anchorage?: string | null
) {
  const segId = post.segmentId
  const comparable = new Set<string>()
  const resolvedAnchorage = anchorage ?? ("anchorage" in post ? post.anchorage : null)

  if (segmentIsComparableLowWall(state, segId)) {
    const ownGroup = getGroupedLowWallSegmentIds(state, segId)
    for (const groupedSegId of ownGroup) comparable.add(groupedSegId)
  }

  if (resolvedAnchorage !== "SFI" && resolvedAnchorage !== "SFO") {
    return comparable
  }

  const parsed = parseSegmentId(segId, state.balcony.id)
  const runs = getBalustradeRuns(state.balcony)
  const run = parsed ? runs[parsed.runIndex] : null

  let atSegmentStart = false
  let atSegmentEnd = false

  if (parsed && run && post.position) {
    const start = run[parsed.segInRun]
    const end = run[parsed.segInRun + 1]

    if (start && pointEquals2(post.position, start)) atSegmentStart = true
    if (end && pointEquals2(post.position, end)) atSegmentEnd = true
  }

  if (atSegmentStart) {
    const linkedSegId = getAdjacentSegmentId(state.balcony, segId, "start")
    const boundaryMode = getBoundaryRefMode(state.balcony, segId, "start")

    if (
      boundaryMode === "linked" &&
      segmentIsComparableLowWall(state, linkedSegId)
    ) {
      const linkedGroup = getGroupedLowWallSegmentIds(state, linkedSegId)
      for (const groupedSegId of linkedGroup) comparable.add(groupedSegId)
    }
  }

  if (atSegmentEnd) {
    const linkedSegId = getAdjacentSegmentId(state.balcony, segId, "end")
    const boundaryMode = getBoundaryRefMode(state.balcony, segId, "end")

    if (
      boundaryMode === "linked" &&
      segmentIsComparableLowWall(state, linkedSegId)
    ) {
      const linkedGroup = getGroupedLowWallSegmentIds(state, linkedSegId)
      for (const groupedSegId of linkedGroup) comparable.add(groupedSegId)
    }
  }

  return comparable
}

function getMaxComparablePostLaserHeightForPost(
  state: RootState,
  post: Post | { segmentId: string; position?: { x: number; z: number } | null },
  anchorage?: string | null
) {
  const comparableSegIds = getComparableLowWallSegmentIdsForPost(state, post, anchorage)
  if (!comparableSegIds.size) return null

  const heights = state.posts
    .filter((candidate) => {
      if (!comparableSegIds.has(candidate.segmentId)) return false
      return candidate.anchorage === "SFI" || candidate.anchorage === "SFO"
    })
    .map((candidate) => candidate.height)
    .filter((height) => Number.isFinite(height))

  if (!heights.length) return null
  return Math.max(...heights)
}

function getDefaultAnchorageLaserHeightsForPost(
  state: RootState,
  post: Post | { segmentId: string; position?: { x: number; z: number } | null },
  anchorage: string | null | undefined
) {
  if (anchorage === "WF") {
    return [-200, -800]
  }

  if (anchorage !== "SFI" && anchorage !== "SFO") {
    return []
  }

  const governing = getMaxComparablePostLaserHeightForPost(state, post, anchorage)

  if (!Number.isFinite(governing)) {
    return [0, 0]
  }

  const governingHeight = Number(governing)
  return [governingHeight + 100, governingHeight + 250]
}

function preserveGeneratedPostAnchorages(state: RootState, prevPosts: Post[], nextPosts: Post[]) {
  const prevById = new Map(prevPosts.map((p) => [p.id, p]))
  return nextPosts.map((post) => {
    const prev = prevById.get(post.id)
    if (!prev?.anchorageOverride) return post

    return {
      ...post,
      anchorage: prev.anchorage,
      anchorageOverride: true,
      anchorageLaserHeights:
        prev.anchorageLaserHeights?.length
          ? [...prev.anchorageLaserHeights]
          : getDefaultAnchorageLaserHeightsForPost(state, post, prev.anchorage),
    }
  })
}

function refreshLinkedAutoAnchorageLaserHeights(
  state: RootState,
  posts: Post[],
  changedPostId: string
) {
  const nextState: RootState = {
    ...state,
    posts,
  }

  const changedPost = posts.find((post) => post.id === changedPostId)
  if (!changedPost) return posts

  const affectedComparableSegIds = getComparableLowWallSegmentIdsForPost(
    nextState,
    changedPost,
    changedPost.anchorage
  )

  if (!affectedComparableSegIds.size) {
    return posts
  }

  const setsIntersect = (a: Set<string>, b: Set<string>) => {
    for (const v of a) {
      if (b.has(v)) return true
    }
    return false
  }

  return posts.map((post) => {
    if (post.anchorageOverride) return post
    if (post.anchorage !== "SFI" && post.anchorage !== "SFO") return post

    const postComparableSegIds = getComparableLowWallSegmentIdsForPost(
      nextState,
      post,
      post.anchorage
    )

    if (!postComparableSegIds.size) return post
    if (!setsIntersect(postComparableSegIds, affectedComparableSegIds)) return post

    return {
      ...post,
      anchorageLaserHeights: getDefaultAnchorageLaserHeightsForPost(
        nextState,
        post,
        post.anchorage
      ),
    }
  })
}

function deriveAllBalconySegments(balcony: RootState["balcony"]) {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  const out: ReturnType<typeof deriveSegments> = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!Array.isArray(runPath) || runPath.length < 2) continue

    const runBalcony = {
      ...balcony,
      id: runIndex === 0 ? balcony.id : `${balcony.id}-run-${runIndex}`,
      balustradePath: runPath,
    } as any

    out.push(...deriveSegments(runBalcony))
  }

  return out
}

function getDerivedSegmentById(balcony: RootState["balcony"], segId: string) {
  const segments = deriveAllBalconySegments(balcony)
  return segments.find((s) => s.id === segId) ?? null
}

function getEdgeTypeDefaultValues(
  foundation: RootState["foundation"],
  edgeType: FloorEdgeType
) {
  const cached = foundation.edgeTypeDefaults?.[edgeType]

  return {
    offset: cached?.offset ?? 0,
    thickness: cached?.thickness ?? null,
    height: cached?.height ?? null,
  }
}

function setEdgeTypeDefaultValues(
  foundation: RootState["foundation"],
  edgeType: FloorEdgeType,
  patch: { offset?: number; thickness?: number | null; height?: number | null }
) {
  return {
    ...foundation,
    edgeTypeDefaults: {
      ...(foundation.edgeTypeDefaults ?? {}),
      [edgeType]: {
        offset:
          patch.offset !== undefined
            ? patch.offset
            : foundation.edgeTypeDefaults?.[edgeType]?.offset ?? 0,
        thickness:
          patch.thickness !== undefined
            ? patch.thickness
            : foundation.edgeTypeDefaults?.[edgeType]?.thickness ?? null,
        height:
          patch.height !== undefined
            ? patch.height
            : foundation.edgeTypeDefaults?.[edgeType]?.height ?? null,
      },
    },
  }
}

type SegmentNeighbourCandidate = {
  kind: "post" | "anchor"
  id: string
  t: number
  x: number
  z: number
  post?: Post
}

function getSegmentNeighbourPair(params: {
  balcony: RootState["balcony"]
  posts: Post[]
  segId: string
  wx: number
  wz: number
}) {
  const seg = getDerivedSegmentById(params.balcony, params.segId)
  if (!seg) return null

  const sx = seg.start.x
  const sz = seg.start.z
  const dir = norm2(seg.end.x - seg.start.x, seg.end.z - seg.start.z)
  const segLen = seg.length
  const tClick = dot2(params.wx - sx, params.wz - sz, dir.x, dir.y)

  const candidates: SegmentNeighbourCandidate[] = []

  candidates.push({
    kind: "anchor",
    id: `${seg.id}::__start__`,
    t: 0,
    x: seg.start.x,
    z: seg.start.z,
  })

  for (const p of params.posts) {
    if (p.segmentId !== seg.id) continue
    if (p.id.startsWith("__")) continue

    const t = dot2(p.position.x - sx, p.position.z - sz, dir.x, dir.y)
    candidates.push({
      kind: "post",
      id: p.id,
      t,
      x: p.position.x,
      z: p.position.z,
      post: p,
    })
  }

  candidates.push({
    kind: "anchor",
    id: `${seg.id}::__end__`,
    t: segLen,
    x: seg.end.x,
    z: seg.end.z,
  })

  candidates.sort((a, b) => {
    if (Math.abs(a.t - b.t) > 1e-6) return a.t - b.t
    if (a.kind !== b.kind) return a.kind === "post" ? -1 : 1
    return a.id.localeCompare(b.id)
  })

  const EPS = 1e-6

  let left = candidates.filter((c) => c.t < tClick - EPS).slice(-1)[0] ?? null
  let right = candidates.filter((c) => c.t > tClick + EPS)[0] ?? null

  if (!left) {
    left = candidates.filter((c) => c.t <= tClick + EPS).slice(-1)[0] ?? null
  }
  if (!right) {
    right = candidates.filter((c) => c.t >= tClick - EPS)[0] ?? null
  }

  if (left && right && left.id === right.id) {
    const idx = candidates.findIndex((c) => c.id === left!.id)
    const prev = idx > 0 ? candidates[idx - 1] : null
    const next = idx >= 0 && idx + 1 < candidates.length ? candidates[idx + 1] : null

    if (prev) left = prev
    if (next) right = next
  }

  if (!left && !right) return null
  if (!left) left = right
  if (!right) right = left
  if (!left || !right) return null

  return { seg, dir, tClick, left, right }
}

function getNeighbourDefaults(params: {
  left: SegmentNeighbourCandidate
  right: SegmentNeighbourCandidate
  laserLevelY: number
  segRotationY: number
}) {
  const realNeighbours = [params.left.post, params.right.post].filter(Boolean) as Post[]

  if (realNeighbours.length >= 2) {
    return {
      height: (realNeighbours[0].height + realNeighbours[1].height) / 2,
      rotationY: (realNeighbours[0].rotationY + realNeighbours[1].rotationY) / 2,
    }
  }

  if (realNeighbours.length === 1) {
    return {
      height: realNeighbours[0].height,
      rotationY: realNeighbours[0].rotationY,
    }
  }

  return {
    height: params.laserLevelY,
    rotationY: params.segRotationY,
  }
}

function insertPostsNearNeighbours(
  allPosts: Post[],
  newPosts: Post[],
  left: SegmentNeighbourCandidate,
  right: SegmentNeighbourCandidate
) {
  const nextPosts = [...allPosts]

  const leftIsReal = left.kind === "post"
  const rightIsReal = right.kind === "post"

  if (leftIsReal && rightIsReal) {
    const idxA = nextPosts.findIndex((p) => p.id === left.id)
    const idxB = nextPosts.findIndex((p) => p.id === right.id)

    if (idxA !== -1 && idxB !== -1) {
      const insertAt = clamp(Math.max(idxA, idxB), 0, nextPosts.length)
      nextPosts.splice(insertAt, 0, ...newPosts)
      return nextPosts
    }
  }

  if (leftIsReal) {
    const idx = nextPosts.findIndex((p) => p.id === left.id)
    if (idx !== -1) {
      nextPosts.splice(idx + 1, 0, ...newPosts)
      return nextPosts
    }
  }

  if (rightIsReal) {
    const idx = nextPosts.findIndex((p) => p.id === right.id)
    if (idx !== -1) {
      nextPosts.splice(idx, 0, ...newPosts)
      return nextPosts
    }
  }

  nextPosts.push(...newPosts)
  return nextPosts
}

function mergeExcludeIds(cur: string[] | undefined, add: string[]) {
  const set = new Set((cur ?? []).filter(Boolean))
  for (const id of add) if (id) set.add(id)
  return Array.from(set)
}

function filterExistingIds(ids: string[] | undefined, posts: Post[]) {
  if (!ids?.length) return []
  const existing = new Set(posts.map((p) => p.id))
  return ids.filter((id) => existing.has(id))
}

function deriveCornerPostHostByRun(params: {
  floor: Floor
  edgeIndicesByRun: number[][]
}): Record<number, Record<number, CornerPostHost>> {
  const out: Record<number, Record<number, CornerPostHost>> = {}

  for (let runIndex = 0; runIndex < params.edgeIndicesByRun.length; runIndex++) {
    const edgeIdxs = params.edgeIndicesByRun[runIndex] ?? []
    if (!edgeIdxs.length) continue

    const byVertex: Record<number, CornerPostHost> = {}

    for (let segIndex = 1; segIndex < edgeIdxs.length; segIndex++) {
      const leftEdgeIndex = edgeIdxs[segIndex - 1]
      const rightEdgeIndex = edgeIdxs[segIndex]

      const leftIncluded = params.floor.edges?.[leftEdgeIndex]?.refType !== "exclude"
      const rightIncluded = params.floor.edges?.[rightEdgeIndex]?.refType !== "exclude"

      if (!leftIncluded || !rightIncluded) continue

      const cornerIndex = rightEdgeIndex
      const host = params.floor.corners?.[cornerIndex]?.cornerPostHost ?? "left"

      byVertex[segIndex] = host
    }

    out[runIndex] = byVertex
  }

  return out
}

function getDerivedToprailEndExtensionsByRun(params: {
  balcony: RootState["balcony"]
  runBoundarySourceOffsetsByRun: NonNullable<RootState["balcony"]["runBoundarySourceOffsetsByRun"]>
}) {
  const out: Record<number, { start?: number; end?: number }> = {}

  for (const [runIndexKey, offsets] of Object.entries(params.runBoundarySourceOffsetsByRun)) {
    const runIndex = Number(runIndexKey)
    if (!Number.isFinite(runIndex)) continue

    out[runIndex] = {
      start: Number.isFinite(offsets?.start) ? Number(offsets.start) : undefined,
      end: Number.isFinite(offsets?.end) ? Number(offsets.end) : undefined,
    }
  }

  return out
}

function rebuildDerivedBalustradeMetadataFromFloor(state: RootState): RootState {
  const floor = state.foundation.floor
  const { runs, edgeIndicesByRun } = deriveFloorOffsetRunsWithEdgeIndices(floor)
  const active = runs[0] ?? []

  const segmentEdgeTypeById: Record<string, FloorEdgeType> = {}
  const segmentSourceOffsetById: Record<string, number> = {}
  const segmentLowWallPlacementById: NonNullable<RootState["balcony"]["segmentLowWallPlacementById"]> = {}
  const runBoundarySourceEdgeIndicesByRun: NonNullable<RootState["balcony"]["runBoundarySourceEdgeIndicesByRun"]> = {}
  const runBoundarySourceOffsetsByRun: NonNullable<RootState["balcony"]["runBoundarySourceOffsetsByRun"]> = {}
  const segmentHeightProfilesById: NonNullable<RootState["balcony"]["segmentHeightProfilesById"]> = {}
  const cornerPostHostByRun = deriveCornerPostHostByRun({
    floor,
    edgeIndicesByRun,
  })

  const edgeCount = getFloorEdgeCount(floor.vertices.length, floor.closed)

  const getBoundaryEdgeIndex = (
    edgeIdxs: number[],
    side: "start" | "end"
  ): number | undefined => {
    if (!edgeIdxs.length || edgeCount <= 0) return undefined

    if (side === "start") {
      const first = edgeIdxs[0]

      if (floor.closed) return (first - 1 + edgeCount) % edgeCount
      return first > 0 ? first - 1 : undefined
    }

    const last = edgeIdxs[edgeIdxs.length - 1]

    if (floor.closed) return (last + 1) % edgeCount
    return last < edgeCount - 1 ? last + 1 : undefined
  }

  const getFloorEdgeOffsetAbs = (edgeIndex: number | undefined) => {
    if (edgeIndex == null) return undefined
    const raw = floor.edges?.[edgeIndex]?.offset
    return Number.isFinite(raw) ? Math.abs(Number(raw)) : undefined
  }

  for (let runIndex = 0; runIndex < edgeIndicesByRun.length; runIndex++) {
    const runPrefix = runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`
    const edgeIdxs = edgeIndicesByRun[runIndex] ?? []

    const startBoundaryEdgeIndex = getBoundaryEdgeIndex(edgeIdxs, "start")
    const endBoundaryEdgeIndex = getBoundaryEdgeIndex(edgeIdxs, "end")

    runBoundarySourceEdgeIndicesByRun[runIndex] = {
      start: startBoundaryEdgeIndex,
      end: endBoundaryEdgeIndex,
    }

    runBoundarySourceOffsetsByRun[runIndex] = {
      start: getFloorEdgeOffsetAbs(startBoundaryEdgeIndex),
      end: getFloorEdgeOffsetAbs(endBoundaryEdgeIndex),
    }

    for (let segIndex = 0; segIndex < edgeIdxs.length; segIndex++) {
      const edgeIndex = edgeIdxs[segIndex]
      const segId = `${runPrefix}-seg-${segIndex}`
      const edgeMeta = floor.edges?.[edgeIndex]
      const edgeType = (edgeMeta?.edgeType ?? "floor") as FloorEdgeType
      const edgeOffsetRaw = edgeMeta?.offset
      const edgeOffset = Number.isFinite(edgeOffsetRaw) ? Number(edgeOffsetRaw) : 0

      const { y0, y1 } = getEdgeVertexHeights(
        floor,
        edgeIndex,
        state.balcony.laserLevelY
      )

      segmentEdgeTypeById[segId] = edgeType
      segmentSourceOffsetById[segId] = Math.abs(edgeOffset)

      if (edgeType === "low_wall") {
        segmentLowWallPlacementById[segId] = classifyLowWallPlacement({
          floor,
          edgeIndex,
          segmentOffset: edgeOffset,
        })
      }

      segmentHeightProfilesById[segId] = {
        startLaserHeight: state.balcony.laserLevelY - y0,
        endLaserHeight: state.balcony.laserLevelY - y1,
        sourceEdgeIndex: edgeIndex,
      }
    }
  }

  const derivedEndExtensionsByRun = getDerivedToprailEndExtensionsByRun({
    balcony: state.balcony,
    runBoundarySourceOffsetsByRun,
  })

  const nextState: RootState = {
    ...state,
    balcony: {
      ...state.balcony,
      balustradePaths: runs.length ? runs : undefined,
      balustradePath: active,
      segmentEdgeTypeById,
      segmentSourceOffsetById,
      segmentLowWallPlacementById,
      runBoundarySourceEdgeIndicesByRun,
      runBoundarySourceOffsetsByRun,
      segmentHeightProfilesById,
      cornerPostHostByRun,
      endExtensionsByRun: derivedEndExtensionsByRun,
      endExtensions: {
        ...(state.balcony.endExtensions ?? {}),
        ...(derivedEndExtensionsByRun[0] ?? {}),
      },
    },
  }

  return syncSegmentConstraintsFromBalcony(nextState)
}

function syncSegmentConstraintsFromBalcony(state: RootState): RootState {
  const nextSegmentsById: Record<
    string,
    NonNullable<RootState["balcony"]["segmentConstraintsById"]>[string]
  > = {}

  const segments = deriveAllBalconySegments(state.balcony)
  for (const seg of segments) {
    const prev = state.balcony.segmentConstraintsById?.[seg.id]
    const effectiveMaxPostSpacing = getEffectiveSegmentMaxPostSpacing(state, seg.id)

    nextSegmentsById[seg.id] = {
      maxPostSpacing: effectiveMaxPostSpacing,
      minBarrierHeight: state.balcony.minBarrierHeight,
      maxBarrierHeight: state.balcony.maxBarrierHeight,
      maxPanelHeight: state.balcony.maxPanelHeight,
      maxBottomGap: state.balcony.maxBottomGap,

      panelHeight:
        prev?.panelHeight ??
        seg.panelHeight ??
        state.balcony.panelHeight,

      boundaryStartBayRefMode:
        prev?.boundaryStartBayRefMode ??
        seg.boundaryStartBayRefMode ??
        "segment",

      boundaryEndBayRefMode:
        prev?.boundaryEndBayRefMode ??
        seg.boundaryEndBayRefMode ??
        "segment",

      edgeType: prev?.edgeType ?? state.balcony.segmentEdgeTypeById?.[seg.id],

      cornerStartType:
        prev?.cornerStartType ??
        seg.cornerStartType ??
        "symmetric",

      cornerEndType:
        prev?.cornerEndType ??
        seg.cornerEndType ??
        "symmetric",

      cornerStartGap:
        prev?.cornerStartGap ??
        seg.cornerStartGap ??
        10,

      cornerEndGap:
        prev?.cornerEndGap ??
        seg.cornerEndGap ??
        10,
    }
  }

  return {
    ...state,
    balcony: {
      ...state.balcony,
      segmentConstraintsById: nextSegmentsById,
    },
  }
}

function getBalustradeRuns(balcony: RootState["balcony"]) {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  return (runs ?? []).filter((run) => Array.isArray(run) && run.length >= 2)
}

function cloneRuns(runs: RootState["balcony"]["balustradePaths"] | RootState["balcony"]["balustradePath"][]) {
  return (runs ?? []).map((run) => run.map((p) => ({ x: p.x, z: p.z })))
}

function getRunPrefix(balconyId: string, runIndex: number) {
  return runIndex === 0 ? balconyId : `${balconyId}-run-${runIndex}`
}

function deriveDefaultToprailTerminationTypesByRun(params: {
  balcony: RootState["balcony"]
  runCount: number
}) {
  const nextByRun: Record<number, { start?: "EC" | "WC"; end?: "EC" | "WC" }> = {}

  for (let runIndex = 0; runIndex < params.runCount; runIndex++) {
    const existingByRun = params.balcony.toprailTerminationTypesByRun?.[runIndex]
    const existingBase = runIndex === 0 ? params.balcony.toprailTerminationTypes : undefined

    const start =
      existingByRun?.start ??
      existingBase?.start ??
      "EC"

    const end =
      existingByRun?.end ??
      existingBase?.end ??
      "EC"

    nextByRun[runIndex] = { start, end }
  }

  return nextByRun
}

function getAdjacentSegmentAtJoint(
  balcony: RootState["balcony"],
  segmentId: string,
  end: "start" | "end"
): { otherSegmentId: string; otherEnd: "start" | "end" } | null {
  const parsed = parseSegmentId(segmentId, balcony.id)
  if (!parsed) return null

  const runs = getBalustradeRuns(balcony)
  const run = runs[parsed.runIndex]
  if (!run) return null

  const segCount = Math.max(0, run.length - 1)
  if (segCount < 2) return null

  if (end === "end") {
    const nextSegInRun = parsed.segInRun + 1
    if (nextSegInRun >= segCount) return null

    return {
      otherSegmentId: `${getRunPrefix(balcony.id, parsed.runIndex)}-seg-${nextSegInRun}`,
      otherEnd: "start",
    }
  }

  const prevSegInRun = parsed.segInRun - 1
  if (prevSegInRun < 0) return null

  return {
    otherSegmentId: `${getRunPrefix(balcony.id, parsed.runIndex)}-seg-${prevSegInRun}`,
    otherEnd: "end",
  }
}

function setFramelessCornerValueOnJoint(
  state: RootState,
  segmentId: string,
  end: "start" | "end",
  patch: Partial<NonNullable<RootState["balcony"]["segmentConstraintsById"]>[string]>
): RootState {
  const current = state.balcony.segmentConstraintsById ?? {}
  const own = current[segmentId]
  if (!own) return state

  const adjacent = getAdjacentSegmentAtJoint(state.balcony, segmentId, end)

  const next: NonNullable<RootState["balcony"]["segmentConstraintsById"]> = {
    ...current,
    [segmentId]: {
      ...own,
      ...patch,
    },
  }

  if (adjacent) {
    const other = current[adjacent.otherSegmentId]
    if (other) {
      const mirroredPatch: Partial<typeof other> = {}

      const ownType = end === "start" ? patch.cornerStartType : patch.cornerEndType
      if (ownType !== undefined) {
        const mirroredType =
          ownType === "this_segment_dominant"
            ? "other_segment_dominant"
            : ownType === "other_segment_dominant"
              ? "this_segment_dominant"
              : ownType

        if (adjacent.otherEnd === "start") mirroredPatch.cornerStartType = mirroredType
        else mirroredPatch.cornerEndType = mirroredType
      }

      const ownGap = end === "start" ? patch.cornerStartGap : patch.cornerEndGap
      if (ownGap !== undefined) {
        if (adjacent.otherEnd === "start") mirroredPatch.cornerStartGap = ownGap
        else mirroredPatch.cornerEndGap = ownGap
      }

      next[adjacent.otherSegmentId] = {
        ...other,
        ...mirroredPatch,
      }
    }
  }

  return {
    ...state,
    balcony: {
      ...state.balcony,
      segmentConstraintsById: next,
    },
  }
}

function parseSegmentId(segId: string, balconyId: string): { runIndex: number; segInRun: number } | null {
  const esc = balconyId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const runMatch = segId.match(new RegExp(`^${esc}-run-(\\d+)-seg-(\\d+)$`))
  if (runMatch) {
    return {
      runIndex: Number(runMatch[1]),
      segInRun: Number(runMatch[2]),
    }
  }

  const baseMatch = segId.match(new RegExp(`^${esc}-seg-(\\d+)$`))
  if (baseMatch) {
    return {
      runIndex: 0,
      segInRun: Number(baseMatch[1]),
    }
  }

  return null
}

function pointEquals2(a: { x: number; z: number }, b: { x: number; z: number }, eps = 1e-6) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= eps
}

function remapPostsForSplit(params: {
  state: RootState
  runIndex: number
  splitSegInRun: number
  splitPoint: { x: number; z: number }
  splitVertexPostId?: string | null
}) {
  const nextPosts = params.state.posts.map((post) => {
    const parsed = parseSegmentId(post.segmentId, params.state.balcony.id)
    if (!parsed) return post
    if (parsed.runIndex !== params.runIndex) return post

    if (parsed.segInRun < params.splitSegInRun) return post

    if (parsed.segInRun > params.splitSegInRun) {
      return {
        ...post,
        segmentId: `${getRunPrefix(params.state.balcony.id, params.runIndex)}-seg-${parsed.segInRun + 1}`,
      }
    }

    const runPath = getBalustradeRuns(params.state.balcony)[params.runIndex] ?? []
    const a = runPath[params.splitSegInRun]
    const b = runPath[params.splitSegInRun + 1]
    if (!a || !b) return post

    const ref = post.referencePosition ?? { x: post.position.x, z: post.position.z }

    const dir = norm2(b.x - a.x, b.z - a.z)
    const tPost = dot2(ref.x - a.x, ref.z - a.z, dir.x, dir.y)
    const tSplit = dot2(params.splitPoint.x - a.x, params.splitPoint.z - a.z, dir.x, dir.y)

    const isSplitVertexPost =
      params.splitVertexPostId != null && post.id === params.splitVertexPostId

    const shouldMoveToNext =
      isSplitVertexPost ||
      pointEquals2({ x: ref.x, z: ref.z }, params.splitPoint) ||
      tPost >= tSplit - 1e-6

    return {
      ...post,
      segmentId: `${getRunPrefix(params.state.balcony.id, params.runIndex)}-seg-${
        shouldMoveToNext ? params.splitSegInRun + 1 : params.splitSegInRun
      }`,
    }
  })

  return nextPosts
}

function splitSegmentConstraintMaps(params: {
  state: RootState
  runIndex: number
  splitSegInRun: number
}) {
  const prefix = getRunPrefix(params.state.balcony.id, params.runIndex)

  const nextSegmentConstraintsById: NonNullable<RootState["balcony"]["segmentConstraintsById"]> = {}
  const prevConstraints = params.state.balcony.segmentConstraintsById ?? {}

  const segIds = Object.keys(prevConstraints).sort((a, b) => a.localeCompare(b))

  for (const segId of segIds) {
    const parsed = parseSegmentId(segId, params.state.balcony.id)
    const value = prevConstraints[segId]
    if (!parsed || parsed.runIndex !== params.runIndex) {
      nextSegmentConstraintsById[segId] = value
      continue
    }

    if (parsed.segInRun < params.splitSegInRun) {
      nextSegmentConstraintsById[segId] = value
      continue
    }

    if (parsed.segInRun > params.splitSegInRun) {
      nextSegmentConstraintsById[`${prefix}-seg-${parsed.segInRun + 1}`] = value
      continue
    }

    nextSegmentConstraintsById[`${prefix}-seg-${params.splitSegInRun}`] = { ...value }
    nextSegmentConstraintsById[`${prefix}-seg-${params.splitSegInRun + 1}`] = { ...value }
  }

  const nextSegmentEdgeTypeById: NonNullable<RootState["balcony"]["segmentEdgeTypeById"]> = {}
  const prevEdgeTypes = params.state.balcony.segmentEdgeTypeById ?? {}

  for (const segId of Object.keys(prevEdgeTypes)) {
    const parsed = parseSegmentId(segId, params.state.balcony.id)
    const value = prevEdgeTypes[segId]
    if (!parsed || parsed.runIndex !== params.runIndex) {
      nextSegmentEdgeTypeById[segId] = value
      continue
    }

    if (parsed.segInRun < params.splitSegInRun) {
      nextSegmentEdgeTypeById[segId] = value
      continue
    }

    if (parsed.segInRun > params.splitSegInRun) {
      nextSegmentEdgeTypeById[`${prefix}-seg-${parsed.segInRun + 1}`] = value
      continue
    }

    nextSegmentEdgeTypeById[`${prefix}-seg-${params.splitSegInRun}`] = value
    nextSegmentEdgeTypeById[`${prefix}-seg-${params.splitSegInRun + 1}`] = value
  }

  return {
    segmentConstraintsById: nextSegmentConstraintsById,
    segmentEdgeTypeById: nextSegmentEdgeTypeById,
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function remapSegmentHeightProfilesForSplit(params: {
  state: RootState
  runIndex: number
  splitSegInRun: number
  splitPoint: { x: number; z: number }
}) {
  const prevProfiles = params.state.balcony.segmentHeightProfilesById ?? {}
  const nextProfiles: NonNullable<RootState["balcony"]["segmentHeightProfilesById"]> = {}

  const prefix = getRunPrefix(params.state.balcony.id, params.runIndex)
  const runPath = getBalustradeRuns(params.state.balcony)[params.runIndex] ?? []

  const a = runPath[params.splitSegInRun]
  const b = runPath[params.splitSegInRun + 1]

  let splitT = 0.5
  if (a && b) {
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    if (len > 1e-6) {
      const dir = norm2(dx, dz)
      const t = dot2(params.splitPoint.x - a.x, params.splitPoint.z - a.z, dir.x, dir.y)
      splitT = clamp(t / len, 0, 1)
    }
  }

  for (const segId of Object.keys(prevProfiles)) {
    const parsed = parseSegmentId(segId, params.state.balcony.id)
    const value = prevProfiles[segId]

    if (!parsed || parsed.runIndex !== params.runIndex) {
      nextProfiles[segId] = value
      continue
    }

    if (parsed.segInRun < params.splitSegInRun) {
      nextProfiles[segId] = value
      continue
    }

    if (parsed.segInRun > params.splitSegInRun) {
      nextProfiles[`${prefix}-seg-${parsed.segInRun + 1}`] = value
      continue
    }

    const midLaserHeight = lerp(value.startLaserHeight, value.endLaserHeight, splitT)

    nextProfiles[`${prefix}-seg-${params.splitSegInRun}`] = {
      ...value,
      endLaserHeight: midLaserHeight,
    }

    nextProfiles[`${prefix}-seg-${params.splitSegInRun + 1}`] = {
      ...value,
      startLaserHeight: midLaserHeight,
    }
  }

  return nextProfiles
}

function remapSegmentHeightProfilesForJoin(params: {
  state: RootState
  runIndex: number
  vertexIndex: number
}) {
  const prevProfiles = params.state.balcony.segmentHeightProfilesById ?? {}
  const nextProfiles: NonNullable<RootState["balcony"]["segmentHeightProfilesById"]> = {}

  const runPrefix = getRunPrefix(params.state.balcony.id, params.runIndex)

  for (const segId of Object.keys(prevProfiles)) {
    const parsed = parseSegmentId(segId, params.state.balcony.id)
    const value = prevProfiles[segId]

    if (!parsed || parsed.runIndex !== params.runIndex) {
      nextProfiles[segId] = value
      continue
    }

    if (parsed.segInRun < params.vertexIndex - 1) {
      nextProfiles[segId] = value
      continue
    }

    if (parsed.segInRun === params.vertexIndex - 1) {
      const nextSegId = `${runPrefix}-seg-${params.vertexIndex}`
      const nextValue = prevProfiles[nextSegId]

      nextProfiles[`${runPrefix}-seg-${params.vertexIndex - 1}`] = nextValue
        ? {
            ...value,
            endLaserHeight: nextValue.endLaserHeight,
          }
        : value
      continue
    }

    if (parsed.segInRun === params.vertexIndex) {
      continue
    }

    nextProfiles[`${runPrefix}-seg-${parsed.segInRun - 1}`] = value
  }

  return nextProfiles
}

function buildStateFromTemplate(templateId: string): RootState {
  const template = editorTemplates.find((t) => t.id === templateId) ?? editorTemplates[0]

  const hasDerivedBalustrade =
    template.hasDerivedBalustrade ?? initialState.hasDerivedBalustrade

  const requestedMode = template.mode ?? initialState.mode

  const requestedDesign = template.design ?? initialState.design
  const requestedAnchorage = template.anchorage ?? initialState.anchorage
  const requestedToprail = template.toprail ?? initialState.toprail

  const resolvedFramelessSpigotType: RootState["balcony"]["framelessSpigotType"] =
    template.balcony?.framelessSpigotType ?? null

  const resolvedFramelessToprailType: RootState["balcony"]["framelessToprailType"] =
    template.balcony?.framelessToprailType ?? null

  const base: RootState = {
    ...initialState,

    mode: hasDerivedBalustrade ? requestedMode : "substrate",
    view: template.view ?? initialState.view,
    snapEnabled: template.snapEnabled ?? initialState.snapEnabled,
    constraintMode: template.constraintMode ?? initialState.constraintMode,
    gizmoTool: template.gizmoTool ?? initialState.gizmoTool,

    design: requestedDesign,
    anchorage: requestedAnchorage,
    toprail: requestedToprail,
    infill: template.infill ?? initialState.infill,
    color: template.color ?? initialState.color,
    windLoad: template.windLoad ?? initialState.windLoad,

    foundation: template.foundation
      ? {
          ...template.foundation,
          floor: {
            ...template.foundation.floor,
          },
        }
      : {
          ...initialState.foundation,
          floor: {
            ...initialState.foundation.floor,
          },
        },

    balcony: {
      ...initialState.balcony,
      ...(template.balcony ?? {}),
      framelessSpigotType: resolvedFramelessSpigotType,
      framelessToprailType: resolvedFramelessToprailType,
      segmentConstraintsById: undefined,
      segmentHeightProfilesById: undefined,
      segmentEdgeTypeById: undefined,
      segmentSourceOffsetById: undefined,
      runBoundarySourceEdgeIndicesByRun: undefined,
      runBoundarySourceOffsetsByRun: undefined,
      cornerPostHostByRun: undefined,
      autoTopExcludePostIds: [],
      bayOverridesById: template.balcony?.bayOverridesById ?? {},
    },

    posts: [],
    selectedPostIds: [],
    selectedFloorVertexIndex: null,
    laserHeightListEditMode: false,
    hasDerivedBalustrade,
  }

  let derived = rebuildDerivedBalustradeMetadataFromFloor(base)

  const derivedRuns = getBalustradeRuns(derived.balcony)
  const nextToprailTerminationTypesByRun = deriveDefaultToprailTerminationTypesByRun({
    balcony: derived.balcony,
    runCount: derivedRuns.length,
  })

  derived = {
    ...derived,
    balcony: {
      ...derived.balcony,
      toprailTerminationTypesByRun: nextToprailTerminationTypesByRun,
      toprailTerminationTypes: {
        ...(derived.balcony.toprailTerminationTypes ?? {}),
        ...(nextToprailTerminationTypesByRun[0] ?? {}),
      },
    },
  }

  const spacing =
    Number.isFinite(derived.balcony.maxPostSpacing) && derived.balcony.maxPostSpacing > 0
      ? derived.balcony.maxPostSpacing
      : 1000

  const rawPosts = generatePosts(derived.balcony, spacing, {
    design: derived.design,
    anchorage: derived.anchorage,
  })
  const nextPosts = preserveGeneratedPostAnchorages(derived, base.posts, rawPosts)

  

  const segmentEdgeTypeById = derived.balcony.segmentEdgeTypeById ?? {}
  const lowWallDefaults = rawPosts
    .filter((p) => segmentEdgeTypeById[p.segmentId] === "low_wall")
    .map((p) => p.id)

  const nextState: RootState = {
    ...derived,
    posts: nextPosts,
    selectedPostIds: [],
    selectedFloorVertexIndex: null,
    laserHeightListEditMode: false,
    hasDerivedBalustrade,
    balcony: {
      ...derived.balcony,
      autoTopExcludePostIds: lowWallDefaults,
    },
  }

  return applyAutoTopAndDeriveY(nextState, nextState.posts)
}

export function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    case "LOAD_TEMPLATE": {
      return buildStateFromTemplate(action.templateId)
    }

    case "SET_LASER_HEIGHT_LIST_EDIT_MODE": {
      return {
        ...state,
        laserHeightListEditMode: action.value,
      }
    }

    case "SET_FLOOR_CORNER_POST_HOST": {
      const floor = state.foundation.floor
      if (!floor) return state

      const i = action.cornerIndex
      if (i < 0 || i >= floor.vertices.length) return state

      const corners = ensureFloorCorners(floor, floor.vertices.length)
      const existing = corners[i] ?? {
        lockedAngle: null,
        laserHeight: null,
        cornerPostHost: "left" as CornerPostHost,
      }

      corners[i] = {
        ...existing,
        cornerPostHost: action.value,
      }

      const nextStateBase: RootState = {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            corners,
          },
        },
      }

      if (!state.hasDerivedBalustrade) {
        return nextStateBase
      }

      const synced = rebuildDerivedBalustradeMetadataFromFloor(nextStateBase)

      const spacing =
        Number.isFinite(synced.balcony.maxPostSpacing) && synced.balcony.maxPostSpacing > 0
          ? synced.balcony.maxPostSpacing
          : 1000

      const rawPosts = generatePosts(synced.balcony, spacing, {
        design: synced.design,
        anchorage: synced.anchorage,
      })
      const nextPosts = preserveGeneratedPostAnchorages(synced, state.posts, rawPosts)

      const segmentEdgeTypeById = synced.balcony.segmentEdgeTypeById ?? {}
      const lowWallDefaults = nextPosts
        .filter((p) => segmentEdgeTypeById[p.segmentId] === "low_wall")
        .map((p) => p.id)

      const preserved = filterExistingIds(synced.balcony.autoTopExcludePostIds, nextPosts)
      const nextExclude = mergeExcludeIds(preserved, lowWallDefaults)

      const nextState: RootState = {
        ...synced,
        posts: nextPosts,
        balcony: {
          ...synced.balcony,
          autoTopExcludePostIds: nextExclude,
        },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SET_MODE": {
      if ((action as any).mode === "balustrade" && !state.hasDerivedBalustrade) {
        return state
      }

      return legacyReducer(state, action as any)
    }

    case "SELECT_FLOOR_VERTEX":
      return { ...state, selectedFloorVertexIndex: action.index }

    case "MOVE_FLOOR_VERTEX": {
      const floor = state.foundation.floor
      const v = floor.vertices
      if (action.index < 0 || action.index >= v.length) return state

      const nextVertices = v.map((p, i) => (i === action.index ? { x: action.x, z: action.z } : p))
      const nextEdges = ensureFloorEdges(floor, nextVertices.length, floor.closed)
      const nextCorners = ensureFloorCorners(floor, nextVertices.length)

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            vertices: nextVertices,
            edges: nextEdges,
            corners: nextCorners,
          },
        },
      }
    }

    case "ADD_FLOOR_VERTEX_AFTER": {
      const floor = state.foundation.floor
      const v = floor.vertices

      if (!v.length) {
        const nextVertices = [{ x: action.x, z: action.z }]
        const nextEdges = ensureFloorEdges(floor, nextVertices.length, floor.closed)
        const nextCorners = ensureFloorCorners(floor, nextVertices.length)

        return {
          ...state,
          foundation: { ...state.foundation, floor: { ...floor, vertices: nextVertices, edges: nextEdges, corners: nextCorners } },
          selectedFloorVertexIndex: 0,
        }
      }

      const insertAfter = Math.max(-1, Math.min(v.length - 1, action.index))
      const nextVertices = [...v.slice(0, insertAfter + 1), { x: action.x, z: action.z }, ...v.slice(insertAfter + 1)]
      const nextIndex = insertAfter + 1

      const prevEdges = ensureFloorEdges(floor, v.length, floor.closed)
      const targetCount = getFloorEdgeCount(nextVertices.length, floor.closed)

      const nextEdges: FloorEdgeMeta[] = []
      for (let i = 0; i < targetCount; i++) nextEdges.push(defaultEdgeMeta())

      for (let i = 0; i < Math.min(prevEdges.length, nextEdges.length); i++) nextEdges[i] = { ...prevEdges[i] }

      if (targetCount > prevEdges.length) {
        const edgeToDup = Math.max(0, Math.min(insertAfter, prevEdges.length - 1))
        const meta = prevEdges[edgeToDup] ? { ...prevEdges[edgeToDup] } : defaultEdgeMeta()
        nextEdges.splice(edgeToDup + 1, 0, meta)
        nextEdges.length = targetCount
      }

      const nextCorners = ensureFloorCorners(floor, nextVertices.length)

      return {
        ...state,
        foundation: { ...state.foundation, floor: { ...floor, vertices: nextVertices, edges: nextEdges, corners: nextCorners } },
        selectedFloorVertexIndex: nextIndex,
      }
    }

    case "DELETE_FLOOR_VERTEX": {
      const floor = state.foundation.floor
      const v = floor.vertices
      if (action.index < 0 || action.index >= v.length) return state

      const validated = validateDeleteFloorVertex(v, floor.closed, action.index, floor.edges, floor.corners)
      if (!validated) return state

      let nextSelected: number | null = state.selectedFloorVertexIndex
      if (nextSelected === action.index) nextSelected = null
      else if (typeof nextSelected === "number" && nextSelected > action.index) nextSelected -= 1

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            vertices: validated.vertices,
            edges: validated.edges,
            corners: validated.corners,
          },
        },
        selectedFloorVertexIndex: nextSelected,
      }
    }

    case "TOGGLE_FLOOR_CLOSED": {
      const floor = state.foundation.floor
      const nextClosed = !floor.closed
      const nextVertices = clampFloorVerticesForClosed(floor.vertices, nextClosed)

      const min = nextClosed ? 3 : 2
      if (nextVertices.length < min) return state

      const nextEdges = ensureFloorEdges(floor, nextVertices.length, nextClosed)
      const nextCorners = ensureFloorCorners(floor, nextVertices.length)

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: { ...floor, closed: nextClosed, vertices: nextVertices, edges: nextEdges, corners: nextCorners },
        },
        selectedFloorVertexIndex: null,
      }
    }

    case "INSERT_FLOOR_VERTEX": {
      const floor = state.foundation.floor
      const v = floor.vertices

      const edgeCountBefore = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCountBefore <= 0) return state

      const prevEdges = ensureFloorEdges(floor, v.length, floor.closed)

      const afterIndex = Math.max(0, Math.min(action.afterIndex, edgeCountBefore - 1))
      const insertVertexIndex = Math.max(0, Math.min(afterIndex + 1, v.length))

      const nextVerts = [...v.slice(0, insertVertexIndex), { x: action.x, z: action.z }, ...v.slice(insertVertexIndex)]
      const edgeCountAfter = getFloorEdgeCount(nextVerts.length, floor.closed)

      const metaToDup = prevEdges[afterIndex] ? { ...prevEdges[afterIndex] } : defaultEdgeMeta()
      const nextEdges = prevEdges.map((m) => ({ ...m }))
      nextEdges.splice(afterIndex + 1, 0, { ...metaToDup })
      nextEdges.length = edgeCountAfter
      while (nextEdges.length < edgeCountAfter) nextEdges.push(defaultEdgeMeta())

      const nextCorners = ensureFloorCorners(floor, nextVerts.length)

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: { ...floor, vertices: nextVerts, edges: nextEdges, corners: nextCorners },
        },
        selectedFloorVertexIndex: insertVertexIndex,
      }
    }

    case "CYCLE_FLOOR_EDGE_REF_TYPE": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)
      const nextEdges = edges.map((m, i) => {
        if (i !== idx) return m

        const nextRefType = cycleRefType(m.refType ?? "include")
        const prevEdgeType = (m.edgeType ?? "floor") as FloorEdgeType
        const nextEdgeType = coerceEdgeTypeForRefType(nextRefType, prevEdgeType)
        const keepEdgeFields = nextEdgeType === "hob" || nextEdgeType === "low_wall" || nextEdgeType === "wall"
        const clearEdgeFields = keepEdgeFields ? {} : { thickness: null, height: null }

        return { ...m, refType: nextRefType, edgeType: nextEdgeType, ...clearEdgeFields }
      })
      const nextCorners = ensureFloorCorners(floor, v.length)

      return {
        ...state,
        foundation: { ...state.foundation, floor: { ...floor, edges: nextEdges, corners: nextCorners } },
      }
    }

    case "SET_FLOOR_EDGE_REF_TYPE": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)
      const nextEdges = edges.map((m, i) => {
        if (i !== idx) return m

        const nextRefType = action.refType
        const prevEdgeType = (m.edgeType ?? "floor") as FloorEdgeType
        const nextEdgeType = coerceEdgeTypeForRefType(nextRefType, prevEdgeType)
        const keepEdgeFields = nextEdgeType === "hob" || nextEdgeType === "low_wall" || nextEdgeType === "wall"
        const clearEdgeFields = keepEdgeFields ? {} : { thickness: null, height: null }

        return { ...m, refType: nextRefType, edgeType: nextEdgeType, ...clearEdgeFields }
      })
      const nextCorners = ensureFloorCorners(floor, v.length)

      return {
        ...state,
        foundation: { ...state.foundation, floor: { ...floor, edges: nextEdges, corners: nextCorners } },
      }
    }

    case "SET_FLOOR_EDGE_OFFSET": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)
      const edgeType = (edges[idx]?.edgeType ?? "floor") as FloorEdgeType
      const nextOffset = Number(action.offset)
      if (!Number.isFinite(nextOffset)) return state

      const nextEdges = edges.map((m, i) => (i === idx ? { ...m, offset: nextOffset } : m))
      const nextCorners = ensureFloorCorners(floor, v.length)

      const nextDefaults: FloorEdgeTypeDefaults = {
        ...(state.foundation.edgeTypeDefaults ?? {}),
        [edgeType]: {
          offset: nextOffset,
          thickness: state.foundation.edgeTypeDefaults?.[edgeType]?.thickness ?? edges[idx]?.thickness ?? null,
          height: state.foundation.edgeTypeDefaults?.[edgeType]?.height ?? edges[idx]?.height ?? null,
        },
      }

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: { ...floor, edges: nextEdges, corners: nextCorners },
          edgeTypeDefaults: nextDefaults,
        },
      }
    }

    case "SET_FLOOR_EDGE_TYPE": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)

      const nextDefaults: FloorEdgeTypeDefaults = {
        ...(state.foundation.edgeTypeDefaults ?? {}),
      }

      const nextEdges = edges.map((m, i) => {
        if (i !== idx) return m

        const refType = m.refType ?? "include"
        const edgeType = coerceEdgeTypeForRefType(refType, action.edgeType)
        const cached = nextDefaults[edgeType]
        const isRaisedType = edgeType === "hob" || edgeType === "low_wall" || edgeType === "wall"

        return {
          ...m,
          edgeType,
          offset: cached?.offset ?? m.offset ?? 0,
          thickness: isRaisedType ? (cached?.thickness ?? m.thickness ?? null) : null,
          height: isRaisedType ? (cached?.height ?? m.height ?? null) : null,
        }
      })

      const nextCorners = ensureFloorCorners(floor, v.length)

      const nextFloor: Floor = {
        ...floor,
        edges: nextEdges,
        corners: nextCorners,
      }

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: nextFloor,
          edgeTypeDefaults: nextDefaults,
        },
      }
    }

    case "SET_FLOOR_EDGE_THICKNESS": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)

      const nextVal = action.thickness == null ? null : Number(action.thickness)
      if (nextVal != null && !Number.isFinite(nextVal)) return state

      const edgeType = (edges[idx]?.edgeType ?? "floor") as FloorEdgeType

      const nextEdges = edges.map((m, i) =>
        i === idx ? { ...m, thickness: nextVal } : m
      )

      const nextCorners = ensureFloorCorners(floor, v.length)

      const nextDefaults: FloorEdgeTypeDefaults = {
        ...(state.foundation.edgeTypeDefaults ?? {}),
        [edgeType]: {
          offset: state.foundation.edgeTypeDefaults?.[edgeType]?.offset ?? edges[idx]?.offset ?? 0,
          thickness: nextVal,
          height: state.foundation.edgeTypeDefaults?.[edgeType]?.height ?? edges[idx]?.height ?? null,
        },
      }

      const nextFloor: Floor = {
        ...floor,
        edges: nextEdges,
        corners: nextCorners,
      }

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: nextFloor,
          edgeTypeDefaults: nextDefaults,
        },
      }
    }

    case "SET_FLOOR_EDGE_HEIGHT": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)

      const nextVal = action.height == null ? null : Number(action.height)
      if (nextVal != null && !Number.isFinite(nextVal)) return state

      const edgeType = (edges[idx]?.edgeType ?? "floor") as FloorEdgeType

      const nextEdges = edges.map((m, i) =>
        i === idx ? { ...m, height: nextVal } : m
      )

      const nextCorners = ensureFloorCorners(floor, v.length)

      const nextDefaults: FloorEdgeTypeDefaults = {
        ...(state.foundation.edgeTypeDefaults ?? {}),
        [edgeType]: {
          offset: state.foundation.edgeTypeDefaults?.[edgeType]?.offset ?? edges[idx]?.offset ?? 0,
          thickness: state.foundation.edgeTypeDefaults?.[edgeType]?.thickness ?? edges[idx]?.thickness ?? null,
          height: nextVal,
        },
      }

      const nextFloor: Floor = {
        ...floor,
        edges: nextEdges,
        corners: nextCorners,
      }

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: nextFloor,
          edgeTypeDefaults: nextDefaults,
        },
      }
    }

    case "UPDATE_BALCONY_PATH": {
      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          balustradePath: action.path,
        },
      }

      return syncSegmentConstraintsFromBalcony(nextState)
    }

    case "UPDATE_POST_POSITION": {
      let remappedSelectedId: string | null = null

      const updatedPosts = state.posts.map((post) => {
        if (post.id !== action.id) return post

        const nextX = action.x ?? post.position.x
        const nextZ = action.z ?? post.position.z

        let nextId = post.id

        const vertexRef = parseVertexPostId(post.id)
        if (vertexRef) {
          const vertex = getBalustradeVertexPoint(
            state.balcony,
            vertexRef.runIndex,
            vertexRef.vertexIndex
          )

          if (vertex && !pointEquals2({ x: nextX, z: nextZ }, vertex, 1e-6)) {
            nextId = `post-custom-${Date.now()}`
          }
        }

        remappedSelectedId = nextId

        return {
          ...post,
          id: nextId,
          position: {
            ...post.position,
            x: nextX,
            z: nextZ,
          },
          referencePosition: {
            ...(post.referencePosition ?? { x: post.position.x, z: post.position.z }),
          },
          spacingMode: state.constraintMode === "single" ? "custom" : post.spacingMode,
        }
      })

      const nextState: RootState = {
        ...state,
        posts: updatedPosts,
        selectedPostIds: remappedSelectedId
          ? state.selectedPostIds.map((id) => (id === action.id ? remappedSelectedId! : id))
          : state.selectedPostIds,
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SET_MAX_POST_SPACING": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next <= 0) return state

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          maxPostSpacing: next,
        },
      }

      return syncSegmentConstraintsFromBalcony(nextState)
    }

    case "SET_MIN_POST_LENGTH": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next <= 0) return state

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          minPostLength: next,
        },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SET_MIN_BARRIER_HEIGHT": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next <= 0) return state

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          minBarrierHeight: next,
        },
      }

      return syncSegmentConstraintsFromBalcony(nextState)
    }

    case "SET_MAX_BARRIER_HEIGHT": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next <= 0) return state

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          maxBarrierHeight: next,
        },
      }

      return syncSegmentConstraintsFromBalcony(nextState)
    }

    case "SET_MAX_PANEL_HEIGHT": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next <= 0) return state

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          maxPanelHeight: next,
        },
      }

      return syncSegmentConstraintsFromBalcony(nextState)
    }

    case "SET_MAX_BOTTOM_GAP": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next < 0) return state

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          maxBottomGap: next,
        },
      }

      return syncSegmentConstraintsFromBalcony(nextState)
    }

    case "DERIVE_BALUSTRADE_FROM_FLOOR": {
      let synced = rebuildDerivedBalustradeMetadataFromFloor({
        ...state,
        selectedPostIds: [],
      })

      const syncedRuns = getBalustradeRuns(synced.balcony)
      const nextToprailTerminationTypesByRun = deriveDefaultToprailTerminationTypesByRun({
        balcony: synced.balcony,
        runCount: syncedRuns.length,
      })

      synced = {
        ...synced,
        balcony: {
          ...synced.balcony,
          toprailTerminationTypesByRun: nextToprailTerminationTypesByRun,
          toprailTerminationTypes: {
            ...(synced.balcony.toprailTerminationTypes ?? {}),
            ...(nextToprailTerminationTypesByRun[0] ?? {}),
          },
        },
      }

      const segmentEdgeTypeById = synced.balcony.segmentEdgeTypeById ?? {}

      const spacing =
        Number.isFinite(synced.balcony.maxPostSpacing) && synced.balcony.maxPostSpacing > 0
          ? synced.balcony.maxPostSpacing
          : 1000

      const rawPosts = generatePosts(synced.balcony, spacing, {
        design: synced.design,
        anchorage: synced.anchorage,
      })
      const nextPosts = preserveGeneratedPostAnchorages(synced, state.posts, rawPosts)

      const lowWallDefaults = nextPosts
        .filter((p) => segmentEdgeTypeById[p.segmentId] === "low_wall")
        .map((p) => p.id)

      const preserved = filterExistingIds(synced.balcony.autoTopExcludePostIds, nextPosts)
      const nextExclude = mergeExcludeIds(preserved, lowWallDefaults)

      const nextWithPosts: RootState = {
        ...synced,
        posts: nextPosts,
        hasDerivedBalustrade: true,
        mode: "balustrade",
        balcony: {
          ...synced.balcony,
          autoTopExcludePostIds: nextExclude,
        },
      }

      return applyAutoTopAndDeriveY(nextWithPosts, nextWithPosts.posts)
    }

    case "REGENERATE_POSTS": {
      const spacing =
        Number.isFinite(state.balcony.maxPostSpacing) && state.balcony.maxPostSpacing > 0
          ? state.balcony.maxPostSpacing
          : (action as any).spacing ?? 1000

      const nextStateWithConstraints = syncSegmentConstraintsFromBalcony(state)
      const rawPosts = generatePosts(nextStateWithConstraints.balcony, spacing, {
        design: nextStateWithConstraints.design,
        anchorage: nextStateWithConstraints.anchorage,
      })
      const nextPosts = preserveGeneratedPostAnchorages(nextStateWithConstraints, state.posts, rawPosts)

      const segmentEdgeTypeById = nextStateWithConstraints.balcony.segmentEdgeTypeById ?? {}
      const lowWallDefaults = nextPosts
        .filter((p) => segmentEdgeTypeById[p.segmentId] === "low_wall")
        .map((p) => p.id)

      const preserved = filterExistingIds(state.balcony.autoTopExcludePostIds, nextPosts)
      const nextExclude = mergeExcludeIds(preserved, lowWallDefaults)

      const next: RootState = {
        ...nextStateWithConstraints,
        posts: nextPosts,
        selectedPostIds: [],
        balcony: {
          ...nextStateWithConstraints.balcony,
          autoTopExcludePostIds: nextExclude,
        },
      }

      return applyAutoTopAndDeriveY(next, next.posts)
    }

    case "UPDATE_TOPRAIL_END_EXTENSION": {
      const runIndex = Number.isFinite((action as any).runIndex) ? (action as any).runIndex : 0
      const end = action.end
      const value = action.value

      const nextByRun: Record<number, { start?: number; end?: number }> = {
        ...(state.balcony.endExtensionsByRun ?? {}),
      }

      nextByRun[runIndex] = { ...(nextByRun[runIndex] ?? {}), [end]: value }

      return {
        ...state,
        balcony: {
          ...state.balcony,
          endExtensionsByRun: nextByRun,
          endExtensions:
            runIndex === 0
              ? { ...(state.balcony.endExtensions ?? {}), [end]: value }
              : state.balcony.endExtensions,
        },
      }
    }

    case "SET_TOPRAIL_TERMINATION_TYPE": {
      const runIndex = Number.isFinite((action as any).runIndex) ? (action as any).runIndex : 0
      const end = action.end
      const value = action.value

      const nextByRun: Record<number, { start?: "EC" | "WC"; end?: "EC" | "WC" }> = {
        ...(state.balcony.toprailTerminationTypesByRun ?? {}),
      }

      nextByRun[runIndex] = {
        ...(nextByRun[runIndex] ?? {}),
        [end]: value,
      }

      return {
        ...state,
        balcony: {
          ...state.balcony,
          toprailTerminationTypesByRun: nextByRun,
          toprailTerminationTypes:
            runIndex === 0
              ? { ...(state.balcony.toprailTerminationTypes ?? {}), [end]: value }
              : state.balcony.toprailTerminationTypes,
        },
      }
    }

    case "SET_FRAMELESS_SPIGOT_TYPE": {
      return {
        ...state,
        balcony: {
          ...state.balcony,
          framelessSpigotType: action.value,
        },
      }
    }

    case "SET_FRAMELESS_GLASS_BOTTOM_OFFSET": {
      return {
        ...state,
        balcony: {
          ...state.balcony,
          framelessGlassBottomOffset: action.value,
        },
      }
    }

    case "SET_FRAMELESS_TOPRAIL_TYPE": {
      return {
        ...state,
        balcony: {
          ...state.balcony,
          framelessToprailType: action.value,
        },
      }
    }

    case "SET_FRAMELESS_TOPRAIL_OFFSET_FROM_GLASS_TOP": {
      return {
        ...state,
        balcony: {
          ...state.balcony,
          framelessToprailOffsetFromGlassTop: action.value,
        },
      }
    }

    case "SET_FRAMELESS_TOPRAIL_HEIGHT": {
      return {
        ...state,
        balcony: {
          ...state.balcony,
          framelessToprailHeight: action.value,
        },
      }
    }

    case "SET_FRAMELESS_CORNER_TYPE": {
      const key = action.end === "start" ? "cornerStartType" : "cornerEndType"

      return setFramelessCornerValueOnJoint(state, action.segmentId, action.end, {
        [key]: action.value,
      })
    }

    case "SET_FRAMELESS_CORNER_GAP": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next < 0) return state

      const key = action.end === "start" ? "cornerStartGap" : "cornerEndGap"

      return setFramelessCornerValueOnJoint(state, action.segmentId, action.end, {
        [key]: next,
      })
    }

    case "SET_FLOOR_EDGE_LOCKED_LENGTH": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const edges = ensureFloorEdges(floor, v.length, floor.closed)

      const nextLocked = action.lockedLength
      const lockedLength = nextLocked == null ? null : Number(nextLocked)

      if (lockedLength != null && (!Number.isFinite(lockedLength) || lockedLength <= 0)) return state

      const nextEdges = edges.map((m, i) => (i === idx ? { ...m, lockedLength } : m))
      const nextCorners = ensureFloorCorners(floor, v.length)

      return {
        ...state,
        foundation: { ...state.foundation, floor: { ...floor, edges: nextEdges, corners: nextCorners } },
      }
    }

    case "SET_FLOOR_EDGE_LENGTH": {
      const floor = state.foundation.floor
      const v = floor.vertices
      const edgeCount = getFloorEdgeCount(v.length, floor.closed)
      if (edgeCount <= 0) return state

      const idx = Math.max(0, Math.min(action.edgeIndex, edgeCount - 1))
      const nextLen = Number(action.length)
      if (!Number.isFinite(nextLen) || nextLen <= 0) return state

      const edges = ensureFloorEdges(floor, v.length, floor.closed)
      const corners = ensureFloorCorners(floor, v.length)

      const solved = solveSetFloorEdgeLength(v, floor.closed, idx, nextLen, edges, floor.corners)
      if (!solved) return state

      const nextEdges = ensureFloorEdges(floor, solved.length, floor.closed)
      const nextCorners = ensureFloorCorners(floor, solved.length)

      const wasLocked = nextEdges[idx]?.lockedLength != null && Number.isFinite(nextEdges[idx].lockedLength as number)
      if (wasLocked) {
        nextEdges[idx] = { ...nextEdges[idx], lockedLength: nextLen }
      }

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: { ...floor, vertices: solved, edges: nextEdges, corners: nextCorners },
        },
      }
    }

    case "SET_FLOOR_CORNER_LOCKED_ANGLE": {
      const floor = state.foundation.floor
      const v = floor.vertices
      if (!v.length) return state

      const idx = Math.max(0, Math.min(action.cornerIndex, v.length - 1))
      const corners = ensureFloorCorners(floor, v.length)

      const nextLocked = action.lockedAngle
      let lockedAngle = nextLocked == null ? null : Number(nextLocked)

      if (lockedAngle != null) {
        if (!Number.isFinite(lockedAngle)) return state
        lockedAngle = normalizeAngle180(lockedAngle)
        if (Math.abs(lockedAngle) <= 0.5) return state
      }

      const nextCorners = corners.map((m, i) =>
        i === idx ? { ...m, lockedAngle } : m
      )

      const nextEdges = ensureFloorEdges(floor, v.length, floor.closed)

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            edges: nextEdges,
            corners: nextCorners,
          },
        },
      }
    }

    case "SET_FLOOR_VERTEX_LASER_HEIGHT": {
      const floor = state.foundation.floor
      const v = floor.vertices
      if (!v.length) return state

      const idx = Math.max(0, Math.min(action.vertexIndex, v.length - 1))
      const corners = ensureFloorCorners(floor, v.length)

      const nextLaserHeight =
        action.laserHeight == null ? null : Number(action.laserHeight)

      if (nextLaserHeight != null && !Number.isFinite(nextLaserHeight)) return state

      const nextCorners = corners.map((m, i) =>
        i === idx ? { ...m, laserHeight: nextLaserHeight } : m
      )

      const nextEdges = ensureFloorEdges(floor, v.length, floor.closed)

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            edges: nextEdges,
            corners: nextCorners,
          },
        },
      }
    }

    case "SET_FLOOR_CORNER_ANGLE": {
      const floor = state.foundation.floor
      const v = floor.vertices
      if (v.length < 3) return state

      const idx = Math.max(0, Math.min(action.cornerIndex, v.length - 1))

      let nextAngle = Number(action.angle)
      if (!Number.isFinite(nextAngle)) return state

      nextAngle = normalizeAngle180(nextAngle)
      if (Math.abs(nextAngle) <= 0.5) return state

      const edges = ensureFloorEdges(floor, v.length, floor.closed)
      const corners = ensureFloorCorners(floor, v.length)

      const solved = solveSetFloorCornerAngle(
        v,
        floor.closed,
        idx,
        nextAngle,
        edges,
        floor.corners
      )
      if (!solved) return state

      const nextEdges = ensureFloorEdges(floor, solved.length, floor.closed)
      const nextCorners = ensureFloorCorners(floor, solved.length)

      const wasLocked =
        nextCorners[idx]?.lockedAngle != null &&
        Number.isFinite(nextCorners[idx].lockedAngle as number)

      if (wasLocked) {
        nextCorners[idx] = {
          ...nextCorners[idx],
          lockedAngle: nextAngle,
        }
      }

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            vertices: solved,
            edges: nextEdges,
            corners: nextCorners,
          },
        },
      }
    }

    case "MOVE_FLOOR_VERTEX_DRAG": {
      const floor = state.foundation.floor
      const v = floor.vertices
      if (!v.length) return state
      if (action.index < 0 || action.index >= v.length) return state

      const edges = ensureFloorEdges(floor, v.length, floor.closed)
      const corners = ensureFloorCorners(floor, v.length)

      const solved = solveMoveFloorVertexDrag(v, floor.closed, action.index, action.x, action.z, edges, corners)
      if (!solved) return state

      const nextEdges = ensureFloorEdges(floor, solved.length, floor.closed)
      const nextCorners = ensureFloorCorners(floor, solved.length)

      return {
        ...state,
        foundation: {
          ...state.foundation,
          floor: {
            ...floor,
            vertices: solved,
            edges: nextEdges,
            corners: nextCorners,
          },
        },
      }
    }

    case "UPDATE_FOUNDATION_FFL_HEIGHT": {
      const next = Number(action.fflHeight)
      if (!Number.isFinite(next)) return state

      const laser = state.balcony.laserLevelY
      const fflY = laser - next

      const nextState: RootState = {
        ...state,
        foundation: {
          ...state.foundation,
          fflHeight: next,
          fflY,
        },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "UPDATE_BALCONY_LASER_LEVEL": {
      const nextLaser = Number((action as any).laserLevelY)
      if (!Number.isFinite(nextLaser)) return state

      const nextState: RootState = {
        ...state,
        balcony: { ...state.balcony, laserLevelY: nextLaser },
        foundation: {
          ...state.foundation,
          fflY: nextLaser - state.foundation.fflHeight,
        },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SPLIT_BALUSTRADE_AT_POST": {
      const post = state.posts.find((p) => p.id === action.postId)
      if (!post) return state

      const parsed = parseSegmentId(post.segmentId, state.balcony.id)
      if (!parsed) return state

      const runs = cloneRuns(getBalustradeRuns(state.balcony))
      const run = runs[parsed.runIndex]
      if (!run || run.length < 2) return state

      const splitInsertIndex = parsed.segInRun + 1
      const splitPoint = {
        x: post.referencePosition?.x ?? post.position.x,
        z: post.referencePosition?.z ?? post.position.z,
      }

      const splitVertexPostId =
        parsed.runIndex === 0
          ? `post-v-${splitInsertIndex}`
          : `post-r${parsed.runIndex}-v-${splitInsertIndex}`

      const segStart = run[parsed.segInRun]
      const segEnd = run[parsed.segInRun + 1]
      if (!segStart || !segEnd) return state

      const atStart = pointEquals2(splitPoint, segStart)
      const atEnd = pointEquals2(splitPoint, segEnd)
      if (atStart || atEnd) return state

      run.splice(splitInsertIndex, 0, splitPoint)

      const nextBalustradePaths = runs
      const nextBalustradePath = nextBalustradePaths[0] ?? []

      const remappedPostsBase = remapPostsForSplit({
        state,
        runIndex: parsed.runIndex,
        splitSegInRun: parsed.segInRun,
        splitPoint,
        splitVertexPostId: action.postId,
      })

      const remappedPosts = remappedPostsBase.map((p) => {
        if (p.id === action.postId) {
          return {
            ...p,
            id: splitVertexPostId,
          }
        }

        if (parsed.runIndex === 0) {
          const m = p.id.match(/^post-v-(\d+)$/)
          if (m) {
            const vi = Number(m[1])
            if (vi >= splitInsertIndex) {
              return {
                ...p,
                id: `post-v-${vi + 1}`,
              }
            }
          }
        } else {
          const m = p.id.match(new RegExp(`^post-r${parsed.runIndex}-v-(\\d+)$`))
          if (m) {
            const vi = Number(m[1])
            if (vi >= splitInsertIndex) {
              return {
                ...p,
                id: `post-r${parsed.runIndex}-v-${vi + 1}`,
              }
            }
          }
        }

        return p
      })

      const splitMaps = splitSegmentConstraintMaps({
        state,
        runIndex: parsed.runIndex,
        splitSegInRun: parsed.segInRun,
      })

      const nextSegmentHeightProfilesById = remapSegmentHeightProfilesForSplit({
        state,
        runIndex: parsed.runIndex,
        splitSegInRun: parsed.segInRun,
        splitPoint,
      })

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          balustradePaths: nextBalustradePaths,
          balustradePath: nextBalustradePath,
          segmentConstraintsById: splitMaps.segmentConstraintsById,
          segmentEdgeTypeById: splitMaps.segmentEdgeTypeById,
          segmentHeightProfilesById: nextSegmentHeightProfilesById,
        },
        posts: remappedPosts,
        selectedPostIds: [splitVertexPostId],
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "JOIN_BALUSTRADE_AT_VERTEX": {
      const runs = cloneRuns(getBalustradeRuns(state.balcony))
      const run = runs[action.runIndex]
      if (!run || run.length < 3) return state

      const vertexIndex = action.vertexIndex
      if (vertexIndex <= 0 || vertexIndex >= run.length - 1) return state

      const prev = run[vertexIndex - 1]
      const curr = run[vertexIndex]
      const next = run[vertexIndex + 1]
      if (!prev || !curr || !next) return state

      const inDir = norm2(prev.x - curr.x, prev.z - curr.z)
      const outDir = norm2(next.x - curr.x, next.z - curr.z)
      const d = dot2(inDir.x, inDir.y, outDir.x, outDir.y)

      if (Math.abs(d + 1) > 1e-6) return state

      run.splice(vertexIndex, 1)

      const runPrefix = getRunPrefix(state.balcony.id, action.runIndex)
      const idRemap = new Map<string, string>()
      const removedIds = new Set<string>()
      const nextPosts: Post[] = []

      for (const post of state.posts) {
        let nextPost: Post | null = post

        const parsed = parseSegmentId(post.segmentId, state.balcony.id)
        if (parsed && parsed.runIndex === action.runIndex) {
          let nextId = post.id
          let nextSegmentId = post.segmentId

          const ref = post.referencePosition ?? { x: post.position.x, z: post.position.z }

          const isAtJoinedVertex =
            pointEquals2(
              { x: ref.x, z: ref.z },
              { x: curr.x, z: curr.z }
            )

          if (action.runIndex === 0) {
            const m = post.id.match(/^post-v-(\d+)$/)
            if (m) {
              const vi = Number(m[1])

              if (vi === vertexIndex) {
                if (isAtJoinedVertex) {
                  nextId = `post-join-${action.runIndex}-${vertexIndex}`
                  nextSegmentId = `${runPrefix}-seg-${vertexIndex - 1}`
                } else {
                  removedIds.add(post.id)
                  nextPost = null
                }
              } else if (vi > vertexIndex) {
                nextId = `post-v-${vi - 1}`
              }
            }
          } else {
            const m = post.id.match(new RegExp(`^post-r${action.runIndex}-v-(\\d+)$`))
            if (m) {
              const vi = Number(m[1])

              if (vi === vertexIndex) {
                if (isAtJoinedVertex) {
                  nextId = `post-join-r${action.runIndex}-${vertexIndex}`
                  nextSegmentId = `${runPrefix}-seg-${vertexIndex - 1}`
                } else {
                  removedIds.add(post.id)
                  nextPost = null
                }
              } else if (vi > vertexIndex) {
                nextId = `post-r${action.runIndex}-v-${vi - 1}`
              }
            }
          }

          if (nextPost) {
            if (parsed.segInRun === vertexIndex) {
              nextSegmentId = `${runPrefix}-seg-${vertexIndex - 1}`
            } else if (parsed.segInRun > vertexIndex) {
              nextSegmentId = `${runPrefix}-seg-${parsed.segInRun - 1}`
            }

            nextPost = {
              ...post,
              id: nextId,
              segmentId: nextSegmentId,
            }

            if (nextId !== post.id) idRemap.set(post.id, nextId)
          }
        }

        if (nextPost) nextPosts.push(nextPost)
      }

      const prevSegmentConstraints = state.balcony.segmentConstraintsById ?? {}
      const nextSegmentConstraintsById: NonNullable<RootState["balcony"]["segmentConstraintsById"]> = {}

      for (const segId of Object.keys(prevSegmentConstraints)) {
        const parsed = parseSegmentId(segId, state.balcony.id)
        const value = prevSegmentConstraints[segId]

        if (!parsed || parsed.runIndex !== action.runIndex) {
          nextSegmentConstraintsById[segId] = value
          continue
        }

        if (parsed.segInRun < vertexIndex) {
          nextSegmentConstraintsById[segId] = value
          continue
        }

        if (parsed.segInRun === vertexIndex) {
          continue
        }

        nextSegmentConstraintsById[`${runPrefix}-seg-${parsed.segInRun - 1}`] = value
      }

      const prevSegmentEdgeTypes = state.balcony.segmentEdgeTypeById ?? {}
      const nextSegmentEdgeTypeById: NonNullable<RootState["balcony"]["segmentEdgeTypeById"]> = {}

      for (const segId of Object.keys(prevSegmentEdgeTypes)) {
        const parsed = parseSegmentId(segId, state.balcony.id)
        const value = prevSegmentEdgeTypes[segId]

        if (!parsed || parsed.runIndex !== action.runIndex) {
          nextSegmentEdgeTypeById[segId] = value
          continue
        }

        if (parsed.segInRun < vertexIndex) {
          nextSegmentEdgeTypeById[segId] = value
          continue
        }

        if (parsed.segInRun === vertexIndex) {
          continue
        }

        nextSegmentEdgeTypeById[`${runPrefix}-seg-${parsed.segInRun - 1}`] = value
      }

      const remapIdList = (ids: string[] | undefined) => {
        if (!ids?.length) return []
        const out: string[] = []
        for (const id of ids) {
          if (removedIds.has(id)) continue
          out.push(idRemap.get(id) ?? id)
        }
        return out
      }

      const nextBalustradePaths = runs
      const nextBalustradePath = nextBalustradePaths[0] ?? []

      const nextSegmentHeightProfilesById = remapSegmentHeightProfilesForJoin({
        state,
        runIndex: action.runIndex,
        vertexIndex,
      })

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          balustradePaths: nextBalustradePaths,
          balustradePath: nextBalustradePath,
          segmentConstraintsById: nextSegmentConstraintsById,
          segmentEdgeTypeById: nextSegmentEdgeTypeById,
          segmentHeightProfilesById: nextSegmentHeightProfilesById,
          autoTopExcludePostIds: remapIdList(state.balcony.autoTopExcludePostIds),
        },
        posts: nextPosts,
        selectedPostIds: remapIdList(state.selectedPostIds),
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SET_POSTS_TOOL":
      return { ...state, postsTool: action.tool }

    case "ADD_MID_POST_ON_SEGMENT": {
      if (state.postsTool !== "add_mid_post") return state

      const segId = action.segId
      const wx = action.wx
      const wz = action.wz

      const pair = getSegmentNeighbourPair({
        balcony: state.balcony,
        posts: state.posts.map((post) => ({
          ...post,
          position: {
            ...post.position,
            x: post.referencePosition?.x ?? post.position.x,
            z: post.referencePosition?.z ?? post.position.z,
          },
        })),
        segId,
        wx,
        wz,
      })
      if (!pair) return state

      const { seg, left, right } = pair
      if (left.id === right.id) return state

      const x = (left.x + right.x) / 2
      const z = (left.z + right.z) / 2

      const segRotationY = (Math.atan2(seg.direction.z, seg.direction.x) * 180) / Math.PI
      const defaults = getNeighbourDefaults({
        left,
        right,
        laserLevelY: state.balcony.laserLevelY,
        segRotationY,
      })

      const neighbourAnchorage =
        left.post?.anchorage ??
        right.post?.anchorage ??
        getDefaultAnchorageForPost(state, { segmentId: segId })

      const newPost: Post = {
        id: `post-mid-${Date.now()}`,
        segmentId: segId,
        position: {
          x,
          z,
          yBottom: 0,
          yTop: 0,
        },
        referencePosition: {
          x,
          z,
        },
        height: defaults.height,
        anchorageLaserHeights: getDefaultAnchorageLaserHeightsForPost(
          state,
          { segmentId: segId, position: { x, z } },
          neighbourAnchorage
        ),
        rotationY: defaults.rotationY,
        anchorage: neighbourAnchorage,
        anchorageOverride: false,
        profile: {
          type: "square",
          size: 45,
        },
        spacingMode: "custom",
      }

      const nextPosts = insertPostsNearNeighbours(state.posts, [newPost], left, right)

      const nextState: RootState = {
        ...state,
        posts: nextPosts,
        selectedPostIds: [newPost.id],
        postsTool: null,
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "ADD_POSTS_TO_MAX_SPACING_ON_SEGMENT": {
      if (state.postsTool !== "add_posts_to_spacing") return state

      const segId = action.segId
      const wx = action.wx
      const wz = action.wz

      const pair = getSegmentNeighbourPair({
        balcony: state.balcony,
        posts: state.posts.map((post) => ({
          ...post,
          position: {
            ...post.position,
            x: post.referencePosition?.x ?? post.position.x,
            z: post.referencePosition?.z ?? post.position.z,
          },
        })),
        segId,
        wx,
        wz,
      })
      if (!pair) return state

      const { seg, left, right } = pair
      if (left.id === right.id) return state

      const dx = right.x - left.x
      const dz = right.z - left.z
      const dist = Math.hypot(dx, dz)
      if (!Number.isFinite(dist) || dist < 1e-6) return state

      const S =
        state.balcony.segmentConstraintsById?.[segId]?.maxPostSpacing ??
        (Number.isFinite(state.balcony.maxPostSpacing) && state.balcony.maxPostSpacing > 0
          ? state.balcony.maxPostSpacing
          : 1000)

      const intervals = Math.max(2, Math.ceil(dist / S))
      const newCount = intervals - 1

      const lerpAngleDeg = (a: number, b: number, t: number) => {
        if (!Number.isFinite(a)) a = 0
        if (!Number.isFinite(b)) b = 0
        let d = b - a
        while (d <= -180) d += 360
        while (d > 180) d -= 360
        return a + d * t
      }

      const segRotationY = (Math.atan2(seg.direction.z, seg.direction.x) * 180) / Math.PI
      const defaults = getNeighbourDefaults({
        left,
        right,
        laserLevelY: state.balcony.laserLevelY,
        segRotationY,
      })

      const leftPost = left.post ?? null
      const rightPost = right.post ?? null

      const base = Date.now()
      const newPosts: Post[] = []

      for (let k = 1; k <= newCount; k++) {
        const t = k / intervals

        let height = defaults.height
        if (leftPost && rightPost) {
          height = lerp(leftPost.height, rightPost.height, t)
        }

        let rotationY = defaults.rotationY
        if (leftPost && rightPost) {
          rotationY = lerpAngleDeg(leftPost.rotationY, rightPost.rotationY, t)
        }

        let anchorage =
          leftPost?.anchorage ??
          rightPost?.anchorage ??
          getDefaultAnchorageForPost(state, { segmentId: segId })

        newPosts.push({
          id: `post-fill-${base}-${k}`,
          segmentId: segId,
          position: {
            x: lerp(left.x, right.x, t),
            z: lerp(left.z, right.z, t),
            yBottom: 0,
            yTop: 0,
          },
          referencePosition: {
            x: lerp(left.x, right.x, t),
            z: lerp(left.z, right.z, t),
          },
          height,
          anchorageLaserHeights: getDefaultAnchorageLaserHeightsForPost(
            state,
            { segmentId: segId, position: { x: lerp(left.x, right.x, t), z: lerp(left.z, right.z, t) } },
            anchorage
          ),
          rotationY,
          anchorage,
          anchorageOverride: false,
          profile: { type: "square", size: 45 },
          spacingMode: "custom",
        })
      }

      const nextPosts = insertPostsNearNeighbours(state.posts, newPosts, left, right)

      const nextState: RootState = {
        ...state,
        posts: nextPosts,
        selectedPostIds: newPosts.map((p) => p.id),
        postsTool: null,
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SET_POST_ANCHORAGE": {
      const nextPosts = state.posts.map((post) =>
        post.id === action.id
          ? {
              ...post,
              anchorage: action.anchorage,
              anchorageOverride: true,
              anchorageLaserHeights: getDefaultAnchorageLaserHeightsForPost(state, post, action.anchorage),
            }
          : post
      )

      return {
        ...state,
        posts: nextPosts,
      }
    }

    case "RESET_POST_ANCHORAGE": {
      const target = state.posts.find((p) => p.id === action.id)
      if (!target) return state

      const nextAnchorage = getDefaultAnchorageForPost(state, target)

      const nextPosts = state.posts.map((post) =>
        post.id === action.id
          ? {
              ...post,
              anchorage: nextAnchorage,
              anchorageOverride: false,
              anchorageLaserHeights: getDefaultAnchorageLaserHeightsForPost(state, post, nextAnchorage),
            }
          : post
      )

      return {
        ...state,
        posts: nextPosts,
      }
    }

    case "DELETE_POST": {
      const id = action.id
      const nextPosts = state.posts.filter((p) => p.id !== id)
      if (nextPosts.length === state.posts.length) return state

      const nextSelected = state.selectedPostIds.filter((pid) => pid !== id)
      const nextExclude = (state.balcony.autoTopExcludePostIds ?? []).filter((pid) => pid !== id)

      const nextState: RootState = {
        ...state,
        posts: nextPosts,
        selectedPostIds: nextSelected,
        balcony: { ...state.balcony, autoTopExcludePostIds: nextExclude },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "UPDATE_BALCONY_TOP_Y": {
      const nextState: RootState = {
        ...state,
        balcony: { ...state.balcony, topY: action.topY },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "UPDATE_POST_HEIGHT_PARAM": {
      const updatedPosts = state.posts.map((post) => {
        if (post.id !== action.id) return post
        return { ...post, height: action.height }
      })

      const syncedPosts = refreshLinkedAutoAnchorageLaserHeights(
        state,
        updatedPosts,
        action.id
      )
      const nextState: RootState = { ...state, posts: syncedPosts }
      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "UPDATE_POST_HEIGHT": {
      let nextState: RootState = state

      if (typeof action.yBottom === "number") {
        const laser = state.balcony.laserLevelY
        const newHeight = laser - action.yBottom
        const updatedPosts = state.posts.map((post) =>
          post.id === action.id ? { ...post, height: newHeight } : post
        )
        const syncedPosts = refreshLinkedAutoAnchorageLaserHeights(
          nextState,
          updatedPosts,
          action.id
        )
        nextState = { ...nextState, posts: syncedPosts }
      }

      if (typeof action.yTop === "number") {
        nextState = { ...nextState, balcony: { ...nextState.balcony, topY: action.yTop } }
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "SET_SEGMENT_PANEL_HEIGHT": {
      const next = Number(action.value)
      if (!Number.isFinite(next) || next <= 0) return state

      const prev = state.balcony.segmentConstraintsById?.[action.segmentId]
      if (!prev) return state

      return {
        ...state,
        balcony: {
          ...state.balcony,
          segmentConstraintsById: {
            ...(state.balcony.segmentConstraintsById ?? {}),
            [action.segmentId]: {
              ...prev,
              panelHeight: next,
            },
          },
        },
      }
    }

    case "SET_SEGMENT_BOUNDARY_START_BAY_REF_MODE": {
      const prev = state.balcony.segmentConstraintsById?.[action.segmentId]
      if (!prev) return state

      return {
        ...state,
        balcony: {
          ...state.balcony,
          segmentConstraintsById: {
            ...(state.balcony.segmentConstraintsById ?? {}),
            [action.segmentId]: {
              ...prev,
              boundaryStartBayRefMode: action.value,
            },
          },
        },
      }
    }

    case "SET_SEGMENT_BOUNDARY_END_BAY_REF_MODE": {
      const prev = state.balcony.segmentConstraintsById?.[action.segmentId]
      if (!prev) return state

      return {
        ...state,
        balcony: {
          ...state.balcony,
          segmentConstraintsById: {
            ...(state.balcony.segmentConstraintsById ?? {}),
            [action.segmentId]: {
              ...prev,
              boundaryEndBayRefMode: action.value,
            },
          },
        },
      }
    }

    case "TOGGLE_AUTO_TOP_EXCLUDE_POSTS": {
      const ids = (action.ids ?? []).filter(Boolean)
      if (!ids.length) return state

      const nextExclude = toggleIds(state.balcony.autoTopExcludePostIds, ids)

      const nextState: RootState = {
        ...state,
        balcony: {
          ...state.balcony,
          autoTopExcludePostIds: nextExclude,
        },
      }

      return applyAutoTopAndDeriveY(nextState, nextState.posts)
    }

    case "TOGGLE_BAY_SUPPRESSION": {
      const bayId = action.bayId
      if (!bayId) return state

      const prev = state.balcony.bayOverridesById?.[bayId] ?? {}

      return {
        ...state,
        balcony: {
          ...state.balcony,
          bayOverridesById: {
            ...(state.balcony.bayOverridesById ?? {}),
            [bayId]: {
              ...prev,
              suppressed: !prev.suppressed,
            },
          },
        },
      }
    }

    case "SET_BAY_BOTTOM_REF_MODE": {
      const bayId = action.bayId
      if (!bayId) return state

      const prev = state.balcony.bayOverridesById?.[bayId] ?? {}

      return {
        ...state,
        balcony: {
          ...state.balcony,
          bayOverridesById: {
            ...(state.balcony.bayOverridesById ?? {}),
            [bayId]: {
              ...prev,
              bottomRefMode: action.value,
            },
          },
        },
      }
    }

    default:
      return legacyReducer(state, action as any)
  }
}