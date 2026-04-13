// /lib/render3d/toprailClipping.ts
function norm2(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function dot2(ax: number, az: number, bx: number, bz: number) {
  return ax * bx + az * bz
}

function clamp01(n: number) {
  return Math.max(-1, Math.min(1, n))
}

function samePoint2(a: { x: number; z: number }, b: { x: number; z: number }, tol = 1e-3) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= tol
}

export type ToprailPieceLike = {
  start: { x: number; z: number }
  end: { x: number; z: number }
  segIndex: number
}

export type ToprailClipPlaneLike = {
  x: number
  y: number
  z: number
  v_x: number
  v_y: number
  v_z: number
}

export type ToprailDebugJointPlane = {
  point: { x: number; z: number }
  normal: { x: number; z: number }
  kind: "mitre" | "stock"
}

function getPieceDir(piece: ToprailPieceLike) {
  return norm2(piece.end.x - piece.start.x, piece.end.z - piece.start.z)
}

function getMitreNormalAtVertex(runPath: Array<{ x: number; z: number }>, vertexIndex: number) {
  if (vertexIndex <= 0 || vertexIndex >= runPath.length - 1) return null

  const prev = runPath[vertexIndex - 1]
  const v = runPath[vertexIndex]
  const next = runPath[vertexIndex + 1]

  const dIn = norm2(v.x - prev.x, v.z - prev.z)
  const dOut = norm2(next.x - v.x, next.z - v.z)

  const theta =
    (Math.acos(clamp01(dot2(dIn.x, dIn.z, dOut.x, dOut.z))) * 180) / Math.PI

  if (theta < 0.5) return null
  if (theta > 179.5) return null

  const nx = dIn.x + dOut.x
  const nz = dIn.z + dOut.z
  const n = norm2(nx, nz)

  return {
    point: { x: v.x, z: v.z },
    normal: { x: n.x, z: n.z },
  }
}

export function getToprailDebugJointPlanes(params: {
  pieces: ToprailPieceLike[]
  runPath: Array<{ x: number; z: number }>
}) {
  const { pieces, runPath } = params
  const out: ToprailDebugJointPlane[] = []

  if (runPath.length >= 3) {
    for (let i = 1; i < runPath.length - 1; i++) {
      const mitre = getMitreNormalAtVertex(runPath, i)
      if (!mitre) continue

      out.push({
        point: mitre.point,
        normal: mitre.normal,
        kind: "mitre",
      })
    }
  }

  if (pieces.length >= 2) {
    for (let i = 0; i < pieces.length - 1; i++) {
      const a = pieces[i]
      const b = pieces[i + 1]

      if (!samePoint2(a.end, b.start)) continue
      if (a.segIndex !== b.segIndex) continue

      const d = getPieceDir(a)

      out.push({
        point: { x: a.end.x, z: a.end.z },
        normal: { x: d.x, z: d.z },
        kind: "stock",
      })
    }
  }

  return out
}

export function getToprailClipPlanesForPiece(params: {
  pieces: ToprailPieceLike[]
  pieceIndex: number
  runPath: Array<{ x: number; z: number }>
  y: number
}) {
  const { pieces, pieceIndex, runPath, y } = params
  const piece = pieces[pieceIndex]

  if (!piece) {
    return {
      leftPlane: null as ToprailClipPlaneLike | null,
      rightPlane: null as ToprailClipPlaneLike | null,
    }
  }

  const prevPiece = pieceIndex > 0 ? pieces[pieceIndex - 1] : null
  const nextPiece = pieceIndex < pieces.length - 1 ? pieces[pieceIndex + 1] : null
  const thisDir = getPieceDir(piece)

  let leftPlane: ToprailClipPlaneLike | null = null
  let rightPlane: ToprailClipPlaneLike | null = null

  const hasStockJoinAtStart =
    !!prevPiece &&
    prevPiece.segIndex === piece.segIndex &&
    samePoint2(prevPiece.end, piece.start)

  const hasStockJoinAtEnd =
    !!nextPiece &&
    nextPiece.segIndex === piece.segIndex &&
    samePoint2(piece.end, nextPiece.start)

  if (hasStockJoinAtStart) {
    leftPlane = {
      x: piece.start.x,
      y,
      z: piece.start.z,
      v_x: thisDir.x,
      v_y: 0,
      v_z: thisDir.z,
    }
  } else {
    const mitre = getMitreNormalAtVertex(runPath, piece.segIndex)

    if (mitre) {
      leftPlane = {
        x: mitre.point.x,
        y,
        z: mitre.point.z,
        v_x: mitre.normal.x,
        v_y: 0,
        v_z: mitre.normal.z,
      }
    } else {
      leftPlane = {
        x: piece.start.x,
        y,
        z: piece.start.z,
        v_x: thisDir.x,
        v_y: 0,
        v_z: thisDir.z,
      }
    }
  }

  if (hasStockJoinAtEnd) {
    rightPlane = {
      x: piece.end.x,
      y,
      z: piece.end.z,
      v_x: -thisDir.x,
      v_y: 0,
      v_z: -thisDir.z,
    }
  } else {
    const mitre = getMitreNormalAtVertex(runPath, piece.segIndex + 1)

    if (mitre) {
      rightPlane = {
        x: mitre.point.x,
        y,
        z: mitre.point.z,
        v_x: -mitre.normal.x,
        v_y: 0,
        v_z: -mitre.normal.z,
      }
    } else {
      rightPlane = {
        x: piece.end.x,
        y,
        z: piece.end.z,
        v_x: -thisDir.x,
        v_y: 0,
        v_z: -thisDir.z,
      }
    }
  }

  return {
    leftPlane,
    rightPlane,
  }
}