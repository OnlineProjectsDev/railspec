// /lib/foundation/floor.ts
import type { Floor, Vec2 } from "../types"

export function moveFloorVertex(floor: Floor, index: number, next: Vec2): Floor {
  if (index < 0 || index >= floor.vertices.length) return floor
  const vertices = floor.vertices.slice()
  vertices[index] = next
  return { ...floor, vertices }
}

export function insertFloorVertex(floor: Floor, index: number, v: Vec2): Floor {
  const i = Math.max(0, Math.min(floor.vertices.length, index))
  const vertices = floor.vertices.slice()
  vertices.splice(i, 0, v)
  return { ...floor, vertices }
}

export function removeFloorVertex(floor: Floor, index: number): Floor {
  if (floor.vertices.length <= 1) return floor
  if (index < 0 || index >= floor.vertices.length) return floor
  const vertices = floor.vertices.slice()
  vertices.splice(index, 1)
  return { ...floor, vertices }
}

export function setFloorClosed(floor: Floor, closed: boolean): Floor {
  return { ...floor, closed }
}