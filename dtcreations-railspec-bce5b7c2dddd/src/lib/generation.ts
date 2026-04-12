// /lib/generation.ts
import { Balcony, Post, AnchorageType, CornerPostHost } from "./types"
import { getCornerPostLayout } from "./math"
import { deriveSegments } from "./segments"

function radToDeg(r: number) {
  return (r * 180) / Math.PI
}

function norm2(dx: number, dz: number) {
  const l = Math.hypot(dx, dz) || 1
  return { x: dx / l, z: dz / l }
}

function normalizeDeg180(deg: number) {
  let a = deg
  while (a <= -180) a += 360
  while (a > 180) a -= 360
  return a
}

function angularDeltaDeg(a: number, b: number) {
  return Math.abs(normalizeDeg180(a - b))
}

function pickCornerRotationClosestToSegment(
  cornerRotationY: number,
  segmentRotationY: number
) {
  const direct = normalizeDeg180(cornerRotationY)
  const flipped = normalizeDeg180(cornerRotationY + 180)

  return angularDeltaDeg(direct, segmentRotationY) <= angularDeltaDeg(flipped, segmentRotationY)
    ? direct
    : flipped
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function angleBetweenDeg(ax: number, az: number, bx: number, bz: number) {
  const a = norm2(ax, az)
  const b = norm2(bx, bz)
  const d = clamp(a.x * b.x + a.z * b.z, -1, 1)
  return (Math.acos(d) * 180) / Math.PI
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function getSegmentLaserHeights(
  balcony: Balcony,
  segId: string
): { startLaserHeight: number; endLaserHeight: number } | null {
  const p = balcony.segmentHeightProfilesById?.[segId]
  if (!p) return null

  if (!Number.isFinite(p.startLaserHeight) || !Number.isFinite(p.endLaserHeight)) {
    return null
  }

  return {
    startLaserHeight: Number(p.startLaserHeight),
    endLaserHeight: Number(p.endLaserHeight),
  }
}

function getSegmentBottomYAtT(
  balcony: Balcony,
  segId: string,
  t: number
) {
  const profile = getSegmentLaserHeights(balcony, segId)
  const laser = balcony.laserLevelY ?? 0

  if (!profile) return 0

  const laserHeight = lerp(profile.startLaserHeight, profile.endLaserHeight, t)
  return laser - laserHeight
}

function isFramelessDesign(design?: string | null) {
  return design === "RD-D10" || design === "RD-D11" || design === "RD-D12" || design === "RD-D13"
}

function getSquarePostSizeForDesign(design?: string | null) {
  return design === "RD-D6" ? 46 : 45
}

function getDefaultAnchorageForSegment(
  balcony: Balcony,
  segId: string,
  design: string | null | undefined,
  globalAnchorage: AnchorageType | null | undefined
): AnchorageType {
  const fallback = globalAnchorage ?? "BP"

  // Current request is explicitly non-frameless only.
  if (isFramelessDesign(design)) {
    return fallback
  }

  const edgeType = balcony.segmentEdgeTypeById?.[segId]
  if (edgeType !== "low_wall") {
    return fallback
  }

  const placement = balcony.segmentLowWallPlacementById?.[segId] ?? "on_wall"

  if (placement === "inside") return "SFI"
  if (placement === "outside") return "SFO"
  return fallback
}

function parseSegmentId(
  segId: string,
  balconyId: string
): { runIndex: number; segInRun: number } | null {
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

function getBalustradeRuns(balcony: Balcony) {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  return (runs ?? []).filter((run) => Array.isArray(run) && run.length >= 2)
}

function getAdjacentSegmentId(
  balcony: Balcony,
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
    return `${parsed.runIndex === 0 ? balcony.id : `${balcony.id}-run-${parsed.runIndex}`}-seg-${prevSegInRun}`
  }

  const nextSegInRun = parsed.segInRun + 1
  if (nextSegInRun >= segCount) return null
  return `${parsed.runIndex === 0 ? balcony.id : `${balcony.id}-run-${parsed.runIndex}`}-seg-${nextSegInRun}`
}

function getSegmentMaxLaserHeight(
  balcony: Balcony,
  segId: string
) {
  const profile = balcony.segmentHeightProfilesById?.[segId]
  if (!profile) return null

  if (!Number.isFinite(profile.startLaserHeight) || !Number.isFinite(profile.endLaserHeight)) {
    return null
  }

  return Math.max(
    Number(profile.startLaserHeight),
    Number(profile.endLaserHeight)
  )
}

function getBoundaryRefMode(
  balcony: Balcony,
  segId: string,
  end: "start" | "end"
) {
  const c = balcony.segmentConstraintsById?.[segId]
  return end === "start"
    ? c?.boundaryStartBayRefMode ?? "segment"
    : c?.boundaryEndBayRefMode ?? "segment"
}

function getCornerPostHost(
  balcony: Balcony,
  runIndex: number,
  vertexIndex: number
): CornerPostHost {
  return balcony.cornerPostHostByRun?.[runIndex]?.[vertexIndex] ?? "left"
}

function getDefaultAnchorageLaserHeightsForAnchorage(params: {
  balcony: Balcony
  anchorage: AnchorageType | null | undefined
  segId: string
  atSegmentStart?: boolean
  atSegmentEnd?: boolean
}) {
  const { balcony, anchorage, segId, atSegmentStart = false, atSegmentEnd = false } = params

  if (anchorage === "WF") {
    return [-200, -800]
  }

  if (anchorage !== "SFI" && anchorage !== "SFO") {
    return []
  }

  const ownIsLowWall = balcony.segmentEdgeTypeById?.[segId] === "low_wall"
  let includeOwn = ownIsLowWall

  const candidateHeights: number[] = []

  if (atSegmentStart) {
    const linkedSegId = getAdjacentSegmentId(balcony, segId, "start")
    const boundaryMode = getBoundaryRefMode(balcony, segId, "start")
    const linkedIsLowWall = linkedSegId ? balcony.segmentEdgeTypeById?.[linkedSegId] === "low_wall" : false

    if (boundaryMode === "linked" && linkedSegId && !linkedIsLowWall) {
      includeOwn = false
    }

    if (linkedSegId && linkedIsLowWall) {
      const h = getSegmentMaxLaserHeight(balcony, linkedSegId)
      if (Number.isFinite(h)) candidateHeights.push(h as number)
    }
  }

  if (atSegmentEnd) {
    const linkedSegId = getAdjacentSegmentId(balcony, segId, "end")
    const boundaryMode = getBoundaryRefMode(balcony, segId, "end")
    const linkedIsLowWall = linkedSegId ? balcony.segmentEdgeTypeById?.[linkedSegId] === "low_wall" : false

    if (boundaryMode === "linked" && linkedSegId && !linkedIsLowWall) {
      includeOwn = false
    }

    if (linkedSegId && linkedIsLowWall) {
      const h = getSegmentMaxLaserHeight(balcony, linkedSegId)
      if (Number.isFinite(h)) candidateHeights.push(h as number)
    }
  }

  if (includeOwn) {
    const ownHeight = getSegmentMaxLaserHeight(balcony, segId)
    if (Number.isFinite(ownHeight)) candidateHeights.push(ownHeight as number)
  }

  if (!candidateHeights.length) {
    return [0, 0]
  }

  const governing = Math.max(...candidateHeights)
  return [governing + 100, governing + 250]
}

export function generatePosts(
  balcony: Balcony,
  spacing: number,
  opts?: {
    design?: string | null
    anchorage?: AnchorageType | null
  }
): Post[] {
  const runsRaw = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  const runs = (runsRaw ?? []).filter((p) => Array.isArray(p) && p.length >= 1)

  const posts: Post[] = []
  if (!runs.length) return posts

  const laser = balcony.laserLevelY ?? 0
  const initialTop = balcony.topY ?? 1000
  const squarePostSize = getSquarePostSizeForDesign(opts?.design)

  const solveSpacingForLength = (length: number, targetSpacing: number) => {
    if (!Number.isFinite(length) || length <= 1e-6) return { spanCount: 0, step: 0 }
    if (!Number.isFinite(targetSpacing) || targetSpacing <= 0) return { spanCount: 0, step: 0 }

    const spanCount = Math.max(1, Math.ceil(length / targetSpacing))
    const step = length / spanCount
    return { spanCount, step }
  }

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const vertices = runs[runIndex]
    if (!vertices.length) continue

    const runBalcony: Balcony = {
      ...balcony,
      id: runIndex === 0 ? balcony.id : `${balcony.id}-run-${runIndex}`,
      balustradePath: vertices,
    }

    const segments = deriveSegments(runBalcony)
    if (!segments.length) {
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i]
        const id = runIndex === 0 ? `post-v-${i}` : `post-r${runIndex}-v-${i}`

        const yBottom = 0
        const height = laser - yBottom

        const anchorage = opts?.anchorage ?? "BP"

        posts.push({
          id,
          segmentId: "seg-0",
          position: { x: v.x, yBottom, yTop: initialTop, z: v.z },
          referencePosition: { x: v.x, z: v.z },
          height,
          anchorageLaserHeights: getDefaultAnchorageLaserHeightsForAnchorage({
            balcony,
            anchorage,
            segId: "seg-0",
            atSegmentStart: i === 0,
            atSegmentEnd: i === vertices.length - 1,
          }),
          rotationY: 0,
          anchorage,
          anchorageOverride: false,
          profile: { type: "square", size: squarePostSize },
          spacingMode: "even",
        })
      }
      continue
    }

    const segYawDeg = (segIndex: number) => {
      const seg = segments[clamp(segIndex, 0, segments.length - 1)]
      return radToDeg(Math.atan2(seg.direction.z, seg.direction.x))
    }

    const vertexIsCorner = (i: number) => {
      if (i <= 0 || i >= vertices.length - 1) return false
      const prev = vertices[i - 1]
      const v = vertices[i]
      const next = vertices[i + 1]
      const inDir = norm2(v.x - prev.x, v.z - prev.z)
      const outDir = norm2(next.x - v.x, next.z - v.z)
      const ang = angleBetweenDeg(inDir.x, inDir.z, outDir.x, outDir.z)
      return ang > 1
    }

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i]

      const prevSeg = i > 0 ? segments[i - 1] ?? null : null
      const nextSeg = i < segments.length ? segments[i] ?? null : null

      const isStart = i === 0
      const isEnd = i === vertices.length - 1
      const isCorner = vertexIsCorner(i)

      const cornerHost = isCorner ? getCornerPostHost(balcony, runIndex, i) : "left"

      const ownerSeg =
        isStart
          ? segments[0] ?? null
          : isEnd
            ? segments[segments.length - 1] ?? null
            : isCorner
              ? (cornerHost === "left" ? prevSeg : nextSeg)
              : nextSeg ?? prevSeg ?? segments[0] ?? null

      const segId = ownerSeg?.id ?? segments[segments.length - 1]?.id ?? segments[0].id
      const id = runIndex === 0 ? `post-v-${i}` : `post-r${runIndex}-v-${i}`

      const postWidth = squarePostSize

      const cornerLayout =
        isCorner && prevSeg && nextSeg
          ? getCornerPostLayout({
              vertex: v,
              parentDir:
                cornerHost === "left"
                  ? { x: -prevSeg.direction.x, z: -prevSeg.direction.z }
                  : { x: nextSeg.direction.x, z: nextSeg.direction.z },
              otherDir:
                cornerHost === "left"
                  ? { x: nextSeg.direction.x, z: nextSeg.direction.z }
                  : { x: -prevSeg.direction.x, z: -prevSeg.direction.z },
              postWidth,
            })
          : null

      let rotationY = 0
      if (segments.length) {
        if (isStart) rotationY = segYawDeg(0)
        else if (isEnd) rotationY = segYawDeg(segments.length - 1)
        else if (isCorner && cornerLayout) {
          const ownerRotationY =
            ownerSeg
              ? radToDeg(Math.atan2(ownerSeg.direction.z, ownerSeg.direction.x))
              : 0

          rotationY = pickCornerRotationClosestToSegment(
            cornerLayout.rotationY,
            ownerRotationY
          )
        } else if (nextSeg) {
          rotationY = radToDeg(Math.atan2(nextSeg.direction.z, nextSeg.direction.x))
        }
      }

      let yBottom = 0

      if (isStart) {
        yBottom = getSegmentBottomYAtT(balcony, segments[0].id, 0)
      } else if (isEnd) {
        yBottom = getSegmentBottomYAtT(balcony, segments[segments.length - 1].id, 1)
      } else if (isCorner) {
        if (cornerHost === "left" && prevSeg) {
          yBottom = getSegmentBottomYAtT(balcony, prevSeg.id, 1)
        } else if (cornerHost === "right" && nextSeg) {
          yBottom = getSegmentBottomYAtT(balcony, nextSeg.id, 0)
        } else if (ownerSeg) {
          yBottom = getSegmentBottomYAtT(balcony, ownerSeg.id, 0)
        }
      } else if (ownerSeg) {
        yBottom = getSegmentBottomYAtT(balcony, ownerSeg.id, 0)
      }

      const height = laser - yBottom

      const actualPosition =
        isCorner && cornerLayout
          ? cornerLayout.position
          : { x: v.x, z: v.z }

      const anchorage = getDefaultAnchorageForSegment(balcony, segId, opts?.design, opts?.anchorage)

      const atSegmentStart =
        isStart ||
        (!isEnd && isCorner && cornerHost === "right")

      const atSegmentEnd =
        isEnd ||
        (!isStart && isCorner && cornerHost === "left")

      posts.push({
        id,
        segmentId: segId,
        position: { x: actualPosition.x, yBottom, yTop: initialTop, z: actualPosition.z },
        referencePosition: { x: v.x, z: v.z },
        height,
        anchorageLaserHeights: getDefaultAnchorageLaserHeightsForAnchorage({
          balcony,
          anchorage,
          segId,
          atSegmentStart,
          atSegmentEnd,
        }),
        rotationY,
        anchorage,
        anchorageOverride: false,
        profile: { type: "square", size: postWidth },
        spacingMode: "even",
      })
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const segSpacing =
        balcony.segmentConstraintsById?.[seg.id]?.maxPostSpacing ??
        spacing

      const { spanCount, step } = solveSpacingForLength(seg.length, segSpacing)
      const interiorCount = Math.max(0, spanCount - 1)
      if (interiorCount <= 0) continue

      const rotationY = radToDeg(Math.atan2(seg.direction.z, seg.direction.x))

      for (let j = 1; j <= interiorCount; j++) {
        const dist = j * step
        const t = seg.length > 1e-6 ? dist / seg.length : 0
        const yBottom = getSegmentBottomYAtT(balcony, seg.id, t)
        const height = laser - yBottom

        const anchorage = getDefaultAnchorageForSegment(balcony, seg.id, opts?.design, opts?.anchorage)

        posts.push({
          id: `post-${seg.id}-i-${j}`,
          segmentId: seg.id,
          position: {
            x: seg.start.x + seg.direction.x * dist,
            yBottom,
            yTop: initialTop,
            z: seg.start.z + seg.direction.z * dist,
          },
          referencePosition: {
            x: seg.start.x + seg.direction.x * dist,
            z: seg.start.z + seg.direction.z * dist,
          },
          height,
          anchorageLaserHeights: getDefaultAnchorageLaserHeightsForAnchorage({
            balcony,
            anchorage,
            segId: seg.id,
          }),
          rotationY,
          anchorage,
          anchorageOverride: false,
          profile: { type: "square", size: squarePostSize },
          spacingMode: "even",
        })
      }
    }
  }

  return posts
}