// /app/(rs)/fabrication/deriveBayFabricationParts.ts

import type { RootState } from "@/lib/types"
import { deriveBays } from "@/lib/balustrade/deriveBays"
import type {
  FabricationExtrusionPart,
  FabricationGlassPart,
} from "./deriveFabricationParts"

function Round(n: number, d: number) {
  return Math.round(n * Math.pow(10, d)) / Math.pow(10, d)
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function cotDeg(deg: number) {
  return 1 / Math.tan(degToRad(deg))
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function norm2(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function dot2(ax: number, az: number, bx: number, bz: number) {
  return ax * bx + az * bz
}

function signedAngleXZ(
  a: { x: number; z: number },
  b: { x: number; z: number }
) {
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

function fmt0(n: number) {
  const r = Math.round(n)
  return Number.isInteger(r) ? String(r) : r.toFixed(0)
}

function getHorizontalRailMitres(
  bay: ReturnType<typeof deriveBays>[number]
) {
  const railLR = norm2(
    bay.derivedFrom.rightX - bay.derivedFrom.leftX,
    bay.derivedFrom.rightZ - bay.derivedFrom.leftZ
  )

  const railRL = {
    x: -railLR.x,
    z: -railLR.z,
  }

  const planeL = {
    x: bay.leftVec.v_x,
    z: bay.leftVec.v_z,
  }

  const planeR = {
    x: bay.rightVec.v_x,
    z: bay.rightVec.v_z,
  }

  const thetaL = signedAngleXZ(railLR, planeL)
  const thetaR = signedAngleXZ(planeR, railRL)

  return {
    hml: Round(fold0_180(90 + thetaL), 1),
    hmr: Round(fold0_180(90 + thetaR), 1),
    vml: 90,
    vmr: 90,
  }
}

function getRailBaseLength(
  bay: ReturnType<typeof deriveBays>[number]
) {
  return Math.hypot(
    bay.derivedFrom.rightX - bay.derivedFrom.leftX,
    bay.derivedFrom.rightZ - bay.derivedFrom.leftZ
  )
}

function buildPatternDrillingString(params: {
  length: number
  spacing: number
  quantity: number
  slotWidth: number
}) {
  const first = Round(
    (params.length - params.spacing * (params.quantity - 1) - params.slotWidth) / 2,
    1
  )

  return `X${first} S${params.slotWidth} C${Round(params.spacing, 1)} N${params.quantity}`
}

function getHorizontalRailsForBay(
  state: RootState,
  bay: ReturnType<typeof deriveBays>[number]
): FabricationExtrusionPart[] {
  const out: FabricationExtrusionPart[] = []

  const design = state.design
  const infillType = state.infill

  const baseLength = getRailBaseLength(bay)
  const mitres = getHorizontalRailMitres(bay)

  let drilling: string | undefined

  if (design === "RD-D3" || design === "RD-D4") {
    let spacing = 120
    const quantity = Math.ceil((baseLength - spacing + 19) / spacing)

    if (infillType === "Balusters Equally Spaced") {
      spacing = Round((baseLength + 19) / (quantity + 1), 2)
    }

    drilling = buildPatternDrillingString({
      length: baseLength,
      spacing,
      quantity,
      slotWidth: 13,
    })
  }

  if (design === "RD-D3SLATS" || design === "RD-D4SLATS") {
    let spacing = 165
    const quantity = Math.ceil((baseLength - spacing + 65) / spacing)

    if (infillType === "Slats Equally Spaced") {
      spacing = Round((baseLength + 65) / (quantity + 1), 2)
    }

    drilling = buildPatternDrillingString({
      length: baseLength,
      spacing,
      quantity,
      slotWidth: 55,
    })
  }

  const common = {
    kind: "extrusion" as const,
    subtype: "midrail" as const,
    sourceId: bay.id,
    sourceBayId: bay.id,
    sourceSegmentId: bay.segmentId,
    sourcePostId: bay.fromPostNumber ?? undefined,
    sourceX: bay.bottomVec.x,
    sourceZ: bay.bottomVec.z,
    drillingDirX: bay.to.x - bay.from.x,
    drillingDirZ: bay.to.z - bay.from.z,
    planeCenterLength: Round(baseLength, 2),
    hml: mitres.hml,
    hmr: mitres.hmr,
    vml: 90,
    vmr: 90,
  }

  if (design === "RD-D1" || design === "RD-D7" || design === "RD-D2" || design === "RD-D8") {
    out.push({
      ...common,
      partName: "Glazing Rail",
      sourceY: bay.bottomVec.y - 12,
      length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)), 2),
      drilling,
    })
  }

  if (design === "RD-D2" || design === "RD-D8") {
    out.push({
      ...common,
      partName: "Glazing Rail Top",
      sourceY: bay.topVec.y - 12,
      length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)), 2),
      drilling,
    })
  }

  if (design === "RD-D3" || design === "RD-D4" || design === "RD-D3SLATS" || design === "RD-D4SLATS") {
    out.push({
      ...common,
      partName: "U-Rail",
      sourceY: bay.bottomVec.y - 22,
      length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)), 2),
      drilling,
    })
  }

  if (design === "RD-D3" || design === "RD-D3SLATS") {
    out.push({
      ...common,
      partName: "Baluster Rail",
      sourceY: bay.topVec.y,
      length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)), 2),
      drilling,
    })
  }

  if (design === "RD-D4" || design === "RD-D4SLATS") {
    out.push({
      ...common,
      partName: "U-Rail Top",
      sourceY: bay.topVec.y,
      length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)), 2),
      drilling,
    })
  }

  if (design === "RD-D9" && infillType === "Midrail") {
    out.push({
      ...common,
      partName: "U-Rail",
      sourceY: bay.bottomVec.y - 22,
      length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)), 2),
      drilling,
    })
  }

  if (design === "RD-D5") {
    let spacer = infillType === "Slats 9mm Spacers" ? 9 : 5
    const clearHeight = bay.topVec.y - bay.bottomVec.y
    const quantity = Math.floor((clearHeight - 65.8) / (65.8 + spacer)) + 1

    for (let j = 1; j <= quantity; j++) {
      out.push({
        ...common,
        partName: "65x16 Slat",
        sourceY: Round(bay.topVec.y - (j - 0.5) * 65.8 - spacer * (j - 1), 1),
        length: Round(baseLength + 0.5 * 34 * (cotDeg(mitres.hml) + cotDeg(mitres.hmr)) - 20, 2),
        hml: 90,
        hmr: 90,
        drilling: undefined,
      })
    }
  }

  return out
}

function getVerticalsForBay(
  state: RootState,
  bay: ReturnType<typeof deriveBays>[number]
): FabricationExtrusionPart[] {
  const out: FabricationExtrusionPart[] = []

  const design = state.design
  const infillType = state.infill
  const clearHeight = bay.topVec.y - bay.bottomVec.y
  const baseLength = getRailBaseLength(bay)
  const dir = norm2(
    bay.derivedFrom.rightX - bay.derivedFrom.leftX,
    bay.derivedFrom.rightZ - bay.derivedFrom.leftZ
  )

  if (design === "RD-D3" || design === "RD-D4") {
    let spacing = 120
    const quantity = Math.ceil((baseLength - spacing + 19) / spacing)

    if (infillType === "Balusters Equally Spaced") {
      spacing = Round((baseLength + 19) / (quantity + 1), 2)
    }

    const firstOffset = -spacing * (0.5 * (quantity - 1))

    for (let j = 0; j < quantity; j++) {
      const d = firstOffset + j * spacing

      out.push({
        kind: "extrusion",
        subtype: "vertical",
        sourceId: `${bay.id}::vertical::${j}`,
        sourceBayId: bay.id,
        sourceSegmentId: bay.segmentId,
        sourcePostId: bay.fromPostNumber ?? undefined,
        sourceX: bay.derivedFrom.centerX + dir.x * d,
        sourceY: bay.bottomVec.y,
        sourceZ: bay.derivedFrom.centerZ + dir.z * d,
        partName: "19x18 Baluster",
        length: Round(clearHeight, 2),
        hml: 90,
        hmr: 90,
        vml: 90,
        vmr: 90,
      })
    }

    return out
  }

  if (design === "RD-D3SLATS" || design === "RD-D4SLATS") {
    let spacing = 165
    const quantity = Math.ceil((baseLength - spacing + 65) / spacing)

    if (infillType === "Slats Equally Spaced") {
      spacing = Round((baseLength + 65) / (quantity + 1), 2)
    }

    const firstOffset = -spacing * (0.5 * (quantity - 1))

    for (let j = 0; j < quantity; j++) {
      const d = firstOffset + j * spacing

      out.push({
        kind: "extrusion",
        subtype: "vertical",
        sourceId: `${bay.id}::vertical::${j}`,
        sourceBayId: bay.id,
        sourceSegmentId: bay.segmentId,
        sourcePostId: bay.fromPostNumber ?? undefined,
        sourceX: bay.derivedFrom.centerX + dir.x * d,
        sourceY: bay.bottomVec.y,
        sourceZ: bay.derivedFrom.centerZ + dir.z * d,
        partName: "65x16 Slat",
        length: Round(clearHeight, 2),
        hml: 90,
        hmr: 90,
        vml: 90,
        vmr: 90,
      })
    }

    return out
  }

  if (design === "RD-D5") {
    const quantity = Math.floor((clearHeight - 65.8) / (65.8 + 9)) + 1
    const length = quantity * 74.8 - 9
    const drilling = [50, 50 + (length - 100) / 2, 50 + (length - 100)].map(fmt0).join(" _ ")

    out.push({
      kind: "extrusion",
      subtype: "vertical",
      sourceId: `${bay.id}::vertical::left`,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      sourceX: bay.leftVec.x,
      sourceY: bay.topVec.y - length,
      sourceZ: bay.leftVec.z,
      drillingDirX: bay.to.x - bay.from.x,
      drillingDirZ: bay.to.z - bay.from.z,
      partName: "Slat Side Frame",
      length,
      hml: 0,
      hmr: 0,
      vml: 0,
      vmr: 0,
      drilling,
    })

    out.push({
      kind: "extrusion",
      subtype: "vertical",
      sourceId: `${bay.id}::vertical::right`,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      sourceX: bay.rightVec.x,
      sourceY: bay.topVec.y - length,
      sourceZ: bay.rightVec.z,
      drillingDirX: bay.from.x - bay.to.x,
      drillingDirZ: bay.from.z - bay.to.z,
      partName: "Slat Side Frame",
      length,
      hml: 0,
      hmr: 0,
      vml: 0,
      vmr: 0,
      drilling,
    })
  }

  return out
}

function getGlassForBay(
  state: RootState,
  bay: ReturnType<typeof deriveBays>[number]
): FabricationGlassPart[] {
  const out: FabricationGlassPart[] = []
  const design = state.design
  const infillType = state.infill
  const baseLength = getRailBaseLength(bay)
  const clearHeight = bay.topVec.y - bay.bottomVec.y

  if (design === "RD-D1" || design === "RD-D2") {
    out.push({
      kind: "glass",
      sourceId: bay.id,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      partName: "Glass Panel",
      width: Round(baseLength - 40, 0),
      height: Round(clearHeight + 9, 0),
      thickness: 6.38,
      glassType: infillType,
      polish: "All Edges",
      topEdgeAngle: 90,
      bottomEdgeAngle: 90,
      leftEdgeAngle: 90,
      rightEdgeAngle: 90,
    })
  }

  if (design === "RD-D7" || design === "RD-D8") {
    out.push({
      kind: "glass",
      sourceId: bay.id,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      partName: "Glass Panel",
      width: Round(baseLength - 40, 0),
      height: Round(clearHeight + 9, 0),
      thickness: 9.52,
      glassType: infillType,
      polish: "All Edges",
      topEdgeAngle: 90,
      bottomEdgeAngle: 90,
      leftEdgeAngle: 90,
      rightEdgeAngle: 90,
    })
  }

  if (design === "RD-D6") {
    out.push({
      kind: "glass",
      sourceId: bay.id,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      partName: "Glass Panel",
      width: Round(baseLength + 20, 0),
      height: Round(clearHeight, 0),
      thickness: 10,
      glassType: infillType,
      polish: "All Edges",
      topEdgeAngle: 90,
      bottomEdgeAngle: 90,
      leftEdgeAngle: 90,
      rightEdgeAngle: 90,
    })
  }

  if (design === "RD-D10" || design === "RD-D11") {
    out.push({
      kind: "glass",
      sourceId: bay.id,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      partName: "Glass Panel",
      width: Round(baseLength, 0),
      height: Round(clearHeight, 0),
      thickness: 12,
      glassType: infillType,
      polish: "All Edges",
      topEdgeAngle: 90,
      bottomEdgeAngle: 90,
      leftEdgeAngle: 90,
      rightEdgeAngle: 90,
    })
  }

  if (design === "RD-D12" || design === "RD-D13") {
    out.push({
      kind: "glass",
      sourceId: bay.id,
      sourceBayId: bay.id,
      sourceSegmentId: bay.segmentId,
      sourcePostId: bay.fromPostNumber ?? undefined,
      partName: "Glass Panel",
      width: Round(baseLength, 0),
      height: Round(clearHeight, 0),
      thickness: 13.52,
      glassType: infillType,
      polish: "All Edges",
      topEdgeAngle: 90,
      bottomEdgeAngle: 90,
      leftEdgeAngle: 90,
      rightEdgeAngle: 90,
    })
  }

  return out
}

export function deriveBayFabricationParts(state: RootState) {
  const bays = deriveBays({
    balcony: state.balcony,
    posts: state.posts,
    design: state.design,
    toprailType: state.toprail,
  })

  const extrusions: FabricationExtrusionPart[] = []
  const glass: FabricationGlassPart[] = []

  for (const bay of bays) {
    if (bay.suppressed) continue

    extrusions.push(...getHorizontalRailsForBay(state, bay))
    extrusions.push(...getVerticalsForBay(state, bay))
    glass.push(...getGlassForBay(state, bay))
  }

  return {
    extrusions,
    glass,
  }
}