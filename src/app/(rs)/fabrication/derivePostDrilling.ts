// /app/(rs)/fabrication/derivePostDrilling.ts

import type { RootState } from "@/lib/types"
import { derivePostDisplayNumbers } from "@/lib/balustrade/deriveBays"
import type {
  FabricationExtrusionPart,
  FabricationPostDrilling,
  PostFace,
} from "./deriveFabricationParts"
import { formatPostDrilling } from "./formatPostDrilling"

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function pushUnique(arr: number[], v: number) {
  if (!arr.includes(v)) arr.push(v)
}

function pushUniqueFace(drilling: FabricationPostDrilling, face: PostFace, y: number) {
  const slot = drilling[face] ?? []
  if (!slot.includes(y)) slot.push(y)
  drilling[face] = slot
}

function pushUniqueSpecial(
  drilling: FabricationPostDrilling,
  tag: "SF" | "WF",
  face: PostFace,
  y: number
) {
  if (!drilling.special) drilling.special = {}

  const tagObj = drilling.special[tag] ?? {}
  const slot = tagObj[face] ?? []

  if (!slot.includes(y)) slot.push(y)

  tagObj[face] = slot
  drilling.special[tag] = tagObj
}

function midrailContributesToPostDrilling(partName: string) {
  const name = partName.trim()

  return (
    name === "Glazing Rail" ||
    name === "Glazing Rail Top" ||
    name === "U-Rail" ||
    name === "U-Rail Top" ||
    name === "Baluster Rail"
  )
}

function verticalContributesToPostDrilling(partName: string) {
  return partName.trim() === "Slat Side Frame"
}

function sideFramePostDrillPoints(vLength: number) {
  const mid = (vLength - 100) / 2
  return [50, 50 + mid, 50 + mid + mid].map(round1)
}

function midrailYDrilling(y: number, partName: string) {
  switch (partName) {
    case "Glazing Rail":
      return y + 4
    case "Glazing Rail Top":
      return y + 21
    case "U-Rail":
      return y + 18
    case "U-Rail Top":
      return y + 4
    case "Baluster Rail":
      return y + 4
    default:
      return y
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
      return 36
    case "42mm Round":
      return 31
    case "None":
      return 0
    default:
      return 31
  }
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function norm2(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function dot2(ax: number, az: number, bx: number, bz: number) {
  return ax * bx + az * bz
}

function getRunPaths(balcony: RootState["balcony"]) {
  return balcony.balustradePaths?.length
    ? balcony.balustradePaths
    : [balcony.balustradePath]
}

function parseRunIndexFromSegmentId(segmentId: string | null | undefined) {
  if (!segmentId) return 0
  const runMatch = segmentId.match(/-run-(\d+)-seg-\d+$/)
  if (runMatch) return Number(runMatch[1])

  const baseMatch = segmentId.match(/-seg-\d+$/)
  if (baseMatch) return 0

  return 0
}

function pointEquals2(
  a: { x: number; z: number },
  b: { x: number; z: number },
  eps = 1e-3
) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= eps
}

function getDefaultAnchorageFaceForPost(
  state: RootState,
  sourcePost: RootState["posts"][number] | null
): PostFace {
  if (!sourcePost) return "P1"

  if (sourcePost.anchorage === "SFO") return "P3"
  if (sourcePost.anchorage === "SFI") return "P4"

  if (sourcePost.anchorage === "WF") {
    const runs = getRunPaths(state.balcony)
    const runIndex = parseRunIndexFromSegmentId(sourcePost.segmentId)
    const runPath = runs[runIndex]

    if (runPath?.length) {
      const runStart = runPath[0]
      const runEnd = runPath[runPath.length - 1]

      const postXZ = { x: sourcePost.position.x, z: sourcePost.position.z }

      if (pointEquals2(postXZ, runStart)) return "P1"
      if (pointEquals2(postXZ, runEnd)) return "P2"
    }

    // normal WF default follows SF convention
    return "P3"
  }

  return "P1"
}

function getPostFaceVectors(rotationY: number) {
  const p1 = {
    x: Math.cos(degToRad(rotationY)),
    z: Math.sin(degToRad(rotationY)),
  }

  const p2 = {
    x: -p1.x,
    z: -p1.z,
  }

  const p3 = {
    x: -p1.z,
    z: p1.x,
  }

  const p4 = {
    x: p1.z,
    z: -p1.x,
  }

  return { p1, p2, p3, p4 }
}

function getClosestPostFaceForDirection(
  rotationY: number,
  dir: { x: number; z: number }
): PostFace {
  const d = norm2(dir.x, dir.z)
  const faces = getPostFaceVectors(rotationY)

  const candidates: { face: PostFace; dot: number }[] = [
    { face: "P1", dot: dot2(faces.p1.x, faces.p1.z, d.x, d.z) },
    { face: "P2", dot: dot2(faces.p2.x, faces.p2.z, d.x, d.z) },
    { face: "P3", dot: dot2(faces.p3.x, faces.p3.z, d.x, d.z) },
    { face: "P4", dot: dot2(faces.p4.x, faces.p4.z, d.x, d.z) },
  ]

  candidates.sort((a, b) => b.dot - a.dot)

  return candidates[0].face
}

function getFaceForBayPart(
  sourcePost: RootState["posts"][number] | null,
  part: FabricationExtrusionPart,
  reverse = false
): PostFace {
  if (!sourcePost) return "P1"

  if (
    typeof part.drillingDirX === "number" &&
    typeof part.drillingDirZ === "number"
  ) {
    return getClosestPostFaceForDirection(sourcePost.rotationY, {
      x: reverse ? -part.drillingDirX : part.drillingDirX,
      z: reverse ? -part.drillingDirZ : part.drillingDirZ,
    })
  }

  return "P1"
}

function getPostNumbersById(state: RootState) {
  return derivePostDisplayNumbers({
    balcony: state.balcony,
    posts: state.posts,
  })
}

function getPostByDisplayNo(state: RootState, displayNo: number) {
  const postNumbersById = getPostNumbersById(state)

  return state.posts.find((post) => postNumbersById[post.id] === displayNo) ?? null
}

function sfHeightsForPost(post: FabricationExtrusionPart) {
  const h = typeof post.height === "number" ? post.height : 0
  return [h - 60 - 150, h - 60].map(round1)
}

function wfHeightsForPost(post: FabricationExtrusionPart) {
  const h = typeof post.height === "number" ? post.height : 0
  return [100, h - 100].map(round1)
}

export function applyPostDrillingToFabricationParts(params: {
  state: RootState
  postParts: FabricationExtrusionPart[]
  bayParts: FabricationExtrusionPart[]
}) {
  const { state, postParts, bayParts } = params

  const bayPartsByPostId = new Map<number, FabricationExtrusionPart[]>()

  for (const part of bayParts) {
    if (!Number.isFinite(part.sourcePostId)) continue

    const list = bayPartsByPostId.get(part.sourcePostId!) ?? []
    list.push(part)
    bayPartsByPostId.set(part.sourcePostId!, list)
  }

  return postParts.map((postPart) => {
    const displayNo = postPart.sourcePostId

    if (!Number.isFinite(displayNo)) return postPart

    const postDisplayNo = Number(displayNo)

    const drilling: FabricationPostDrilling = {
      ...(postPart.drillingData ?? {}),
    }

    const sourcePost = getPostByDisplayNo(state, postDisplayNo)

    const postTopY =
      (typeof postPart.sourceY === "number" ? postPart.sourceY : 0) +
      (typeof postPart.height === "number" ? postPart.height : 0) -
      getToprailHeight(state.toprail)

    const sameSideParts = bayPartsByPostId.get(postDisplayNo) ?? []

    for (const part of sameSideParts) {
      if (part.subtype === "midrail" && midrailContributesToPostDrilling(part.partName)) {
        const y = Math.round(
          postTopY -
          midrailYDrilling(typeof part.sourceY === "number" ? part.sourceY : 0, part.partName)
        )

        pushUniqueFace(drilling, getFaceForBayPart(sourcePost, part), y)
      }

      if (part.subtype === "vertical" && verticalContributesToPostDrilling(part.partName)) {
        const pts = sideFramePostDrillPoints(typeof part.length === "number" ? part.length : 0)

        for (const y of pts) {
          pushUniqueFace(drilling, getFaceForBayPart(sourcePost, part), y)
        }
      }
    }

    const prevDisplayNo = postDisplayNo - 1
    const prevParts = bayPartsByPostId.get(prevDisplayNo) ?? []

    for (const part of prevParts) {
      const faceKey = getFaceForBayPart(sourcePost, part, true)

      if (part.subtype === "midrail" && midrailContributesToPostDrilling(part.partName)) {
        const y = Math.round(
          postTopY -
          midrailYDrilling(typeof part.sourceY === "number" ? part.sourceY : 0, part.partName)
        )

        pushUniqueFace(drilling, faceKey, y)
      }

      if (part.subtype === "vertical" && verticalContributesToPostDrilling(part.partName)) {
        const pts = sideFramePostDrillPoints(typeof part.length === "number" ? part.length : 0)

        for (const y of pts) {
          pushUniqueFace(drilling, faceKey, y)
        }
      }
    }

    if (sourcePost?.anchorage === "SFI" || sourcePost?.anchorage === "SFO") {
      const sfFace = getDefaultAnchorageFaceForPost(state, sourcePost)
      const sfHeights = sfHeightsForPost(postPart)

      for (const y of sfHeights) {
        pushUniqueSpecial(drilling, "SF", sfFace, y)
      }
    }

    if (sourcePost?.anchorage === "WF") {
      const wfFace = getDefaultAnchorageFaceForPost(state, sourcePost)
      const wfHeights = wfHeightsForPost(postPart)

      for (const y of wfHeights) {
        pushUniqueSpecial(drilling, "WF", wfFace, y)
      }
    }

    if (drilling.P1?.length) drilling.P1.sort((a, b) => a - b)
    if (drilling.P2?.length) drilling.P2.sort((a, b) => a - b)
    if (drilling.P3?.length) drilling.P3.sort((a, b) => a - b)
    if (drilling.P4?.length) drilling.P4.sort((a, b) => a - b)

    return {
      ...postPart,
      drillingData: drilling,
      drilling: formatPostDrilling(drilling),
    }
  })
}