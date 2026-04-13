// /lib/frameless/supportSampling.ts
import type { RootState } from "@/lib/types"
import { sampleEdgeHeight } from "@/lib/foundation/heightSampling"
import type { SupportSampleFn } from "./types"

function distSqPointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
) {
  const abx = bx - ax
  const abz = bz - az
  const apx = px - ax
  const apz = pz - az
  const abLenSq = abx * abx + abz * abz

  if (abLenSq < 1e-9) {
    const dx = px - ax
    const dz = pz - az
    return { d2: dx * dx + dz * dz, t: 0 }
  }

  let t = (apx * abx + apz * abz) / abLenSq
  t = Math.max(0, Math.min(1, t))

  const cx = ax + abx * t
  const cz = az + abz * t
  const dx = px - cx
  const dz = pz - cz

  return { d2: dx * dx + dz * dz, t }
}

export const sampleSupportYAtXZ: SupportSampleFn = ({ state, x, z }) => {
  const floor = state.foundation?.floor
  const laserLevelY = Number.isFinite(state.balcony?.laserLevelY) ? state.balcony.laserLevelY : 0

  if (!floor?.vertices?.length) {
    return Number.isFinite(state.foundation?.fflY) ? state.foundation.fflY : 0
  }

  const verts = floor.vertices
  const edgeCount = floor.closed ? verts.length : Math.max(0, verts.length - 1)

  let bestEdgeIndex = -1
  let bestT = 0
  let bestD2 = Infinity

  for (let i = 0; i < edgeCount; i++) {
    const a = verts[i]
    const b = floor.closed ? verts[(i + 1) % verts.length] : verts[i + 1]
    if (!b) continue

    const hit = distSqPointToSegment(x, z, a.x, a.z, b.x, b.z)
    if (hit.d2 < bestD2) {
      bestD2 = hit.d2
      bestEdgeIndex = i
      bestT = hit.t
    }
  }

  if (bestEdgeIndex >= 0) {
    return sampleEdgeHeight(floor, bestEdgeIndex, bestT, laserLevelY)
  }

  return Number.isFinite(state.foundation?.fflY) ? state.foundation.fflY : 0
}