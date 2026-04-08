// /lib/balustrade/deriveBays.ts
import { type BayPlaneVec } from "../math"
import { deriveBayPlanes } from "./deriveBayPlanes"
import type { Balcony, BoundaryBayRefMode, Post, Segment } from "../types"
import { deriveSegments } from "../segments"

export type BayRef = {
  id: string
  x: number
  z: number
  t: number
  kind: "post" | "anchor" | "virtual"
  postId?: string
}

export type DerivedBay = {
  id: string
  segmentId: string

  from: BayRef
  to: BayRef

  leftVec: BayPlaneVec
  rightVec: BayPlaneVec
  topVec: BayPlaneVec
  bottomVec: BayPlaneVec

  derivedFrom: {
    leftX: number
    leftZ: number
    rightX: number
    rightZ: number
    centerX: number
    centerZ: number
  }

  runIndex: number
  segInRun: number

  isFirstBayOnSegment: boolean
  isLastBayOnSegment: boolean

  length: number

  maxPostSpacing: number
  spacingExceeded: boolean
  spacingExceededBy: number

  suppressed: boolean

  panelHeight: number
  maxPanelHeight: number
  maxBottomGap: number

  bottomRefMode: BoundaryBayRefMode
  yRefSegmentId: string
  yRef: number

  fromAnchorBottomY: number | null
  toAnchorBottomY: number | null

  bottomGapFrom: number | null
  bottomGapTo: number | null

  fromBottomGapExceededBy: number
  toBottomGapExceededBy: number
  worstBottomGapExceededBy: number

  fromPostNumber: number | null
  toPostNumber: number | null
  displayLabel: string

  panelHeightExceeded: boolean
  fromBottomGapExceeded: boolean
  toBottomGapExceeded: boolean
  bottomGapExceeded: boolean
  hasRailFailure: boolean
}

function norm(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function dot(ax: number, az: number, bx: number, bz: number) {
  return ax * bx + az * bz
}

function getRunSegments(balcony: Balcony, runIndex: number): Segment[] {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  const runPath = runs[runIndex]
  if (!Array.isArray(runPath) || runPath.length < 2) return []

  const runBalcony = {
    ...balcony,
    id: runIndex === 0 ? balcony.id : `${balcony.id}-run-${runIndex}`,
    balustradePath: runPath,
  } as Balcony

  return deriveSegments(runBalcony)
}

function getSegmentConstraint(
  balcony: Balcony,
  seg: Segment
): {
  maxPostSpacing: number
  panelHeight: number
  maxPanelHeight: number
  maxBottomGap: number
  boundaryStartBayRefMode: BoundaryBayRefMode
  boundaryEndBayRefMode: BoundaryBayRefMode
} {
  const c = balcony.segmentConstraintsById?.[seg.id]

  const maxPostSpacing =
    c?.maxPostSpacing ??
    seg.maxPostSpacing ??
    balcony.maxPostSpacing

  const panelHeight =
    c?.panelHeight ??
    seg.panelHeight ??
    balcony.maxPanelHeight

  const maxPanelHeight =
    c?.maxPanelHeight ??
    seg.maxPanelHeight ??
    balcony.maxPanelHeight

  const maxBottomGap =
    c?.maxBottomGap ??
    seg.maxBottomGap ??
    balcony.maxBottomGap

  const boundaryStartBayRefMode =
    c?.boundaryStartBayRefMode ??
    seg.boundaryStartBayRefMode ??
    "segment"

  const boundaryEndBayRefMode =
    c?.boundaryEndBayRefMode ??
    seg.boundaryEndBayRefMode ??
    "segment"

  return {
    maxPostSpacing,
    panelHeight,
    maxPanelHeight,
    maxBottomGap,
    boundaryStartBayRefMode,
    boundaryEndBayRefMode,
  }
}

function getOrderedRefsForSegment(params: {
  balcony: Balcony
  posts: Post[]
  seg: Segment
  runIndex: number
  segInRun: number
}): BayRef[] {
  const { balcony, posts, seg, runIndex, segInRun } = params

  const refs: BayRef[] = []

  const sx = seg.start.x
  const sz = seg.start.z
  const d = norm(seg.end.x - seg.start.x, seg.end.z - seg.start.z)

  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  const runPath = runs[runIndex] ?? []
  const segCount = Math.max(0, runPath.length - 1)

  const addRef = (ref: BayRef) => {
    refs.push(ref)
  }

  const JOINT_POST_EPS = 200

  const isPostNearPoint = (
    post: Post,
    x: number,
    z: number
  ) => {
    return Math.hypot(post.position.x - x, post.position.z - z) <= JOINT_POST_EPS
  }

  const runPrefix = runIndex === 0 ? balcony.id : `${balcony.id}-run-${runIndex}`

  const getAdjacentSegmentIdForJoint = (
    end: "start" | "end"
  ) => {
    if (end === "start") {
      if (segInRun <= 0) return null
      return `${runPrefix}-seg-${segInRun - 1}`
    }

    if (segInRun >= segCount - 1) return null
    return `${runPrefix}-seg-${segInRun + 1}`
  }

  const getJointPost = (
    x: number,
    z: number,
    end: "start" | "end"
  ) => {
    const adjacentSegmentId = getAdjacentSegmentIdForJoint(end)

    const candidates = posts
      .filter((p) => {
        if (!isPostNearPoint(p, x, z)) return false
        if (p.segmentId === seg.id) return true
        if (adjacentSegmentId && p.segmentId === adjacentSegmentId) return true
        return false
      })
      .map((p) => ({
        post: p,
        dist: Math.hypot(p.position.x - x, p.position.z - z),
      }))
      .sort((a, b) => {
        if (Math.abs(a.dist - b.dist) > 1e-6) return a.dist - b.dist
        return a.post.id.localeCompare(b.post.id)
      })

    return candidates[0]?.post ?? null
  }

  const hasRealAt = (
    x: number,
    z: number,
    end: "start" | "end"
  ) => {
    return getJointPost(x, z, end) != null
  }

  for (const p of posts) {
    if (p.segmentId !== seg.id) continue

    const t = dot(p.position.x - sx, p.position.z - sz, d.x, d.z)
    if (t < -50 || t > seg.length + 50) continue

    addRef({
      id: p.id,
      x: p.position.x,
      z: p.position.z,
      t,
      kind: "post",
      postId: p.id,
    })
  }

  if (segInRun > 0) {
    const jointPost = getJointPost(seg.start.x, seg.start.z, "start")

    if (jointPost && !refs.some((r) => r.postId === jointPost.id)) {
      addRef({
        id: jointPost.id,
        x: jointPost.position.x,
        z: jointPost.position.z,
        t: 0,
        kind: "post",
        postId: jointPost.id,
      })
    }
  }

  if (segInRun < segCount - 1) {
    const jointPost = getJointPost(seg.end.x, seg.end.z, "end")

    if (jointPost && !refs.some((r) => r.postId === jointPost.id)) {
      addRef({
        id: jointPost.id,
        x: jointPost.position.x,
        z: jointPost.position.z,
        t: seg.length,
        kind: "post",
        postId: jointPost.id,
      })
    }
  }

  // shared interior joint anchors only when no real post is on that joint for this segment
  if (segInRun > 0 && !hasRealAt(seg.start.x, seg.start.z, "start")) {
    addRef({
      id: `__joint-start__${seg.id}`,
      x: seg.start.x,
      z: seg.start.z,
      t: 0,
      kind: "anchor",
    })
  }

  if (segInRun < segCount - 1 && !hasRealAt(seg.end.x, seg.end.z, "end")) {
    addRef({
      id: `__joint-end__${seg.id}`,
      x: seg.end.x,
      z: seg.end.z,
      t: seg.length,
      kind: "anchor",
    })
  }

  // open-run start / end anchors if no real post exists there
  if (segInRun === 0 && !hasRealAt(seg.start.x, seg.start.z, "start")) {
    addRef({
      id: `__seg-start__${seg.id}`,
      x: seg.start.x,
      z: seg.start.z,
      t: 0,
      kind: "anchor",
    })
  }

  if (segInRun === segCount - 1 && !hasRealAt(seg.end.x, seg.end.z, "end")) {
    addRef({
      id: `__seg-end__${seg.id}`,
      x: seg.end.x,
      z: seg.end.z,
      t: seg.length,
      kind: "anchor",
    })
  }

  refs.sort((a, b) => {
    if (Math.abs(a.t - b.t) > 1e-6) return a.t - b.t
    return a.id.localeCompare(b.id)
  })

  const deduped: BayRef[] = []
  const seen = new Set<string>()
  for (const r of refs) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    deduped.push(r)
  }

  return deduped
}

function getLinkedSegmentId(params: {
  balcony: Balcony
  runIndex: number
  segInRun: number
  isFirstBayOnSegment: boolean
  isLastBayOnSegment: boolean
}): string | null {
  const runSegs = getRunSegments(params.balcony, params.runIndex)
  if (!runSegs.length) return null

  if (params.isFirstBayOnSegment && params.segInRun > 0) {
    return runSegs[params.segInRun - 1]?.id ?? null
  }

  if (params.isLastBayOnSegment && params.segInRun < runSegs.length - 1) {
    return runSegs[params.segInRun + 1]?.id ?? null
  }

  return null
}

function getSegmentYRef(balcony: Balcony, segId: string) {
  const c = balcony.segmentConstraintsById?.[segId]
  const panelHeight =
    c?.panelHeight ??
    balcony.maxPanelHeight

  return balcony.topY - panelHeight
}

function getPostById(posts: Post[], id?: string) {
  if (!id) return null
  return posts.find((p) => p.id === id) ?? null
}

function getEffectiveBottomGapLimitForRef(
  balcony: Balcony,
  posts: Post[],
  ref: BayRef,
  segmentMaxBottomGap: number
) {
  if (ref.kind !== "post") return segmentMaxBottomGap

  const post =
    getPostById(posts, ref.postId) ??
    getPostById(posts, ref.id)

  if (!post) return segmentMaxBottomGap

  const edgeType =
    balcony.segmentConstraintsById?.[post.segmentId]?.edgeType

  const isLowWall = edgeType === "low_wall"
  const isSf = post.anchorage === "SFI" || post.anchorage === "SFO"

  if (isLowWall && isSf) return 10

  return segmentMaxBottomGap
}

function getAnchorBottomYForRef(balcony: Balcony, posts: Post[], ref: BayRef) {
  if (ref.kind !== "post") return null

  const post =
    getPostById(posts, ref.postId) ??
    getPostById(posts, ref.id)

  if (!post) return null

  return balcony.laserLevelY - post.height
}

export function deriveBays(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  posts: Post[]
}): DerivedBay[] {
  const { balcony, design, toprailType, posts } = params
  const postNumbersById = derivePostDisplayNumbers({
  balcony,
  posts,
})
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]

  const bays: DerivedBay[] = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runSegs = getRunSegments(balcony, runIndex)
    if (!runSegs.length) continue

    for (let segInRun = 0; segInRun < runSegs.length; segInRun++) {
      const seg = runSegs[segInRun]
      const refs = getOrderedRefsForSegment({
        balcony,
        posts,
        seg,
        runIndex,
        segInRun,
      })

      if (refs.length < 2) continue

      const segConstraint = getSegmentConstraint(balcony, seg)

      for (let i = 0; i < refs.length - 1; i++) {
        const from = refs[i]
        const to = refs[i + 1]

        const isFirstBayOnSegment = i === 0
        const isLastBayOnSegment = i === refs.length - 2

        const bayId = `${seg.id}::${from.id}::${to.id}`

        const override = balcony.bayOverridesById?.[bayId]

        const boundaryDefaultMode =
          isFirstBayOnSegment
            ? segConstraint.boundaryStartBayRefMode
            : isLastBayOnSegment
            ? segConstraint.boundaryEndBayRefMode
            : "segment"

        const bottomRefMode =
          override?.bottomRefMode ??
          boundaryDefaultMode

        let yRefSegmentId = seg.id

        if (bottomRefMode === "linked") {
          const linkedId = getLinkedSegmentId({
            balcony,
            runIndex,
            segInRun,
            isFirstBayOnSegment,
            isLastBayOnSegment,
          })
          if (linkedId) yRefSegmentId = linkedId
        }

        const yRef = getSegmentYRef(balcony, yRefSegmentId)

        const fromAnchorBottomY = getAnchorBottomYForRef(balcony, posts, from)
        const toAnchorBottomY = getAnchorBottomYForRef(balcony, posts, to)

        const bottomGapFrom =
          fromAnchorBottomY == null ? null : yRef - fromAnchorBottomY

        const bottomGapTo =
          toAnchorBottomY == null ? null : yRef - toAnchorBottomY

        const displayedLength = Math.hypot(
          to.x - from.x,
          to.z - from.z
        )

        const bayPlanes = deriveBayPlanes({
          balcony,
          design,
          toprailType,
          posts,
          seg,
          from,
          to,
          yRef,
          panelHeight: segConstraint.panelHeight,
        })

        const spacingExceeded =
          segConstraint.maxPostSpacing > 0 &&
          displayedLength > segConstraint.maxPostSpacing + 1e-6

        const spacingExceededBy =
          spacingExceeded
            ? displayedLength - segConstraint.maxPostSpacing
            : 0

        const panelHeightExceeded =
          segConstraint.panelHeight > segConstraint.maxPanelHeight + 1e-6
        const fromMaxBottomGap = getEffectiveBottomGapLimitForRef(
          balcony,
          posts,
          from,
          segConstraint.maxBottomGap
        )

        const toMaxBottomGap = getEffectiveBottomGapLimitForRef(
          balcony,
          posts,
          to,
          segConstraint.maxBottomGap
        )

        const fromBottomGapExceeded =
          bottomGapFrom != null &&
          fromMaxBottomGap > 0 &&
          bottomGapFrom > fromMaxBottomGap + 1e-6

        const toBottomGapExceeded =
          bottomGapTo != null &&
          toMaxBottomGap > 0 &&
          bottomGapTo > toMaxBottomGap + 1e-6

        const fromBottomGapExceededBy =
          fromBottomGapExceeded && bottomGapFrom != null
            ? bottomGapFrom - fromMaxBottomGap
            : 0

        const toBottomGapExceededBy =
          toBottomGapExceeded && bottomGapTo != null
            ? bottomGapTo - toMaxBottomGap
            : 0

        const worstBottomGapExceededBy = Math.max(
          fromBottomGapExceededBy,
          toBottomGapExceededBy
        )

        const bottomGapExceeded =
          fromBottomGapExceeded || toBottomGapExceeded

        const hasRailFailure =
          spacingExceeded || panelHeightExceeded || bottomGapExceeded

        bays.push({
          id: bayId,
          segmentId: seg.id,
          from,
          to,
          runIndex,
          segInRun,
          isFirstBayOnSegment,
          isLastBayOnSegment,
          length: displayedLength,
          maxPostSpacing: segConstraint.maxPostSpacing,
          spacingExceeded,
          spacingExceededBy,
          suppressed: !!override?.suppressed,
          panelHeight: segConstraint.panelHeight,
          maxPanelHeight: segConstraint.maxPanelHeight,
          maxBottomGap: segConstraint.maxBottomGap,
          bottomRefMode,
          yRefSegmentId,
          yRef,
          fromAnchorBottomY,
          toAnchorBottomY,
          bottomGapFrom,
          bottomGapTo,
          leftVec: bayPlanes.leftVec,
          rightVec: bayPlanes.rightVec,
          topVec: bayPlanes.topVec,
          bottomVec: bayPlanes.bottomVec,
          derivedFrom: {
            leftX: bayPlanes.leftPoint.x,
            leftZ: bayPlanes.leftPoint.z,
            rightX: bayPlanes.rightPoint.x,
            rightZ: bayPlanes.rightPoint.z,
            centerX: bayPlanes.centerPoint.x,
            centerZ: bayPlanes.centerPoint.z,
          },
          fromBottomGapExceededBy,
          toBottomGapExceededBy,
          worstBottomGapExceededBy,
          fromPostNumber: from.postId ? postNumbersById[from.postId] ?? null : null,
          toPostNumber: to.postId ? postNumbersById[to.postId] ?? null : null,

          displayLabel: formatBayDisplayLabel(
            from.postId ? postNumbersById[from.postId] ?? null : null,
            to.postId ? postNumbersById[to.postId] ?? null : null
          ),
          panelHeightExceeded,
          fromBottomGapExceeded,
          toBottomGapExceeded,
          bottomGapExceeded,
          hasRailFailure,
        })
      }
    }
  }

  return bays
}

function getOrderedPostsOnSegment(posts: Post[], seg: Segment) {
  const sx = seg.start.x
  const sz = seg.start.z
  const d = norm(seg.end.x - seg.start.x, seg.end.z - seg.start.z)

  return posts
    .filter((p) => p.segmentId === seg.id)
    .map((p) => ({
      post: p,
      t: dot(p.position.x - sx, p.position.z - sz, d.x, d.z),
    }))
    .filter((it) => it.t >= -50 && it.t <= seg.length + 50)
    .sort((a, b) => {
      if (Math.abs(a.t - b.t) > 1e-6) return a.t - b.t
      return a.post.id.localeCompare(b.post.id)
    })
}

export function derivePostDisplayNumbers(params: {
  balcony: Balcony
  posts: Post[]
}): Record<string, number> {
  const { balcony, posts } = params

  const out: Record<string, number> = {}
  const seen = new Set<string>()

  let nextNumber = 1

  const runs = balcony.balustradePaths?.length
    ? balcony.balustradePaths
    : [balcony.balustradePath]

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runSegs = getRunSegments(balcony, runIndex)
    if (!runSegs.length) continue

    for (const seg of runSegs) {
      const ordered = getOrderedPostsOnSegment(posts, seg)

      for (const item of ordered) {
        const postId = item.post.id
        if (seen.has(postId)) continue

        seen.add(postId)
        out[postId] = nextNumber
        nextNumber += 1
      }
    }
  }

  return out
}

export function formatPostDisplayLabel(postNumber: number | null | undefined) {
  if (!Number.isFinite(postNumber)) return "Post"
  return `Post ${postNumber}`
}

export function formatBayDisplayLabel(
  fromPostNumber: number | null,
  toPostNumber: number | null
) {
  const fromLabel =
    fromPostNumber != null ? `Post ${fromPostNumber}` : "Boundary"
  const toLabel =
    toPostNumber != null ? `Post ${toPostNumber}` : "Boundary"

  return `Bay ${fromLabel} - ${toLabel}`
}