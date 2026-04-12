// /lib/render3d/balustrade.ts
import * as THREE from "three"
import type { Balcony, Post, RootState, FramelessSpigotType, FramelessToprailType } from "../types"
import { deriveBays } from "../balustrade/deriveBays"
import { buildBalustradePartInstance } from "./balustradeParts"
import { deriveFrameless } from "../frameless/deriveFrameless"
import { buildToprailPieces, getToprailProfileMm } from "../toprail"
import { getToprailClipPlanesForPiece  } from "./toprailClipping"

function norm2(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function clamp01(n: number) {
  return Math.max(-1, Math.min(1, n))
}

function yawFromDir(dx: number, dz: number) {
  return -Math.atan2(dz, dx)
}

function midpointXZ(a: { x: number; z: number }, b: { x: number; z: number }) {
  return {
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
  }
}

function pointFromBayPlaneVec(v: { x: number; y: number; z: number }) {
  return new THREE.Vector3(v.x, v.y, v.z)
}

function normalFromBayPlaneVec(v: { v_x: number; v_y: number; v_z: number }) {
  const n = new THREE.Vector3(v.v_x, v.v_y, v.v_z)
  if (n.lengthSq() < 1e-12) return new THREE.Vector3(0, 1, 0)
  return n.normalize()
}

function quaternionFromPlaneNormal(normal: THREE.Vector3) {
  const from = new THREE.Vector3(0, 0, 1)
  const to = normal.clone().normalize()
  return new THREE.Quaternion().setFromUnitVectors(from, to)
}

function cloneMaterial(material: THREE.Material) {
  return material.clone()
}

function getBayYaw(start: { x: number; z: number }, end: { x: number; z: number }) {
  return yawFromDir(end.x - start.x, end.z - start.z)
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

function createLinearMemberMesh(params: {
  start: { x: number; z: number }
  end: { x: number; z: number }
  y: number
  height: number
  depth: number
  material: THREE.Material
}) {
  const dx = params.end.x - params.start.x
  const dz = params.end.z - params.start.z
  const len = Math.hypot(dx, dz)
  if (!Number.isFinite(len) || len < 1e-3) return null

  const mid = midpointXZ(params.start, params.end)
  const yaw = yawFromDir(dx, dz)

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(len, params.height, params.depth),
    params.material
  )

  mesh.position.set(mid.x, params.y, mid.z)
  mesh.rotation.set(0, yaw, 0)

  return mesh
}

function createVerticalMemberMesh(params: {
  x: number
  z: number
  y: number
  height: number
  width: number
  depth: number
  yaw?: number
  material: THREE.Material
}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(params.width, params.height, params.depth),
    params.material
  )

  mesh.position.set(params.x, params.y, params.z)
  mesh.rotation.set(0, params.yaw ?? 0, 0)

  return mesh
}

function getPostPartName(post: Post) {
  if (post.profile?.size === 46) return "PST-002"
  return "PST-001"
}

function getBaseplatePartName(anchorage: string | null | undefined) {
  if (anchorage === "BP") return "BP"
  if (anchorage === "DP") return "DP"
  if (anchorage === "CD") return "CD"
  return null
}

function getFramelessSpigotPartName(spigotType: FramelessSpigotType | string | null | undefined) {
  switch (spigotType) {
    case "Spigot_RDTF":
    case "Spigot_SQTF":
    case "Spigot_RDCD":
    case "Spigot_SQCD":
    case "Spigot_HDTF":
    case "Spigot_HDCD":
    case "Spigot_SF":
      return spigotType
    default:
      return null
  }
}

function getFramelessToprailPartName(toprailType: FramelessToprailType | string | null | undefined) {
  switch (toprailType) {
    case "25mm Round":
      return "25mm Round Toprail"
    case "25mm Square":
      return "25mm Square Toprail"
    case "38mm Round":
    case "38mm Handrail":
      return "38mm Round Toprail"
    default:
      return null
  }
}

function getFramelessSpigotRotationDeg(
  start: { x: number; z: number },
  end: { x: number; z: number }
) {
  return radToDeg(getBayYaw(start, end))
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function getHorizontalInfillPartName(
  design: string | null | undefined,
  infillType: string | null | undefined
) {
  switch (design) {
    case "RD-D1":
    case "RD-D7":
      return ["Glazing Rail"]

    case "RD-D2":
    case "RD-D8":
      return ["Glazing Rail", "Glazing Rail Top"]

    case "RD-D3":
      return ["U-Rail", "Baluster Rail"]

    case "RD-D4":
      return ["U-Rail", "U-Rail Top"]

    case "RD-D3SLATS":
      return ["U-Rail", "Baluster Rail"]

    case "RD-D4SLATS":
      return ["U-Rail", "U-Rail Top"]

    case "RD-D5":
      return []

    case "RD-D9":
      return infillType === "Midrail" ? ["U-Rail"] : []

    default:
      return []
  }
}

function getVerticalInfillPartName(
  design: string | null | undefined
) {
  switch (design) {
    case "RD-D3":
    case "RD-D4":
      return "19x18 Baluster"
    case "RD-D3SLATS":
    case "RD-D4SLATS":
      return "65x16 Slat"
    case "RD-D5":
      return "Slat Side Frame"
    default:
      return null
  }
}

function getPostPowdercoatColor(params: {
  postId: string
  defaultPowdercoatColor?: number
  selectedPostIds?: string[]
  failingPostIds?: Set<string>
}) {
  const isSelected = params.selectedPostIds?.includes(params.postId) ?? false
  const isFail = params.failingPostIds?.has(params.postId) ?? false

  if (isSelected && isFail) return 0xb91c1c
  if (isSelected) return 0x2563eb
  if (isFail) return 0xdc2626
  return params.defaultPowdercoatColor ?? 0x333333
}

function getPostVisualExtents(params: {
  post: Post
  balcony: Balcony
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

  const height = Math.max(50, visualYTop - visualYBottom)

  return {
    visualYTop,
    visualYBottom,
    height,
  }
}

export async function buildBalustradePostPartMeshes(params: {
  balcony: Balcony
  posts: Post[]
  railHeight: number
  powdercoatColor?: number
  selectedPostIds?: string[]
  failingPostIds?: Set<string>
}) {
  const {
    balcony,
    posts,
    railHeight,
    powdercoatColor: defaultPowdercoatColor = 0x333333,
    selectedPostIds = [],
    failingPostIds = new Set<string>(),
  } = params

  const group = new THREE.Group()
  group.name = "balustrade-post-parts"

  for (const post of posts) {
    const partName = getPostPartName(post)
    const partPowdercoatColor = getPostPowdercoatColor({
      postId: post.id,
      defaultPowdercoatColor,
      selectedPostIds,
      failingPostIds,
    })

    const { visualYTop, visualYBottom, height } = getPostVisualExtents({
      post,
      balcony,
      railHeight,
    })

    const postInstance = await buildBalustradePartInstance({
      partName,
      position: {
        x: post.position.x,
        y: visualYBottom + height / 2,
        z: post.position.z,
      },
      rotation: {
        x: 0,
        y: -post.rotationY,
        z: 0,
      },
      heightMm: height,
      powdercoatColor: partPowdercoatColor,
      topPlane: {
        x: post.position.x,
        y: visualYTop,
        z: post.position.z,
        v_x: 0,
        v_y: -1,
        v_z: 0,
      },
      bottomPlane: {
        x: post.position.x,
        y: visualYBottom,
        z: post.position.z,
        v_x: 0,
        v_y: 1,
        v_z: 0,
      },
      userData: {
        kind: "post-part",
        postId: post.id,
      },
    })

    if (postInstance) {
      group.add(postInstance)
    }

    const baseplatePartName = getBaseplatePartName(post.anchorage)

    if (!baseplatePartName) continue

    const baseplateY =
      post.anchorage === "CD"
        ? post.position.yBottom + 1.5
        : post.position.yBottom + 8

    const baseplateInstance = await buildBalustradePartInstance({
      partName: baseplatePartName,
      position: {
        x: post.position.x,
        y: baseplateY,
        z: post.position.z,
      },
      rotation: {
        x: 0,
        y: -post.rotationY,
        z: 0,
      },
      powdercoatColor: partPowdercoatColor,
      userData: {
        kind: "post-baseplate-part",
        postId: post.id,
      },
    })

    if (baseplateInstance) {
      group.add(baseplateInstance)
    }
  }

  return group
}

export async function buildBalustradeBayAssemblyPartMeshes(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  infillType: string | null | undefined
  posts: Post[]
  powdercoatColor?: number
  selectedBayId?: string | null
  failingBayIds?: Set<string>
}) {
  const {
    balcony,
    design,
    toprailType,
    infillType,
    posts,
    powdercoatColor: defaultPowdercoatColor = 0x333333,
    selectedBayId = null,
    failingBayIds = new Set<string>(),
  } = params

  const group = new THREE.Group()
  group.name = "balustrade-bay-assembly-parts"

  const bays = deriveBays({
    balcony,
    design,
    toprailType,
    posts,
  })

  const horizontalPartNames = getHorizontalInfillPartName(design, infillType)
  const verticalPartName = getVerticalInfillPartName(design)
  const glassSpec = getGlassSpec(design)

  for (const bay of bays) {
    if (bay.suppressed) continue

    const start = {
      x: bay.derivedFrom.leftX,
      z: bay.derivedFrom.leftZ,
    }

    const end = {
      x: bay.derivedFrom.rightX,
      z: bay.derivedFrom.rightZ,
    }

    const dx = end.x - start.x
    const dz = end.z - start.z
    const len = Math.hypot(dx, dz)
    if (!Number.isFinite(len) || len < 1e-3) continue

    const yawDeg = radToDeg(getBayYaw(start, end))
    const mid = midpointXZ(start, end)

    const bottomY = bay.bottomVec.y
    const topY = bay.topVec.y
    const clearHeight = topY - bottomY
    if (!Number.isFinite(clearHeight) || clearHeight <= 1) continue

    const isSelected = selectedBayId === bay.id
    const isFail = bay.hasRailFailure || failingBayIds.has(bay.id)

    const partPowdercoatColor =
      isSelected && isFail ? 0xb91c1c :
      isSelected ? 0x2563eb :
      isFail ? 0xdc2626 :
      defaultPowdercoatColor

    const railOversizeMm = len + 200
    const verticalOversizeMm = clearHeight + 200

    for (const partName of horizontalPartNames) {
      let y = bottomY
      if (partName === "Glazing Rail") y = bottomY - 12
      if (partName === "Glazing Rail Top") y = topY - 12
      if (partName === "U-Rail") y = bottomY - 22
      if (partName === "U-Rail Top") y = topY
      if (partName === "Baluster Rail") y = topY
      if (partName === "65x16 Slat Horizontal") y = (bottomY + topY) / 2

      const instance = await buildBalustradePartInstance({
        partName,
        position: {
          x: mid.x,
          y,
          z: mid.z,
        },
        rotation: {
          x: 0,
          y: yawDeg,
          z: 0,
        },
        lengthMm: railOversizeMm,
        powdercoatColor: partPowdercoatColor,
        leftPlane: bay.leftVec,
        rightPlane: bay.rightVec,
        userData: {
          kind: "bay-assembly",
          bayId: bay.id,
          partName,
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        },
      })

      if (instance) group.add(instance)
    }

    if (design === "RD-D5") {
      const spacer = infillType === "Slats 9mm Spacers" ? 9 : 5;
      const slatHeight = 65.8;
      const quantity = Math.max(1, Math.floor((clearHeight - slatHeight) / (slatHeight + spacer)) + 1);

      for (let j = 1; j <= quantity; j++) {
        const centerY = topY - (j - 0.5) * slatHeight - spacer * (j - 1);

        const instance = await buildBalustradePartInstance({
          partName: "65x16 Slat Horizontal",
          position: {
            x: mid.x,
            y: centerY,
            z: mid.z,
          },
          rotation: {
            x: 0,
            y: yawDeg,
            z: 0,
          },
          lengthMm: railOversizeMm,
          powdercoatColor: partPowdercoatColor,
          leftPlane: bay.leftVec,
          rightPlane: bay.rightVec,
          userData: {
            kind: "bay-assembly",
            bayId: bay.id,
            partName: "65x16 Slat Horizontal",
            segmentId: bay.segmentId,
            runIndex: bay.runIndex,
            segInRun: bay.segInRun,
            hasRailFailure: bay.hasRailFailure,
          },
        });

        if (instance) group.add(instance);
      }
    }

    if (glassSpec) {
      const glassLength = len + getGlassLengthAdjustment(design)

      const glass = await buildBalustradePartInstance({
        partName: "Glass Panel",
        position: {
          x: mid.x,
          y: bottomY + clearHeight / 2,
          z: mid.z,
        },
        rotation: {
          x: 0,
          y: yawDeg + 90,
          z: 0,
        },
        lengthMm: glassLength,
        heightMm: clearHeight,
        thicknessMm: glassSpec.thickness,
        leftPlane: bay.leftVec,
        rightPlane: bay.rightVec,
        topPlane: bay.topVec,
        bottomPlane: bay.bottomVec,
        powdercoatColor: isFail ? 0xff0000 : partPowdercoatColor,
        userData: {
          kind: "bay-assembly",
          bayId: bay.id,
          partName: "Glass Panel",
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        },
      })

      if (glass) group.add(glass)
    }

    if (
      verticalPartName === "19x18 Baluster" ||
      verticalPartName === "65x16 Slat"
    ) {
      let spacing = verticalPartName === "19x18 Baluster" ? 120 : 165
      let quantity =
        verticalPartName === "19x18 Baluster"
          ? Math.max(1, Math.ceil((len - spacing + 19) / spacing))
          : Math.max(1, Math.ceil((len - spacing + 65) / spacing))

      if (verticalPartName === "19x18 Baluster" && infillType === "Balusters Equally Spaced") {
        spacing = (len + 19) / (quantity + 1)
      }

      if (verticalPartName === "65x16 Slat" && infillType === "Slats Equally Spaced") {
        spacing = (len + 65) / (quantity + 1)
      }

      const dir = norm2(dx, dz)
      const firstOffset = -spacing * (0.5 * (quantity - 1))

      for (let j = 0; j < quantity; j++) {
        const d = firstOffset + j * spacing
        const x = mid.x + dir.x * d
        const z = mid.z + dir.z * d

        const instance = await buildBalustradePartInstance({
          partName: verticalPartName,
          position: {
            x,
            y: (bottomY+topY)/2,
            z,
          },
          rotation: {
            x: 0,
            y: verticalPartName === "65x16 Slat" ? yawDeg + 90 : yawDeg,
            z: 0,
          },
          heightMm: verticalOversizeMm,
          powdercoatColor: partPowdercoatColor,
          topPlane: bay.topVec,
          bottomPlane: bay.bottomVec,
          userData: {
            kind: "bay-assembly",
            bayId: bay.id,
            partName: verticalPartName,
            segmentId: bay.segmentId,
            runIndex: bay.runIndex,
            segInRun: bay.segInRun,
            hasRailFailure: bay.hasRailFailure,
          },
        })

        if (instance) group.add(instance)
      }
    }

    if (verticalPartName === "Slat Side Frame") {
      const spacer = infillType === "Slats 9mm Spacers" ? 9 : 5
      const slatHeight = 65.8
      const quantity = Math.max(
        1,
        Math.floor((clearHeight - slatHeight) / (slatHeight + spacer)) + 1
      )
      const frameLength = quantity * 74.8 - 9

      const leftInstance = await buildBalustradePartInstance({
        partName: "Slat Side Frame",
        position: {
          x: bay.leftVec.x,
          y: topY - frameLength/2,
          z: bay.leftVec.z,
        },
        rotation: {
          x: 0,
          y: yawDeg + 90,
          z: 0,
        },
        heightMm: frameLength,
        powdercoatColor: partPowdercoatColor,
        topPlane: bay.topVec,
        bottomPlane: bay.bottomVec,
        userData: {
          kind: "bay-assembly",
          bayId: bay.id,
          partName: "Slat Side Frame",
          side: "left",
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        },
      })

      if (leftInstance) group.add(leftInstance)

      const rightInstance = await buildBalustradePartInstance({
        partName: "Slat Side Frame",
        position: {
          x: bay.rightVec.x,
          y: topY - frameLength/2,
          z: bay.rightVec.z,
        },
        rotation: {
          x: 0,
          y: yawDeg + 270,
          z: 0,
        },
        heightMm: frameLength,
        powdercoatColor: partPowdercoatColor,
        topPlane: bay.topVec,
        bottomPlane: bay.bottomVec,
        userData: {
          kind: "bay-assembly",
          bayId: bay.id,
          partName: "Slat Side Frame",
          side: "right",
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        },
      })

      if (rightInstance) group.add(rightInstance)
    }
  }

  return group
}

export async function buildFramelessPartMeshes(params: {
  state: RootState
  powdercoatColor?: number
}) {
  const {
    state,
    powdercoatColor = 0x333333,
  } = params

  const group = new THREE.Group()
  group.name = "frameless-parts"

  const derived = deriveFrameless(state)
  if (!derived.enabled) return group

  const framelessToprailType =
    state.toprail ??
    state.balcony.framelessToprailType

  const toprailPartName = getFramelessToprailPartName(framelessToprailType)
  const toprailProfile = getToprailProfileMm({
    toprailType: framelessToprailType,
    isFrameless: true,
    framelessToprailHeight: state.balcony.framelessToprailHeight,
  })

  for (const panel of derived.panels) {
    const dx = panel.end.x - panel.start.x
    const dz = panel.end.z - panel.start.z
    const len = Math.hypot(dx, dz)
    if (!Number.isFinite(len) || len < 1e-3) continue

    const yawDeg = radToDeg(getBayYaw(panel.start, panel.end))
    const mid = midpointXZ(panel.start, panel.end)

    const glass = await buildBalustradePartInstance({
      partName: "Glass Panel",
      position: {
        x: mid.x,
        y: panel.glassBottomY + panel.glassHeight / 2,
        z: mid.z,
      },
      rotation: {
        x: 0,
        y: yawDeg + 90,
        z: 0,
      },
      lengthMm: panel.length,
      heightMm: panel.glassHeight,
      thicknessMm: panel.glassThickness,
      leftPlane: {
        x: panel.start.x,
        y: panel.glassBottomY,
        z: panel.start.z,
        v_x: panel.leftPlaneDir.x,
        v_y: 0,
        v_z: panel.leftPlaneDir.z,
      },
      rightPlane: {
        x: panel.end.x,
        y: panel.glassBottomY,
        z: panel.end.z,
        v_x: panel.rightPlaneDir.x,
        v_y: 0,
        v_z: panel.rightPlaneDir.z,
      },
      topPlane: {
        x: mid.x,
        y: panel.glassTopY,
        z: mid.z,
        v_x: 0,
        v_y: -1,
        v_z: 0,
      },
      bottomPlane: {
        x: mid.x,
        y: panel.glassBottomY,
        z: mid.z,
        v_x: 0,
        v_y: 1,
        v_z: 0,
      },
      userData: {
        kind: "frameless-panel",
        panelId: panel.id,
      },
    })

    if (glass) group.add(glass)

    const renderSpigotSide = async (
      spigot: typeof panel.leftSpigot,
      side: "left" | "right"
    ) => {
      const spigotPartName = getFramelessSpigotPartName(spigot.type)
      if (!spigotPartName) return

      const rotationY = getFramelessSpigotRotationDeg(panel.start, panel.end)

      if (spigot.type === "Spigot_SF") {
        const laserHeights = Array.isArray(spigot.anchorageLaserHeights)
          ? spigot.anchorageLaserHeights.filter((v) => Number.isFinite(v))
          : []

        for (let i = 0; i < laserHeights.length; i++) {
          const laserHeight = Number(laserHeights[i])
          const y = state.balcony.laserLevelY - laserHeight

          const instance = await buildBalustradePartInstance({
            partName: spigotPartName,
            position: {
              x: spigot.x,
              y,
              z: spigot.z,
            },
            rotation: {
              x: 0,
              y: rotationY,
              z: 0,
            },
            powdercoatColor,
            userData: {
              kind: "frameless-spigot",
              panelId: panel.id,
              side,
              anchorIndex: i,
            },
          })

          if (instance) group.add(instance)
        }

        return
      }

      const instance = await buildBalustradePartInstance({
        partName: spigotPartName,
        position: {
          x: spigot.x,
          y: spigot.supportY,
          z: spigot.z,
        },
        rotation: {
          x: 0,
          y: rotationY,
          z: 0,
        },
        powdercoatColor,
        userData: {
          kind: "frameless-spigot",
          panelId: panel.id,
          side,
        },
      })

      if (instance) group.add(instance)
    }

    await renderSpigotSide(panel.leftSpigot, "left")
    await renderSpigotSide(panel.rightSpigot, "right")
  }

  if (toprailPartName && toprailProfile.width > 0) {
    const runs =
      state.balcony.balustradePaths?.length
        ? state.balcony.balustradePaths
        : [state.balcony.balustradePath]

    const postW = 45
    const toprailY = state.balcony.topY - toprailProfile.height / 2

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
        profile: toprailProfile,
        rules: {
          stockLen: 5500,
          postWidth: postW,
          endExtMin: getToprailEndExtensionLimits(true, postW).min,
          endExtMax: getToprailEndExtensionLimits(true, postW).max,
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
        if (len < 1e-3) continue

        const yawDeg = -THREE.MathUtils.radToDeg(Math.atan2(dz, dx))
        const midX = (piece.start.x + piece.end.x) / 2
        const midZ = (piece.start.z + piece.end.z) / 2

        const { leftPlane, rightPlane } = getToprailClipPlanesForPiece({
          pieces,
          pieceIndex,
          runPath,
          y: toprailY,
        })

        const toprail = await buildBalustradePartInstance({
          partName: toprailPartName,
          position: {
            x: midX,
            y: toprailY,
            z: midZ,
          },
          rotation: {
            x: 0,
            y: yawDeg,
            z: 0,
          },
          lengthMm: len + 200,
          powdercoatColor,
          leftPlane,
          rightPlane,
          userData: {
            kind: "toprail",
            runIndex,
            pieceIndex,
          },
        })

        if (toprail) group.add(toprail)
      }
    }
  }

  return group
}

export function buildFramelessBayPlaneMeshes(params: {
  state: RootState
  planeSize?: number
  planeMaterial?: THREE.Material
}) {
  const {
    state,
    planeSize = 80,
  } = params

  const material =
    params.planeMaterial ??
    new THREE.MeshBasicMaterial({
      color: 0xffc107,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })

  const group = new THREE.Group()
  group.name = "frameless-bay-planes"

  const derived = deriveFrameless(state)
  if (!derived.enabled) return group

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize)

  for (const panel of derived.panels) {
    const mid = midpointXZ(panel.start, panel.end)

    const planeDefs = [
      {
        key: "left",
        vec: {
          x: panel.leftPlanePoint.x,
          y: panel.leftPlanePoint.y,
          z: panel.leftPlanePoint.z,
          v_x: panel.leftPlaneDir.x,
          v_y: panel.leftPlaneDir.y,
          v_z: panel.leftPlaneDir.z,
        },
      },
      {
        key: "right",
        vec: {
          x: panel.rightPlanePoint.x,
          y: panel.rightPlanePoint.y,
          z: panel.rightPlanePoint.z,
          v_x: panel.rightPlaneDir.x,
          v_y: panel.rightPlaneDir.y,
          v_z: panel.rightPlaneDir.z,
        },
      },
      {
        key: "top",
        vec: {
          x: mid.x,
          y: panel.glassTopY,
          z: mid.z,
          v_x: 0,
          v_y: -1,
          v_z: 0,
        },
      },
      {
        key: "bottom",
        vec: {
          x: mid.x,
          y: panel.glassBottomY,
          z: mid.z,
          v_x: 0,
          v_y: 1,
          v_z: 0,
        },
      },
    ] as const

    for (const planeDef of planeDefs) {
      const point = pointFromBayPlaneVec(planeDef.vec)
      const normal = normalFromBayPlaneVec(planeDef.vec)
      const quat = quaternionFromPlaneNormal(normal)

      const mesh = new THREE.Mesh(planeGeo, material)
      mesh.position.copy(point)
      mesh.quaternion.copy(quat)
      mesh.userData = {
        kind: "frameless-bay-plane",
        panelId: panel.id,
        plane: planeDef.key,
        segmentId: panel.segmentId,
        runIndex: panel.runIndex,
        segInRun: panel.segmentIndex,
      }

      group.add(mesh)
    }
  }

  return group
}

export function buildFramelessBayPlaneNormalLines(params: {
  state: RootState
  lineLength?: number
}) {
  const {
    state,
    lineLength = 220,
  } = params

  const group = new THREE.Group()
  group.name = "frameless-bay-plane-normal-lines"

  const derived = deriveFrameless(state)
  if (!derived.enabled) return group

  for (const panel of derived.panels) {
    const mid = midpointXZ(panel.start, panel.end)

    const planeDefs = [
      {
        key: "left",
        vec: {
          x: panel.leftPlanePoint.x,
          y: panel.leftPlanePoint.y,
          z: panel.leftPlanePoint.z,
          v_x: panel.leftPlaneDir.x,
          v_y: panel.leftPlaneDir.y,
          v_z: panel.leftPlaneDir.z,
        },
      },
      {
        key: "right",
        vec: {
          x: panel.rightPlanePoint.x,
          y: panel.rightPlanePoint.y,
          z: panel.rightPlanePoint.z,
          v_x: panel.rightPlaneDir.x,
          v_y: panel.rightPlaneDir.y,
          v_z: panel.rightPlaneDir.z,
        },
      },
      {
        key: "top",
        vec: {
          x: mid.x,
          y: panel.glassTopY,
          z: mid.z,
          v_x: 0,
          v_y: -1,
          v_z: 0,
        },
      },
      {
        key: "bottom",
        vec: {
          x: mid.x,
          y: panel.glassBottomY,
          z: mid.z,
          v_x: 0,
          v_y: 1,
          v_z: 0,
        },
      },
    ] as const

    for (const planeDef of planeDefs) {
      const start = pointFromBayPlaneVec(planeDef.vec)
      const normal = normalFromBayPlaneVec(planeDef.vec)
      const end = start.clone().add(normal.clone().multiplyScalar(lineLength))

      const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
      const material = new THREE.LineBasicMaterial({ color: 0xffc107 })

      const line = new THREE.Line(geometry, material)
      line.userData = {
        kind: "frameless-bay-plane-normal",
        panelId: panel.id,
        plane: planeDef.key,
        segmentId: panel.segmentId,
        runIndex: panel.runIndex,
        segInRun: panel.segmentIndex,
      }

      group.add(line)
    }
  }

  return group
}

function getDesignHorizontalRailDefs(
  design: string | null | undefined,
  infillType: string | null | undefined
) {
  switch (design) {
    case "RD-D1":
    case "RD-D7":
      return [
        {
          partName: "Glazing Rail",
          yMode: "bottom" as const,
          yOffset: -12,
          centerOffset: 12,
          height: 24,
          depth: 34,
        },
      ]
    case "RD-D2":
    case "RD-D8":
      return [
        {
          partName: "Glazing Rail",
          yMode: "bottom" as const,
          yOffset: -12,
          centerOffset: 12,
          height: 24,
          depth: 34,
        },
        {
          partName: "Glazing Rail Top",
          yMode: "top" as const,
          yOffset: -12,
          centerOffset: 12,
          height: 24,
          depth: 34,
        },
      ]
    case "RD-D3":
    case "RD-D3SLATS":
      return [
        {
          partName: "U-Rail",
          yMode: "bottom" as const,
          yOffset: -22,
          centerOffset: 11,
          height: 22,
          depth: 20,
        },
        {
          partName: "Baluster Rail",
          yMode: "top" as const,
          yOffset: 0,
          centerOffset: -10,
          height: 20,
          depth: 20,
        },
      ]
    case "RD-D4":
    case "RD-D4SLATS":
      return [
        {
          partName: "U-Rail",
          yMode: "bottom" as const,
          yOffset: -22,
          centerOffset: 11,
          height: 22,
          depth: 20,
        },
        {
          partName: "U-Rail Top",
          yMode: "top" as const,
          yOffset: 0,
          centerOffset: 11,
          height: 22,
          depth: 20,
        },
      ]
    case "RD-D9":
      if (infillType === "Midrail") {
        return [
          {
            partName: "U-Rail",
            yMode: "bottom" as const,
            yOffset: -22,
            centerOffset: 11,
            height: 22,
            depth: 20,
          },
        ]
      }
      return []
    default:
      return []
  }
}

function getGlassSpec(design: string | null | undefined) {
  switch (design) {
    case "RD-D1":
    case "RD-D2":
      return { thickness: 6.38 }
    case "RD-D7":
    case "RD-D8":
      return { thickness: 9.52 }
    case "RD-D6":
      return { thickness: 10 }
    case "RD-D10":
    case "RD-D11":
      return { thickness: 12 }
    case "RD-D12":
    case "RD-D13":
    case "RD-D14":
      return { thickness: 13.52 }
    default:
      return null
  }
}

function getGlassLengthAdjustment(design: string | null | undefined) {
  switch (design) {
    case "RD-D1":
    case "RD-D2":
    case "RD-D7":
    case "RD-D8":
      return -40
    case "RD-D6":
      return 20
    case "RD-D10":
    case "RD-D11":
    case "RD-D12":
    case "RD-D13":
    case "RD-D14":
      return 0
    default:
      return 0
  }
}

function getVerticalInfillMode(design: string | null | undefined) {
  switch (design) {
    case "RD-D3":
    case "RD-D4":
      return "balusters" as const
    case "RD-D3SLATS":
    case "RD-D4SLATS":
      return "slats" as const
    default:
      return null
  }
}

export function buildBalustradeBayAssemblyMeshes(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  infillType: string | null | undefined
  posts: Post[]
  okMaterial: THREE.Material
  failMaterial: THREE.Material
}) {
  const {
    balcony,
    design,
    toprailType,
    infillType,
    posts,
    okMaterial,
    failMaterial,
  } = params

  const group = new THREE.Group()
  group.name = "balustrade-bay-assemblies"

  const bays = deriveBays({
    balcony,
    design,
    toprailType,
    posts,
  })

  const horizontalDefs = getDesignHorizontalRailDefs(design, infillType)
  const glassSpec = getGlassSpec(design)
  const verticalMode = getVerticalInfillMode(design)

  for (const bay of bays) {
    if (bay.suppressed) continue

    const start = {
      x: bay.derivedFrom.leftX,
      z: bay.derivedFrom.leftZ,
    }

    const end = {
      x: bay.derivedFrom.rightX,
      z: bay.derivedFrom.rightZ,
    }

    const dx = end.x - start.x
    const dz = end.z - start.z
    const len = Math.hypot(dx, dz)
    if (!Number.isFinite(len) || len < 1e-3) continue

    const dir = norm2(dx, dz)
    const yaw = getBayYaw(start, end)
    const mid = midpointXZ(start, end)
    const bottomY = bay.bottomVec.y
    const topY = bay.topVec.y
    const clearHeight = topY - bottomY
    const glassLength = len + getGlassLengthAdjustment(design)

    const memberMaterial = bay.hasRailFailure
      ? cloneMaterial(failMaterial)
      : cloneMaterial(okMaterial)

    for (const def of horizontalDefs) {
      const centerYBase = def.yMode === "top" ? topY : bottomY
      const centerY = centerYBase + def.yOffset + def.centerOffset

      const mesh = createLinearMemberMesh({
        start,
        end,
        y: centerY,
        height: def.height,
        depth: def.depth,
        material: memberMaterial,
      })

      if (!mesh) continue

      mesh.userData = {
        kind: "bay-assembly",
        bayId: bay.id,
        partName: def.partName,
        segmentId: bay.segmentId,
        runIndex: bay.runIndex,
        segInRun: bay.segInRun,
        hasRailFailure: bay.hasRailFailure,
      }

      group.add(mesh)
    }

    if (glassSpec && clearHeight > 1 && glassLength > 1) {
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(glassLength, clearHeight, glassSpec.thickness),
        new THREE.MeshBasicMaterial({
          color: 0x0f766e,
          transparent: true,
          opacity: 0.2,
        })
      )

      glass.position.set(mid.x, bottomY + clearHeight / 2, mid.z)
      glass.rotation.set(0, yaw, 0)
      glass.userData = {
        kind: "bay-assembly",
        bayId: bay.id,
        partName: "Glass Panel",
        segmentId: bay.segmentId,
        runIndex: bay.runIndex,
        segInRun: bay.segInRun,
        hasRailFailure: bay.hasRailFailure,
      }

      group.add(glass)
    }

    if (verticalMode === "balusters" && clearHeight > 1) {
      let spacing = 120
      const quantity = Math.max(1, Math.ceil((len - spacing + 19) / spacing))

      if (infillType === "Balusters Equally Spaced") {
        spacing = (len + 19) / (quantity + 1)
      }

      const firstOffset = -spacing * (0.5 * (quantity - 1))

      for (let j = 0; j < quantity; j++) {
        const d = firstOffset + j * spacing
        const x = mid.x + dir.x * d
        const z = mid.z + dir.z * d

        const mesh = createVerticalMemberMesh({
          x,
          z,
          y: bottomY + clearHeight / 2,
          height: clearHeight,
          width: 19,
          depth: 18,
          yaw,
          material: memberMaterial,
        })

        mesh.userData = {
          kind: "bay-assembly",
          bayId: bay.id,
          partName: "19x18 Baluster",
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        }

        group.add(mesh)
      }
    }

    if (verticalMode === "slats" && clearHeight > 1) {
      let spacing = 165
      const quantity = Math.max(1, Math.ceil((len - spacing + 65) / spacing))

      if (infillType === "Slats Equally Spaced") {
        spacing = (len + 65) / (quantity + 1)
      }

      const firstOffset = -spacing * (0.5 * (quantity - 1))

      for (let j = 0; j < quantity; j++) {
        const d = firstOffset + j * spacing
        const x = mid.x + dir.x * d
        const z = mid.z + dir.z * d

        const mesh = createVerticalMemberMesh({
          x,
          z,
          y: bottomY + clearHeight / 2,
          height: clearHeight,
          width: 16,
          depth: 65,
          yaw: yaw+Math.PI/2,
          material: memberMaterial,
        })

        mesh.userData = {
          kind: "bay-assembly",
          bayId: bay.id,
          partName: "65x16 Slat",
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        }

        group.add(mesh)
      }
    }

    if (design === "RD-D5" && clearHeight > 1) {
      const spacer = infillType === "Slats 9mm Spacers" ? 9 : 5
      const slatHeight = 65.8
      const quantity = Math.max(
        1,
        Math.floor((clearHeight - slatHeight) / (slatHeight + spacer)) + 1
      )

      for (let j = 1; j <= quantity; j++) {
        const centerY = topY - (j - 0.5) * slatHeight - spacer * (j - 1)

        const mesh = createLinearMemberMesh({
          start,
          end,
          y: centerY,
          height: slatHeight,
          depth: 16,
          material: memberMaterial,
        })

        if (!mesh) continue

        mesh.userData = {
          kind: "bay-assembly",
          bayId: bay.id,
          partName: "65x16 Slat",
          segmentId: bay.segmentId,
          runIndex: bay.runIndex,
          segInRun: bay.segInRun,
          hasRailFailure: bay.hasRailFailure,
        }

        group.add(mesh)
      }
    }
  }

  return group
}

export function buildBalustradeBayPlaneMeshes(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  posts: Post[]
  planeSize?: number
  planeMaterial?: THREE.Material
  skipSuppressed?: boolean
}) {
  const {
    balcony,
    design,
    toprailType,
    posts,
    planeSize = 80,
    skipSuppressed = true,
  } = params

  const material =
    params.planeMaterial ??
    new THREE.MeshBasicMaterial({
      color: 0xffc107,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })

  const group = new THREE.Group()
  group.name = "balustrade-bay-planes"

  const bays = deriveBays({
    balcony,
    design,
    toprailType,
    posts,
  })

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize)

  for (const bay of bays) {
    if (skipSuppressed && bay.suppressed) continue

    const planeDefs = [
      { key: "left", vec: bay.leftVec },
      { key: "right", vec: bay.rightVec },
      { key: "top", vec: bay.topVec },
      { key: "bottom", vec: bay.bottomVec },
    ] as const

    for (const planeDef of planeDefs) {
      const point = pointFromBayPlaneVec(planeDef.vec)
      const normal = normalFromBayPlaneVec(planeDef.vec)
      const quat = quaternionFromPlaneNormal(normal)

      const mesh = new THREE.Mesh(planeGeo, material)
      mesh.position.copy(point)
      mesh.quaternion.copy(quat)
      mesh.userData = {
        kind: "bay-plane",
        bayId: bay.id,
        plane: planeDef.key,
        segmentId: bay.segmentId,
        runIndex: bay.runIndex,
        segInRun: bay.segInRun,
      }

      group.add(mesh)
    }
  }

  return group
}

export function buildBalustradeBayPlaneNormalLines(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  posts: Post[]
  lineLength?: number
  skipSuppressed?: boolean
}) {
  const {
    balcony,
    design,
    toprailType,
    posts,
    lineLength = 220,
    skipSuppressed = true,
  } = params

  const group = new THREE.Group()
  group.name = "balustrade-bay-plane-normal-lines"

  const bays = deriveBays({
    balcony,
    design,
    toprailType,
    posts,
  })

  for (const bay of bays) {
    if (skipSuppressed && bay.suppressed) continue

    const planeDefs = [
      { key: "left", vec: bay.leftVec },
      { key: "right", vec: bay.rightVec },
      { key: "top", vec: bay.topVec },
      { key: "bottom", vec: bay.bottomVec },
    ] as const

    for (const planeDef of planeDefs) {
      const start = pointFromBayPlaneVec(planeDef.vec)
      const normal = normalFromBayPlaneVec(planeDef.vec)
      const end = start.clone().add(normal.clone().multiplyScalar(lineLength))

      const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
      const material = new THREE.LineBasicMaterial({ color: 0xffc107 })

      const line = new THREE.Line(geometry, material)
      line.userData = {
        kind: "bay-plane-normal",
        bayId: bay.id,
        plane: planeDef.key,
        segmentId: bay.segmentId,
        runIndex: bay.runIndex,
        segInRun: bay.segInRun,
      }

      group.add(line)
    }
  }

  return group
}

export function buildBalustradeBayCenterLines(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  posts: Post[]
  okColor?: number
  failColor?: number
  skipSuppressed?: boolean
}) {
  const {
    balcony,
    design,
    toprailType,
    posts,
    okColor = 0x111827,
    failColor = 0xdc2626,
    skipSuppressed = true,
  } = params

  const group = new THREE.Group()
  group.name = "balustrade-bay-center-lines"

  const bays = deriveBays({
    balcony,
    design,
    toprailType,
    posts,
  })

  for (const bay of bays) {
    if (skipSuppressed && bay.suppressed) continue

    const start = new THREE.Vector3(
      bay.derivedFrom.leftX,
      bay.yRef,
      bay.derivedFrom.leftZ
    )

    const end = new THREE.Vector3(
      bay.derivedFrom.rightX,
      bay.yRef,
      bay.derivedFrom.rightZ
    )

    const dir = new THREE.Vector3().subVectors(end, start)
    if (dir.lengthSq() < 1e-6) continue

    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineBasicMaterial({
      color: bay.hasRailFailure ? failColor : okColor,
    })

    const line = new THREE.Line(geometry, material)
    line.userData = {
      kind: "bay-center-line",
      bayId: bay.id,
      segmentId: bay.segmentId,
      runIndex: bay.runIndex,
      segInRun: bay.segInRun,
      hasRailFailure: bay.hasRailFailure,
    }

    group.add(line)
  }

  return group
}

export function buildBalustradeBayBoxes(params: {
  balcony: Balcony
  design: string | null | undefined
  toprailType: string | null | undefined
  posts: Post[]
  railWidth: number
  panelHeightOverride?: number | null
  material?: THREE.Material
  skipSuppressed?: boolean
}) {
  const {
    balcony,
    design,
    toprailType,
    posts,
    railWidth,
    panelHeightOverride = null,
    skipSuppressed = true,
  } = params

  const material =
    params.material ??
    new THREE.MeshBasicMaterial({
      color: 0x0f766e,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    })

  const group = new THREE.Group()
  group.name = "balustrade-bay-boxes"

  const bays = deriveBays({
    balcony,
    design,
    toprailType,
    posts,
  })

  for (const bay of bays) {
    if (skipSuppressed && bay.suppressed) continue

    const start = {
      x: bay.derivedFrom.leftX,
      z: bay.derivedFrom.leftZ,
    }

    const end = {
      x: bay.derivedFrom.rightX,
      z: bay.derivedFrom.rightZ,
    }

    const dx = end.x - start.x
    const dz = end.z - start.z
    const len = Math.hypot(dx, dz)
    if (!Number.isFinite(len) || len < 1e-3) continue

    const bayHeight =
      panelHeightOverride != null && Number.isFinite(panelHeightOverride)
        ? Number(panelHeightOverride)
        : bay.panelHeight

    if (!Number.isFinite(bayHeight) || bayHeight <= 0) continue

    const mid = midpointXZ(start, end)
    const yaw = yawFromDir(dx, dz)

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(len, bayHeight, railWidth),
      material
    )

    mesh.position.set(mid.x, bay.yRef + bayHeight / 2, mid.z)
    mesh.rotation.set(0, yaw, 0)
    mesh.userData = {
      kind: "bay-box",
      bayId: bay.id,
      segmentId: bay.segmentId,
      runIndex: bay.runIndex,
      segInRun: bay.segInRun,
    }

    group.add(mesh)
  }

  return group
}