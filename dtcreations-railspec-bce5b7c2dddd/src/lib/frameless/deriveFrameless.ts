// /lib/frameless/deriveFrameless.ts
import type { FramelessSpigotType, FramelessToprailType, RootState } from "@/lib/types"
import {
  designIsFrameless,
  getFramelessDefaultSpigotForDesign,
  getFramelessGlassThicknessForDesign,
} from "@/lib/jobDesignRules"
import { deriveFramelessPanelBases } from "./deriveFramelessPanels"
import { sampleSupportYAtXZ } from "./supportSampling"
import type {
  DerivedFramelessPanel,
  DerivedFramelessResult,
  FramelessDeriveOptions,
  FramelessSpigot,
  FramelessSystemType,
} from "./types"

function clampMin(n: number, min: number) {
  return Math.max(min, n)
}

function isFramelessSpigotType(value: string | null | undefined): value is FramelessSpigotType {
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

function isFramelessToprailType(value: string | null | undefined): value is FramelessToprailType {
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

function getSpigotGlassBottomOffset(spigotType: string | null | undefined) {
  // TODO: replace these placeholders with your actual product-specific offsets.
  // This function is intentionally centralised because this behaviour is
  // frameless-system-specific, not a generic panel offset.
  switch (spigotType) {
    case "Spigot_RDTF":
      return 65
    case "Spigot_SQTF":
      return 90
    case "Spigot_RDCD":
      return 90
    case "Spigot_SQCD":
      return 90
    case "Spigot_HDTF":
      return 59
    case "Spigot_HDCD":
      return 65
    case "Spigot_SF":
      return (-100-250)
    default:
      return 0
  }
}

function getFramelessToprailTopOffset(toprailType: FramelessToprailType | null | undefined) {
  switch (toprailType) {
    case "25mm Round":
      return -9

    case "25mm Square":
      return -6

    case "38mm Round":
      return -23

    case "38mm Handrail":
      return 0

    case "None":
    default:
      return 0
  }
}



function getBalustradeRuns(balcony: RootState["balcony"]) {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  return (runs ?? []).filter((run) => Array.isArray(run) && run.length >= 2)
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

function getRunPrefix(balconyId: string, runIndex: number) {
  return runIndex === 0 ? balconyId : `${balconyId}-run-${runIndex}`
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

function getComparableLowWallSegmentIdsForSpigot(
  state: RootState,
  params: {
    segmentId: string
    x: number
    z: number
    spigotType: string | null | undefined
  }
) {
  const comparable = new Set<string>()
  const segId = params.segmentId

  if (segmentIsComparableLowWall(state, segId)) {
    const ownGroup = getGroupedLowWallSegmentIds(state, segId)
    for (const groupedSegId of ownGroup) comparable.add(groupedSegId)
  }

  if (params.spigotType !== "Spigot_SF") {
    return comparable
  }

  const parsed = parseSegmentId(segId, state.balcony.id)
  const runs = getBalustradeRuns(state.balcony)
  const run = parsed ? runs[parsed.runIndex] : null

  let atSegmentStart = false
  let atSegmentEnd = false

  if (parsed && run) {
    const start = run[parsed.segInRun]
    const end = run[parsed.segInRun + 1]

    if (start && pointEquals2({ x: params.x, z: params.z }, start)) atSegmentStart = true
    if (end && pointEquals2({ x: params.x, z: params.z }, end)) atSegmentEnd = true
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

type FramelessSpigotSupportDraft = {
  panelId: string
  runIndex: number
  segmentId: string
  side: "left" | "right"
  type: string | null | undefined
  x: number
  z: number
  supportY: number
}

function getMaxComparableSpigotLaserHeight(
  state: RootState,
  drafts: FramelessSpigotSupportDraft[],
  params: {
    segmentId: string
    x: number
    z: number
    spigotType: string | null | undefined
  }
) {
  const comparableSegIds = getComparableLowWallSegmentIdsForSpigot(state, params)
  if (!comparableSegIds.size) return null

  const laserLevelY = Number.isFinite(state.balcony.laserLevelY) ? state.balcony.laserLevelY : 0

  const heights = drafts
    .filter((draft) => {
      if (draft.type !== "Spigot_SF") return false
      return comparableSegIds.has(draft.segmentId)
    })
    .map((draft) => laserLevelY - draft.supportY)
    .filter((height) => Number.isFinite(height))

  if (!heights.length) return null
  return Math.max(...heights)
}

function getDefaultAnchorageLaserHeightsForSpigotType(
  state: RootState,
  drafts: FramelessSpigotSupportDraft[],
  params: {
    segmentId: string
    x: number
    z: number
    spigotType: string | null | undefined
  }
) {
  if (params.spigotType !== "Spigot_SF") {
    return []
  }

  const governing = getMaxComparableSpigotLaserHeight(state, drafts, params)

  if (!Number.isFinite(governing)) {
    return [0, 0]
  }

  const governingHeight = Number(governing)
  return [governingHeight + 100, governingHeight + 250]
}

export function deriveFrameless(
  state: RootState,
  options?: FramelessDeriveOptions
): DerivedFramelessResult {
  const system: FramelessSystemType | null =
    options?.system ??
    (designIsFrameless(state.design) ? state.design : null)

  if (!system) {
    return {
      enabled: false,
      system: null,
      panels: [],
    }
  }

  const spigotType =
    options?.spigotType ??
    (isFramelessSpigotType(state.anchorage) ? state.anchorage : null) ??
    (isFramelessSpigotType(state.balcony.framelessSpigotType) ? state.balcony.framelessSpigotType : null) ??
    (getFramelessDefaultSpigotForDesign(system) as FramelessSpigotType)

  const glassThickness =
    options?.glassThickness ??
    getFramelessGlassThicknessForDesign(system) ??
    12

  const glassBottomOffset =
    options?.glassBottomOffset ??
    state.balcony.framelessGlassBottomOffset ??
    0

  const toprailHeight =
    options?.toprailHeight ??
    state.balcony.framelessToprailHeight ??
    21

  const toprailType =
    (isFramelessToprailType(state.toprail) ? state.toprail : null) ??
    (isFramelessToprailType(state.balcony.framelessToprailType) ? state.balcony.framelessToprailType : null) ??
    null

  const hasToprail =
    toprailType !== null &&
    toprailType !== "None" &&
    toprailType !== "38mm Handrail"
  const toprailTopOffset = getFramelessToprailTopOffset(toprailType)

  const spigotGlassBottomOffset = getSpigotGlassBottomOffset(spigotType)

  const panelBases = deriveFramelessPanelBases(state, system)

  const spigotSupportDrafts: FramelessSpigotSupportDraft[] = panelBases.flatMap((panelBase) => {
    const dx = panelBase.end.x - panelBase.start.x
    const dz = panelBase.end.z - panelBase.start.z
    const len = Math.hypot(dx, dz) || 1

    const dirX = dx / len
    const dirZ = dz / len

    const nominalInset = 250
    const inset = panelBase.length < nominalInset * 3 ? panelBase.length / 3 : nominalInset

    const leftSpigotX = panelBase.start.x + dirX * inset
    const leftSpigotZ = panelBase.start.z + dirZ * inset

    const rightSpigotX = panelBase.end.x - dirX * inset
    const rightSpigotZ = panelBase.end.z - dirZ * inset

    const leftSupportY = sampleSupportYAtXZ({
      state,
      x: leftSpigotX,
      z: leftSpigotZ,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
    })

    const rightSupportY = sampleSupportYAtXZ({
      state,
      x: rightSpigotX,
      z: rightSpigotZ,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
    })

    return [
      {
        panelId: panelBase.id,
        runIndex: panelBase.runIndex,
        segmentId: panelBase.segmentId,
        side: "left" as const,
        type: spigotType,
        x: leftSpigotX,
        z: leftSpigotZ,
        supportY: leftSupportY,
      },
      {
        panelId: panelBase.id,
        runIndex: panelBase.runIndex,
        segmentId: panelBase.segmentId,
        side: "right" as const,
        type: spigotType,
        x: rightSpigotX,
        z: rightSpigotZ,
        supportY: rightSupportY,
      },
    ]
  })

  const panels: DerivedFramelessPanel[] = panelBases.map((panelBase) => {
    const dx = panelBase.end.x - panelBase.start.x
    const dz = panelBase.end.z - panelBase.start.z
    const len = Math.hypot(dx, dz) || 1

    const dirX = dx / len
    const dirZ = dz / len

    const nominalInset = 250
    const inset = panelBase.length < nominalInset * 3 ? panelBase.length / 3 : nominalInset

    const leftSpigotX = panelBase.start.x + dirX * inset
    const leftSpigotZ = panelBase.start.z + dirZ * inset

    const rightSpigotX = panelBase.end.x - dirX * inset
    const rightSpigotZ = panelBase.end.z - dirZ * inset

    const leftSupportY = sampleSupportYAtXZ({
      state,
      x: leftSpigotX,
      z: leftSpigotZ,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
    })

    const rightSupportY = sampleSupportYAtXZ({
      state,
      x: rightSpigotX,
      z: rightSpigotZ,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
    })

    const leftGlassBottomCandidateY =
      leftSupportY + spigotGlassBottomOffset + glassBottomOffset

    const rightGlassBottomCandidateY =
      rightSupportY + spigotGlassBottomOffset + glassBottomOffset

    const glassBottomY = Math.max(
      leftGlassBottomCandidateY,
      rightGlassBottomCandidateY
    )

    const controllingSupportY = Math.max(leftSupportY, rightSupportY)

    // Frameless panel/system top is solved from the overall balustrade target.
    //
    // If there is a toprail:
    //   toprailTopY = balcony.topY
    //   toprailBottomY = toprailTopY - toprailHeight
    //   glassTopY = toprailBottomY - toprailOffsetFromGlassTop
    //
    // If there is no toprail:
    //   glassTopY = balcony.topY
    //
    // Glass bottom is controlled by the higher effective spigot seat:
    //   glassBottomY = max(
    //     leftSupportY + spigotTypeOffset + genericGlassBottomOffset,
    //     rightSupportY + spigotTypeOffset + genericGlassBottomOffset
    //   )
    //
    // Therefore glassHeight is derived.
    const toprailTopY = state.balcony.topY

    const toprailBottomY = hasToprail ? toprailTopY - toprailHeight : toprailTopY
    const toprailCenterY = hasToprail ? toprailBottomY + toprailHeight / 2 : toprailTopY

    const glassTopY = hasToprail
      ? toprailTopY + toprailTopOffset
      : state.balcony.topY

    const glassHeight = clampMin(glassTopY - glassBottomY, 1)

    const leftSpigot: FramelessSpigot = {
      id: `${panelBase.id}-spigot-left`,
      panelId: panelBase.id,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
      side: "left",
      type: spigotType,
      x: leftSpigotX,
      z: leftSpigotZ,
      supportY: leftSupportY,
      anchorageLaserHeights: getDefaultAnchorageLaserHeightsForSpigotType(state, spigotSupportDrafts, {
        segmentId: panelBase.segmentId,
        x: leftSpigotX,
        z: leftSpigotZ,
        spigotType,
      }),
    }

    const rightSpigot: FramelessSpigot = {
      id: `${panelBase.id}-spigot-right`,
      panelId: panelBase.id,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
      side: "right",
      type: spigotType,
      x: rightSpigotX,
      z: rightSpigotZ,
      supportY: rightSupportY,
      anchorageLaserHeights: getDefaultAnchorageLaserHeightsForSpigotType(state, spigotSupportDrafts, {
        segmentId: panelBase.segmentId,
        x: rightSpigotX,
        z: rightSpigotZ,
        spigotType,
      }),
    }

    return {
      id: panelBase.id,
      runIndex: panelBase.runIndex,
      segmentId: panelBase.segmentId,
      segmentIndex: panelBase.segmentIndex,

      start: panelBase.start,
      end: panelBase.end,
      length: panelBase.length,

      leftPlanePoint: panelBase.leftPlanePoint,
      leftPlaneDir: panelBase.leftPlaneDir,
      rightPlanePoint: panelBase.rightPlanePoint,
      rightPlaneDir: panelBase.rightPlaneDir,

      glassThickness,

      leftSpigot,
      rightSpigot,

      leftSupportY,
      rightSupportY,
      controllingSupportY,

      glassBottomY,
      glassTopY,
      glassHeight,

      // Kept for compatibility with the current shared frameless types.
      targetGlassBottomY: glassBottomY,

      toprailType,
      toprailOffset: toprailTopOffset,
      toprailBottomY,
      toprailCenterY,
      toprailTopY,
    }
  })

  return {
    enabled: true,
    system,
    panels,
  }
}