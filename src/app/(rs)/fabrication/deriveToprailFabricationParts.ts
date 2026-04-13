// /app/(rs)/fabrication/deriveToprailFabricationParts.ts
import type { RootState, FramelessToprailType, ToprailTerminationType } from "@/lib/types"
import { buildToprailPieces, getToprailProfileMm } from "@/lib/toprail"
import { getToprailClipPlanesForPiece } from "@/lib/render3d/toprailClipping"
import { designIsFrameless } from "@/lib/jobDesignRules"
import type { FabricationComponentPart, FabricationExtrusionPart } from "./deriveFabricationParts"

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function cotDeg(deg: number) {
  return 1 / Math.tan(degToRad(deg))
}

function norm2(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function dot2(ax: number, az: number, bx: number, bz: number) {
  return ax * bx + az * bz
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function signedAngleXZ(a: { x: number; z: number }, b: { x: number; z: number }) {
  const na = norm2(a.x, a.z)
  const nb = norm2(b.x, b.z)
  const d = clamp(dot2(na.x, na.z, nb.x, nb.z), -1, 1)
  const c = na.x * nb.z - na.z * nb.x
  return (Math.atan2(c, d) * 180) / Math.PI
}

function fold0_180(deg: number) {
  let a = deg % 360
  if (a < 0) a += 360
  if (a > 180) a = 360 - a
  return a
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
      return null
  }
}

function normalizeToprailType(toprailType: string | null | undefined) {
  return typeof toprailType === "string" ? toprailType.trim() : null
}

function getToprailEndCapPartName(toprailType: string | null | undefined) {
  switch (normalizeToprailType(toprailType)) {
    case "Elite":
      return "End Cap Elite"
    case "Slenderline":
      return "End Cap Slenderline"
    case "Oval":
      return "End Cap Oval"
    case "Round":
      return "End Cap Round"
    default:
      return "End Cap" + normalizeToprailType(toprailType)
  }
}

function getToprailWallCapPartName(toprailType: string | null | undefined) {
  switch (normalizeToprailType(toprailType)) {
    case "Elite":
      return "Wall Cap Elite"
    default:
      return  "Wall Cap" + normalizeToprailType(toprailType)
  }
}

function getRunStartSegmentId(balconyId: string, runIndex: number) {
  return runIndex === 0
    ? `${balconyId}-seg-0`
    : `${balconyId}-run-${runIndex}-seg-0`
}

function getRunEndSegmentId(params: {
  balconyId: string
  runIndex: number
  runPath: Array<{ x: number; z: number }>
}) {
  const lastSegIndex = Math.max(0, params.runPath.length - 2)

  return params.runIndex === 0
    ? `${params.balconyId}-seg-${lastSegIndex}`
    : `${params.balconyId}-run-${params.runIndex}-seg-${lastSegIndex}`
}

function getToprailEndExtensionLimits(
  isFramelessDesignActive: boolean,
  postWidth: number
) {
  const framelessGap = 10

  return {
    min: isFramelessDesignActive ? -framelessGap : postWidth / 2,
    max: 200,
  }
}

function getSegmentIdForRun(params: {
  balconyId: string
  runIndex: number
  segIndex: number
}) {
  return params.runIndex === 0
    ? `${params.balconyId}-seg-${params.segIndex}`
    : `${params.balconyId}-run-${params.runIndex}-seg-${params.segIndex}`
}

function getMitresForPiece(params: {
  piece: { start: { x: number; z: number }; end: { x: number; z: number } }
  leftPlane: { v_x: number; v_z: number } | null
  rightPlane: { v_x: number; v_z: number } | null
}) {
  const railLR = norm2(
    params.piece.end.x - params.piece.start.x,
    params.piece.end.z - params.piece.start.z
  )

  const railRL = {
    x: -railLR.x,
    z: -railLR.z,
  }

  const planeL = params.leftPlane
    ? norm2(params.leftPlane.v_x, params.leftPlane.v_z)
    : railLR

  const planeR = params.rightPlane
    ? norm2(params.rightPlane.v_x, params.rightPlane.v_z)
    : railRL

  const thetaL = signedAngleXZ(railLR, planeL)
  const thetaR = signedAngleXZ(planeR, railRL)

  return {
    hml: round2(fold0_180(90 + thetaL)),
    hmr: round2(fold0_180(90 + thetaR)),
    vml: 90,
    vmr: 90,
  }
}

export function deriveToprailFabricationParts(state: RootState): FabricationExtrusionPart[] {
  const out: FabricationExtrusionPart[] = []

  const isFramelessDesignActive = designIsFrameless(state.design)
  const hasFramelessToprail =
    isFramelessDesignActive &&
    state.balcony.framelessToprailType != null &&
    state.balcony.framelessToprailType !== "None"

  const shouldRenderToprail =
    state.hasDerivedBalustrade &&
    (!isFramelessDesignActive || hasFramelessToprail)

  if (!shouldRenderToprail) return out

  const resolvedToprailType = isFramelessDesignActive
    ? (state.balcony.framelessToprailType as FramelessToprailType | null | undefined)
    : state.toprail

  const partName = getToprailPartName(resolvedToprailType)
  if (!partName) return out

  const profile = getToprailProfileMm({
    toprailType: resolvedToprailType,
    isFrameless: isFramelessDesignActive,
    framelessToprailHeight: state.balcony.framelessToprailHeight,
  })

  const runs =
    state.balcony.balustradePaths?.length
      ? state.balcony.balustradePaths
      : [state.balcony.balustradePath]

  const postW = 45

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!runPath || runPath.length < 2) continue

    const runBalcony = {
      ...state.balcony,
      id: runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`,
      balustradePath: runPath,
    }

    const runEndExt =
      state.balcony.endExtensionsByRun?.[runIndex] ??
      state.balcony.endExtensions

    const pieces = buildToprailPieces({
      balcony: runBalcony as any,
      posts: state.posts,
      profile,
      rules: {
        stockLen: 5500,
        postWidth: postW,
        endExtMin: getToprailEndExtensionLimits(isFramelessDesignActive, postW).min,
        endExtMax: getToprailEndExtensionLimits(isFramelessDesignActive, postW).max,
        joinOffset: postW / 2,
      },
      design: state.design,
      state,
      endExtensions: runEndExt,
    })

    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
      const piece = pieces[pieceIndex]
      const dx = piece.end.x - piece.start.x
      const dz = piece.end.z - piece.start.z
      const len = Math.hypot(dx, dz)
      if (!Number.isFinite(len) || len < 1e-3) continue

      const { leftPlane, rightPlane } = getToprailClipPlanesForPiece({
        pieces,
        pieceIndex,
        runPath,
        y: state.balcony.topY,
      })

      const mitres = getMitresForPiece({
        piece,
        leftPlane,
        rightPlane,
      })

      const cutLength = round2(
        len + 0.5 * profile.width * (cotDeg(mitres.hml) + cotDeg(mitres.hmr))
      )

      out.push({
        kind: "extrusion",
        subtype: "toprail",
        sourceId: `toprail-r${runIndex}-p${pieceIndex}`,
        sourceSegmentId: getSegmentIdForRun({
          balconyId: state.balcony.id,
          runIndex,
          segIndex: piece.segIndex,
        }),
        partName,
        sourceX: (piece.start.x + piece.end.x) / 2,
        sourceY: state.balcony.topY,
        sourceZ: (piece.start.z + piece.end.z) / 2,
        planeCenterLength: round2(len),
        length: cutLength,
        hml: mitres.hml,
        hmr: mitres.hmr,
        vml: 90,
        vmr: 90,
      })
    }
  }

  return out
}

export function deriveToprailComponentFabricationParts(state: RootState): FabricationComponentPart[] {
  const out: FabricationComponentPart[] = []

  const isFramelessDesignActive = designIsFrameless(state.design)
  const hasFramelessToprail =
    isFramelessDesignActive &&
    state.balcony.framelessToprailType != null &&
    state.balcony.framelessToprailType !== "None"

  const shouldRenderToprail =
    state.hasDerivedBalustrade &&
    (!isFramelessDesignActive || hasFramelessToprail)

  if (!shouldRenderToprail) return out
  if (isFramelessDesignActive) return out

  const resolvedToprailType = state.toprail
  const endCapPartName = getToprailEndCapPartName(resolvedToprailType)
  const wallCapPartName = getToprailWallCapPartName(resolvedToprailType)

  const runs =
    state.balcony.balustradePaths?.length
      ? state.balcony.balustradePaths
      : [state.balcony.balustradePath]

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!runPath || runPath.length < 2) continue

    const runTerminationTypes =
      state.balcony.toprailTerminationTypesByRun?.[runIndex] ??
      state.balcony.toprailTerminationTypes

    const startTermination = runTerminationTypes?.start
    const endTermination = runTerminationTypes?.end

    const pushTerminationComponent = (
      end: "start" | "end",
      terminationType: ToprailTerminationType | undefined,
      segmentId: string
    ) => {
      const partName =
        terminationType === "WC"
          ? wallCapPartName
          : terminationType === "EC"
          ? endCapPartName
          : null

      if (!partName) return

      out.push({
        kind: "component",
        sourceId: `toprail-r${runIndex}-${end}-${terminationType}`,
        sourceSegmentId: segmentId,
        partName,
        qty: 1,
      })
    }

    pushTerminationComponent(
      "start",
      startTermination,
      getRunStartSegmentId(state.balcony.id, runIndex)
    )

    pushTerminationComponent(
      "end",
      endTermination,
      getRunEndSegmentId({
        balconyId: state.balcony.id,
        runIndex,
        runPath,
      })
    )
  }

  return out
}