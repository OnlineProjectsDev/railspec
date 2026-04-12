// /lib/math.ts
import type { FloorCornerMeta, FloorEdgeMeta, Vec2, FloorEdgeRefType } from "./types"

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function norm(x: number, y: number) {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

function dot(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by
}

function clamp01(n: number) {
  return clamp(n, -1, 1)
}

function edgeLen(a: Vec2, b: Vec2) {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

function getEdgeCount(nVerts: number, closed: boolean) {
  if (nVerts <= 0) return 0
  return closed ? nVerts : Math.max(0, nVerts - 1)
}

function wrap(i: number, n: number) {
  return ((i % n) + n) % n
}

function hasLockedLength(meta?: FloorEdgeMeta) {
  return meta != null && meta.lockedLength != null && Number.isFinite(meta.lockedLength)
}

function hasLockedAngle(meta?: FloorCornerMeta) {
  return meta != null && meta.lockedAngle != null && Number.isFinite(meta.lockedAngle)
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function rotate(v: { x: number; y: number }, rad: number) {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}

function angleDegBetween(ax: number, ay: number, bx: number, by: number) {
  const a = norm(ax, ay)
  const b = norm(bx, by)
  const d = clamp01(dot(a.x, a.y, b.x, b.y))
  return radToDeg(Math.acos(d)) // 0..180
}

function getCornerAngleDeg(vertices: Vec2[], closed: boolean, cornerIndex: number) {
  const n = vertices.length
  if (n < 3) return null

  const i = Math.max(0, Math.min(cornerIndex, n - 1))
  if (!closed) {
    if (i <= 0 || i >= n - 1) return null
  }

  const ip = closed ? wrap(i - 1, n) : i - 1
  const inx = closed ? wrap(i + 1, n) : i + 1

  const prev = vertices[ip]
  const curr = vertices[i]
  const next = vertices[inx]

  const v1x = prev.x - curr.x
  const v1y = prev.z - curr.z
  const v2x = next.x - curr.x
  const v2y = next.z - curr.z

  const l1 = Math.hypot(v1x, v1y)
  const l2 = Math.hypot(v2x, v2y)
  if (l1 < 1e-6 || l2 < 1e-6) return null

  const ang = angleDegBetween(v1x, v1y, v2x, v2y)
  if (!Number.isFinite(ang)) return null

  // reject only near-zero degenerate angles
  if (ang < 0.5) return null

  // allow straight; clamp ONLY tiny numeric overshoot (keep decimals like 179.9)
  const EPS = 1e-6
  if (ang > 180 + EPS) return 180
  return ang
}

function signedAngleDegBetween(ax: number, ay: number, bx: number, by: number) {
  const a = norm(ax, ay)
  const b = norm(bx, by)
  const d = clamp01(dot(a.x, a.y, b.x, b.y))
  const c = a.x * b.y - a.y * b.x // 2D cross (z component)

  // Match Canvas2D convention (SVG Y-down flip):
  return -(Math.atan2(c, d) * 180) / Math.PI // (-180, 180]
}

function getCornerSignedAngleDeg(vertices: Vec2[], closed: boolean, cornerIndex: number) {
  const n = vertices.length
  if (n < 3) return null

  const i = Math.max(0, Math.min(cornerIndex, n - 1))
  if (!closed) {
    if (i <= 0 || i >= n - 1) return null
  }

  const ip = closed ? wrap(i - 1, n) : i - 1
  const inx = closed ? wrap(i + 1, n) : i + 1

  const prev = vertices[ip]
  const curr = vertices[i]
  const next = vertices[inx]

  const v1x = prev.x - curr.x
  const v1y = prev.z - curr.z
  const v2x = next.x - curr.x
  const v2y = next.z - curr.z

  const l1 = Math.hypot(v1x, v1y)
  const l2 = Math.hypot(v2x, v2y)
  if (l1 < 1e-6 || l2 < 1e-6) return null

  const ang = signedAngleDegBetween(v1x, v1y, v2x, v2y)
  if (!Number.isFinite(ang)) return null

  // reject only near-zero degenerate angles
  if (Math.abs(ang) < 0.5) return null

  // clamp ONLY tiny numeric overshoot (keep decimals like 179.9)
  const EPS = 1e-6
  if (ang > 180 + EPS) return 180
  if (ang < -180 - EPS) return -180

  // keep (-180, 180], not [-180, 180]
  if (ang === -180) return 180
  return ang
}

function isInteriorCornerIndex(i: number, n: number, closed: boolean) {
  if (n < 3) return false
  if (closed) return true
  return i > 0 && i < n - 1
}

/**
 * “How painful is it to move this vertex?”
 * Lower score => prefer moving it.
 */
function scoreVertexMove(
  vi: number,
  vertices: Vec2[],
  closed: boolean,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  pinnedVertexIndex?: number
) {
  if (pinnedVertexIndex != null && vi === pinnedVertexIndex) return 1e9
  const n = vertices.length
  let score = 0

  const edgeCount = getEdgeCount(n, closed)

  const prevEdge = closed ? wrap(vi - 1, edgeCount) : vi - 1
  const nextEdge = closed ? wrap(vi, edgeCount) : vi

  if (edgesMeta && prevEdge >= 0 && prevEdge < edgeCount && hasLockedLength(edgesMeta[prevEdge])) score++
  if (edgesMeta && nextEdge >= 0 && nextEdge < edgeCount && hasLockedLength(edgesMeta[nextEdge])) score++

  if (cornersMeta) {
    // moving vi affects corner(vi) and corner(vi-1) (and in practice can ripple, but local score is fine)
    if (isInteriorCornerIndex(vi, n, closed) && hasLockedAngle(cornersMeta[closed ? wrap(vi, n) : vi])) score++
    if (isInteriorCornerIndex(vi - 1, n, closed) && hasLockedAngle(cornersMeta[closed ? wrap(vi - 1, n) : vi - 1])) score++
    // also consider neighbour corner (vi+1) lightly
    if (isInteriorCornerIndex(vi + 1, n, closed) && hasLockedAngle(cornersMeta[closed ? wrap(vi + 1, n) : vi + 1])) score++
  }

  return score
}

function ensureEdgesMetaLen(edgesMeta: FloorEdgeMeta[] | undefined, edgeCount: number): FloorEdgeMeta[] {
  const out: FloorEdgeMeta[] = []
  for (let i = 0; i < edgeCount; i++) out[i] = edgesMeta?.[i] ? { ...edgesMeta[i] } : { offset: 0, refType: "include", lockedLength: null }
  return out
}

function ensureCornersMetaLen(cornersMeta: FloorCornerMeta[] | undefined, nVerts: number): FloorCornerMeta[] {
  const out: FloorCornerMeta[] = []
  for (let i = 0; i < nVerts; i++)
    out[i] = cornersMeta?.[i]
      ? { ...cornersMeta[i] }
      : { lockedAngle: null, cornerPostHost: "left" }
  return out
}

function applyLockedEdgeLength(
  verts: Vec2[],
  closed: boolean,
  edgeIndex: number,
  targetLen: number,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  pinnedVertexIndex?: number
): boolean {

  const n = verts.length
  const edgeCount = getEdgeCount(n, closed)
  if (edgeCount <= 0) return true

  const i = Math.max(0, Math.min(edgeIndex, edgeCount - 1))
  const ia = i
  const ib = closed ? wrap(i + 1, n) : i + 1
  if (ib < 0 || ib >= n) return true

  const a = verts[ia]
  const b = verts[ib]
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len = Math.hypot(dx, dz)
  if (len < 1e-6) return false

  const d = norm(dx, dz)

  const scoreA = scoreVertexMove(ia, verts, closed, edgesMeta, cornersMeta, pinnedVertexIndex)
  const scoreB = scoreVertexMove(ib, verts, closed, edgesMeta, cornersMeta, pinnedVertexIndex)

  const move: "A" | "B" = scoreA <= scoreB ? "A" : "B"

  if (move === "B") {
    verts[ib] = { x: a.x + d.x * targetLen, z: a.z + d.y * targetLen }
  } else {
    verts[ia] = { x: b.x - d.x * targetLen, z: b.z - d.y * targetLen }
  }

  return true
}

function applyLockedCornerAngle(
  verts: Vec2[],
  closed: boolean,
  cornerIndex: number,
  targetAngleDeg: number,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  pinnedVertexIndex?: number
): boolean {
  const n = verts.length
  if (!isInteriorCornerIndex(cornerIndex, n, closed)) return true

  const i = cornerIndex
  const ip = closed ? wrap(i - 1, n) : i - 1
  const inx = closed ? wrap(i + 1, n) : i + 1
  if (ip < 0 || ip >= n) return true
  if (inx < 0 || inx >= n) return true

  const edgeCount = getEdgeCount(n, closed)
  const prevEdgeIndex = closed ? wrap(i - 1, edgeCount) : i - 1 // prev->curr
  const currEdgeIndex = i // curr->next

  const prev = verts[ip]
  const curr = verts[i]
  const next = verts[inx]

  const v1 = { x: prev.x - curr.x, y: prev.z - curr.z } // curr->prev
  const v2 = { x: next.x - curr.x, y: next.z - curr.z } // curr->next

  const l1 = Math.hypot(v1.x, v1.y)
  const l2 = Math.hypot(v2.x, v2.y)
  if (l1 < 1e-6 || l2 < 1e-6) return false

  const u1 = norm(v1.x, v1.y)
  const u2 = norm(v2.x, v2.y)

  const target = normalizeAngle180(targetAngleDeg) // keep signed
  const targetMag = Math.abs(target)
  if (targetMag < 0.5) return false

  const theta = degToRad(targetMag)

  const scorePrev = scoreVertexMove(ip, verts, closed, edgesMeta, cornersMeta, pinnedVertexIndex)
  const scoreNext = scoreVertexMove(inx, verts, closed, edgesMeta, cornersMeta, pinnedVertexIndex)
  const move: "PREV" | "NEXT" = scorePrev <= scoreNext ? "PREV" : "NEXT"

  // Helper: pick cand that best matches signed target once applied
  const pickBest = (baseDir: { x: number; y: number }, radius: number) => {
    const candA = rotate({ x: baseDir.x, y: baseDir.y }, +theta)
    const candB = rotate({ x: baseDir.x, y: baseDir.y }, -theta)
    const candidates = [candA, candB]

    let best: { dir: { x: number; y: number }; score: number } | null = null

    for (const cand of candidates) {
      const test = verts.map((p) => ({ ...p }))

      const testPos = { x: curr.x + cand.x * radius, z: curr.z + cand.y * radius }
      if (move === "NEXT") test[inx] = testPos
      else test[ip] = testPos

      const ang = getCornerSignedAngleDeg(test, closed, i)
      if (ang == null) continue

      const magErr = Math.abs(Math.abs(ang) - targetMag)
      const signErr = Math.sign(ang) === Math.sign(target) ? 0 : 1000
      const score = signErr + magErr

      if (!best || score < best.score) best = { dir: cand, score }
    }

    return best?.dir ?? null
  }

  if (move === "NEXT") {
    const locked = edgesMeta?.[currEdgeIndex]?.lockedLength
    const radius = locked != null && Number.isFinite(locked) && locked > 0 ? Number(locked) : l2

    const chosen = pickBest(u1, radius)
    if (!chosen) return false

    verts[inx] = { x: curr.x + chosen.x * radius, z: curr.z + chosen.y * radius }
    return true
  }

  // move PREV
  {
    const locked = edgesMeta?.[prevEdgeIndex]?.lockedLength
    const radius = locked != null && Number.isFinite(locked) && locked > 0 ? Number(locked) : l1

    const chosen = pickBest(u2, radius)
    if (!chosen) return false

    verts[ip] = { x: curr.x + chosen.x * radius, z: curr.z + chosen.y * radius }
    return true
  }
}

function projectLocksIterative(
  vertices: Vec2[],
  closed: boolean,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  opts?: { maxIters?: number; lenEps?: number; angEps?: number; pinnedVertexIndex?: number }
): Vec2[] | null {
  const pinned = opts?.pinnedVertexIndex
  const n = vertices.length
  const edgeCount = getEdgeCount(n, closed)
  if (edgeCount <= 0) return vertices

  const maxIters = opts?.maxIters ?? 25
  const lenEps = opts?.lenEps ?? 1e-3
  const angEps = opts?.angEps ?? 1e-2

  const v = vertices.map((p) => ({ ...p }))
  const eMeta = ensureEdgesMetaLen(edgesMeta, edgeCount)
  const cMeta = ensureCornersMetaLen(cornersMeta, n)

  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false

    // 1) Locked lengths
    for (let ei = 0; ei < edgeCount; ei++) {
      const L = eMeta[ei]?.lockedLength
      if (L == null || !Number.isFinite(L) || L <= 0) continue

      const ia = ei
      const ib = closed ? wrap(ei + 1, n) : ei + 1
      if (ib < 0 || ib >= n) continue

      const currL = edgeLen(v[ia], v[ib])
      if (!Number.isFinite(currL)) continue
      if (Math.abs(currL - L) <= lenEps) continue

      const ok = applyLockedEdgeLength(v, closed, ei, L, eMeta, cMeta, pinned)
      if (!ok) return null
      changed = true
    }

    // 2) Locked angles
    for (let ci = 0; ci < n; ci++) {
      if (!isInteriorCornerIndex(ci, n, closed)) continue
       const Araw = cMeta[ci]?.lockedAngle
      if (Araw == null || !Number.isFinite(Araw)) continue

      const A = Math.abs(Araw)
      if (A < 0.5) continue

      // keep decimals; only clamp true overshoot (not 179.9)
      const EPS = 1e-6
      const Atarget = A > 180 + EPS ? 180 : A

      const currA = getCornerAngleDeg(v, closed, ci)
      if (currA == null) continue
      if (Math.abs(currA - Atarget) <= angEps) continue

      const ok = applyLockedCornerAngle(v, closed, ci, Atarget, eMeta, cMeta, pinned)
      if (!ok) return null
      changed = true
    }

    if (!changed) break
  }

  return v
}

/**
 * Solve "set edge length" with Option A projection:
 * - apply the user's target length (by moving one endpoint along the current direction)
 * - then iteratively project all locked lengths + locked angles
 * - treat the edited edge as temporarily “locked to target” during projection
 */
export function solveSetFloorEdgeLength(
  vertices: Vec2[],
  closed: boolean,
  edgeIndex: number,
  targetLength: number,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  pinnedVertexIndex?: number // <-- add this
): Vec2[] | null {
  const n = vertices.length
  const edgeCount = getEdgeCount(n, closed)
  if (edgeCount <= 0) return null
  if (!Number.isFinite(targetLength) || targetLength <= 0) return null

  const i = Math.max(0, Math.min(edgeIndex, edgeCount - 1))
  const ia = i
  const ib = closed ? wrap(i + 1, n) : i + 1
  if (ib < 0 || ib >= n) return null

  const a = vertices[ia]
  const b = vertices[ib]

  const dx = b.x - a.x
  const dz = b.z - a.z
  const len = Math.hypot(dx, dz)
  if (len < 1e-6) return null

  const d = norm(dx, dz)

  // Initial direct move (pick the easier vertex to move)
  const scoreA = scoreVertexMove(ia, vertices, closed, edgesMeta, cornersMeta, pinnedVertexIndex)
  const scoreB = scoreVertexMove(ib, vertices, closed, edgesMeta, cornersMeta, pinnedVertexIndex)
  const move: "A" | "B" = scoreA <= scoreB ? "A" : "B"

  const next = vertices.map((p) => ({ ...p }))
  if (move === "B") next[ib] = { x: a.x + d.x * targetLength, z: a.z + d.y * targetLength }
  else next[ia] = { x: b.x - d.x * targetLength, z: b.z - d.y * targetLength }

  // Projection step: treat edited edge as locked-to-target
  const tempEdges = ensureEdgesMetaLen(edgesMeta, edgeCount)
  tempEdges[i] = { ...tempEdges[i], lockedLength: targetLength }

  const projected = projectLocksIterative(next, closed, tempEdges, cornersMeta, { pinnedVertexIndex })
  if (!projected) return null

  // Verify edited edge still matches target (within tolerance)
  const finalLen = edgeLen(projected[ia], projected[ib])
  if (!Number.isFinite(finalLen) || Math.abs(finalLen - targetLength) > 1e-2) return null

  return projected
}

/**
 * Convenience: compute current edge length (for lock button etc.)
 */
export function getFloorEdgeLength(vertices: Vec2[], closed: boolean, edgeIndex: number) {
  const n = vertices.length
  const edgeCount = getEdgeCount(n, closed)
  if (edgeCount <= 0) return null
  const i = Math.max(0, Math.min(edgeIndex, edgeCount - 1))
  const ia = i
  const ib = closed ? wrap(i + 1, n) : i + 1
  if (ib < 0 || ib >= n) return null
  return edgeLen(vertices[ia], vertices[ib])
}

/**
 * Convenience: compute current interior corner angle at cornerIndex (degrees).
 */
export function getFloorCornerAngle(vertices: Vec2[], closed: boolean, cornerIndex: number) {
  return getCornerAngleDeg(vertices, closed, cornerIndex)
}

/**
 * Solve "set corner angle" with Option A projection:
 * - enforce target angle by moving prev OR next
 * - then project all locked lengths + locked angles
 * - treat edited corner angle as temporarily “locked to target” during projection
 */
export function solveSetFloorCornerAngle(
  vertices: Vec2[],
  closed: boolean,
  cornerIndex: number,
  targetAngleDeg: number,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  pinnedVertexIndex?: number // <-- add this
): Vec2[] | null {
  const n = vertices.length
  if (n < 3) return null

  if (!Number.isFinite(targetAngleDeg)) return null

  const mag = Math.abs(targetAngleDeg)
  if (mag <= 0.5) return null

  // allow straight; only clamp true overshoot (keep decimals like 179.9)
  const EPS = 1e-6
  const targetMag = mag > 180 + EPS ? 180 : mag

  const i = Math.max(0, Math.min(cornerIndex, n - 1))
  if (!isInteriorCornerIndex(i, n, closed)) return null

  const ip = closed ? wrap(i - 1, n) : i - 1
  const inx = closed ? wrap(i + 1, n) : i + 1
  if (ip < 0 || ip >= n) return null
  if (inx < 0 || inx >= n) return null

  const edgeCount = getEdgeCount(n, closed)
  const tempEdges = ensureEdgesMetaLen(edgesMeta, edgeCount)
  const tempCorners = ensureCornersMetaLen(cornersMeta, n)
    tempCorners[i] = { ...tempCorners[i], lockedAngle: targetAngleDeg } // keep signed in meta
    
  // Initial move to hit target angle (choose easier adjacent vertex)
  const next = vertices.map((p) => ({ ...p }))
  const ok = applyLockedCornerAngle(next, closed, i, targetAngleDeg, tempEdges, tempCorners, pinnedVertexIndex)
  if (!ok) return null

  // Projection step (includes the edited angle because we set tempCorners[i].lockedAngle)
  const projected = projectLocksIterative(next, closed, tempEdges, tempCorners, { pinnedVertexIndex })
  if (!projected) return null

    const finalAng = getCornerAngleDeg(projected, closed, i)
    if (finalAng == null || Math.abs(finalAng - targetMag) > 0.05) return null

  return projected
}

export function normalizeAngle180(a: number): number {
  if (!Number.isFinite(a)) return 0

  let ang = a % 360

  if (ang <= -180) ang += 360
  if (ang > 180) ang -= 360

  return ang
}

export function vecYawDeg(dir: { x: number; z: number }) {
  return (Math.atan2(dir.z, dir.x) * 180) / Math.PI
}

export function signedAngleDegXZ(
  a: { x: number; z: number },
  b: { x: number; z: number }
) {
  const na = norm(a.x, a.z)
  const nb = norm(b.x, b.z)
  const d = clamp01(dot(na.x, na.y, nb.x, nb.y))
  const c = na.x * nb.y - na.y * nb.x
  return (Math.atan2(c, d) * 180) / Math.PI
}

export function displacementForSquareCornerAngle(
  angleDeg: number,
  halfPostWidth: number
) {
  const angle = Math.abs(normalizeAngle180(angleDeg))
  const rad = degToRad(angle)

  if (!Number.isFinite(rad)) return 0
  if (angle >= 179.999) return 0
  if (angle <= 0.001) return 0

  if (rad > Math.PI / 2 && rad < (2 * Math.PI) / 3) {
    return Math.abs(halfPostWidth * Math.tan(rad - Math.PI / 2))
  }

  if (
    Math.abs(rad) < 1e-10 ||
    Math.abs(rad - Math.PI) < 1e-10 ||
    Math.abs(rad - Math.PI / 2) < 1e-10
  ) {
    return 0
  }

  if (rad < Math.PI / 2) {
    return Math.abs(halfPostWidth * Math.tan(rad + Math.PI / 2))
  }

  return Math.abs(halfPostWidth / Math.tan(rad / 2))
}

export function getCornerPostLayout(params: {
  vertex: { x: number; z: number }
  parentDir: { x: number; z: number }
  otherDir: { x: number; z: number }
  postWidth: number
}) {
  const { vertex, postWidth } = params

  const parentDirN = norm(params.parentDir.x, params.parentDir.z)
  const otherDirN = norm(params.otherDir.x, params.otherDir.z)

  const parentXZ = { x: parentDirN.x, z: parentDirN.y }
  const otherXZ = { x: otherDirN.x, z: otherDirN.y }

  const signedAngle = signedAngleDegXZ(parentXZ, otherXZ)
  const absAngle = Math.abs(signedAngle)

  const symmetric = absAngle >= 125

  if (symmetric) {
    const bisN = norm(parentXZ.x + otherXZ.x, parentXZ.z + otherXZ.z)
    const bisXZ = { x: bisN.x, z: bisN.y }
    const disp = displacementForSquareCornerAngle(absAngle, postWidth / 2)

    return {
      symmetric: true,
      signedAngle,
      absAngle,
      position: {
        x: vertex.x + bisXZ.x * disp,
        z: vertex.z + bisXZ.z * disp,
      },
      rotationY: vecYawDeg(rotateDirXZ(bisXZ, -90)),
      guideDir: bisXZ,
    }
  }

  const disp = displacementForSquareCornerAngle(absAngle, postWidth / 2)
  return {
    symmetric: false,
    signedAngle,
    absAngle,
    position: {
      x: vertex.x - parentXZ.x * disp,
      z: vertex.z - parentXZ.z * disp,
    },
    rotationY: vecYawDeg(parentXZ),
    guideDir: parentXZ,
  }
}

export type XZDir = { x: number; z: number }

export type BayPlaneVec = {
  x: number
  y: number
  z: number
  v_x: number
  v_y: number
  v_z: number
}

function cross2(ax: number, az: number, bx: number, bz: number) {
  return ax * bz - az * bx
}

function lineIntersectionXZ(
  a0: { x: number; z: number },
  ad: XZDir,
  b0: { x: number; z: number },
  bd: XZDir
) {
  const den = cross2(ad.x, ad.z, bd.x, bd.z)
  if (Math.abs(den) < 1e-9) return null

  const rx = b0.x - a0.x
  const rz = b0.z - a0.z
  const t = cross2(rx, rz, bd.x, bd.z) / den

  return {
    x: a0.x + ad.x * t,
    z: a0.z + ad.z * t,
    t,
  }
}

export function rotateDirXZ(dir: XZDir, deg: number): XZDir {
  const r = degToRad(deg)
  const c = Math.cos(r)
  const s = Math.sin(r)
  return {
    x: dir.x * c - dir.z * s,
    z: dir.x * s + dir.z * c,
  }
}

export function getPostFaceDirections(params: {
  rotationY: number
}) {
  const forwardN = norm(Math.cos(degToRad(params.rotationY)), Math.sin(degToRad(params.rotationY)))
  const forward = { x: forwardN.x, z: forwardN.y }
  const back = { x: -forward.x, z: -forward.z }
  const right = rotateDirXZ(forward, -90)
  const left = rotateDirXZ(forward, 90)

  return {
    forward,
    back,
    right,
    left,
  }
}

export function getPostFacesForBayDirection(params: {
  postCenter: { x: number; z: number }
  rotationY: number
  postWidth: number
  bayDir: XZDir
}) {
  const half = params.postWidth / 2
  const faces = getPostFaceDirections({ rotationY: params.rotationY })

  const candidates = [
    {
      origin: {
        x: params.postCenter.x + faces.forward.x * half,
        z: params.postCenter.z + faces.forward.z * half,
      },
      normal: faces.forward,
    },
    {
      origin: {
        x: params.postCenter.x + faces.back.x * half,
        z: params.postCenter.z + faces.back.z * half,
      },
      normal: faces.back,
    },
    {
      origin: {
        x: params.postCenter.x + faces.left.x * half,
        z: params.postCenter.z + faces.left.z * half,
      },
      normal: faces.left,
    },
    {
      origin: {
        x: params.postCenter.x + faces.right.x * half,
        z: params.postCenter.z + faces.right.z * half,
      },
      normal: faces.right,
    },
  ]

  const bayDirN = norm(params.bayDir.x, params.bayDir.z)
  const bayXZ = { x: bayDirN.x, z: bayDirN.y }

  candidates.sort((a, b) => {
    const da = dot(a.normal.x, a.normal.z, bayXZ.x, bayXZ.z)
    const db = dot(b.normal.x, b.normal.z, bayXZ.x, bayXZ.z)
    return db - da
  })

  return candidates.slice(0, 2)
}

export function getBayEndFromPost(params: {
  postCenter: { x: number; z: number }
  postRotationY: number
  postWidth: number
  linePoint: { x: number; z: number }
  lineDir: XZDir
  towardsBayCenter: XZDir
}) {
  const lineDirN = norm(params.lineDir.x, params.lineDir.z)
  const lineXZ = { x: lineDirN.x, z: lineDirN.y }

  const towardN = norm(params.towardsBayCenter.x, params.towardsBayCenter.z)
  const towardXZ = { x: towardN.x, z: towardN.y }

  const faces = getPostFacesForBayDirection({
    postCenter: params.postCenter,
    rotationY: params.postRotationY,
    postWidth: params.postWidth,
    bayDir: towardXZ,
  })

  let best:
    | null
    | {
        point: { x: number; z: number }
        faceOrigin: { x: number; z: number }
        faceNormal: XZDir
        score: number
      } = null

  for (const face of faces) {
    const faceTangent = rotateDirXZ(face.normal, 90)
    const hit = lineIntersectionXZ(params.linePoint, lineXZ, face.origin, faceTangent)
    if (!hit) continue

    const relx = hit.x - face.origin.x
    const relz = hit.z - face.origin.z
    const along = dot(relx, relz, faceTangent.x, faceTangent.z)

    if (Math.abs(along) > params.postWidth / 2 + 1e-6) continue

    const score = dot(face.normal.x, face.normal.z, towardXZ.x, towardXZ.z)

    if (!best || score > best.score) {
      best = {
        point: { x: hit.x, z: hit.z },
        faceOrigin: face.origin,
        faceNormal: face.normal,
        score,
      }
    }
  }

  if (!best) {
    const fallback = {
      x: params.postCenter.x,
      z: params.postCenter.z,
    }

    return {
      point: fallback,
      plane: {
        x: fallback.x,
        y: 0,
        z: fallback.z,
        v_x: towardXZ.x,
        v_y: 0,
        v_z: towardXZ.z,
      } satisfies BayPlaneVec,
    }
  }

  return {
    point: best.point,
    plane: {
      x: best.point.x,
      y: 0,
      z: best.point.z,
      v_x: best.faceNormal.x,
      v_y: 0,
      v_z: best.faceNormal.z,
    } satisfies BayPlaneVec,
  }
}

export function getBayEndFromBoundary(params: {
  boundaryPoint: { x: number; z: number }
  boundaryPlaneNormal: XZDir
  linePoint: { x: number; z: number }
  lineDir: XZDir
}) {
  const normalN = norm(params.boundaryPlaneNormal.x, params.boundaryPlaneNormal.z)
  const planeNormal = { x: normalN.x, z: normalN.y }

  const lineDirN = norm(params.lineDir.x, params.lineDir.z)
  const lineXZ = { x: lineDirN.x, z: lineDirN.y }

  const denom = dot(lineXZ.x, lineXZ.z, planeNormal.x, planeNormal.z)

  if (Math.abs(denom) < 1e-9) {
    return {
      point: {
        x: params.boundaryPoint.x,
        z: params.boundaryPoint.z,
      },
      plane: {
        x: params.boundaryPoint.x,
        y: 0,
        z: params.boundaryPoint.z,
        v_x: planeNormal.x,
        v_y: 0,
        v_z: planeNormal.z,
      } satisfies BayPlaneVec,
    }
  }

  const rx = params.boundaryPoint.x - params.linePoint.x
  const rz = params.boundaryPoint.z - params.linePoint.z
  const t = dot(rx, rz, planeNormal.x, planeNormal.z) / denom

  const point = {
    x: params.linePoint.x + lineXZ.x * t,
    z: params.linePoint.z + lineXZ.z * t,
  }

  return {
    point,
    plane: {
      x: point.x,
      y: 0,
      z: point.z,
      v_x: planeNormal.x,
      v_y: 0,
      v_z: planeNormal.z,
    } satisfies BayPlaneVec,
  }
}

export function getBayPlaceholderVerticalVectors(params: {
  left: { x: number; z: number }
  right: { x: number; z: number }
  y: number
}) {
  const cx = (params.left.x + params.right.x) / 2
  const cz = (params.left.z + params.right.z) / 2

  return {
    top: {
      x: cx,
      y: params.y,
      z: cz,
      v_x: 0,
      v_y: -1,
      v_z: 0,
    } satisfies BayPlaneVec,
    bottom: {
      x: cx,
      y: params.y,
      z: cz,
      v_x: 0,
      v_y: 1,
      v_z: 0,
    } satisfies BayPlaneVec,
  }
}

export function projectFloorLocks(
  vertices: Vec2[],
  closed: boolean,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[],
  opts?: { maxIters?: number; lenEps?: number; angEps?: number }
): Vec2[] | null {
  return projectLocksIterative(vertices, closed, edgesMeta, cornersMeta, opts)
}

function defaultEdgeMeta(): FloorEdgeMeta {
  return { offset: 0, refType: "include", lockedLength: null }
}

function mergeEdgeMetaOnDeleteWithLocks(
  prevVertices: Vec2[],
  closed: boolean,
  deleteIndex: number,
  aEdgeIndex: number,
  bEdgeIndex: number,
  a: FloorEdgeMeta | undefined,
  b: FloorEdgeMeta | undefined
): FloorEdgeMeta | null {
  const A = a ?? defaultEdgeMeta()
  const B = b ?? defaultEdgeMeta()

  const offset = A.offset ?? 0
  const refType: FloorEdgeRefType =
    A.refType === "exclude" || B.refType === "exclude" ? "exclude" : "include"

  const aLocked = typeof A.lockedLength === "number" && Number.isFinite(A.lockedLength) && A.lockedLength > 0
  const bLocked = typeof B.lockedLength === "number" && Number.isFinite(B.lockedLength) && B.lockedLength > 0

  if (!aLocked && !bLocked) return { offset, refType, lockedLength: null }

  // Only preserve locked-length merge if deleted corner is straight.
  const ang = getFloorCornerAngle(prevVertices, closed, deleteIndex) // 0..180
  const straight = ang != null && Math.abs(ang - 180) <= 0.5
  if (!straight) return null

  const lenA = (aLocked ? (A.lockedLength as number) : getFloorEdgeLength(prevVertices, closed, aEdgeIndex)) ?? null
  const lenB = (bLocked ? (B.lockedLength as number) : getFloorEdgeLength(prevVertices, closed, bEdgeIndex)) ?? null
  if (lenA == null || lenB == null) return null

  return { offset, refType, lockedLength: lenA + lenB }
}

function remapCornersAfterDelete(prevCorners: FloorCornerMeta[], deleteIndex: number): FloorCornerMeta[] {
  return prevCorners
    .filter((_, i) => i !== deleteIndex)
    .map((m) => ({ ...m }))
}

function remapEdgesAfterDelete(
  prevVertices: Vec2[],
  prevEdges: FloorEdgeMeta[],
  prevVertCount: number,
  closed: boolean,
  deleteIndex: number
): FloorEdgeMeta[] | null {
  const n = prevVertCount
  const oldEdgeCount = getEdgeCount(n, closed)
  const nextVertCount = n - 1
  const nextEdgeCount = getEdgeCount(nextVertCount, closed)

  if (nextEdgeCount <= 0) return []
  if (oldEdgeCount <= 0) return []

  // OPEN
  if (!closed) {
    const k = deleteIndex
    const out: FloorEdgeMeta[] = []

    if (k === 0) {
      for (let i = 0; i < nextEdgeCount; i++) out.push({ ...(prevEdges[i + 1] ?? defaultEdgeMeta()) })
      return out
    }

    if (k === n - 1) {
      for (let i = 0; i < nextEdgeCount; i++) out.push({ ...(prevEdges[i] ?? defaultEdgeMeta()) })
      return out
    }

    for (let i = 0; i <= k - 2; i++) out.push({ ...(prevEdges[i] ?? defaultEdgeMeta()) })

    const merged = mergeEdgeMetaOnDeleteWithLocks(prevVertices, closed, k, k - 1, k, prevEdges[k - 1], prevEdges[k])
    if (!merged) return null
    out.push(merged)

    for (let i = k; i < nextEdgeCount; i++) out.push({ ...(prevEdges[i + 1] ?? defaultEdgeMeta()) })
    return out
  }

  // CLOSED
  {
    const k = deleteIndex
    const prevK = wrap(k - 1, n)
    const nextK = wrap(k + 1, n)

    const map: number[] = []
    for (let oi = 0; oi < n; oi++) if (oi !== k) map.push(oi)

    const out: FloorEdgeMeta[] = []
    for (let i = 0; i < nextEdgeCount; i++) {
      const oldA = map[i]
      const oldB = map[(i + 1) % nextEdgeCount]

      if (oldA === prevK && oldB === nextK) {
        const merged = mergeEdgeMetaOnDeleteWithLocks(prevVertices, closed, k, prevK, k, prevEdges[prevK], prevEdges[k])
        if (!merged) return null
        out.push(merged)
      } else {
        out.push({ ...(prevEdges[oldA] ?? defaultEdgeMeta()) })
      }
    }
    return out
  }
}

/**
 * Single source of truth for delete feasibility.
 * Returns the fully validated next state (vertices+meta) or null if delete is not feasible.
 */
export function validateDeleteFloorVertex(
  prevVertices: Vec2[],
  closed: boolean,
  deleteIndex: number,
  edgesMeta?: FloorEdgeMeta[],
  cornersMeta?: FloorCornerMeta[]
): { vertices: Vec2[]; edges: FloorEdgeMeta[]; corners: FloorCornerMeta[] } | null {
  const n = prevVertices.length
  if (deleteIndex < 0 || deleteIndex >= n) return null

  const min = closed ? 3 : 2
  if (n - 1 < min) return null

  const prevEdgeCount = getEdgeCount(n, closed)
  const prevEdges = ensureEdgesMetaLen(edgesMeta, prevEdgeCount)
  const prevCorners = ensureCornersMetaLen(cornersMeta, n)

  const nextVerticesRaw = prevVertices.filter((_, i) => i !== deleteIndex).map((p) => ({ ...p }))
  const nextEdges = remapEdgesAfterDelete(prevVertices, prevEdges, n, closed, deleteIndex)
  if (!nextEdges) return null

  const nextCorners = remapCornersAfterDelete(prevCorners, deleteIndex)

  // This is the actual "verification": if locks can't be projected => delete is rejected.
  const solvedVerts = projectFloorLocks(nextVerticesRaw, closed, nextEdges, nextCorners)
  if (!solvedVerts) return null

  // Make sure meta array lengths match solved vertex count
  const finalEdgeCount = getEdgeCount(solvedVerts.length, closed)
  const finalEdges = ensureEdgesMetaLen(nextEdges, finalEdgeCount)
  const finalCorners = ensureCornersMetaLen(nextCorners, solvedVerts.length)

  return { vertices: solvedVerts, edges: finalEdges, corners: finalCorners }
}