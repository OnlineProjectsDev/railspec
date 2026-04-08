// /lib/render3d/foundation.ts
import * as THREE from "three"
import type { Floor, FloorEdgeType } from "../types"
import { getEdgeVertexHeights } from "../foundation/heightSampling"

function norm2(x: number, y: number) {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

function computeFoundationBaseY(params: { floor: Floor; laserLevelY: number; slabThickness: number }) {
  const { floor, laserLevelY, slabThickness } = params

  let lowestTopY = laserLevelY

  const v = floor?.vertices ?? []
  const n = v.length
  const edgeCount = floor?.closed ? n : Math.max(0, n - 1)

  for (let i = 0; i < edgeCount; i++) {
    const { y0, y1 } = getEdgeVertexHeights(floor, i, laserLevelY)
    if (y0 < lowestTopY) lowestTopY = y0
    if (y1 < lowestTopY) lowestTopY = y1
  }

  for (let i = 0; i < edgeCount; i++) {
    const meta = (floor.edges?.[i] as any) ?? {}
    const edgeType = ((meta.edgeType ?? "floor") as FloorEdgeType) || "floor"
    if (edgeType === "floor") continue

    const thickness = Number.isFinite(meta.thickness) ? Number(meta.thickness) : 0
    if (Math.abs(thickness) <= 1e-6) continue

    const height = Number.isFinite(meta.height) ? Number(meta.height) : 0
    const { y0, y1 } = getEdgeVertexHeights(floor, i, laserLevelY)
    const topY0 = y0 + height
    const topY1 = y1 + height

    if (topY0 < lowestTopY) lowestTopY = topY0
    if (topY1 < lowestTopY) lowestTopY = topY1
  }

  const baseY = lowestTopY - slabThickness
  return { lowestTopY, baseY }
}

function buildWarpedFloorSlabGeometry(params: {
  floor: Floor
  laserLevelY: number
  fallbackTopY: number
  baseY: number
}): THREE.BufferGeometry | null {
  const { floor, laserLevelY, fallbackTopY, baseY } = params

  if (!floor?.closed) return null
  if (!Array.isArray(floor.vertices) || floor.vertices.length < 3) return null

  const verts2 = floor.vertices.map((v) => new THREE.Vector2(v.x, v.z))
  const faces = THREE.ShapeUtils.triangulateShape(verts2, [])
  if (!faces.length) return null

  const positions: number[] = []
  const indices: number[] = []

  const topIndexByVertex: number[] = []
  const bottomIndexByVertex: number[] = []

  const edgeCount = floor.closed ? floor.vertices.length : Math.max(0, floor.vertices.length - 1)

  for (let i = 0; i < floor.vertices.length; i++) {
    const v = floor.vertices[i]

    let topY = fallbackTopY

    if (edgeCount > 0) {
      if (i < edgeCount) {
        const h = getEdgeVertexHeights(floor, i, laserLevelY)
        topY = h.y0
      } else if (!floor.closed && i > 0) {
        const h = getEdgeVertexHeights(floor, i - 1, laserLevelY)
        topY = h.y1
      }
    }

    topIndexByVertex[i] = positions.length / 3
    positions.push(v.x, topY, v.z)

    bottomIndexByVertex[i] = positions.length / 3
    positions.push(v.x, baseY, v.z)
  }

  for (const tri of faces) {
    indices.push(
      topIndexByVertex[tri[0]],
      topIndexByVertex[tri[1]],
      topIndexByVertex[tri[2]]
    )
  }

  for (const tri of faces) {
    indices.push(
      bottomIndexByVertex[tri[2]],
      bottomIndexByVertex[tri[1]],
      bottomIndexByVertex[tri[0]]
    )
  }

  const n = floor.vertices.length
  const sideEdgeCount = floor.closed ? n : Math.max(0, n - 1)

  for (let i = 0; i < sideEdgeCount; i++) {
    const j = floor.closed ? (i + 1) % n : i + 1
    if (j >= n) continue

    const ti0 = topIndexByVertex[i]
    const ti1 = topIndexByVertex[j]
    const bi0 = bottomIndexByVertex[i]
    const bi1 = bottomIndexByVertex[j]

    indices.push(ti0, bi0, bi1)
    indices.push(ti0, bi1, ti1)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  return geo
}

/**
 * Closed floor -> 3D slab:
 * - top surface uses edge-derived heights from heightSampling.ts
 * - underside stays flat at baseY
 */
export function buildFloorSlabMesh(params: {
  floor: Floor
  laserLevelY: number
  thickness?: number
  material?: THREE.Material
}): THREE.Mesh | null {
  const { floor, laserLevelY } = params
  const thickness =
    typeof params.thickness === "number" && Number.isFinite(params.thickness)
      ? params.thickness
      : 150

  if (!floor?.closed) return null
  if (!Array.isArray(floor.vertices) || floor.vertices.length < 3) return null

  const mat =
    params.material ??
    new THREE.MeshBasicMaterial({
      color: 0xe5e7eb,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })

  const { baseY } = computeFoundationBaseY({ floor, laserLevelY, slabThickness: thickness })

  const geo = buildWarpedFloorSlabGeometry({
    floor,
    laserLevelY,
    fallbackTopY: laserLevelY,
    baseY,
  })
  if (!geo) return null

  const mesh = new THREE.Mesh(geo, mat)

  const edgeGeo = new THREE.EdgesGeometry(geo)
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x374151,
    linewidth: 1,
  })

  const edges = new THREE.LineSegments(edgeGeo, edgeMat)
  mesh.add(edges)

  return mesh
}

export function buildEdgeWallMeshes(params: {
  floor: Floor
  laserLevelY: number
  slabThickness?: number
  material?: THREE.Material
  edgeLineMaterial?: THREE.Material
}): THREE.Group | null {
  const { floor, laserLevelY } = params
  const slabThickness =
    typeof params.slabThickness === "number" && Number.isFinite(params.slabThickness)
      ? params.slabThickness
      : 150

  if (!floor) return null
  if (!Array.isArray(floor.vertices) || floor.vertices.length < 2) return null

  const { baseY } = computeFoundationBaseY({ floor, laserLevelY, slabThickness })

  const mat =
    params.material ??
    new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })

  const edgeMat =
    params.edgeLineMaterial ??
    new THREE.LineBasicMaterial({
      color: 0x374151,
      linewidth: 1,
    })

  const v = floor.vertices
  const n = v.length
  const edgeCount = floor.closed ? n : Math.max(0, n - 1)
  if (edgeCount <= 0) return null

  const ANG_EPS = 1e-6
  const PAR_EPS = 1e-4
  const MITER_LIMIT = 10

  const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx
  const rightNormal = (d: { x: number; y: number }) => ({ x: -d.y, y: d.x })

  const intersectLines = (
    p: { x: number; y: number },
    r: { x: number; y: number },
    q: { x: number; y: number },
    s: { x: number; y: number }
  ): { ok: true; x: number; y: number } | { ok: false } => {
    const rxs = cross(r.x, r.y, s.x, s.y)
    if (Math.abs(rxs) < ANG_EPS) return { ok: false }

    const qmpx = q.x - p.x
    const qmpy = q.y - p.y
    const t = cross(qmpx, qmpy, s.x, s.y) / rxs
    return { ok: true, x: p.x + r.x * t, y: p.y + r.y * t }
  }

  type BaseEdge =
    | { ok: false }
    | { ok: true; i: number; dir: { x: number; y: number }; a: { x: number; y: number }; b: { x: number; y: number } }

  type ThickEdge =
    | { ok: false }
    | {
        ok: true
        i: number
        edgeType: FloorEdgeType
        thickness: number
        height: number
        dir: { x: number; y: number }
        aOff: { x: number; y: number }
        bOff: { x: number; y: number }
        draw: boolean
      }

  const baseEdges: BaseEdge[] = []
  const edges: ThickEdge[] = []

  for (let i = 0; i < edgeCount; i++) {
    const a = v[i]
    const b = floor.closed ? v[(i + 1) % n] : v[i + 1]
    if (!b) {
      baseEdges.push({ ok: false })
      edges.push({ ok: false })
      continue
    }

    const dx = b.x - a.x
    const dy = b.z - a.z
    const len = Math.hypot(dx, dy)
    if (len < 1e-6) {
      baseEdges.push({ ok: false })
      edges.push({ ok: false })
      continue
    }

    const dir = norm2(dx, dy)
    baseEdges.push({ ok: true, i, dir, a: { x: a.x, y: a.z }, b: { x: b.x, y: b.z } })

    const meta = (floor.edges?.[i] as any) ?? {}
    const edgeType = ((meta.edgeType ?? "floor") as FloorEdgeType) || "floor"
    const thickness = Number.isFinite(meta.thickness) ? Number(meta.thickness) : 0
    const height = Number.isFinite(meta.height) ? Number(meta.height) : 0

    const draw = edgeType !== "floor" && Math.abs(thickness) > 1e-6

    const thickOffset = -thickness
    const nR = rightNormal(dir)

    const aOff = { x: a.x + nR.x * thickOffset, y: a.z + nR.y * thickOffset }
    const bOff = { x: b.x + nR.x * thickOffset, y: b.z + nR.y * thickOffset }

    edges.push({ ok: true, i, edgeType, thickness, height, dir, aOff, bOff, draw })
  }

  const prevValid = (i: number) => {
    for (let k = 1; k <= edgeCount; k++) {
      const j = (i - k + edgeCount) % edgeCount
      if (baseEdges[j]?.ok) return j
    }
    return null
  }

  const nextValid = (i: number) => {
    for (let k = 1; k <= edgeCount; k++) {
      const j = (i + k) % edgeCount
      if (baseEdges[j]?.ok) return j
    }
    return null
  }

  const trimToNeighbourBase = (
    nb: Extract<BaseEdge, { ok: true }>,
    te: Extract<ThickEdge, { ok: true }>,
    end: "start" | "end",
    corner: { x: number; y: number },
    nR: { x: number; y: number },
    thickOffset: number
  ) => {
    const cr = cross(nb.dir.x, nb.dir.y, te.dir.x, te.dir.y)
    if (Math.abs(cr) < PAR_EPS) return { x: corner.x + nR.x * thickOffset, y: corner.y + nR.y * thickOffset }

    const p = end === "start" ? nb.b : nb.a
    const r = nb.dir
    const q = end === "start" ? te.aOff : te.bOff
    const s = te.dir

    const isect = intersectLines(p, r, q, s)
    if (!isect.ok) return { x: corner.x + nR.x * thickOffset, y: corner.y + nR.y * thickOffset }

    const m = { x: isect.x, y: isect.y }

    const mag = Math.max(Math.abs(te.thickness), 1)
    const ref = end === "start" ? te.aOff : te.bOff
    if (Math.hypot(m.x - ref.x, m.y - ref.y) > MITER_LIMIT * mag) {
      return { x: corner.x + nR.x * thickOffset, y: corner.y + nR.y * thickOffset }
    }

    return m
  }

  const g = new THREE.Group()
  g.name = "foundation-edges"

  for (let i = 0; i < edgeCount; i++) {
    const e = edges[i]
    if (!e.ok || !e.draw) continue

    const aBase = { x: v[i].x, y: v[i].z }
    const bV = floor.closed ? v[(i + 1) % n] : v[i + 1]
    if (!bV) continue
    const bBase = { x: bV.x, y: bV.z }

    const prevI = floor.closed ? prevValid(i) : i - 1 >= 0 && baseEdges[i - 1]?.ok ? i - 1 : null
    const nextI = floor.closed ? nextValid(i) : i + 1 < edgeCount && baseEdges[i + 1]?.ok ? i + 1 : null

    let s = { ...e.aOff }
    let t = { ...e.bOff }

    const nR = rightNormal(e.dir)
    const thickOffset = -e.thickness

    if (prevI !== null) {
      const nb = baseEdges[prevI]
      if (nb?.ok) s = trimToNeighbourBase(nb, e, "start", aBase, nR, thickOffset)
    }
    if (nextI !== null) {
      const nb = baseEdges[nextI]
      if (nb?.ok) t = trimToNeighbourBase(nb, e, "end", bBase, nR, thickOffset)
    }

    const { y0, y1 } = getEdgeVertexHeights(floor, i, laserLevelY)
    const startTopY = y0 + e.height
    const endTopY = y1 + e.height

    const positions: number[] = [
      aBase.x, baseY, aBase.y,
      bBase.x, baseY, bBase.y,
      t.x, baseY, t.y,
      s.x, baseY, s.y,

      aBase.x, startTopY, aBase.y,
      bBase.x, endTopY, bBase.y,
      t.x, endTopY, t.y,
      s.x, startTopY, s.y,
    ]

    const indices = [
      0, 2, 1,
      0, 3, 2,

      4, 5, 6,
      4, 6, 7,

      0, 1, 5,
      0, 5, 4,

      3, 7, 6,
      3, 6, 2,

      0, 4, 7,
      0, 7, 3,

      1, 2, 6,
      1, 6, 5,
    ]

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    const mesh = new THREE.Mesh(geo, mat)

    const eg = new THREE.EdgesGeometry(geo)
    const lines = new THREE.LineSegments(eg, edgeMat)
    mesh.add(lines)

    mesh.userData = { kind: "foundation-edge", edgeIndex: i, edgeType: e.edgeType }
    g.add(mesh)
  }

  return g.children.length ? g : null
}