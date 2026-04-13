// /lib/frameless/deriveFramelessPanels.ts
import type { RootState } from "@/lib/types"
import { designIsFrameless } from "@/lib/jobDesignRules"
import { deriveBays } from "@/lib/balustrade/deriveBays"
import {
  angleDegToXZVector,
  displacementForAngle,
  rotateAroundNormal,
  scaleV,
  solveL,
  solveDominantCornerExtension,
  round,
  distanceXZ,
} from "./math"
import type { FramelessPanelBase, FramelessSystemType } from "./types"
import type { FramelessCornerType } from "@/lib/types"
import { getSegmentJoinAvailability } from "@/lib/frameless/segmentJoinAvailability"

type PanelCandidate = {
  id: string
  runIndex: number
  segmentId: string
  segmentIndex: number
  start: { x: number; z: number }
  end: { x: number; z: number }
}

type PanelDraft = {
  id: string
  runIndex: number
  segmentId: string
  segmentIndex: number
  start: { x: number; z: number }
  end: { x: number; z: number }
  leftPlanePoint: { x: number; y: number; z: number }
  leftPlaneDir: { x: number; y: number; z: number }
  rightPlanePoint: { x: number; y: number; z: number }
  rightPlaneDir: { x: number; y: number; z: number }
}

function movePointAlongSegment(
  point: { x: number; z: number },
  from: { x: number; z: number },
  to: { x: number; z: number },
  distance: number
) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const len = Math.hypot(dx, dz) || 1

  return {
    x: point.x + (dx / len) * distance,
    z: point.z + (dz / len) * distance,
  }
}

function getPanelDir2(
  start: { x: number; z: number },
  end: { x: number; z: number }
) {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const len = Math.hypot(dx, dz) || 1

  return {
    x: dx / len,
    z: dz / len,
  }
}

function getPanelPlaneData(
  start: { x: number; z: number },
  end: { x: number; z: number }
) {
  const dir = getPanelDir2(start, end)

  return {
    leftPlanePoint: {
      x: start.x,
      y: 0,
      z: start.z,
    },
    leftPlaneDir: {
      x: dir.x,
      y: 0,
      z: dir.z,
    },
    rightPlanePoint: {
      x: end.x,
      y: 0,
      z: end.z,
    },
    rightPlaneDir: {
      x: -dir.x,
      y: 0,
      z: -dir.z,
    },
  }
}

function getPanelNormal2(
  start: { x: number; z: number },
  end: { x: number; z: number }
) {
  const dir = getPanelDir2(start, end)
  return {
    x: -dir.z,
    z: dir.x,
  }
}

function getTerminalCorners(
  terminalPoint: { x: number; z: number },
  panelStart: { x: number; z: number },
  panelEnd: { x: number; z: number },
  glassThickness: number
) {
  const normal = getPanelNormal2(panelStart, panelEnd)
  const half = Math.max(0, glassThickness) / 2

  return [
    {
      x: terminalPoint.x + normal.x * half,
      z: terminalPoint.z + normal.z * half,
    },
    {
      x: terminalPoint.x - normal.x * half,
      z: terminalPoint.z - normal.z * half,
    },
  ]
}

function pointToThinEdgePerpendicularDistance(
  point: { x: number; z: number },
  terminalPoint: { x: number; z: number },
  panelStart: { x: number; z: number },
  panelEnd: { x: number; z: number }
) {
  const dir = getPanelDir2(panelStart, panelEnd)
  return Math.abs(
    (point.x - terminalPoint.x) * dir.x +
    (point.z - terminalPoint.z) * dir.z
  )
}

function getClosestCornerDistanceBetweenPanels(
  prevPanel: PanelDraft,
  currentPanel: PanelDraft,
  glassThickness: number
) {
  const prevCorners = getTerminalCorners(
    prevPanel.end,
    prevPanel.start,
    prevPanel.end,
    glassThickness
  )

  const currentCorners = getTerminalCorners(
    currentPanel.start,
    currentPanel.start,
    currentPanel.end,
    glassThickness
  )

  let min = Number.POSITIVE_INFINITY

  for (const a of prevCorners) {
    for (const b of currentCorners) {
      min = Math.min(min, distanceXZ(a, b))
    }
  }

  return min
}

function getClosestDominantCornerToNonDominantThinEdge(params: {
  dominantTerminalPoint: { x: number; z: number }
  dominantPanelStart: { x: number; z: number }
  dominantPanelEnd: { x: number; z: number }
  nonDominantTerminalPoint: { x: number; z: number }
  nonDominantPanelStart: { x: number; z: number }
  nonDominantPanelEnd: { x: number; z: number }
  glassThickness: number
}) {
  const corners = getTerminalCorners(
    params.dominantTerminalPoint,
    params.dominantPanelStart,
    params.dominantPanelEnd,
    params.glassThickness
  )

  let bestCorner = corners[0]
  let bestDistance = pointToThinEdgePerpendicularDistance(
    corners[0],
    params.nonDominantTerminalPoint,
    params.nonDominantPanelStart,
    params.nonDominantPanelEnd
  )

  for (let i = 1; i < corners.length; i++) {
    const dist = pointToThinEdgePerpendicularDistance(
      corners[i],
      params.nonDominantTerminalPoint,
      params.nonDominantPanelStart,
      params.nonDominantPanelEnd
    )

    if (dist < bestDistance) {
      bestDistance = dist
      bestCorner = corners[i]
    }
  }

  return {
    corner: bestCorner,
    distance: bestDistance,
  }
}

function setPrevPanelEnd(
  panel: PanelDraft,
  point: { x: number; z: number }
) {
  panel.end = point
  panel.rightPlanePoint = {
    x: point.x,
    y: 0,
    z: point.z,
  }
}

function setCurrentPanelStart(
  panel: PanelDraft,
  point: { x: number; z: number }
) {
  panel.start = point
  panel.leftPlanePoint = {
    x: point.x,
    y: 0,
    z: point.z,
  }
}

function movePrevPanelEndOutward(
  panel: PanelDraft,
  distance: number
) {
  const dir = getPanelDir2(panel.start, panel.end)

  return {
    x: panel.end.x + dir.x * distance,
    z: panel.end.z + dir.z * distance,
  }
}

function moveCurrentPanelStartOutward(
  panel: PanelDraft,
  distance: number
) {
  const dir = getPanelDir2(panel.start, panel.end)

  return {
    x: panel.start.x - dir.x * distance,
    z: panel.start.z - dir.z * distance,
  }
}

function getPrevPanelEndAtDistanceFromJoint(
  jointPoint: { x: number; z: number },
  panel: PanelDraft,
  distance: number
) {
  const dir = getPanelDir2(panel.start, panel.end)

  return {
    x: jointPoint.x + dir.x * distance,
    z: jointPoint.z + dir.z * distance,
  }
}

function getCurrentPanelStartAtDistanceFromJoint(
  jointPoint: { x: number; z: number },
  panel: PanelDraft,
  distance: number
) {
  const dir = getPanelDir2(panel.start, panel.end)

  return {
    x: jointPoint.x - dir.x * distance,
    z: jointPoint.z - dir.z * distance,
  }
}

function solveByBinarySearch(params: {
  evaluate: (distance: number) => number
  target: number
  min: number
  max: number
}) {
  let lo = params.min
  let hi = params.max

  let loValue = params.evaluate(lo)
  let hiValue = params.evaluate(hi)

  if (
    (params.target <= Math.min(loValue, hiValue)) ||
    (params.target >= Math.max(loValue, hiValue))
  ) {
    return Math.abs(loValue - params.target) <= Math.abs(hiValue - params.target)
      ? lo
      : hi
  }

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const value = params.evaluate(mid)

    if (Math.abs(value - params.target) <= 1e-6) return mid

    const lowSide = Math.min(loValue, value)
    const highSide = Math.max(loValue, value)

    if (params.target >= lowSide && params.target <= highSide) {
      hi = mid
      hiValue = value
    } else {
      lo = mid
      loValue = value
    }
  }

  const loDiff = Math.abs(loValue - params.target)
  const hiDiff = Math.abs(hiValue - params.target)

  return loDiff <= hiDiff ? lo : hi
}

function applyJointCornerMode(params: {
  prevPanel: PanelDraft
  currentPanel: PanelDraft
  jointPoint: { x: number; z: number }
  mode: FramelessCornerType
  gap: number
  dominantExtension: number
  glassThickness: number
}) {
  const gap = Math.max(0, params.gap)
  const dominantExtension = Math.max(0, params.dominantExtension)
  const glassThickness = Math.max(0, params.glassThickness)

  if (params.mode === "symmetric") {
    const maxSearch = Math.max(1000, gap + dominantExtension + glassThickness * 2)

    const shortening = solveByBinarySearch({
      min: 0,
      max: maxSearch,
      target: gap,
      evaluate: (distance) => {
        const prevEnd = getPrevPanelEndAtDistanceFromJoint(
          params.jointPoint,
          params.prevPanel,
          -distance
        )

        const currentStart = getCurrentPanelStartAtDistanceFromJoint(
          params.jointPoint,
          params.currentPanel,
          -distance
        )

        return getClosestCornerDistanceBetweenPanels(
          {
            ...params.prevPanel,
            end: prevEnd,
            rightPlanePoint: { x: prevEnd.x, y: 0, z: prevEnd.z },
          },
          {
            ...params.currentPanel,
            start: currentStart,
            leftPlanePoint: { x: currentStart.x, y: 0, z: currentStart.z },
          },
          glassThickness
        )
      },
    })

    setPrevPanelEnd(
      params.prevPanel,
      getPrevPanelEndAtDistanceFromJoint(
        params.jointPoint,
        params.prevPanel,
        -shortening
      )
    )

    setCurrentPanelStart(
      params.currentPanel,
      getCurrentPanelStartAtDistanceFromJoint(
        params.jointPoint,
        params.currentPanel,
        -shortening
      )
    )

    return
  }

  if (params.mode === "this_segment_dominant") {
    const dominantStart = getCurrentPanelStartAtDistanceFromJoint(
      params.jointPoint,
      params.currentPanel,
      dominantExtension
    )

    setCurrentPanelStart(params.currentPanel, dominantStart)

    const dominantCornerInfo = getClosestDominantCornerToNonDominantThinEdge({
      dominantTerminalPoint: dominantStart,
      dominantPanelStart: dominantStart,
      dominantPanelEnd: params.currentPanel.end,
      nonDominantTerminalPoint: params.jointPoint,
      nonDominantPanelStart: params.prevPanel.start,
      nonDominantPanelEnd: params.jointPoint,
      glassThickness,
    })

    const maxSearch = Math.max(1000, gap + dominantExtension + glassThickness * 2)

    const shorten = solveByBinarySearch({
      min: 0,
      max: maxSearch,
      target: gap,
      evaluate: (distance) => {
        const prevEnd = getPrevPanelEndAtDistanceFromJoint(
          params.jointPoint,
          params.prevPanel,
          -distance
        )

        return pointToThinEdgePerpendicularDistance(
          dominantCornerInfo.corner,
          prevEnd,
          params.prevPanel.start,
          prevEnd
        )
      },
    })

    setPrevPanelEnd(
      params.prevPanel,
      getPrevPanelEndAtDistanceFromJoint(
        params.jointPoint,
        params.prevPanel,
        -shorten
      )
    )

    return
  }

  const dominantEnd = getPrevPanelEndAtDistanceFromJoint(
    params.jointPoint,
    params.prevPanel,
    dominantExtension
  )

  setPrevPanelEnd(params.prevPanel, dominantEnd)

  const dominantCornerInfo = getClosestDominantCornerToNonDominantThinEdge({
    dominantTerminalPoint: dominantEnd,
    dominantPanelStart: params.prevPanel.start,
    dominantPanelEnd: dominantEnd,
    nonDominantTerminalPoint: params.jointPoint,
    nonDominantPanelStart: params.jointPoint,
    nonDominantPanelEnd: params.currentPanel.end,
    glassThickness,
  })

  const maxSearch = Math.max(1000, gap + dominantExtension + glassThickness * 2)

  const shorten = solveByBinarySearch({
    min: 0,
    max: maxSearch,
    target: gap,
    evaluate: (distance) => {
      const currentStart = getCurrentPanelStartAtDistanceFromJoint(
        params.jointPoint,
        params.currentPanel,
        -distance
      )

      return pointToThinEdgePerpendicularDistance(
        dominantCornerInfo.corner,
        currentStart,
        currentStart,
        params.currentPanel.end
      )
    },
  })

  setCurrentPanelStart(
    params.currentPanel,
    getCurrentPanelStartAtDistanceFromJoint(
      params.jointPoint,
      params.currentPanel,
      -shorten
    )
  )
}

function getRequiredInterPanelGap() {
  return 10
}

function redistributeSegmentPanels(params: {
  drafts: PanelDraft[]
  candidates: PanelCandidate[]
  panelGap: number
}) {
  const { drafts, candidates } = params
  if (drafts.length <= 1) return
  if (drafts.length !== candidates.length) return

  const first = drafts[0]
  const last = drafts[drafts.length - 1]

  const totalDx = last.end.x - first.start.x
  const totalDz = last.end.z - first.start.z
  const totalLen = Math.hypot(totalDx, totalDz)
  if (totalLen < 1e-6) return

  const dirX = totalDx / totalLen
  const dirZ = totalDz / totalLen

  const safePanelGap = Math.max(0, params.panelGap)
  const totalGap = safePanelGap * (drafts.length - 1)
  const usableLen = totalLen - totalGap
  if (usableLen <= 1e-6) return

  const candidateLengths = candidates.map((panel) =>
    Math.hypot(panel.end.x - panel.start.x, panel.end.z - panel.start.z)
  )

  const candidateTotalLen = candidateLengths.reduce((sum, len) => sum + len, 0)

  const solvedPanelLengths =
    candidateTotalLen > 1e-6
      ? candidateLengths.map((len) => (len / candidateTotalLen) * usableLen)
      : drafts.map(() => usableLen / drafts.length)

  let cursor = 0

  for (let i = 0; i < drafts.length; i++) {
    const panelLen = solvedPanelLengths[i]

    const nextStart = {
      x: first.start.x + dirX * cursor,
      z: first.start.z + dirZ * cursor,
    }

    const nextEnd = {
      x: first.start.x + dirX * (cursor + panelLen),
      z: first.start.z + dirZ * (cursor + panelLen),
    }

    drafts[i].start = nextStart
    drafts[i].end = nextEnd

    drafts[i].leftPlanePoint = {
      x: nextStart.x,
      y: 0,
      z: nextStart.z,
    }

    drafts[i].rightPlanePoint = {
      x: nextEnd.x,
      y: 0,
      z: nextEnd.z,
    }

    cursor += panelLen + safePanelGap
  }
}

function parseSegmentIndex(segmentId: string) {
  const runMatch = segmentId.match(/-run-(\d+)-seg-(\d+)$/)
  if (runMatch) {
    return {
      runIndex: Number(runMatch[1]),
      segmentIndex: Number(runMatch[2]),
    }
  }

  const baseMatch = segmentId.match(/-seg-(\d+)$/)
  return {
    runIndex: 0,
    segmentIndex: baseMatch ? Number(baseMatch[1]) : 0,
  }
}

function sortPanelsAlongSegment<T extends {
  start: { x: number; z: number }
  end: { x: number; z: number }
}>(panels: T[]) {
  if (panels.length <= 1) return [...panels]

  const first = panels[0]
  const dx = first.end.x - first.start.x
  const dz = first.end.z - first.start.z
  const len = Math.hypot(dx, dz) || 1
  const dirX = dx / len
  const dirZ = dz / len

  return [...panels].sort((a, b) => {
    const at = a.start.x * dirX + a.start.z * dirZ
    const bt = b.start.x * dirX + b.start.z * dirZ

    if (Math.abs(at - bt) > 1e-6) return at - bt
    return 0
  })
}

function pointEquals2(a: { x: number; z: number }, b: { x: number; z: number }, eps = 1e-6) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= eps
}

function normalizeSignedDeg180(angle: number) {
  let ang = angle
  while (ang <= -180) ang += 360
  while (ang > 180) ang -= 360
  return ang
}

function getJointAngleDeg(
  prevPoint: { x: number; z: number },
  jointPoint: { x: number; z: number },
  nextPoint: { x: number; z: number }
) {
  const a1 = Math.atan2(prevPoint.z - jointPoint.z, prevPoint.x - jointPoint.x)
  const a2 = Math.atan2(nextPoint.z - jointPoint.z, nextPoint.x - jointPoint.x)
  return normalizeSignedDeg180(((a2 - a1) * 180) / Math.PI)
}

function buildPanelCandidates(state: RootState): PanelCandidate[] {
  const bays = deriveBays({
    balcony: state.balcony,
    posts: state.posts,
    design: state.design,
    toprailType: state.toprail
  })

  const out: PanelCandidate[] = []

  for (const bay of bays) {
    if (bay.suppressed) continue

    const parsed = parseSegmentIndex(bay.segmentId)

    const start = { x: bay.from.x, z: bay.from.z }
    const end = { x: bay.to.x, z: bay.to.z }
    const length = Math.hypot(end.x - start.x, end.z - start.z)
    if (!Number.isFinite(length) || length < 1e-6) continue

    out.push({
      id: `${bay.id}`,
      runIndex: bay.runIndex ?? parsed.runIndex,
      segmentId: bay.segmentId,
      segmentIndex: parsed.segmentIndex,
      start,
      end,
    })
  }

  out.sort((a, b) => {
    if (a.runIndex !== b.runIndex) return a.runIndex - b.runIndex
    if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex

    const adx = a.end.x - a.start.x
    const adz = a.end.z - a.start.z
    const alen = Math.hypot(adx, adz) || 1
    const adirx = adx / alen
    const adirz = adz / alen

    const at = a.start.x * adirx + a.start.z * adirz
    const bt = b.start.x * adirx + b.start.z * adirz

    if (Math.abs(at - bt) > 1e-6) return at - bt
    return a.id.localeCompare(b.id)
  })

  return out
}

export function deriveFramelessPanelBases(
  state: RootState,
  system?: FramelessSystemType
): FramelessPanelBase[] {
  const activeSystem =
    system ??
    (designIsFrameless(state.design) ? state.design : undefined)

  if (!activeSystem) return []

  const panelCandidates = buildPanelCandidates(state)
  const segments = state.balcony.segmentConstraintsById ?? {}
  if (!panelCandidates.length) return []

  const panelDrafts: PanelDraft[] = []

  const glassThickness =
    activeSystem === "RD-D10" || activeSystem === "RD-D11" ? 12 : 13.52

  const edgeOffset =
    activeSystem === "RD-D11" || activeSystem === "RD-D13" ? 5 : 15

  const panelsByRun = new Map<number, PanelCandidate[]>()
  for (const candidate of panelCandidates) {
    const list = panelsByRun.get(candidate.runIndex) ?? []
    list.push(candidate)
    panelsByRun.set(candidate.runIndex, list)
  }

  for (const [runIndex, runPanels] of panelsByRun.entries()) {
    for (let panelIndex = 0; panelIndex < runPanels.length; panelIndex++) {
      const panel = runPanels[panelIndex]
      const prevPanel = panelIndex > 0 ? runPanels[panelIndex - 1] : null
      const nextPanel = panelIndex < runPanels.length - 1 ? runPanels[panelIndex + 1] : null

      const leftPoint = panel.start
      const rightPoint = panel.end

      const dx = rightPoint.x - leftPoint.x
      const dz = rightPoint.z - leftPoint.z
      const length = Math.hypot(dx, dz)
      if (length < 1e-6) continue

      const currentAngleDeg = (Math.atan2(-dz, -dx) * 180) / Math.PI
      const dir = angleDegToXZVector(currentAngleDeg)

      const leftAngle =
        prevPanel && pointEquals2(prevPanel.end, leftPoint)
          ? getJointAngleDeg(prevPanel.start, leftPoint, rightPoint)
          : 180

      const rightAngle =
        nextPanel && pointEquals2(nextPanel.start, rightPoint)
          ? getJointAngleDeg(leftPoint, rightPoint, nextPanel.end)
          : 180

      const leftSymmetry =
        prevPanel
          ? !(
              ((Math.abs(leftAngle) % 90 < 35) && (Math.abs(leftAngle) % 90 > 0)) ||
              ((Math.abs(leftAngle) % 180 > 0) && (Math.abs(leftAngle) % 180 < 125))
            )
          : true

      const rightSymmetry =
        nextPanel
          ? !(
              ((Math.abs(rightAngle) % 90 < 35) && (Math.abs(rightAngle) % 90 > 0)) ||
              ((Math.abs(rightAngle) % 180 > 0) && (Math.abs(rightAngle) % 180 < 125))
            )
          : true

      const dir2 =
        nextPanel
          ? (() => {
              const ndx = nextPanel.end.x - nextPanel.start.x
              const ndz = nextPanel.end.z - nextPanel.start.z
              const nextAngleDeg = (Math.atan2(-ndz, -ndx) * 180) / Math.PI
              return angleDegToXZVector(nextAngleDeg)
            })()
          : dir

      const d1 = prevPanel ? displacementForAngle((leftAngle * Math.PI) / 180) : 0
      const d2 = nextPanel ? displacementForAngle((rightAngle * Math.PI) / 180) : 0

      const leftDir = leftSymmetry
        ? rotateAroundNormal(dir, (180 - leftAngle) / 2, { x: 0, y: 1, z: 0 })
        : { x: d1 ? dir.x : dir.x, y: 0, z: d1 ? dir.z : dir.z }

      const rightDir = rightSymmetry
        ? rotateAroundNormal(scaleV(dir, -1), -(180 - rightAngle) / 2, { x: 0, y: 1, z: 0 })
        : scaleV(dir2, -1)

      const edgeOffsetLeft =
        edgeOffset < 22
          ? leftAngle !== 180
            ? solveL(glassThickness, leftAngle)
            : edgeOffset
          : edgeOffset

      const edgeOffsetRight =
        edgeOffset < 22
          ? rightAngle !== 180
            ? solveL(glassThickness, rightAngle)
            : edgeOffset
          : edgeOffset

      const startPoint = movePointAlongSegment(
        leftPoint,
        leftPoint,
        rightPoint,
        edgeOffsetLeft
      )

      const endPoint = movePointAlongSegment(
        rightPoint,
        rightPoint,
        leftPoint,
        edgeOffsetRight
      )

      const planeData = getPanelPlaneData(startPoint, endPoint)

      panelDrafts.push({
        id: `frameless-panel-r${runIndex}-p${panelIndex}`,
        runIndex,
        segmentId: panel.segmentId,
        segmentIndex: panel.segmentIndex,
        start: startPoint,
        end: endPoint,
        ...planeData,
      })
    }
  }

  const draftsByRun = new Map<number, PanelDraft[]>()
  for (const draft of panelDrafts) {
    const list = draftsByRun.get(draft.runIndex) ?? []
    list.push(draft)
    draftsByRun.set(draft.runIndex, list)
  }

  const candidateGroupsBySegment = new Map<string, PanelCandidate[]>()
  for (const candidate of panelCandidates) {
    const key = `${candidate.runIndex}::${candidate.segmentId}`
    const list = candidateGroupsBySegment.get(key) ?? []
    list.push(candidate)
    candidateGroupsBySegment.set(key, list)
  }

  const draftGroupsBySegment = new Map<string, PanelDraft[]>()
  for (const draft of panelDrafts) {
    const key = `${draft.runIndex}::${draft.segmentId}`
    const list = draftGroupsBySegment.get(key) ?? []
    list.push(draft)
    draftGroupsBySegment.set(key, list)
  }

for (const [segmentKey, currentSegmentDraftsRaw] of draftGroupsBySegment.entries()) {
  const currentSegmentDrafts = sortPanelsAlongSegment(currentSegmentDraftsRaw)
  if (!currentSegmentDrafts.length) continue

  const currentDraft = currentSegmentDrafts[0]
  const currentJoin = getSegmentJoinAvailability(state.balcony, currentDraft.segmentId)

  if (!currentJoin.hasStartJoin) continue
  if (currentJoin.runIndex == null || currentJoin.segInRun == null) continue

  const prevSegmentIndex = currentJoin.segInRun - 1
  if (prevSegmentIndex < 0) continue

  const prevSegmentId =
    currentJoin.runIndex === 0
      ? `${state.balcony.id}-seg-${prevSegmentIndex}`
      : `${state.balcony.id}-run-${currentJoin.runIndex}-seg-${prevSegmentIndex}`

  const prevSegmentDrafts =
    sortPanelsAlongSegment(draftGroupsBySegment.get(`${currentJoin.runIndex}::${prevSegmentId}`) ?? [])

  if (!prevSegmentDrafts.length) continue

  const prevDraft = prevSegmentDrafts[prevSegmentDrafts.length - 1]

  if (!pointEquals2(prevDraft.end, currentDraft.start, 200)) continue

  const currentSegConstraints = segments[currentDraft.segmentId]
  const jointMode: FramelessCornerType =
    currentSegConstraints?.cornerStartType ?? "symmetric"
  const jointGap =
    currentSegConstraints?.cornerStartGap ?? 10

  const currentSegmentCandidates =
    sortPanelsAlongSegment(candidateGroupsBySegment.get(segmentKey) ?? [])

  const prevSegmentCandidates =
    sortPanelsAlongSegment(candidateGroupsBySegment.get(`${currentJoin.runIndex}::${prevSegmentId}`) ?? [])

  if (!currentSegmentCandidates.length || !prevSegmentCandidates.length) continue

  const currentCandidate = currentSegmentCandidates[0]
  const prevCandidate = prevSegmentCandidates[prevSegmentCandidates.length - 1]

  const jointAngleDeg = getJointAngleDeg(
    prevCandidate.start,
    currentCandidate.start,
    currentCandidate.end
  )

  const dominantExtension = solveDominantCornerExtension(
    glassThickness,
    jointAngleDeg
  )

  applyJointCornerMode({
    prevPanel: prevDraft,
    currentPanel: currentDraft,
    jointPoint: currentCandidate.start,
    mode: jointMode,
    gap: jointGap,
    dominantExtension,
    glassThickness,
  })
}


  const nextPanelDrafts: PanelDraft[] = []

  for (const [segmentKey, segmentDraftsRaw] of draftGroupsBySegment.entries()) {
    const segmentCandidates = candidateGroupsBySegment.get(segmentKey) ?? []
    const segmentDrafts = sortPanelsAlongSegment(segmentDraftsRaw)

    if (!segmentDrafts.length || !segmentCandidates.length) {
      nextPanelDrafts.push(...segmentDrafts)
      continue
    }

    if (segmentDrafts.length <= 1) {
      nextPanelDrafts.push(...segmentDrafts)
      continue
    }

    if (segmentCandidates.length !== segmentDrafts.length) {
      nextPanelDrafts.push(...segmentDrafts)
      continue
    }

    const panelGap = getRequiredInterPanelGap()

    redistributeSegmentPanels({
      drafts: segmentDrafts,
      candidates: segmentCandidates,
      panelGap,
    })

    nextPanelDrafts.push(...segmentDrafts)
  }

  const panels: FramelessPanelBase[] = nextPanelDrafts
    .map((panel) => {
      const length = Math.hypot(
        panel.end.x - panel.start.x,
        panel.end.z - panel.start.z
      )

      if (!Number.isFinite(length) || length < 1e-6) return null

      const planeData = getPanelPlaneData(panel.start, panel.end)

      return {
        id: panel.id,
        runIndex: panel.runIndex,
        segmentId: panel.segmentId,
        segmentIndex: panel.segmentIndex,
        start: { x: panel.start.x, z: panel.start.z },
        end: { x: panel.end.x, z: panel.end.z },
        ...planeData,
        length,
      }
    })
    .filter((panel): panel is FramelessPanelBase => panel !== null)

  return panels
}