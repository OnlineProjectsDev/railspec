// /lib/balustrade/deriveBayPlanes.ts
import {
  getBayEndFromBoundary,
  getBayEndFromPost,
  type BayPlaneVec,
} from "../math"
import type { Balcony, Post, Segment } from "../types"

export type BayPlaneRef = {
  id: string
  x: number
  z: number
  t: number
  kind: "post" | "anchor" | "virtual"
  postId?: string
}

export type DerivedBayPlanes = {
  leftVec: BayPlaneVec
  rightVec: BayPlaneVec
  topVec: BayPlaneVec
  bottomVec: BayPlaneVec

  leftPoint: { x: number; z: number }
  rightPoint: { x: number; z: number }
  centerPoint: { x: number; z: number }

  derivedLength: number
}

function norm(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function getPostById(posts: Post[], id?: string) {
  if (!id) return null
  return posts.find((p) => p.id === id) ?? null
}

function getPostCenterAndRotation(posts: Post[], ref: BayPlaneRef) {
  if (ref.kind !== "post") return null

  const post =
    getPostById(posts, ref.postId) ??
    getPostById(posts, ref.id)

  if (!post) return null

  return {
    center: { x: post.position.x, z: post.position.z },
    rotationY: post.rotationY ?? 0,
    postWidth: post.profile?.size ?? 45,
  }
}

function getBayLineFromRefs(params: {
  from: BayPlaneRef
  to: BayPlaneRef
  seg: Segment
}) {
  const segDir = norm(params.seg.direction.x, params.seg.direction.z)

  return {
    point: {
      x: params.seg.start.x + segDir.x * params.from.t,
      z: params.seg.start.z + segDir.z * params.from.t,
    },
    dir: {
      x: segDir.x,
      z: segDir.z,
    },
  }
}

function getDesignTopBottomOffsets(design: string | null | undefined) {
  switch (design) {
    case "RD-D1":
      return { top: 8, bottom: 12 }
    case "RD-D2":
      return { top: -113, bottom: 12 }
    case "RD-D3":
    case "RD-D3SLATS":
      return { top: -14, bottom: 22 }
    case "RD-D4":
    case "RD-D4SLATS":
      return { top: -122, bottom: 22 }
    case "RD-D5":
      return { top: 0, bottom: 0 }
    case "RD-D6":
      return { top: 10, bottom: 0 }
    case "RD-D7":
      return { top: 10, bottom: 12 }
    case "RD-D8":
      return { top: -100, bottom: 12 }
    case "RD-D9":
      return { top: 0, bottom: 22 }
    case "RD-D10":
    case "RD-D12":
    case "RD-D14":
      return { top: 0, bottom: 0 }
    case "RD-D11":
    case "RD-D13":
      return { top: 0, bottom: -200 }
    default:
      return { top: 0, bottom: 0 }
  }
}

function getToprailHeight(toprailType: string | null | undefined) {
  switch (toprailType) {
    case "Elite":
      return 31
    case "Visage":
      return 29
    case "Slenderline":
      return 31
    case "Oval":
      return 31
    case "Round":
      return 43
    case "25mm Round":
      return 21
    case "25mm Square":
      return 21
    case "38mm Round":
      return 36
    case "38mm Handrail":
      return 0
    case "None":
      return 0
    default:
      return 31
  }
}

function getVerticalPlaneVectors(params: {
  leftPoint: { x: number; z: number }
  rightPoint: { x: number; z: number }
  topY: number
  bottomY: number
}) {
  const cx = (params.leftPoint.x + params.rightPoint.x) / 2
  const cz = (params.leftPoint.z + params.rightPoint.z) / 2

  return {
    topVec: {
      x: cx,
      y: params.topY,
      z: cz,
      v_x: 0,
      v_y: -1,
      v_z: 0,
    } satisfies BayPlaneVec,
    bottomVec: {
      x: cx,
      y: params.bottomY,
      z: cz,
      v_x: 0,
      v_y: 1,
      v_z: 0,
    } satisfies BayPlaneVec,
  }
}

export function deriveBayPlanes(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  posts: Post[]
  seg: Segment
  from: BayPlaneRef
  to: BayPlaneRef
  yRef: number
  panelHeight: number
}): DerivedBayPlanes {
  const { posts, seg, from, to, yRef, panelHeight } = params

  const segDirN = norm(seg.direction.x, seg.direction.z)
  const bayDir =
    to.t >= from.t
      ? { x: segDirN.x, z: segDirN.z }
      : { x: -segDirN.x, z: -segDirN.z }

  const fromPostGeo = getPostCenterAndRotation(posts, from)
  const toPostGeo = getPostCenterAndRotation(posts, to)

  const bayLine = getBayLineFromRefs({
    from,
    to,
    seg,
  })

  const leftDerived = fromPostGeo
    ? getBayEndFromPost({
        postCenter: fromPostGeo.center,
        postRotationY: fromPostGeo.rotationY,
        postWidth: fromPostGeo.postWidth,
        linePoint: bayLine.point,
        lineDir: bayLine.dir,
        towardsBayCenter: bayDir,
      })
    : getBayEndFromBoundary({
        boundaryPoint: { x: from.x, z: from.z },
        boundaryPlaneNormal: bayDir,
        linePoint: bayLine.point,
        lineDir: bayLine.dir,
      })

  const rightDerived = toPostGeo
    ? getBayEndFromPost({
        postCenter: toPostGeo.center,
        postRotationY: toPostGeo.rotationY,
        postWidth: toPostGeo.postWidth,
        linePoint: bayLine.point,
        lineDir: bayLine.dir,
        towardsBayCenter: { x: -bayDir.x, z: -bayDir.z },
      })
    : getBayEndFromBoundary({
        boundaryPoint: { x: to.x, z: to.z },
        boundaryPlaneNormal: { x: -bayDir.x, z: -bayDir.z },
        linePoint: bayLine.point,
        lineDir: bayLine.dir,
      })

  const leftPoint = {
    x: leftDerived.point.x,
    z: leftDerived.point.z,
  }

  const rightPoint = {
    x: rightDerived.point.x,
    z: rightDerived.point.z,
  }

  const centerPoint = {
    x: (leftPoint.x + rightPoint.x) / 2,
    z: (leftPoint.z + rightPoint.z) / 2,
  }

  const designOffsets = getDesignTopBottomOffsets(params.design)

  const toprailHeight = getToprailHeight(params.toprailType)
  const topBaseY = yRef + panelHeight - toprailHeight
  const bottomBaseY = yRef

  const topY = topBaseY + designOffsets.top
  const bottomY = bottomBaseY + designOffsets.bottom
  
  const { topVec, bottomVec } = getVerticalPlaneVectors({
    leftPoint,
    rightPoint,
    topY,
    bottomY,
  })

  return {
    leftVec: leftDerived.plane,
    rightVec: rightDerived.plane,
    topVec,
    bottomVec,
    leftPoint,
    rightPoint,
    centerPoint,
    derivedLength: Math.hypot(
      rightPoint.x - leftPoint.x,
      rightPoint.z - leftPoint.z
    ),
  }
}