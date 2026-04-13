// /lib/foundation/heightSampling.ts
import type { Floor, FloorEdgeType } from "../types"

function getEdgeType(floor: Floor, edgeIndex: number): FloorEdgeType {
  return (floor.edges?.[edgeIndex]?.edgeType ?? "floor") as FloorEdgeType
}

function getVertexLaserHeight(floor: Floor, vertexIndex: number): number {
  const raw = (floor.corners?.[vertexIndex] as any)?.laserHeight
  return Number.isFinite(raw) ? Number(raw) : 0
}

function getVertexWorldY(
  floor: Floor,
  vertexIndex: number,
  laserLevelY: number
) {
  const h = getVertexLaserHeight(floor, vertexIndex)
  return laserLevelY - h
}

function isSameTypeRun(floor: Floor, edgeIndex: number) {
  const n = floor.vertices.length
  const edgeCount = floor.closed ? n : Math.max(0, n - 1)

  const type = getEdgeType(floor, edgeIndex)

  const prev = edgeIndex - 1
  const next = edgeIndex + 1

  const prevSame =
    floor.closed
      ? getEdgeType(floor, ((prev % edgeCount) + edgeCount) % edgeCount) === type
      : prev >= 0 && getEdgeType(floor, prev) === type

  const nextSame =
    floor.closed
      ? getEdgeType(floor, next % edgeCount) === type
      : next < edgeCount && getEdgeType(floor, next) === type

  return prevSame || nextSame
}

export function getEdgeVertexHeights(
  floor: Floor,
  edgeIndex: number,
  laserLevelY: number
) {
  const n = floor.vertices.length
  const start = edgeIndex
  const end = floor.closed ? (edgeIndex + 1) % n : edgeIndex + 1

  const y0 = getVertexWorldY(floor, start, laserLevelY)
  const y1 = getVertexWorldY(floor, end, laserLevelY)

  if (isSameTypeRun(floor, edgeIndex)) {
    return { y0, y1 }
  }

  const flat = (y0 + y1) * 0.5
  return { y0: flat, y1: flat }
}

export function sampleEdgeHeight(
  floor: Floor,
  edgeIndex: number,
  t: number,
  laserLevelY: number
) {
  const { y0, y1 } = getEdgeVertexHeights(floor, edgeIndex, laserLevelY)
  return y0 + (y1 - y0) * t
}