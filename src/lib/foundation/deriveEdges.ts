// /lib/foundation/deriveEdges.ts
import type { Edge, Floor, Vec2, FloorEdgeMeta } from "../types"

function norm(dx: number, dz: number) {
  const l = Math.hypot(dx, dz) || 1
  return { x: dx / l, z: dz / l }
}

function cross(ax: number, az: number, bx: number, bz: number) {
  return ax * bz - az * bx
}

/**
 * RIGHT normal convention:
 * For direction (dx,dz), RIGHT normal is (-dz, +dx).
 */
function rightNormal(dir: { x: number; z: number }) {
  return { x: -dir.z, z: dir.x }
}

function getEdgeCount(floor: Floor) {
  const n = floor.vertices.length
  if (n <= 0) return 0
  return floor.closed ? n : Math.max(0, n - 1)
}

function defaultMeta(): FloorEdgeMeta {
  return { offset: 0, refType: "include" }
}

function getMeta(floor: Floor, edgeIndex: number): FloorEdgeMeta {
  return floor.edges?.[edgeIndex] ?? defaultMeta()
}

// Intersection of infinite lines p + t*r and q + u*s
function intersectLines(
  p: { x: number; z: number },
  r: { x: number; z: number },
  q: { x: number; z: number },
  s: { x: number; z: number },
  eps: number
): { ok: true; x: number; z: number } | { ok: false } {
  const rxs = cross(r.x, r.z, s.x, s.z)
  if (Math.abs(rxs) < eps) return { ok: false }

  const qmp = { x: q.x - p.x, z: q.z - p.z }
  const t = cross(qmp.x, qmp.z, s.x, s.z) / rxs

  return { ok: true, x: p.x + r.x * t, z: p.z + r.z * t }
}

function pointEquals(a: Vec2, b: Vec2, eps = 1e-6) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= eps
}

export function deriveFloorEdges(floor: Floor): Edge[] {
  const v = floor.vertices
  if (!v.length) return []

  const count = floor.closed ? v.length : Math.max(0, v.length - 1)
  const edges: Edge[] = []

  for (let i = 0; i < count; i++) {
    const a = v[i]
    const b = floor.closed ? v[(i + 1) % v.length] : v[i + 1]
    if (!b) continue

    const dx = b.x - a.x
    const dz = b.z - a.z
    const length = Math.hypot(dx, dz)
    if (length < 1e-6) continue

    edges.push({
      id: `edge-${floor.id}-${i}`,
      a,
      b,
      length,
      dir: norm(dx, dz),
    })
  }

  return edges
}

/**
 * Returns MULTIPLE offset polylines (“runs”) split by excluded edges.
 *
 * Rules:
 * - open floor already has 1 start/stop (polyline); excluded edges create more gaps => more runs.
 * - closed floor must exclude at least 1 edge to define a start/stop; multiple excluded edges => multiple runs.
 *
 * Join behaviour:
 * - Excluded edges still participate in mitre maths so adjacent included edges trim/extend consistently.
 * - Runs are built from the trimmed included edges; gaps occur where edges are excluded.
 */
export function deriveFloorOffsetRuns(
  floor: Floor,
  opts?: {
    angleEps?: number
    miterLimit?: number
  }
): Vec2[][] {
  const v = floor.vertices
  const edgeCount = getEdgeCount(floor)
  if (!v.length || edgeCount <= 0) return []

  const ANG_EPS = opts?.angleEps ?? 1e-6
  const MITER_LIMIT = opts?.miterLimit ?? 10

  const rightN = (d: { x: number; z: number }) => rightNormal(d)

  type RefType = "include" | "exclude"

  type OffEdge =
    | { ok: false; i: number; draw: false }
    | {
        ok: true
        i: number
        refType: RefType
        offset: number
        dir: { x: number; z: number }
        aOff: Vec2
        bOff: Vec2
        draw: boolean // include => true, exclude => false
        // trimmed endpoints (mitred)
        s?: Vec2
        t?: Vec2
      }

  const edges: OffEdge[] = []

  for (let i = 0; i < edgeCount; i++) {
    const a = v[i]
    const b = floor.closed ? v[(i + 1) % v.length] : v[i + 1]
    if (!b) {
      edges.push({ ok: false, i, draw: false })
      continue
    }

    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    if (len < 1e-6) {
      edges.push({ ok: false, i, draw: false })
      continue
    }

    const dir = norm(dx, dz)
    const meta = getMeta(floor, i)
    const refType = (meta.refType ?? "include") as RefType
    const offset = meta.offset ?? 0

    const nR = rightN(dir)
    const aOff = { x: a.x + nR.x * offset, z: a.z + nR.z * offset }
    const bOff = { x: b.x + nR.x * offset, z: b.z + nR.z * offset }

    // exclude still participates in joins but isn't drawn
    const draw = refType !== "exclude"

    edges.push({ ok: true, i, refType, offset, dir, aOff, bOff, draw })
  }

  const prevValid = (i: number) => {
    if (!floor.closed) {
      for (let j = i - 1; j >= 0; j--) if (edges[j]?.ok) return j
      return null
    }
    for (let step = 1; step <= edgeCount; step++) {
      const j = (i - step + edgeCount) % edgeCount
      if (edges[j]?.ok) return j
    }
    return null
  }

  const nextValid = (i: number) => {
    if (!floor.closed) {
      for (let j = i + 1; j < edgeCount; j++) if (edges[j]?.ok) return j
      return null
    }
    for (let step = 1; step <= edgeCount; step++) {
      const j = (i + step) % edgeCount
      if (edges[j]?.ok) return j
    }
    return null
  }

  const joinPoint = (prev: Extract<OffEdge, { ok: true }>, curr: Extract<OffEdge, { ok: true }>) => {
    const isect = intersectLines(prev.bOff, prev.dir, curr.aOff, curr.dir, ANG_EPS)
    if (!isect.ok) return null

    const m = { x: isect.x, z: isect.z }

    const mag = Math.max(Math.abs(prev.offset), Math.abs(curr.offset), 1)
    const spike = Math.min(
      Math.hypot(m.x - prev.bOff.x, m.z - prev.bOff.z),
      Math.hypot(m.x - curr.aOff.x, m.z - curr.aOff.z)
    )
    if (spike > MITER_LIMIT * mag) return null

    return m
  }

  // 1) Compute trimmed endpoints s/t for every valid edge (including excluded)
  for (let i = 0; i < edgeCount; i++) {
    const e = edges[i]
    if (!e.ok) continue

    let s = { ...e.aOff }
    let t = { ...e.bOff }

    const prevI = floor.closed ? prevValid(i) : i - 1 >= 0 ? (edges[i - 1]?.ok ? i - 1 : null) : null
    const nextI = floor.closed ? nextValid(i) : i + 1 < edgeCount ? (edges[i + 1]?.ok ? i + 1 : null) : null

    if (prevI !== null) {
      const p = edges[prevI] as Extract<OffEdge, { ok: true }>
      const m = joinPoint(p, e)
      if (m) s = m
    }

    if (nextI !== null) {
      const nx = edges[nextI] as Extract<OffEdge, { ok: true }>
      const m = joinPoint(e, nx)
      if (m) t = m
    }

    e.s = s
    e.t = t
  }

  // 2) Determine run start points (split by excluded edges)
  const includeIndices = edges
    .filter((e): e is Extract<OffEdge, { ok: true }> => !!e.ok)
    .filter((e) => e.draw)
    .map((e) => e.i)

  if (!includeIndices.length) return []

  const excludedCount = edges.filter((e) => !!(e as any).ok).filter((e: any) => e.refType === "exclude").length

  // If closed and nothing is excluded, there is no “start/stop”.
  // We still return one closed loop for stability, but your workflow expects you to exclude at least one edge.
  if (floor.closed && excludedCount === 0) {
    // Build one loop in index order from 0..edgeCount-1
    const run: Vec2[] = []
    for (let i = 0; i < edgeCount; i++) {
      const e = edges[i] as OffEdge
      if (!e.ok || !e.draw) continue

      const s = e.s ?? e.aOff
      const t = e.t ?? e.bOff

      if (!run.length) {
        run.push({ ...s })
      } else {
        const last = run[run.length - 1]
        if (!pointEquals(last, s)) run.push({ ...s })
      }

      const last = run[run.length - 1]
      if (!pointEquals(last, t)) run.push({ ...t })
    }

    if (run.length > 2) {
      const a0 = run[0]
      const an = run[run.length - 1]
      if (!pointEquals(an, a0)) run.push({ ...a0 })
    }

    return run.length ? [run] : []
  }

  // Helper: is index included?
  const isIncluded = (i: number) => {
    const e = edges[i] as OffEdge
    return !!(e as any).ok && (e as any).draw === true
  }

  // Find starts: included edge whose previous (geometric) edge is excluded (or invalid / end on open)
  const starts: number[] = []
  for (let i = 0; i < edgeCount; i++) {
    if (!isIncluded(i)) continue
    if (!floor.closed) {
      const prev = i - 1
      if (prev < 0) starts.push(i)
      else if (!isIncluded(prev)) starts.push(i)
      continue
    }
    const prev = (i - 1 + edgeCount) % edgeCount
    if (!isIncluded(prev)) starts.push(i)
  }

  // If for some reason we didn't find starts (shouldn't happen if there is any exclude on closed),
  // fall back to first included.
  if (!starts.length) starts.push(includeIndices[0])

  const visited = new Array(edgeCount).fill(false)
  const runs: Vec2[][] = []

  for (const startIdx of starts) {
    if (visited[startIdx]) continue
    if (!isIncluded(startIdx)) continue

    const run: Vec2[] = []

    let i = startIdx
    while (true) {
      if (visited[i]) break
      visited[i] = true

      const e = edges[i] as Extract<OffEdge, { ok: true }>
      const s = e.s ?? e.aOff
      const t = e.t ?? e.bOff

      if (!run.length) {
        run.push({ ...s })
      } else {
        const last = run[run.length - 1]
        if (!pointEquals(last, s)) run.push({ ...s })
      }

      const last = run[run.length - 1]
      if (!pointEquals(last, t)) run.push({ ...t })

      // advance
      const next = floor.closed ? (i + 1) % edgeCount : i + 1
      if (!floor.closed && next >= edgeCount) break
      if (!isIncluded(next)) break

      i = next
      if (floor.closed && i === startIdx) break
    }

    if (run.length >= 2) runs.push(run)
  }

  // Open floors: there is already a “start/stop” at ends; excluded edges create extra runs.
  // Closed floors: excluded edges define the run boundaries. Multiple excluded => multiple runs.
  return runs
}

export function deriveFloorOffsetRunsWithEdgeIndices(
  floor: Floor,
  opts?: {
    angleEps?: number
    miterLimit?: number
  }
): { runs: Vec2[][]; edgeIndicesByRun: number[][] } {
  const runs = deriveFloorOffsetRuns(floor, opts)

  // Re-run the same logic as deriveFloorOffsetRuns uses to know which original edges are "included",
  // but only return the edge indices in the order each run traverses.
  const v = floor.vertices
  const edgeCount = getEdgeCount(floor)
  if (!v.length || edgeCount <= 0) return { runs: [], edgeIndicesByRun: [] }

  type RefType = "include" | "exclude"
  type OffEdge =
    | { ok: false; i: number; draw: false }
    | { ok: true; i: number; refType: RefType; draw: boolean }

  const edges: OffEdge[] = []

  for (let i = 0; i < edgeCount; i++) {
    const a = v[i]
    const b = floor.closed ? v[(i + 1) % v.length] : v[i + 1]
    if (!b) {
      edges.push({ ok: false, i, draw: false })
      continue
    }

    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    if (len < 1e-6) {
      edges.push({ ok: false, i, draw: false })
      continue
    }

    const meta = getMeta(floor, i)
    const refType = (meta.refType ?? "include") as RefType
    const draw = refType !== "exclude"
    edges.push({ ok: true, i, refType, draw })
  }

  const isIncluded = (i: number) => {
    const e = edges[i] as any
    return !!e?.ok && e.draw === true
  }

  const includeIndices = edges.filter((e: any) => e.ok && e.draw).map((e: any) => e.i)
  if (!includeIndices.length) return { runs: [], edgeIndicesByRun: [] }

  const excludedCount = edges.filter((e: any) => e.ok).filter((e: any) => e.refType === "exclude").length

  // Closed + no excluded: your deriveFloorOffsetRuns returns one closed loop.
  // The segment order matches included edges in index order.
  if (floor.closed && excludedCount === 0) {
    const edgeIndicesByRun = [includeIndices.slice()]
    return { runs, edgeIndicesByRun }
  }

  // Find starts (same rule as deriveFloorOffsetRuns)
  const starts: number[] = []
  for (let i = 0; i < edgeCount; i++) {
    if (!isIncluded(i)) continue
    if (!floor.closed) {
      const prev = i - 1
      if (prev < 0) starts.push(i)
      else if (!isIncluded(prev)) starts.push(i)
      continue
    }
    const prev = (i - 1 + edgeCount) % edgeCount
    if (!isIncluded(prev)) starts.push(i)
  }
  if (!starts.length) starts.push(includeIndices[0])

  const visited = new Array(edgeCount).fill(false)
  const edgeIndicesByRun: number[][] = []

  for (const startIdx of starts) {
    if (visited[startIdx]) continue
    if (!isIncluded(startIdx)) continue

    const runEdges: number[] = []

    let i = startIdx
    while (true) {
      if (visited[i]) break
      visited[i] = true

      runEdges.push(i)

      const next = floor.closed ? (i + 1) % edgeCount : i + 1
      if (!floor.closed && next >= edgeCount) break
      if (!isIncluded(next)) break

      i = next
      if (floor.closed && i === startIdx) break
    }

    if (runEdges.length) edgeIndicesByRun.push(runEdges)
  }

  return { runs, edgeIndicesByRun }
}