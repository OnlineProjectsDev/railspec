// /lib/toprail.ts
import { RootState, Balcony, Post, Vec2 } from "./types"
import { deriveSegments } from "./segments"
import { designIsFrameless } from "./jobDesignRules"
import { deriveFramelessPanelBases } from "./frameless/deriveFramelessPanels"

export type ToprailProfile = { width: number; height: number }

export type ToprailRules = {
  stockLen: number // e.g. 5500
  postWidth: number // e.g. 45
  endExtMin: number // e.g. postWidth/2
  endExtMax: number // e.g. 200
  joinOffset: number // e.g. postWidth/2 (22.5)
}

export type ToprailPiece = {
  id: string
  start: Vec2
  end: Vec2
  segIndex: number
  planeCenterLength: number
  length: number
  hml: number
  hmr: number
  vml: number
  vmr: number
  // debug / future:
  reason: "segment" | "stock-join"
}

export function getToprailProfileMm(params: {
  toprailType: string | null | undefined
  isFrameless?: boolean
  framelessToprailHeight?: number | null
}): ToprailProfile {
  const { toprailType, isFrameless = false, framelessToprailHeight = null } = params

  if (isFrameless) {
    return {
      width: 40,
      height: Number.isFinite(framelessToprailHeight) ? Number(framelessToprailHeight) : 21,
    }
  }

  switch (toprailType) {
    case "Elite":
      return { width: 55, height: 31 }

    case "Slenderline":
      return { width: 68, height: 31 }

    case "Visage":
      return { width: 98, height: 29 }

    case "Oval":
      return { width: 80, height: 31 }

    case "Round":
      return { width: 60, height: 43 }

    case "25mm Square":
      return { width: 25, height: 21 }

    case "25mm Round":
      return { width: 25, height: 21 }

    case "38mm Round":
      return { width: 38, height: 36 }

    case "38mm Handrail":
      return { width: 38, height: 36 }

    case "42mm Round":
      return { width: 42, height: 31 }

    case "None":
      return { width: 0, height: 0 }

    default:
      return { width: 55, height: 31 }
  }
}

function hypot2(dx: number, dz: number) {
  return Math.hypot(dx, dz)
}

function norm2(dx: number, dz: number) {
  const l = Math.hypot(dx, dz) || 1
  return { x: dx / l, z: dz / l }
}

function dot2(ax: number, az: number, bx: number, bz: number) {
  return ax * bx + az * bz
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function getRunIndexFromBalconyId(balconyId: string) {
  const m = balconyId.match(/-run-(\d+)$/)
  return m ? Number(m[1]) : 0
}

function getDefaultEndExtensionFromRunBoundaryOffset(
  balcony: Balcony,
  runIndex: number,
  end: "start" | "end",
  fallback: number
) {
  const raw = balcony.runBoundarySourceOffsetsByRun?.[runIndex]?.[end]
  if (!Number.isFinite(raw)) return fallback
  return Math.abs(Number(raw))
}

function getToprailTerminationTypeForRunEnd(
  balcony: Balcony,
  runIndex: number,
  end: "start" | "end"
): "EC" | "WC" {
  const byRun = balcony.toprailTerminationTypesByRun?.[runIndex]
  const legacy = balcony.toprailTerminationTypes
  return byRun?.[end] ?? legacy?.[end] ?? "EC"
}

function getToprailTerminationInsetMm(
  terminationType: "EC" | "WC"
) {
  if (terminationType === "WC") return 3
  return 3
}

function angleBetweenDeg(ax: number, az: number, bx: number, bz: number) {
  const a = norm2(ax, az)
  const b = norm2(bx, bz)
  const d = clamp(dot2(a.x, a.z, b.x, b.z), -1, 1)
  return (Math.acos(d) * 180) / Math.PI
}

// Option A allowance: extra length along each run caused by mitre cut
// For a symmetric mitre on a rectangular profile centered on the run centerline,
// the along-run "setback" from the vertex is: halfWidth * cot(theta/2)
// We *ADD* that as "material used" beyond vertex-to-vertex.
function mitreExtraAlong(halfWidth: number, thetaDeg: number) {
  // theta is the interior angle between directions (0..180)
  // ignore near-180 and near-0 (degenerate)
  if (thetaDeg >= 179.5) return 0
  if (thetaDeg <= 0.5) return 0
  const theta = (thetaDeg * Math.PI) / 180
  const t = Math.tan(theta / 2)
  if (Math.abs(t) < 1e-6) return 0
  return halfWidth / t // halfWidth * cot(theta/2)
}

function projectT(p: Vec2, s: Vec2, dir: Vec2) {
  return dot2(p.x - s.x, p.z - s.z, dir.x, dir.z)
}

type BuildArgs = {
  balcony: Balcony
  posts: Post[]
  profile: ToprailProfile
  rules: ToprailRules
  design?: string | null
  state?: RootState
  // future: per-end extension overrides
  endExtensions?: { start?: number; end?: number }
}

function getPostsOnSegmentOrdered(segmentId: string, segStart: Vec2, dir: Vec2, posts: Post[]) {
  return posts
    .filter((p) => p.segmentId === segmentId)
    .map((p) => ({
      id: p.id,
      x: p.position.x,
      z: p.position.z,
      t: projectT({ x: p.position.x, z: p.position.z }, segStart, dir),
    }))
    .sort((a, b) => a.t - b.t)
}

function pointAtT(segStart: Vec2, dir: Vec2, t: number): Vec2 {
  return {
    x: segStart.x + dir.x * t,
    z: segStart.z + dir.z * t,
  }
}

function getFramelessGapMidTsForSegment(params: {
  state: RootState
  design: string | null | undefined
  segmentId: string
  segStart: Vec2
  dir: Vec2
}) {
  if (!designIsFrameless(params.design ?? null)) return []

  const panels = deriveFramelessPanelBases(params.state).filter((panel) => panel.segmentId === params.segmentId)
  if (panels.length < 2) return []

  const spans = panels
    .map((panel) => {
      const startT = projectT(panel.start, params.segStart, params.dir)
      const endT = projectT(panel.end, params.segStart, params.dir)
      return {
        startT: Math.min(startT, endT),
        endT: Math.max(startT, endT),
      }
    })
    .sort((a, b) => a.startT - b.startT)

  const mids: number[] = []

  for (let i = 0; i < spans.length - 1; i++) {
    const left = spans[i]
    const right = spans[i + 1]

    const gapStartT = left.endT
    const gapEndT = right.startT
    const gapLen = gapEndT - gapStartT

    if (!Number.isFinite(gapLen) || gapLen <= 1e-6) continue

    mids.push((gapStartT + gapEndT) / 2)
  }

  return mids
}

function signedAngleDegXZ(a: Vec2, b: Vec2) {
  const na = norm2(a.x, a.z)
  const nb = norm2(b.x, b.z)
  const d = clamp(dot2(na.x, na.z, nb.x, nb.z), -1, 1)
  const c = na.x * nb.z - na.z * nb.x
  return (Math.atan2(c, d) * 180) / Math.PI
}

function fold0_180(deg: number) {
  let a = deg % 360
  if (a < 0) a += 360
  if (a > 180) a = 360 - a
  return a
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function getBisectorPlaneNormal(leftDir: Vec2, rightDir: Vec2) {
  const sx = leftDir.x + rightDir.x
  const sz = leftDir.z + rightDir.z

  if (Math.hypot(sx, sz) <= 1e-6) {
    return norm2(leftDir.x, leftDir.z)
  }

  return norm2(sx, sz)
}

function getToprailPieceMitres(params: {
  pieceDir: Vec2
  leftPlaneNormal: Vec2
  rightPlaneNormal: Vec2
}) {
  const railLR = norm2(params.pieceDir.x, params.pieceDir.z)
  const railRL = { x: -railLR.x, z: -railLR.z }

  const thetaL = signedAngleDegXZ(params.leftPlaneNormal, railLR)
  const thetaR = signedAngleDegXZ(params.rightPlaneNormal, railRL)

  return {
    hml: round1(fold0_180(90 - thetaL)),
    hmr: round1(fold0_180(90 - thetaR)),
    vml: 90,
    vmr: 90,
  }
}

function normalizeMitreAngleDeg(angle: number) {
  let a = Math.abs(angle) % 360
  if (a > 180) a = 360 - a
  return a
}

function getMitreLengthAllowance(profileSize: number, mitreDeg: number) {
  const angle = normalizeMitreAngleDeg(mitreDeg)

  if (!Number.isFinite(profileSize) || profileSize <= 0) return 0
  if (!Number.isFinite(angle)) return 0
  if (angle <= 1e-6 || angle >= 179.999) return 0
  if (Math.abs(angle - 90) <= 1e-6) return 0

  const tan = Math.tan((angle * Math.PI) / 180)
  if (Math.abs(tan) <= 1e-6) return 0

  return Math.abs((profileSize / 2) / tan)
}

function getToprailPieceLengths(params: {
  start: Vec2
  end: Vec2
  profile: ToprailProfile
  hml: number
  hmr: number
  vml: number
  vmr: number
}) {
  const planeCenterLength = hypot2(
    params.end.x - params.start.x,
    params.end.z - params.start.z
  )

  const leftAllowance =
    getMitreLengthAllowance(params.profile.width, params.hml) +
    getMitreLengthAllowance(params.profile.height, params.vml)

  const rightAllowance =
    getMitreLengthAllowance(params.profile.width, params.hmr) +
    getMitreLengthAllowance(params.profile.height, params.vmr)

  return {
    planeCenterLength,
    length: planeCenterLength + leftAllowance + rightAllowance,
  }
}

function getFramelessGapCenteredJoinT(params: {
  gapMidTs: number[]
  currentStartT: number
  targetT: number
  segLength: number
  isOpenStart: boolean
  isOpenEnd: boolean
}) {
  const eligible = params.gapMidTs.filter((mid) => {
    if (!Number.isFinite(mid)) return false
    if (mid <= params.currentStartT + 1e-6) return false
    if (params.isOpenStart && mid < 0) return false
    if (params.isOpenEnd && mid > params.segLength) return false
    return mid <= params.targetT + 1e-6
  })

  if (eligible.length) return eligible[eligible.length - 1]

  let fallback = params.targetT
  if (params.isOpenEnd) fallback = Math.min(fallback, params.segLength)
  if (params.isOpenStart) fallback = Math.max(fallback, 0)
  return fallback
}

// Builds toprail pieces for rendering (and later for cut lists):
// - uses segment directions from balcony path
// - uses post centers only for stock joins (rotation ignored for now)
// - adds "Option A" mitre allowance to material length
// - non-frameless stock joints inserted at previous post + joinOffset
// - frameless stock joints inserted at the centre of a gap, not on a post edge
export function buildToprailPieces(args: BuildArgs): ToprailPiece[] {
  const { balcony, posts, profile, rules } = args
  const segments = deriveSegments(balcony)
  if (!segments.length) return []

  const halfW = profile.width / 2
  const isFrameless = designIsFrameless(args.design ?? null)

  const pieces: ToprailPiece[] = []

  const path = balcony.balustradePath
  const requestedStartExt = args.endExtensions?.start
  const requestedEndExt = args.endExtensions?.end

  const runIndex = getRunIndexFromBalconyId(balcony.id)

  const startDefaultExt = getDefaultEndExtensionFromRunBoundaryOffset(balcony, runIndex, "start", rules.endExtMin)
  const endDefaultExt = getDefaultEndExtensionFromRunBoundaryOffset(balcony, runIndex, "end", rules.endExtMin)

  const startExt = clamp(typeof requestedStartExt === "number" ? requestedStartExt : startDefaultExt, rules.endExtMin, rules.endExtMax)
  const endExt = clamp(typeof requestedEndExt === "number" ? requestedEndExt : endDefaultExt, rules.endExtMin, rules.endExtMax)

  const startTerminationType = getToprailTerminationTypeForRunEnd(balcony, runIndex, "start")
  const endTerminationType = getToprailTerminationTypeForRunEnd(balcony, runIndex, "end")

  const startTerminationInset = getToprailTerminationInsetMm(startTerminationType)
  const endTerminationInset = getToprailTerminationInsetMm(endTerminationType)

  // Precompute corner mitre allowances per vertex index
  const cornerExtraByVertexIndex = new Map<number, number>()
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const v = path[i]
    const next = path[i + 1]
    const a = norm2(v.x - prev.x, v.z - prev.z) // incoming to v
    const b = norm2(next.x - v.x, next.z - v.z) // outgoing from v
    const theta = angleBetweenDeg(a.x, a.z, b.x, b.z)
    const extra = mitreExtraAlong(halfW, theta)
    cornerExtraByVertexIndex.set(i, extra)
  }

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]
    const dir = seg.direction

    let tStart = 0
    let tEnd = seg.length

    if (si === 0) tStart -= startExt
    if (si === segments.length - 1) tEnd += endExt

    const startIndex = si
    const endIndex = si + 1

    if (startIndex > 0 && startIndex < path.length - 1) {
      const extra = cornerExtraByVertexIndex.get(startIndex) ?? 0
      if (extra > 0) tStart -= extra
    }

    if (endIndex > 0 && endIndex < path.length - 1) {
      const extra = cornerExtraByVertexIndex.get(endIndex) ?? 0
      if (extra > 0) tEnd += extra
    }

    let pieceStartT = tStart
    let pieceEndT = tEnd

    if (si === 0) {
      pieceStartT += startTerminationInset
    }

    if (si === segments.length - 1) {
      pieceEndT -= endTerminationInset
    }

    if (pieceEndT <= pieceStartT) continue

    const runStart = pointAtT(seg.start, dir, pieceStartT)
    const runEnd = pointAtT(seg.start, dir, pieceEndT)

    const totalLen = hypot2(runEnd.x - runStart.x, runEnd.z - runStart.z)
    if (totalLen <= rules.stockLen + 1e-6) {
      const leftPlaneNormal =
        startIndex > 0 && startIndex < path.length - 1
          ? getBisectorPlaneNormal(segments[si - 1].direction, seg.direction)
          : norm2(seg.direction.x, seg.direction.z)

      const rightPlaneNormal =
        endIndex > 0 && endIndex < path.length - 1
          ? getBisectorPlaneNormal(seg.direction, segments[si + 1].direction)
          : norm2(seg.direction.x, seg.direction.z)

      const mitres = getToprailPieceMitres({
        pieceDir: seg.direction,
        leftPlaneNormal,
        rightPlaneNormal,
      })
      const lengths = getToprailPieceLengths({
        start: runStart,
        end: runEnd,
        profile,
        ...mitres,
      })

      pieces.push({
        id: `rail-${seg.id}-0`,
        start: runStart,
        end: runEnd,
        segIndex: si,
        ...lengths,
        ...mitres,
        reason: "segment",
      })
      continue
    }

    const orderedPosts = getPostsOnSegmentOrdered(seg.id, seg.start, dir, posts)

    if (!orderedPosts.length) {
      let cursorT = tStart
      let k = 0

      while (tEnd - cursorT > rules.stockLen + 1e-6) {
        const nextT = cursorT + rules.stockLen
        let pieceStartT = cursorT
        let pieceEndT = nextT

        if (k === 0 && si === 0) {
          pieceStartT += startTerminationInset
        }

        if (pieceEndT <= pieceStartT) {
          cursorT = nextT
          k++
          continue
        }

        const pieceStart = pointAtT(seg.start, dir, pieceStartT)
        const pieceEnd = pointAtT(seg.start, dir, pieceEndT)
        const leftPlaneNormal =
          k === 0
            ? startIndex > 0 && startIndex < path.length - 1
              ? getBisectorPlaneNormal(segments[si - 1].direction, seg.direction)
              : norm2(seg.direction.x, seg.direction.z)
            : norm2(seg.direction.x, seg.direction.z)

        const rightPlaneNormal = norm2(seg.direction.x, seg.direction.z)

        const mitres = getToprailPieceMitres({
          pieceDir: seg.direction,
          leftPlaneNormal,
          rightPlaneNormal,
        })
        const lengths = getToprailPieceLengths({
          start: pieceStart,
          end: pieceEnd,
          profile,
          ...mitres,
        })

        pieces.push({
          id: `rail-${seg.id}-${k}`,
          start: pieceStart,
          end: pieceEnd,
          segIndex: si,
          ...lengths,
          ...mitres,
          reason: "stock-join",
        })
        cursorT = nextT
        k++
      }

      {
        let pieceStartT = cursorT
        let pieceEndT = tEnd

        if (k === 0 && si === 0) {
          pieceStartT += startTerminationInset
        }

        if (si === segments.length - 1) {
          pieceEndT -= endTerminationInset
        }

        if (pieceEndT <= pieceStartT) continue

        const pieceStart = pointAtT(seg.start, dir, pieceStartT)
        const pieceEnd = pointAtT(seg.start, dir, pieceEndT)
        const leftPlaneNormal =
          k === 0
            ? startIndex > 0 && startIndex < path.length - 1
              ? getBisectorPlaneNormal(segments[si - 1].direction, seg.direction)
              : norm2(seg.direction.x, seg.direction.z)
            : norm2(seg.direction.x, seg.direction.z)

        const rightPlaneNormal =
          endIndex > 0 && endIndex < path.length - 1
            ? getBisectorPlaneNormal(seg.direction, segments[si + 1].direction)
            : norm2(seg.direction.x, seg.direction.z)

        const mitres = getToprailPieceMitres({
          pieceDir: seg.direction,
          leftPlaneNormal,
          rightPlaneNormal,
        })
        const lengths = getToprailPieceLengths({
          start: pieceStart,
          end: pieceEnd,
          profile,
          ...mitres,
        })

        pieces.push({
          id: `rail-${seg.id}-${k}`,
          start: pieceStart,
          end: pieceEnd,
          segIndex: si,
          ...lengths,
          ...mitres,
          reason: "segment",
        })
      }
      continue
    }

    const isOpenStart = si === 0
    const isOpenEnd = si === segments.length - 1

    const framelessGapMidTs =
      isFrameless && args.state
        ? getFramelessGapMidTsForSegment({
            state: args.state,
            design: args.design,
            segmentId: seg.id,
            segStart: seg.start,
            dir,
          })
        : []

    let currentStartT = tStart
    let k = 0

    while (true) {
      const remainingLen = tEnd - currentStartT
      if (remainingLen <= rules.stockLen + 1e-6) {
        {
          let pieceStartT = currentStartT
          let pieceEndT = tEnd

          if (k === 0 && si === 0) {
            pieceStartT += startTerminationInset
          }

          if (si === segments.length - 1) {
            pieceEndT -= endTerminationInset
          }

          if (pieceEndT <= pieceStartT) break

          const pieceStart = pointAtT(seg.start, dir, pieceStartT)
          const pieceEnd = pointAtT(seg.start, dir, pieceEndT)
          const leftPlaneNormal =
            k === 0
              ? startIndex > 0 && startIndex < path.length - 1
                ? getBisectorPlaneNormal(segments[si - 1].direction, seg.direction)
                : norm2(seg.direction.x, seg.direction.z)
              : norm2(seg.direction.x, seg.direction.z)

          const rightPlaneNormal =
            endIndex > 0 && endIndex < path.length - 1
              ? getBisectorPlaneNormal(seg.direction, segments[si + 1].direction)
              : norm2(seg.direction.x, seg.direction.z)

          const mitres = getToprailPieceMitres({
            pieceDir: seg.direction,
            leftPlaneNormal,
            rightPlaneNormal,
          })
          const lengths = getToprailPieceLengths({
            start: pieceStart,
            end: pieceEnd,
            profile,
            ...mitres,
          })

          pieces.push({
            id: `rail-${seg.id}-${k}`,
            start: pieceStart,
            end: pieceEnd,
            segIndex: si,
            ...lengths,
            ...mitres,
            reason: k === 0 ? "segment" : "stock-join",
          })
        }
        break
      }

      const targetT = currentStartT + rules.stockLen
      let joinT: number

      if (isFrameless) {
        joinT = getFramelessGapCenteredJoinT({
          gapMidTs: framelessGapMidTs,
          currentStartT,
          targetT,
          segLength: seg.length,
          isOpenStart,
          isOpenEnd,
        })
      } else {
        const eligible = orderedPosts.filter((p) => {
          if (p.t > targetT) return false
          if (isOpenEnd && p.t + rules.joinOffset > seg.length) return false
          if (isOpenStart && p.t + rules.joinOffset < 0) return false
          return true
        })

        const prev = eligible.length ? eligible[eligible.length - 1] : null

        if (!prev) {
          joinT = targetT
          if (isOpenEnd) joinT = Math.min(joinT, seg.length)
          if (isOpenStart) joinT = Math.max(joinT, 0)
        } else {
          joinT = prev.t + rules.joinOffset
        }
      }

      if (!Number.isFinite(joinT) || joinT <= currentStartT + 1e-6) {
        joinT = targetT
        if (isOpenEnd) joinT = Math.min(joinT, seg.length)
        if (isOpenStart) joinT = Math.max(joinT, 0)
      }

      {
        let pieceStartT = currentStartT
        let pieceEndT = joinT

        if (k === 0 && si === 0) {
          pieceStartT += startTerminationInset
        }

        if (pieceEndT <= pieceStartT) {
          currentStartT = joinT
          k++
          continue
        }

        const pieceStart = pointAtT(seg.start, dir, pieceStartT)
        const pieceEnd = pointAtT(seg.start, dir, pieceEndT)
        const leftPlaneNormal =
          k === 0
            ? startIndex > 0 && startIndex < path.length - 1
              ? getBisectorPlaneNormal(segments[si - 1].direction, seg.direction)
              : norm2(seg.direction.x, seg.direction.z)
            : norm2(seg.direction.x, seg.direction.z)

        const rightPlaneNormal = norm2(seg.direction.x, seg.direction.z)

        const mitres = getToprailPieceMitres({
          pieceDir: seg.direction,
          leftPlaneNormal,
          rightPlaneNormal,
        })
        const lengths = getToprailPieceLengths({
          start: pieceStart,
          end: pieceEnd,
          profile,
          ...mitres,
        })

        pieces.push({
          id: `rail-${seg.id}-${k}`,
          start: pieceStart,
          end: pieceEnd,
          segIndex: si,
          ...lengths,
          ...mitres,
          reason: k === 0 ? "segment" : "stock-join",
        })
      }

      currentStartT = joinT
      k++
    }
  }

  return pieces
}