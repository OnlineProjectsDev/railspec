// /lib/balustrade/getBalustradeRunLengthMeters.ts
import type { RootState } from "@/lib/types"

export function getBalustradeRunLengthMeters(state: RootState): number {
  const runs =
    state.balcony.balustradePaths?.length
      ? state.balcony.balustradePaths
      : state.balcony.balustradePath?.length
        ? [state.balcony.balustradePath]
        : []

  const totalMm = runs.reduce((runTotal, run) => {
    if (!run || run.length < 2) return runTotal

    const runLengthMm = run.slice(0, -1).reduce((segmentTotal, from, index) => {
      const to = run[index + 1]
      if (!to) return segmentTotal

      return segmentTotal + Math.hypot(to.x - from.x, to.z - from.z)
    }, 0)

    return runTotal + runLengthMm
  }, 0)

  const totalMeters = totalMm / 1000

  return Math.ceil(totalMeters * 10) / 10
}

export function getBalustradeRunLengthMetersLabel(state: RootState): string {
  return `${getBalustradeRunLengthMeters(state).toFixed(1)}m`
}