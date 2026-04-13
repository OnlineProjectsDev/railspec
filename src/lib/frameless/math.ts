// /lib/frameless/math.ts
export type Vec3 = { x: number; y: number; z: number }

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

export function round(n: number, d = 6) {
  const p = Math.pow(10, d)
  return Math.round(n * p) / p
}

export function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

export function dot3(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function norm3(v: Vec3) {
  return Math.hypot(v.x, v.y, v.z)
}

export function normalize3(v: Vec3): Vec3 {
  const n = norm3(v) || 1
  return {
    x: v.x / n,
    y: v.y / n,
    z: v.z / n,
  }
}

export function angleDegToXZVector(angleDeg: number, length = 1): Vec3 {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: round(-Math.cos(rad) * length, 6),
    y: 0,
    z: round(-Math.sin(rad) * length, 6),
  }
}

export function scaleV(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function addV(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function normalize(x: number, y: number, z: number) {
  const n = Math.hypot(x, y, z) || 1
  return {
    vector: { x: x / n, y: y / n, z: z / n },
    norm: n,
  }
}

export function normalizeXZ(x: number, z: number) {
  const n = Math.hypot(x, z) || 1
  return {
    x: x / n,
    z: z / n,
  }
}

export function rotateAroundNormal(vIn: Vec3, angleDeg: number, nIn: Vec3): Vec3 {
  const v = vIn
  const n = normalize3(nIn)
  const rad = (angleDeg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)

  const term1 = scaleV(v, c)
  const term2 = scaleV(cross3(n, v), s)
  const term3 = scaleV(n, dot3(n, v) * (1 - c))

  return addV(addV(term1, term2), term3)
}

export function signedAngleAroundNormal(aIn: Vec3, bIn: Vec3, nIn: Vec3): number {
  const a = normalize3(aIn)
  const b = normalize3(bIn)
  const n = normalize3(nIn)

  const d = clamp(dot3(a, b), -1, 1)
  const c = dot3(n, cross3(a, b))
  const rad = Math.atan2(c, d)

  return (rad * 180) / Math.PI
}

export function signedAngleXZ(aIn: Vec3, bIn: Vec3): number {
  return signedAngleAroundNormal(aIn, bIn, { x: 0, y: 1, z: 0 })
}

export function fold0_180(deg: number) {
  let a = deg % 360
  if (a < 0) a += 360
  if (a > 180) a = 360 - a
  return a
}

export function solveL(t: number, thetaDeg: number, g = 10): number {
  let theta = Math.abs(thetaDeg) % 360
  if (theta > 180) theta = 360 - theta

  if (theta === 180) return g / 2

  const half = (theta * 0.5 * Math.PI) / 180
  const s = Math.sin(half)
  const c = Math.cos(half)

  if (Math.abs(s) < 1e-9) return Number.POSITIVE_INFINITY

  return (g + t * c) / (2 * s)
}

export function solveDominantCornerExtension(t: number, thetaDeg: number): number {
  let theta = Math.abs(thetaDeg) % 360
  if (theta > 180) theta = 360 - theta

  if (theta === 180) return 0

  const half = (theta * 0.5 * Math.PI) / 180
  const s = Math.sin(half)
  const c = Math.cos(half)

  if (Math.abs(s) < 1e-9) return 0

  return (t * c) / (2 * s)
}

export function displacementForAngle(a: number): number {
  const PI = Math.PI
  const HALF_PI = 0.5 * PI
  const TWO_THIRDS_PI = (2 / 3) * PI
  const EPS = 1e-10

  let angle = a
  if (angle > PI) angle -= PI

  const approx = (x: number, y: number) => Math.abs(x - y) < EPS

  if (angle > HALF_PI && angle < TWO_THIRDS_PI) {
    return Math.abs(22.5 * Math.tan(angle - HALF_PI))
  } else if (
    approx(angle, 0) ||
    approx(Math.abs(angle), PI) ||
    approx(Math.abs(angle), HALF_PI)
  ) {
    return 0
  } else if (angle < HALF_PI) {
    return Math.abs(22.5 * Math.tan(angle + HALF_PI))
  } else {
    return Math.abs(Math.abs(22.5 / Math.tan(angle / 2)))
  }
}