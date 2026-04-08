// /lib/render3d/balustradeParts.ts
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"

export type BayPlaneLike = {
  x: number
  y: number
  z: number
  v_x: number
  v_y: number
  v_z: number
}

export type BalustradePartKind =
  | "post"
  | "baseplate"
  | "vertical-infill"
  | "horizontal-infill"
  | "glass"
  | "toprail"
  | "component"
  | "spigot"
  | "debug"
  | "wall"

export type BalustradePartMaterialMode =
  | "powdercoat"
  | "glass"
  | "stainless"
  | "rubber"
  | "debug"
  | "wall"

export type BalustradePartDefinition = {
  key: string
  kind: BalustradePartKind
  path: string
  axis?: "x" | "y" | "z"
  scaleMultiplier?: { x?: number; y?: number; z?: number }
  materialMode?: BalustradePartMaterialMode
  rotationOffsetDeg?: { x?: number; y?: number; z?: number }
}

const MODEL_ROOT = "/models/balustrade"

const PART_DEFS: Record<string, BalustradePartDefinition> = {
  "PST-001": {
    key: "PST-001",
    kind: "post",
    path: `${MODEL_ROOT}/posts/PST_001.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 0, z: 0 },
  },
  "PST-002": {
    key: "PST-002",
    kind: "post",
    path: `${MODEL_ROOT}/posts/PST_002.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 0, z: 0 },
  },

  "BP": {
    key: "BP",
    kind: "baseplate",
    path: `${MODEL_ROOT}/baseplates/BP_001.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "DP": {
    key: "DP",
    kind: "baseplate",
    path: `${MODEL_ROOT}/baseplates/BP_005.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "CD": {
    key: "CD",
    kind: "baseplate",
    path: `${MODEL_ROOT}/baseplates/BP_006.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },

  "19x18 Baluster": {
    key: "19x18 Baluster",
    kind: "vertical-infill",
    path: `${MODEL_ROOT}/vertical-infill/19x18_Baluster.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "powdercoat",
  },
  "65x16 Slat": {
    key: "65x16 Slat",
    kind: "vertical-infill",
    path: `${MODEL_ROOT}/vertical-infill/65x16_Slat.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "powdercoat",
  },
  "Slat Side Frame": {
    key: "Slat Side Frame",
    kind: "vertical-infill",
    path: `${MODEL_ROOT}/vertical-infill/Slat_Side_Frame.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 180, z: 0 },
  },
  "Post-002 Clipin": {
    key: "Post-002 Clipin",
    kind: "vertical-infill",
    path: `${MODEL_ROOT}/vertical-infill/Post_002_Clipin.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "powdercoat",
  },
  "Post-002 Rubber": {
    key: "Post-002 Rubber",
    kind: "vertical-infill",
    path: `${MODEL_ROOT}/vertical-infill/Post_002_Rubber.gltf`,
    axis: "y",
    scaleMultiplier: { x: 10, y: 1, z: 10 },
    materialMode: "rubber",
  },

  "U-Rail": {
    key: "U-Rail",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/U_Rail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "U-Rail Top": {
    key: "U-Rail Top",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/U_Rail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Baluster Rail": {
    key: "Baluster Rail",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/Baluster_Rail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Glazing Rail": {
    key: "Glazing Rail",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/Glazing_Rail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Glazing Rail Top": {
    key: "Glazing Rail Top",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/Glazing_Rail_Top.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "65x16 Slat Horizontal": {
    key: "65x16 Slat Horizontal",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/65x16_Slat_Horizontal.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "4mm Spline": {
    key: "4mm Spline",
    kind: "horizontal-infill",
    path: `${MODEL_ROOT}/horizontal-infill/4mm_Spline.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "rubber",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },

  "Glass Panel": {
    key: "Glass Panel",
    kind: "glass",
    path: `${MODEL_ROOT}/glass/Glass_Panel.gltf`,
    scaleMultiplier: { x: 1, y: 1, z: 1 },
    materialMode: "glass",
  },

  "Elite Toprail": {
    key: "Elite Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/Elite_Toprail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Slenderline Toprail": {
    key: "Slenderline Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/Slenderline_Toprail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Visage Toprail": {
    key: "Visage Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/Visage_Toprail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Oval Toprail": {
    key: "Oval Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/Oval_Toprail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Round Toprail": {
    key: "Round Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/Round_Toprail.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "25mm Round Toprail": {
    key: "25mm Round Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/SS-RD25-HR.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "38mm Round Toprail": {
    key: "38mm Round Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/SS-RD38-HR.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "42mm Round Toprail": {
    key: "42mm Round Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/SS-RD42-HR.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "25mm Square Toprail": {
    key: "25mm Square Toprail",
    kind: "toprail",
    path: `${MODEL_ROOT}/toprails/SS-SQ25-HR.gltf`,
    axis: "z",
    scaleMultiplier: { x: 10, y: 10, z: 1 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },

  "End Cap Elite": {
    key: "End Cap Elite",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/End_Cap_Elite.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "End Cap Slenderline": {
    key: "End Cap Slenderline",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/End_Cap_Slenderline.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "End Cap Oval": {
    key: "End Cap Oval",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/End_Cap_Oval.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "End Cap Round": {
    key: "End Cap Round",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/End_Cap_Round.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Wall Cap Elite": {
    key: "Wall Cap Elite",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/Wall_Cap_Elite.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "powdercoat",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "SF Anchor": {
    key: "SF Anchor",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/SF_Anchor.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "PST-002 Glass Cushion": {
    key: "PST-002 Glass Cushion",
    kind: "component",
    path: `${MODEL_ROOT}/caps-and-components/46x46_Post_Glass_Cushion.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "rubber",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },

  "Spigot_RDTF": {
    key: "Spigot_RDTF",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/D10-Spigot-RDTF.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Spigot_SQTF": {
    key: "Spigot_SQTF",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/D10-Spigot-SQTF.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Spigot_RDCD": {
    key: "Spigot_RDCD",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/D10-Spigot-RDCD.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Spigot_SQCD": {
    key: "Spigot_SQCD",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/D10-Spigot-SQCD.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Spigot_HDTF": {
    key: "Spigot_HDTF",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/D12-TF-Spigot.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Spigot_HDCD": {
    key: "Spigot_HDCD",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/D12-CD-Spigot.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
  "Spigot_SF": {
    key: "Spigot_SF",
    kind: "spigot",
    path: `${MODEL_ROOT}/spigots/SS-DIA50mmx32mm.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "stainless",
    rotationOffsetDeg: { x: 0, y: -90, z: 0 },
  },

  "Plane Arrow": {
    key: "Plane Arrow",
    kind: "debug",
    path: `${MODEL_ROOT}/debug/Plane_Arrow.gltf`,
    scaleMultiplier: { x: 10, y: 10, z: 10 },
    materialMode: "debug",
  },

  "150mm Hob": {
    key: "150mm Hob",
    kind: "wall",
    path: `${MODEL_ROOT}/walls/Block.gltf`,
    axis: "z",
    scaleMultiplier: { x: 1.5, y: 1, z: 1 },
    materialMode: "wall",
    rotationOffsetDeg: { x: 0, y: 90, z: 0 },
  },
}

const SPIGOT_WHITE = "0.917647_0.917647_0.917647_0.000000_0.000000"
const SPIGOT_BLACK = "0.000000_0.000000_0.000000_0.000000_0.000000"
const SPIGOT_GREY = "0.603922_0.647059_0.686275_0.000000_0.000000"

const gltfLoader = new GLTFLoader()
const gltfSceneCache = new Map<string, Promise<THREE.Group>>()
const MODEL_TO_MM = 100

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function getAxisUnit(axis: "x" | "y" | "z" | undefined) {
  switch (axis) {
    case "x":
      return new THREE.Vector3(1, 0, 0)
    case "y":
      return new THREE.Vector3(0, 1, 0)
    case "z":
    default:
      return new THREE.Vector3(0, 0, 1)
  }
}

function getMaterialName(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return ""
  if (Array.isArray(material)) return material[0]?.name ?? ""
  return material.name ?? ""
}

function createPowdercoatMaterial(color: number) {
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    metalness: 0.0,
    roughness: 0.25,
    envMapIntensity: 1.2,
    emissive: color,
    emissiveIntensity: 0.15,
    clipShadows: true,
  })
}

function createGlassMaterial(color = 0xaaaaba, opacity = 0.15) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    clipShadows: true,
  })
}

function createRubberMaterial(color = 0x111111) {
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    metalness: 0.0,
    roughness: 0.7,
    envMapIntensity: 1.2,
    clipShadows: true,
  })
}

function createStainlessMaterial(color = 0xbfc6cc) {
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    metalness: 0.85,
    roughness: 0.25,
    envMapIntensity: 1.2,
    clipShadows: true,
  })
}

function createDebugMaterial(color = 0xcccccc, opacity = 0.2) {
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity,
    clipShadows: false,
  })
}

function createWallMaterial(color = 0x111111, opacity = 0.2) {
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity,
    clipShadows: true,
  })
}

function planeFromPlaneVec(v: BayPlaneLike) {
  const normal = new THREE.Vector3(v.v_x, v.v_y, v.v_z)
  if (normal.lengthSq() < 1e-12) {
    normal.set(0, 1, 0)
  } else {
    normal.normalize()
  }

  const point = new THREE.Vector3(v.x, v.y, v.z)
  const plane = new THREE.Plane()
  plane.setFromNormalAndCoplanarPoint(normal, point)
  return plane
}

function applyClippingPlanes(
  root: THREE.Object3D,
  planes: THREE.Plane[]
) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return

    obj.castShadow = true
    obj.receiveShadow = true

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((mat) => {
        const next = mat.clone()
        next.clippingPlanes = planes
        next.clipShadows = true
        next.needsUpdate = true
        return next
      })
      return
    }

    const next = obj.material.clone()
    next.clippingPlanes = planes
    next.clipShadows = true
    next.needsUpdate = true
    obj.material = next
  })
}

function applySingleMaterial(
  root: THREE.Object3D,
  material: THREE.Material
) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.castShadow = true
    obj.receiveShadow = true
    obj.material = material.clone()
  })
}

function applySpigotMaterials(
  root: THREE.Object3D,
  powdercoatColor: number
) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return

    obj.castShadow = true
    obj.receiveShadow = true

    const matName = getMaterialName(obj.material)

    if (matName === SPIGOT_BLACK) {
      obj.material = createRubberMaterial()
      return
    }

    if (matName === SPIGOT_GREY) {
      obj.material = createStainlessMaterial()
      return
    }

    if (matName === SPIGOT_WHITE) {
      obj.material = createStainlessMaterial()//createPowdercoatMaterial(powdercoatColor)
      return
    }

    obj.material = createStainlessMaterial()//createPowdercoatMaterial(powdercoatColor)
  })
}

async function loadScene(path: string) {
  let cached = gltfSceneCache.get(path)

  if (!cached) {
    cached = gltfLoader.loadAsync(path).then((gltf) => gltf.scene)
    gltfSceneCache.set(path, cached)
  }

  return cached
}

export async function preloadBalustradePartModels() {
  await Promise.all(
    Object.values(PART_DEFS).map((def) => loadScene(def.path))
  )
}

export function getBalustradePartDefinition(partName: string) {
  return PART_DEFS[partName] ?? null
}

export type BuildBalustradePartInstanceParams = {
  partName: string
  position?: { x?: number; y?: number; z?: number }
  rotation?: { x?: number; y?: number; z?: number }
  lengthMm?: number
  heightMm?: number
  thicknessMm?: number
  powdercoatColor?: number
  stainlessColor?: number
  leftPlane?: BayPlaneLike | null
  rightPlane?: BayPlaneLike | null
  topPlane?: BayPlaneLike | null
  bottomPlane?: BayPlaneLike | null
  extraClippingPlanes?: THREE.Plane[]
  userData?: Record<string, unknown>
}

export async function buildBalustradePartInstance(
  params: BuildBalustradePartInstanceParams
) {
  const def = getBalustradePartDefinition(params.partName)
  if (!def) return null

  const baseScene = await loadScene(def.path)
  const instance = SkeletonUtils.clone(baseScene) as THREE.Group

  if (def.kind === "spigot") {
    applySpigotMaterials(instance, params.powdercoatColor ?? 0xaaaaaa)
  } else {
    const material =
      def.materialMode === "glass"
        ? createGlassMaterial()
        : def.materialMode === "stainless"
        ? createStainlessMaterial(params.stainlessColor ?? 0xbfc6cc)
        : def.materialMode === "rubber"
        ? createRubberMaterial()
        : def.materialMode === "debug"
        ? createDebugMaterial()
        : def.materialMode === "wall"
        ? createWallMaterial()
        : createPowdercoatMaterial(params.powdercoatColor ?? 0xaaaaaa)

    applySingleMaterial(instance, material)
  }

  const sx = def.scaleMultiplier?.x ?? 1
  const sy = def.scaleMultiplier?.y ?? 1
  const sz = def.scaleMultiplier?.z ?? 1

  instance.scale.set(
    sx * MODEL_TO_MM,
    sy * MODEL_TO_MM,
    sz * MODEL_TO_MM
  )

  if (def.axis === "x" && Number.isFinite(params.lengthMm)) {
    instance.scale.x *= Number(params.lengthMm) / 100
  }

  if (def.axis === "y" && Number.isFinite(params.heightMm)) {
    instance.scale.y *= Number(params.heightMm) / 100
  }

  if (def.axis === "z" && Number.isFinite(params.lengthMm)) {
    instance.scale.z *= Number(params.lengthMm) / 100
  }

  if (def.kind === "glass") {
    if (Number.isFinite(params.thicknessMm)) {
      instance.scale.x *= Number(params.thicknessMm)
    }

    if (Number.isFinite(params.heightMm)) {
      instance.scale.y *= Number(params.heightMm) / 100
    }

    if (Number.isFinite(params.lengthMm)) {
      instance.scale.z *= Number(params.lengthMm) / 100
    }
  }

  instance.rotation.order = "YXZ"
  instance.rotation.set(
    degToRad(def.rotationOffsetDeg?.x ?? 0),
    degToRad(def.rotationOffsetDeg?.y ?? 0),
    degToRad(def.rotationOffsetDeg?.z ?? 0)
  )

  instance.position.set(
    params.position?.x ?? 0,
    params.position?.y ?? 0,
    params.position?.z ?? 0
  )

  instance.rotateX(degToRad(params.rotation?.x ?? 0))
  instance.rotateY(degToRad(params.rotation?.y ?? 0))
  instance.rotateZ(degToRad(params.rotation?.z ?? 0))

  const clippingPlanes: THREE.Plane[] = []

  if (params.leftPlane) clippingPlanes.push(planeFromPlaneVec(params.leftPlane))
  if (params.rightPlane) clippingPlanes.push(planeFromPlaneVec(params.rightPlane))
  if (params.topPlane) clippingPlanes.push(planeFromPlaneVec(params.topPlane))
  if (params.bottomPlane) clippingPlanes.push(planeFromPlaneVec(params.bottomPlane))
  if (params.extraClippingPlanes?.length) clippingPlanes.push(...params.extraClippingPlanes)

  if (clippingPlanes.length > 0) {
    applyClippingPlanes(instance, clippingPlanes)
  }

  if (params.userData) {
    instance.userData = {
      ...instance.userData,
      ...params.userData,
    }
  }

  return instance
}

export function createDebugPlaneArrow(params: {
  plane: BayPlaneLike
  color?: number
  opacity?: number
  userData?: Record<string, unknown>
}) {
  const point = new THREE.Vector3(
    params.plane.x,
    params.plane.y,
    params.plane.z
  )

  const normal = new THREE.Vector3(
    params.plane.v_x,
    params.plane.v_y,
    params.plane.v_z
  )

  if (normal.lengthSq() < 1e-12) {
    normal.set(0, 1, 0)
  } else {
    normal.normalize()
  }

  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    normal
  )

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    createDebugMaterial(params.color ?? 0xcccccc, params.opacity ?? 0.2)
  )

  mesh.position.copy(point)
  mesh.quaternion.copy(quat)
  mesh.userData = {
    kind: "debug-plane-arrow",
    ...(params.userData ?? {}),
  }

  return mesh
}

export function getToprailCutbackMm() {
  return 3
}

export function getToprailTerminationPartName(
  terminationType: "EC" | "WC",
  toprailType: string | null | undefined
) {
  if (terminationType === "EC") {
    switch (toprailType) {
      case "Elite":
        return "End Cap Elite"
      case "Slenderline":
        return "End Cap Slenderline"
      case "Oval":
        return "End Cap Oval"
      case "Round":
        return "End Cap Round"
      default:
        return null
    }
  }

  if (terminationType === "WC") {
    switch (toprailType) {
      case "Elite":
        return "Wall Cap Elite"
      case "Slenderline":
        return "Wall Cap Slenderline"
      case "Oval":
        return "Wall Cap Oval"
      case "Round":
        return "Wall Cap Round"
      default:
        return null
    }
  }

  return null
}