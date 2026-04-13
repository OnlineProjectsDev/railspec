// /lib/frameless/segmentJoinAvailability.ts
import type { RootState, Vec2 } from "@/lib/types"

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

function pointEquals2(a: Vec2, b: Vec2, eps = 1e-6) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= eps
}

export function getSegmentJoinAvailability(
  balcony: RootState["balcony"],
  segmentId: string
) {
  const parsed = parseSegmentId(segmentId, balcony.id)
  if (!parsed) {
    return {
      hasStartJoin: false,
      hasEndJoin: false,
      runIndex: null,
      segInRun: null,
    }
  }

  const runs = getBalustradeRuns(balcony)
  const run = runs[parsed.runIndex]
  if (!run || run.length < 2) {
    return {
      hasStartJoin: false,
      hasEndJoin: false,
      runIndex: parsed.runIndex,
      segInRun: parsed.segInRun,
    }
  }

  const segStart = run[parsed.segInRun]
  const segEnd = run[parsed.segInRun + 1]

  const hasPrevSeg = parsed.segInRun > 0
  const hasNextSeg = parsed.segInRun < run.length - 2

  const hasStartJoin =
    hasPrevSeg &&
    !!segStart &&
    !!run[parsed.segInRun - 1] &&
    pointEquals2(run[parsed.segInRun], segStart)

  const hasEndJoin =
    hasNextSeg &&
    !!segEnd &&
    !!run[parsed.segInRun + 2] &&
    pointEquals2(run[parsed.segInRun + 1], segEnd)

  return {
    hasStartJoin,
    hasEndJoin,
    runIndex: parsed.runIndex,
    segInRun: parsed.segInRun,
  }
}