// /app/(rs)/fabrication/derivePostFabricationParts.ts
import type { RootState } from "@/lib/types"
import { derivePostDisplayNumbers } from "@/lib/balustrade/deriveBays"
import { designIsFrameless } from "@/lib/jobDesignRules"
import type { FabricationComponentPart, FabricationExtrusionPart } from "./deriveFabricationParts"

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function getPostPartName(size: number | null | undefined) {
  return size === 46 ? "PST-002" : "PST-001"
}

function getBaseplatePartName(anchorage: string | null | undefined) {
  if (anchorage === "BP") return "BP"
  if (anchorage === "DP") return "DP"
  if (anchorage === "CD") return "CD"
  return null
}

function getPostCapPartName(params: {
  anchorage: string | null | undefined
  profileSize: number | null | undefined
}) {
  if (
    params.anchorage === "SFI" ||
    params.anchorage === "SFO" ||
    params.anchorage === "WF"
  ) {
    const size = params.profileSize === 46 ? 46 : 45
    return `${size} SQ Post Cap`
  }

  return null
}

function getPostVisualLength(params: {
  post: RootState["posts"][number]
  balcony: RootState["balcony"]
  railHeight: number
}) {
  const { post, balcony, railHeight } = params

  const visualYTop = post.position.yTop - railHeight

  const anchorageLaserHeights = Array.isArray(post.anchorageLaserHeights)
    ? post.anchorageLaserHeights.filter((v) => Number.isFinite(v))
    : []

  const shouldExtendPastAnchorage =
    post.anchorage === "SFI" || post.anchorage === "SFO"

  const anchorageExtensionBottomY =
    shouldExtendPastAnchorage && anchorageLaserHeights.length > 0
      ? balcony.laserLevelY - Math.max(...anchorageLaserHeights) - 60
      : post.position.yBottom

  const nonSideFixedBottomAdjustment =
    post.anchorage === "CD" ? -100 : post.anchorage === "BP" || post.anchorage === "DP" ? 16 : 0

  const nonSideFixedVisualYBottom =
    post.position.yBottom + nonSideFixedBottomAdjustment

  const visualYBottom = shouldExtendPastAnchorage
    ? Math.min(post.position.yBottom, anchorageExtensionBottomY)
    : nonSideFixedVisualYBottom

  return Math.max(50, visualYTop - visualYBottom)
}

export function getToprailHeight(toprailType: string | null | undefined) {
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

export function derivePostFabricationParts(state: RootState): FabricationExtrusionPart[] {
  if (designIsFrameless(state.design)) {
    return []
  }

  const postNumbersById = derivePostDisplayNumbers({
    balcony: state.balcony,
    posts: state.posts,
  })

  return state.posts.map((post) => {
    const height = getPostVisualLength({
      post,
      balcony: state.balcony,
      railHeight: getToprailHeight(state.toprail),
    })

    return {
      kind: "extrusion",
      subtype: "post",
      sourceId: post.id,
      sourcePostId: postNumbersById[post.id],
      sourceSegmentId: post.segmentId,
      partName: getPostPartName(post.profile?.size),
      sourceX: post.position.x,
      sourceY: post.position.yBottom,
      sourceZ: post.position.z,
      height: round2(height),
      hml: 0,
      hmr: 0,
      vml: 0,
      vmr: 0,
    }
  })
}

export function derivePostComponentFabricationParts(state: RootState): FabricationComponentPart[] {
  if (designIsFrameless(state.design)) {
    return []
  }

  const postNumbersById = derivePostDisplayNumbers({
    balcony: state.balcony,
    posts: state.posts,
  })

  const out: FabricationComponentPart[] = []

  for (const post of state.posts) {
    const sourcePostId = postNumbersById[post.id]

    const baseplatePartName = getBaseplatePartName(post.anchorage)

    if (baseplatePartName) {
      out.push({
        kind: "component",
        sourceId: `${post.id}::baseplate`,
        sourcePostId,
        sourceSegmentId: post.segmentId,
        partName: baseplatePartName,
        qty: 1,
      })
    }

    const postCapPartName = getPostCapPartName({
      anchorage: post.anchorage,
      profileSize: post.profile?.size,
    })

    if (postCapPartName) {
      out.push({
        kind: "component",
        sourceId: `${post.id}::post-cap`,
        sourcePostId,
        sourceSegmentId: post.segmentId,
        partName: postCapPartName,
        qty: 1,
        details: getPostPartName(post.profile?.size),
      })
    }
  }

  return out
}