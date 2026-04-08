// /app/(rs)/fabrication/deriveFabricationFromEditor.ts

import type { RootState } from "@/lib/types"
import { derivePostDisplayNumbers } from "@/lib/balustrade/deriveBays"
import { buildToprailPieces, getToprailProfileMm } from "@/lib/toprail"
import { deriveBayFabricationParts } from "./deriveBayFabricationParts"
import { applyPostDrillingToFabricationParts } from "./derivePostDrilling"
import {
  FabricationPart,
  FabricationExtrusionPart,
} from "./deriveFabricationParts"

function getPostPartName(profileSize?: number) {
  if (profileSize === 46) return "PST-002"
  return "PST-001"
}

function getToprailPartName(toprailType: string | null | undefined) {
  switch (toprailType) {
    case "Elite":
      return "Elite Toprail"
    case "Slenderline":
      return "Slenderline Toprail"
    case "Visage":
      return "Visage Toprail"
    case "Oval":
      return "Oval Toprail"
    case "Round":
      return "Round Toprail"
    case "25mm Round":
      return "25mm Round Toprail"
    case "38mm Round":
    case "38mm Handrail":
      return "38mm Round Toprail"
    case "42mm Round":
      return "42mm Round Toprail"
    case "25mm Square":
      return "25mm Square Toprail"
    default:
      return "Elite Toprail"
  }
}

export function deriveFabricationFromEditor(rootState: RootState): FabricationPart[] {
  const postNumbersById = derivePostDisplayNumbers({
    balcony: rootState.balcony,
    posts: rootState.posts,
  })

  const postPartsRaw: FabricationExtrusionPart[] = rootState.posts.map((post) => ({
    kind: "extrusion",
    subtype: "post",
    sourceId: post.id,
    sourcePostId: postNumbersById[post.id],
    sourceSegmentId: post.segmentId,
    partName: getPostPartName(post.profile?.size),
    sourceX: post.position.x,
    sourceY: post.position.yTop,
    sourceZ: post.position.z,
    height: Math.round(post.height ?? 0),
    hml: 90,
    hmr: 90,
    vml: 90,
    vmr: 90,
  }))

  const runs =
    rootState.balcony.balustradePaths?.length
      ? rootState.balcony.balustradePaths
      : [rootState.balcony.balustradePath]

  const toprailParts: FabricationExtrusionPart[] = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!runPath || runPath.length < 2) continue

    const runBalcony = {
      ...rootState.balcony,
      id: runIndex === 0 ? rootState.balcony.id : `${rootState.balcony.id}-run-${runIndex}`,
      balustradePath: runPath,
    }

    const runEndExt =
      rootState.balcony.endExtensionsByRun?.[runIndex] ??
      rootState.balcony.endExtensions

    const profile = getToprailProfileMm({
      toprailType: rootState.toprail,
      isFrameless: false,
      framelessToprailHeight: rootState.balcony.framelessToprailHeight,
    })

    const pieces = buildToprailPieces({
      balcony: runBalcony as any,
      posts: rootState.posts,
      profile,
      rules: {
        stockLen: 5500,
        postWidth: 45,
        endExtMin: 45 / 2,
        endExtMax: 200,
        joinOffset: 45 / 2,
      },
      design: rootState.design,
      state: rootState,
      endExtensions: runEndExt,
    })

    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
      const piece = pieces[pieceIndex]

      toprailParts.push({
        kind: "extrusion",
        subtype: "toprail",
        sourceId: `${runIndex}:${pieceIndex}`,
        partName: getToprailPartName(rootState.toprail),
        planeCenterLength: Math.round(piece.planeCenterLength),
        length: Math.round(piece.length),
        hml: piece.hml,
        hmr: piece.hmr,
        vml: piece.vml,
        vmr: piece.vmr,
      })
    }
  }

  const bayParts = deriveBayFabricationParts(rootState)

  const postParts = applyPostDrillingToFabricationParts({
    state: rootState,
    postParts: postPartsRaw,
    bayParts: bayParts.extrusions,
  })

  return [
    ...postParts,
    ...toprailParts,
    ...bayParts.extrusions,
    ...bayParts.glass,
  ]
}