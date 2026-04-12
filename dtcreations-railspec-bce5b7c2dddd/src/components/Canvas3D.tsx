// /components/Canvas3D.tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RootState } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import { buildToprailPieces, getToprailProfileMm } from "@/lib/toprail"
import {
  buildBalustradeBayAssemblyPartMeshes,
  buildBalustradeBayPlaneMeshes,
  buildBalustradeBayPlaneNormalLines,
  buildBalustradePostPartMeshes,
  buildFramelessBayPlaneMeshes,
  buildFramelessBayPlaneNormalLines,
  buildFramelessPartMeshes,
} from "@/lib/render3d/balustrade"
import { buildBalustradePartInstance, getToprailTerminationPartName } from "@/lib/render3d/balustradeParts"
import { buildFloorSlabMesh, buildEdgeWallMeshes } from "@/lib/render3d/foundation"
import { deriveBays } from "@/lib/balustrade/deriveBays"
import ConstraintInspector, { InspectorTarget } from "./ConstraintInspector"
import EditorToolbar from "./EditorToolbar"
import PostSelectionCard from "./PostSelectionCard"
import BaySelectionCard from "./BaySelectionCard"
import LaserHeightListCard from "./LaserHeightListCard"
import FramelessSelectionCard from "./FramelessSelectionCard"
import ToprailSelectionCard from "./ToprailSelectionCard"
import { deriveFrameless } from "@/lib/frameless/deriveFrameless"
import { designIsFrameless } from "@/lib/jobDesignRules"
import { getToprailClipPlanesForPiece } from "@/lib/render3d/toprailClipping"

function snap(n: number, step: number) {
  return Math.round(n / step) * step
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

function getSegmentDirById(
  balcony: RootState["balcony"],
  segId: string
) {
  const segments = deriveAllBalconySegments(balcony)
  const seg = segments.find((s) => s.id === segId)
  if (!seg) return null

  const dx = seg.end.x - seg.start.x
  const dz = seg.end.z - seg.start.z
  const len = Math.hypot(dx, dz)
  if (len < 1e-6) return null

  return { x: dx / len, z: dz / len }
}

function getPerpDirForSegment(
  balcony: RootState["balcony"],
  segId: string
) {
  const dir = getSegmentDirById(balcony, segId)
  if (!dir) return null
  return { x: dir.z, z: -dir.x }
}

function getPostNonSideFixedBottomAdjustment(anchorage: string | null | undefined) {
  if (anchorage === "CD") return -100
  if (anchorage === "BP" || anchorage === "DP") return 16
  return 0
}

function clamp01(n: number) {
  return clamp(n, -1, 1)
}

function setAxisYToDir(obj: THREE.Object3D, dir: { x: number; z: number }) {
  const from = new THREE.Vector3(0, 1, 0)
  const to = new THREE.Vector3(dir.x, 0, dir.z).normalize()
  obj.quaternion.setFromUnitVectors(from, to)
}

function setYawToPostRotation(obj: THREE.Object3D, rotationYDeg: number) {
  obj.rotation.y = -THREE.MathUtils.degToRad(rotationYDeg)
}

function applyPostRotationAroundY(obj: THREE.Object3D, rotationYDeg: number) {
  obj.rotateY(-THREE.MathUtils.degToRad(rotationYDeg))
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

function rotateDirXZ(dir: { x: number; z: number }, deg: number) {
  const rad = THREE.MathUtils.degToRad(deg)
  const c = Math.cos(rad)
  const s = Math.sin(rad)

  return {
    x: dir.x * c - dir.z * s,
    z: dir.x * s + dir.z * c,
  }
}

function getPostFaceDirection(
  post: RootState["posts"][number],
  face: "P1" | "P2" | "P3" | "P4"
) {
  const p1 = rotateDirXZ({ x: 1, z: 0 }, -post.rotationY)

  if (face === "P1") return p1
  if (face === "P2") return { x: -p1.x, z: -p1.z }
  if (face === "P3") return { x: -p1.z, z: p1.x }
  return { x: p1.z, z: -p1.x }
}

function getDefaultAnchorageFaceForPost(
  balcony: RootState["balcony"],
  post: RootState["posts"][number]
): "P1" | "P2" | "P3" | "P4" {
  if (post.anchorage === "SFO") return "P3"
  if (post.anchorage === "SFI") return "P4"

  if (post.anchorage === "WF") {
    const runs = getRunPaths(balcony)
    const runIndex = parseRunIndexFromSegmentId(post.segmentId)
    const runPath = runs[runIndex]

    if (runPath?.length) {
      const runStart = runPath[0]
      const runEnd = runPath[runPath.length - 1]
      const postXZ = { x: post.position.x, z: post.position.z }

      if (pointEquals2(postXZ, runStart)) return "P1"
      if (pointEquals2(postXZ, runEnd)) return "P2"
    }

    // default WF convention
    return "P3"
  }

  return "P1"
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

function deriveAllBalconySegments(balcony: RootState["balcony"]) {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  const out: ReturnType<typeof buildDummySegments> = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!Array.isArray(runPath) || runPath.length < 2) continue

    const runId = runIndex === 0 ? balcony.id : `${balcony.id}-run-${runIndex}`

    for (let i = 0; i < runPath.length - 1; i++) {
      const a = runPath[i]
      const b = runPath[i + 1]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const length = Math.hypot(dx, dz)
      if (length < 1e-6) continue

      out.push({
        id: `${runId}-seg-${i}`,
        start: { x: a.x, z: a.z },
        end: { x: b.x, z: b.z },
        length,
      })
    }
  }

  return out
}

type DummySegment = {
  id: string
  start: { x: number; z: number }
  end: { x: number; z: number }
  length: number
}

function buildDummySegments(): DummySegment[] {
  return []
}

function createSceneLights() {
  const group = new THREE.Group()
  group.name = "scene-lights"

  const ambient = new THREE.AmbientLight(0xffffff, 1.15)
  group.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
  keyLight.position.set(3000, 4500, 2500)
  group.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.55)
  fillLight.position.set(-2500, 2200, -1800)
  group.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.35)
  rimLight.position.set(1800, 1600, -3200)
  group.add(rimLight)

  return group
}

function getLinkedToprailTargetFromRailEnd(params: {
  state: RootState
  runIndex: number
  end: "start" | "end"
}) {
  const isFramelessDesignActive = designIsFrameless(params.state.design)

  const runs =
    params.state.balcony.balustradePaths?.length
      ? params.state.balcony.balustradePaths
      : [params.state.balcony.balustradePath]

  const runPath = runs[params.runIndex]
  if (!runPath || runPath.length < 2) return null

  const runBalcony = {
    ...params.state.balcony,
    id:
      params.runIndex === 0
        ? params.state.balcony.id
        : `${params.state.balcony.id}-run-${params.runIndex}`,
    balustradePath: runPath,
  }

  const profile = getToprailProfileMm({
    toprailType: isFramelessDesignActive
      ? params.state.balcony.framelessToprailType
      : params.state.toprail,
    isFrameless: isFramelessDesignActive,
    framelessToprailHeight: params.state.balcony.framelessToprailHeight,
  })

  const endExtMin = isFramelessDesignActive ? -10 : 45 / 2
  const endExtMax = 200

  const runEndExt =
    params.state.balcony.endExtensionsByRun?.[params.runIndex] ??
    params.state.balcony.endExtensions

  const pieces = buildToprailPieces({
    balcony: runBalcony as any,
    posts: params.state.posts,
    profile,
    rules: {
      stockLen: 5500,
      postWidth: 45,
      endExtMin,
      endExtMax,
      joinOffset: 45 / 2,
    },
    design: params.state.design,
    state: params.state,
    endExtensions: runEndExt,
  })

  if (!pieces.length) return null

  return {
    kind: "toprail" as const,
    runIndex: params.runIndex,
    pieceIndex: params.end === "start" ? 0 : pieces.length - 1,
  }
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

function getToprailTerminationTypeForRunEnd(
  balcony: RootState["balcony"],
  runIndex: number,
  end: "start" | "end"
): "EC" | "WC" {
  const byRun = balcony.toprailTerminationTypesByRun?.[runIndex]
  const legacy = balcony.toprailTerminationTypes
  return byRun?.[end] ?? legacy?.[end] ?? "EC"
}

export default function Canvas3D({
  state,
  dispatch,
  onSave,
  isSaving = false,
  saveDisabled = false,
  hoveredTarget,
  selectedTarget,
  onHoverTargetChange,
  onSelectTargetChange,
  toolbarTitle,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
  onSave?: () => void
  isSaving?: boolean
  saveDisabled?: boolean
  hoveredTarget: InspectorTarget
  selectedTarget: InspectorTarget
  onHoverTargetChange: (target: InspectorTarget) => void
  onSelectTargetChange: (target: InspectorTarget) => void
  toolbarTitle?: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)

  const canShowBalustrade = state.hasDerivedBalustrade

  const isFramelessDesignActive = designIsFrameless(state.design)
  const showPostSystem = canShowBalustrade && !isFramelessDesignActive
  const showFramelessSystem = canShowBalustrade && isFramelessDesignActive
  const hasFramelessToprail = isFramelessDesignActive && state.balcony.framelessToprailType != null && state.balcony.framelessToprailType !== "None"
  const shouldRenderToprail = canShowBalustrade && (!isFramelessDesignActive || hasFramelessToprail)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rafRef = useRef<number | null>(null)

  const raycasterRef = useRef(new THREE.Raycaster())
  const pointerNdcRef = useRef(new THREE.Vector2())

  const meshByIdRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const postPartGroupRef = useRef<THREE.Group | null>(null)
  const gizmoGroupRef = useRef<THREE.Group | null>(null)

  const debugGroupRef = useRef<THREE.Group | null>(null)

  const toprailGroupRef = useRef<THREE.Group | null>(null)

  const toprailPickGroupRef = useRef<THREE.Group | null>(null)

  const bottomRailGroupRef = useRef<THREE.Group | null>(null)

  const bayPlaneGroupRef = useRef<THREE.Group | null>(null)

  const bayPlaneNormalGroupRef = useRef<THREE.Group | null>(null)

  const floorGroupRef = useRef<THREE.Group | null>(null)

  const framelessGroupRef = useRef<THREE.Group | null>(null)

  const lightGroupRef = useRef<THREE.Group | null>(null)

  const matDefaultRef = useRef(new THREE.MeshBasicMaterial({ color: 0x333333 }))
  const matSelectedRef = useRef(new THREE.MeshBasicMaterial({ color: 0x2563eb }))
  const matFailRef = useRef(new THREE.MeshBasicMaterial({ color: 0xdc2626 }))
  const matSelectedFailRef = useRef(new THREE.MeshBasicMaterial({ color: 0xb91c1c }))
  const matPickRef = useRef(
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  )

  const matToprailRef = useRef(new THREE.MeshBasicMaterial({ color: 0x111827 }))

  const matGizmoX = useRef(new THREE.MeshBasicMaterial({ color: 0xd94f4f }))
  const matGizmoY = useRef(new THREE.MeshBasicMaterial({ color: 0x3baa57 }))
  const matGizmoZ = useRef(new THREE.MeshBasicMaterial({ color: 0x3b82f6 }))
  const matGizmoWhite = useRef(new THREE.MeshBasicMaterial({ color: 0xffffff }))

  const matDebugMitre = useRef(
    new THREE.MeshBasicMaterial({ color: 0xffc107, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  )

  const anchorGroupRef = useRef<THREE.Group | null>(null)  

  const dragRef = useRef<
    | null
    | {
        kind: "move"
        postId: string
        axis: "x" | "z" | "xz"
        planeY: number
        startHit: THREE.Vector3
        startPos: { x: number; z: number }
        sx: number
        sz: number
        dx: number
        dz: number
        nx: number
        nz: number
        segLen: number
        perp: number
        tDelta: number
      }
    | {
        kind: "rotate"
        postId: string
        startClientX: number
        startRotDeg: number
      }
    | {
        kind: "extend"
        postId: string
        startClientY: number
        startYTop: number
        yBottom: number
      }
    | {
        kind: "height"
        postId: string
        startClientY: number
        startYBottom: number
      }
    | {
        kind: "rail-extend"
        runIndex: number
        end: "start" | "end"
        planeY: number
        startHit: THREE.Vector3
        startExt: number
        dir: { x: number; z: number }
        endExtMin: number
        endExtMax: number
      }
  >(null)

  const snapXZ = 50
  const snapY = 5
  const rotateStep = 2.5

  const railW = 55
  const railH = 31
  const postW = 45

  const postsFailingBarrierHeight = useMemo(() => {
    const excludedSet = new Set(state.balcony.autoTopExcludePostIds ?? [])
    const fflY = Number.isFinite(state.foundation.fflY) ? state.foundation.fflY : 0

    return new Set(
      state.posts
        .filter((post) => {
          const minBarrierHeight =
            state.balcony.segmentConstraintsById?.[post.segmentId]?.minBarrierHeight ??
            state.balcony.minBarrierHeight

          const maxBarrierHeight =
            state.balcony.segmentConstraintsById?.[post.segmentId]?.maxBarrierHeight ??
            state.balcony.maxBarrierHeight

          const hasMin = Number.isFinite(minBarrierHeight) && minBarrierHeight > 0
          const hasMax = Number.isFinite(maxBarrierHeight) && maxBarrierHeight > 0
          if (!hasMin && !hasMax) return false

          const bottomRef = excludedSet.has(post.id) ? fflY : post.position.yBottom
          const barrierHeight = post.position.yTop - bottomRef

          if (hasMin && barrierHeight < minBarrierHeight - 1e-6) return true
          if (hasMax && barrierHeight > maxBarrierHeight + 1e-6) return true

          return false
        })
        .map((post) => post.id)
    )
  }, [
    state.posts,
    state.foundation.fflY,
    state.balcony.autoTopExcludePostIds,
    state.balcony.segmentConstraintsById,
    state.balcony.minBarrierHeight,
    state.balcony.maxBarrierHeight,
  ])

  const postsFailingBottomGap = useMemo(() => {
    return new Set(
      deriveBays({
        balcony: state.balcony,
        design: state.design,
        toprailType: state.toprail,
        posts: state.posts,
      }).flatMap((bay) => {
        const ids: string[] = []
        if (bay.fromBottomGapExceeded && bay.from.postId) ids.push(bay.from.postId)
        if (bay.toBottomGapExceeded && bay.to.postId) ids.push(bay.to.postId)
        return ids
      })
    )
  }, [state.balcony, state.design, state.toprail, state.posts])

  const postsFailingAny = useMemo(() => {
    return new Set([
      ...postsFailingBarrierHeight,
      ...postsFailingBottomGap,
    ])
  }, [postsFailingBarrierHeight, postsFailingBottomGap])

  const derivedFrameless = useMemo(() => {
    return deriveFrameless(state)
  }, [state])

  // create scene once
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf6f7f9)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 1, 100000)
    camera.position.set(3000, 3000, 3000)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.localClippingEnabled = true
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controls.update()
    controlsRef.current = controls

    const grid = new THREE.GridHelper(20000, 40)
    ;(grid.material as THREE.Material).opacity = 0.25
    ;(grid.material as THREE.Material).transparent = true
    scene.add(grid)

    const axes = new THREE.AxesHelper(2000)
    scene.add(axes)

    const lightGroup = createSceneLights()
    scene.add(lightGroup)
    lightGroupRef.current = lightGroup

    const handleResize = () => {
      const m = mountRef.current
      const r = rendererRef.current
      const c = cameraRef.current
      if (!m || !r || !c) return

      const w = m.clientWidth
      const h = m.clientHeight

      if (!w || !h) return

      r.setSize(w, h)
      c.aspect = w / h
      c.updateProjectionMatrix()
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    resizeObserver.observe(mount)

    window.addEventListener("resize", handleResize)

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      if (bottomRailGroupRef.current) {
        scene.remove(bottomRailGroupRef.current)
        bottomRailGroupRef.current = null
      }

      if (bayPlaneGroupRef.current) {
        scene.remove(bayPlaneGroupRef.current)
        bayPlaneGroupRef.current = null
      }

      if (bayPlaneNormalGroupRef.current) {
        scene.remove(bayPlaneNormalGroupRef.current)
        bayPlaneNormalGroupRef.current = null
      }

      if (toprailGroupRef.current) {
        scene.remove(toprailGroupRef.current)
        toprailGroupRef.current = null
      }

      if (toprailPickGroupRef.current) {
        scene.remove(toprailPickGroupRef.current)
        toprailPickGroupRef.current = null
      }

      if (floorGroupRef.current) {
        scene.remove(floorGroupRef.current)
        floorGroupRef.current = null
      }

      if (debugGroupRef.current) {
        scene.remove(debugGroupRef.current)
        debugGroupRef.current = null
      }

      if (gizmoGroupRef.current) {
        scene.remove(gizmoGroupRef.current)
        gizmoGroupRef.current = null
      }

      if (anchorGroupRef.current) {
        scene.remove(anchorGroupRef.current)
        anchorGroupRef.current = null
      }

      if (framelessGroupRef.current) {
        scene.remove(framelessGroupRef.current)
        framelessGroupRef.current = null
      }

      if (lightGroupRef.current) {
        scene.remove(lightGroupRef.current)
        lightGroupRef.current = null
      }

      if (postPartGroupRef.current) {
        scene.remove(postPartGroupRef.current)
        postPartGroupRef.current = null
      }

      meshByIdRef.current.forEach((mesh) => {
        mesh.geometry.dispose()
        scene.remove(mesh)
      })
      meshByIdRef.current.clear()

      controls.dispose()
      renderer.dispose()

      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)

      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
    }
  }, [])

  // sync posts -> meshes (height aware)  ✅ shortened by railH (posts end at topY-31)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const meshById = meshByIdRef.current
    if (!showPostSystem) {
      meshById.forEach((mesh) => {
        mesh.geometry.dispose()
        scene.remove(mesh)
      })
      meshById.clear()
      return
    }
    const existingIds = new Set(meshById.keys())
    const incomingIds = new Set(state.posts.map((p) => p.id))

    existingIds.forEach((id) => {
      if (!incomingIds.has(id)) {
        const mesh = meshById.get(id)
        if (mesh) {
          mesh.geometry.dispose()
          scene.remove(mesh)
        }
        meshById.delete(id)
      }
    })

    for (const post of state.posts) {
      // visual top is below topY by rail thickness
      const visualYTop = post.position.yTop - railH

      const anchorageLaserHeights = Array.isArray(post.anchorageLaserHeights)
        ? post.anchorageLaserHeights.filter((v) => Number.isFinite(v))
        : []

      const shouldExtendPastAnchorage =
        post.anchorage === "SFI" || post.anchorage === "SFO"

      const anchorageExtensionBottomY =
        shouldExtendPastAnchorage && anchorageLaserHeights.length > 0
          ? state.balcony.laserLevelY - Math.max(...anchorageLaserHeights) - 60
          : post.position.yBottom

      const nonSideFixedBottomAdjustment = getPostNonSideFixedBottomAdjustment(post.anchorage)
      const nonSideFixedVisualYBottom = post.position.yBottom + nonSideFixedBottomAdjustment

      const visualYBottom = shouldExtendPastAnchorage
        ? Math.min(post.position.yBottom, anchorageExtensionBottomY)
        : nonSideFixedVisualYBottom
      const height = Math.max(50, visualYTop - visualYBottom)

      let mesh = meshById.get(post.id)
      if (!mesh) {
        const geometry = new THREE.BoxGeometry(postW, height, postW)
        const isFail = postsFailingAny.has(post.id)
        mesh = new THREE.Mesh(geometry, matPickRef.current)
        mesh.userData.postId = post.id
        scene.add(mesh)
        meshById.set(post.id, mesh)
      } else {
        const oldH = (mesh.geometry as THREE.BoxGeometry).parameters.height
        if (Math.abs(oldH - height) > 0.001) {
          mesh.geometry.dispose()
          mesh.geometry = new THREE.BoxGeometry(postW, height, postW)
        }
      }

      mesh.position.set(post.position.x, visualYBottom + height / 2, post.position.z)
      mesh.rotation.y = -THREE.MathUtils.degToRad(post.rotationY)
      mesh.material = matPickRef.current
    }
  }, [showPostSystem, state.posts, postsFailingAny])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    let cancelled = false

    if (postPartGroupRef.current) {
      scene.remove(postPartGroupRef.current)
      postPartGroupRef.current = null
    }

    if (!showPostSystem) return

    ;(async () => {
      const g = await buildBalustradePostPartMeshes({
        balcony: state.balcony,
        posts: state.posts,
        railHeight: railH,
        powdercoatColor: state.color.hex,
        selectedPostIds: state.selectedPostIds,
        failingPostIds: postsFailingAny,
      })

      if (cancelled) return

      scene.add(g)
      postPartGroupRef.current = g
    })()

    return () => {
      cancelled = true

      if (postPartGroupRef.current) {
        scene.remove(postPartGroupRef.current)
        postPartGroupRef.current = null
      }
    }
  }, [
    showPostSystem,
    state.balcony,
    state.posts,
    state.selectedPostIds,
    postsFailingAny,
  ])

  // keep post pick meshes invisible; visible state is handled by real GLTF parts
  useEffect(() => {
    meshByIdRef.current.forEach((mesh) => {
      mesh.material = matPickRef.current
    })
  }, [state.selectedPostIds, postsFailingAny])

  // toprail render (multi-run)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    let cancelled = false

    if (toprailGroupRef.current) {
      scene.remove(toprailGroupRef.current)
      toprailGroupRef.current = null
    }

    if (toprailPickGroupRef.current) {
      scene.remove(toprailPickGroupRef.current)
      toprailPickGroupRef.current = null
    }

    if (!shouldRenderToprail || isFramelessDesignActive) return

    ;(async () => {
      const runs =
        state.balcony.balustradePaths?.length
          ? state.balcony.balustradePaths
          : [state.balcony.balustradePath]

      const g = new THREE.Group()
      g.name = "toprail"

      const pickGroup = new THREE.Group()
      pickGroup.name = "toprail-pick"

      const profile = getToprailProfileMm({
        toprailType: isFramelessDesignActive ? state.balcony.framelessToprailType : state.toprail,
        isFrameless: isFramelessDesignActive,
        framelessToprailHeight: state.balcony.framelessToprailHeight,
      })

      const y = isFramelessDesignActive
        ? state.balcony.topY - profile.height / 2
        : state.balcony.topY - profile.height
      const toprailPartName = isFramelessDesignActive ? null : getToprailPartName(state.toprail)
      const getToprailPowdercoatColor = (runIndex: number, pieceIndex: number) => {
        const isSelected =
          selectedTarget?.kind === "toprail" &&
          selectedTarget.runIndex === runIndex &&
          selectedTarget.pieceIndex === pieceIndex

        if (isSelected) return 0x2563eb

        return state.color.hex
      }

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
          if (len < 1e-3) continue

          const yawDeg = -THREE.MathUtils.radToDeg(Math.atan2(dz, dx))
          const midX = (piece.start.x + piece.end.x) / 2
          const midZ = (piece.start.z + piece.end.z) / 2

          const pickMesh = new THREE.Mesh(
            new THREE.BoxGeometry(len, Math.max(profile.height, 20), Math.max(profile.width, 20)),
            matPickRef.current
          )
          pickMesh.position.set(midX, y, midZ)
          pickMesh.rotation.set(0, -Math.atan2(dz, dx), 0)
          pickMesh.userData = {
            kind: "toprail",
            runIndex,
            pieceIndex,
          }
          pickGroup.add(pickMesh)

          const { leftPlane, rightPlane } = getToprailClipPlanesForPiece({
            pieces,
            pieceIndex,
            runPath,
            y,
          })

          if (toprailPartName) {
            const instance = await buildBalustradePartInstance({
              partName: toprailPartName,
              position: {
                x: midX,
                y,
                z: midZ,
              },
              rotation: {
                x: 0,
                y: yawDeg,
                z: 0,
              },
              lengthMm: len + 200,
              powdercoatColor: getToprailPowdercoatColor(runIndex, pieceIndex),
              leftPlane,
              rightPlane,
              userData: {
                kind: "toprail",
                runIndex,
                pieceIndex,
              },
            })

            if (instance) g.add(instance)

            const isFirstPieceInRun = pieceIndex === 0
            const isLastPieceInRun = pieceIndex === pieces.length - 1

            if (isFirstPieceInRun) {
              const startTerminationType = getToprailTerminationTypeForRunEnd(
                state.balcony,
                runIndex,
                "start"
              )

              const startTerminationPartName = getToprailTerminationPartName(
                startTerminationType,
                state.toprail
              )

              if (startTerminationPartName) {
                const startTermination = await buildBalustradePartInstance({
                  partName: startTerminationPartName,
                  position: {
                    x: piece.start.x,
                    y,
                    z: piece.start.z,
                  },
                  rotation: {
                    x: 0,
                    y: yawDeg,
                    z: 0,
                  },
                  powdercoatColor: getToprailPowdercoatColor(runIndex, pieceIndex),
                  userData: {
                    kind: "toprail-termination",
                    runIndex,
                    end: "start",
                    terminationType: startTerminationType,
                  },
                })

                if (startTermination) g.add(startTermination)
              }
            }

            if (isLastPieceInRun) {
              const endTerminationType = getToprailTerminationTypeForRunEnd(
                state.balcony,
                runIndex,
                "end"
              )

              const endTerminationPartName = getToprailTerminationPartName(
                endTerminationType,
                state.toprail
              )

              if (endTerminationPartName) {
                const endTermination = await buildBalustradePartInstance({
                  partName: endTerminationPartName,
                  position: {
                    x: piece.end.x,
                    y,
                    z: piece.end.z,
                  },
                  rotation: {
                    x: 0,
                    y: yawDeg + 180,
                    z: 0,
                  },
                  powdercoatColor: getToprailPowdercoatColor(runIndex, pieceIndex),
                  userData: {
                    kind: "toprail-termination",
                    runIndex,
                    end: "end",
                    terminationType: endTerminationType,
                  },
                })

                if (endTermination) g.add(endTermination)
              }
            }

            continue
          }

          const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, profile.height, profile.width), matToprailRef.current)
          mesh.position.set(midX, y, midZ)
          mesh.rotation.set(0, -Math.atan2(dz, dx), 0)
          mesh.userData = {
            kind: "toprail",
            runIndex,
            pieceIndex,
          }
          g.add(mesh)
        }
      }

      if (cancelled) return

      scene.add(g)
      scene.add(pickGroup)
      toprailGroupRef.current = g
      toprailPickGroupRef.current = pickGroup
    })()

    return () => {
      cancelled = true

      if (toprailGroupRef.current) {
        scene.remove(toprailGroupRef.current)
        toprailGroupRef.current = null
      }

      if (toprailPickGroupRef.current) {
        scene.remove(toprailPickGroupRef.current)
        toprailPickGroupRef.current = null
      }      
    }
  }, [
    shouldRenderToprail,
    isFramelessDesignActive,
    state.design,
    state.toprail,
    state.posts,
    state.balcony,
    state.color.hex,
    state.balcony.framelessToprailType,
    state.balcony.framelessToprailHeight,
    state.balcony.endExtensions,
    state.balcony.endExtensionsByRun,
    selectedTarget,
  ])

useEffect(() => {
  const scene = sceneRef.current
  if (!scene) return

  let cancelled = false

  if (bottomRailGroupRef.current) {
    scene.remove(bottomRailGroupRef.current)
    bottomRailGroupRef.current = null
  }

  if (!showPostSystem) return

  ;(async () => {
    const g = await buildBalustradeBayAssemblyPartMeshes({
      balcony: state.balcony,
      design: state.design,
      toprailType: state.toprail,
      infillType: state.infill,
      posts: state.posts,
      powdercoatColor: state.color.hex,
      selectedBayId: selectedTarget?.kind === "bottom-rail" ? selectedTarget.bayId : null,
    })

    if (cancelled) return

    scene.add(g)
    bottomRailGroupRef.current = g
  })()

  return () => {
    cancelled = true

    if (bottomRailGroupRef.current) {
      scene.remove(bottomRailGroupRef.current)
      bottomRailGroupRef.current = null
    }
  }
}, [
  showPostSystem,
  state.design,
  state.toprail,
  state.infill,
  state.posts,
  state.balcony,
  selectedTarget,
])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (bayPlaneGroupRef.current) {
      scene.remove(bayPlaneGroupRef.current)
      bayPlaneGroupRef.current = null
    }

    if (!state.debug.showMitrePlanes) return

    const g = showPostSystem
      ? buildBalustradeBayPlaneMeshes({
          balcony: state.balcony,
          design: state.design,
          toprailType: state.toprail,
          posts: state.posts,
          planeSize: 120,
        })
      : showFramelessSystem
      ? buildFramelessBayPlaneMeshes({
          state,
          planeSize: 120,
        })
      : null

    if (!g) return

    scene.add(g)
    bayPlaneGroupRef.current = g
  }, [
    showPostSystem,
    showFramelessSystem,
    state.debug.showMitrePlanes,
    state.design,
    state.toprail,
    state.posts,
    state.balcony,
    state,
  ])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (bayPlaneNormalGroupRef.current) {
      scene.remove(bayPlaneNormalGroupRef.current)
      bayPlaneNormalGroupRef.current = null
    }

    if (!state.debug.showMitrePlanes) return

    const g = showPostSystem
      ? buildBalustradeBayPlaneNormalLines({
          balcony: state.balcony,
          design: state.design,
          toprailType: state.toprail,
          posts: state.posts,
          lineLength: 220,
        })
      : showFramelessSystem
      ? buildFramelessBayPlaneNormalLines({
          state,
          lineLength: 220,
        })
      : null

    if (!g) return

    scene.add(g)
    bayPlaneNormalGroupRef.current = g
  }, [
    showPostSystem,
    showFramelessSystem,
    state.debug.showMitrePlanes,
    state.design,
    state.toprail,
    state.posts,
    state.balcony,
    state,
  ])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (framelessGroupRef.current) {
      scene.remove(framelessGroupRef.current)
      framelessGroupRef.current = null
    }

    if (!showFramelessSystem) return
    if (!derivedFrameless.enabled) return

    let cancelled = false

    ;(async () => {
      const g = await buildFramelessPartMeshes({
        state,
        powdercoatColor: state.color.hex,
      })

      if (cancelled) return

      scene.add(g)
      framelessGroupRef.current = g
    })()

    return () => {
      cancelled = true

      if (framelessGroupRef.current) {
        scene.remove(framelessGroupRef.current)
        framelessGroupRef.current = null
      }
    }
  }, [showFramelessSystem, state, derivedFrameless])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (anchorGroupRef.current) {
      scene.remove(anchorGroupRef.current)
      anchorGroupRef.current = null
    }

    if (!canShowBalustrade) return

    const g = new THREE.Group()
    g.name = "anchors"

    const rodDiameter = 12
    const rodRadius = rodDiameter / 2
    const rodLength = 150

    const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 12)
    const rodMat = new THREE.MeshBasicMaterial({ color: 0x6b7280 })

    const bpGeo = new THREE.BoxGeometry(80, 16, 110)
    const dpGeo = new THREE.BoxGeometry(80, 16, 110)
    const cdDressRingGeo = new THREE.CylinderGeometry(40, 40, 3, 24)

    const bpMat = new THREE.MeshBasicMaterial({ color: 0x9ca3af })
    const dpMat = new THREE.MeshBasicMaterial({ color: 0x6b7280 })
    const cdMat = new THREE.MeshBasicMaterial({ color: 0x4b5563 })

    const addPlaceholderAnchorage = (post: RootState["posts"][number]) => {
      if (post.anchorage === "BP") {
        const mesh = new THREE.Mesh(bpGeo, bpMat)
        mesh.position.set(post.position.x, post.position.yBottom + 8, post.position.z)
        setYawToPostRotation(mesh, post.rotationY)
        g.add(mesh)
        return
      }

      if (post.anchorage === "DP") {
        const mesh = new THREE.Mesh(dpGeo, dpMat)
        mesh.position.set(post.position.x, post.position.yBottom + 8, post.position.z)
        setYawToPostRotation(mesh, post.rotationY)
        g.add(mesh)
        return
      }

      if (post.anchorage === "CD") {
        const mesh = new THREE.Mesh(cdDressRingGeo, cdMat)
        mesh.position.set(post.position.x, post.position.yBottom + 1.5, post.position.z)
        setYawToPostRotation(mesh, post.rotationY)
        g.add(mesh)
      }
    }

    const addRod = (
      x: number,
      y: number,
      z: number,
      dir: { x: number; z: number }
    ) => {
      const rod = new THREE.Mesh(rodGeo, rodMat)

      rod.position.set(
        x + dir.x * (rodLength / 2),
        y,
        z + dir.z * (rodLength / 2)
      )

      setAxisYToDir(rod, dir)
      g.add(rod)
    }

    if (showPostSystem) {
      for (const post of state.posts) {
        if (post.anchorage !== "SFI" && post.anchorage !== "SFO" && post.anchorage !== "WF") continue
        if (!Array.isArray(post.anchorageLaserHeights) || !post.anchorageLaserHeights.length) continue

        const face = getDefaultAnchorageFaceForPost(state.balcony, post)
        const faceDir = getPostFaceDirection(post, face)

        const dir =
          post.anchorage === "WF"
            ? { x: -faceDir.x, z: -faceDir.z }
            : faceDir

        for (const laserHeight of post.anchorageLaserHeights) {
          if (!Number.isFinite(laserHeight)) continue
          const y = state.balcony.laserLevelY - Number(laserHeight)
          addRod(post.position.x, y, post.position.z, dir)
        }
      }
    }

    if (showFramelessSystem && derivedFrameless.enabled) {
      for (const panel of derivedFrameless.panels) {
        const segPerp = getPerpDirForSegment(state.balcony, panel.segmentId)
        if (!segPerp) continue

        const spigots = [
          panel.leftSpigot,
          panel.rightSpigot,
        ]

        for (const spigot of spigots) {
          if (!Array.isArray(spigot.anchorageLaserHeights) || !spigot.anchorageLaserHeights.length) continue

          for (const laserHeight of spigot.anchorageLaserHeights) {
            if (!Number.isFinite(laserHeight)) continue
            const y = state.balcony.laserLevelY - Number(laserHeight)
            addRod(spigot.x, y, spigot.z, segPerp)
          }
        }
      }
    }

    scene.add(g)
    anchorGroupRef.current = g
  }, [
    canShowBalustrade,
    showPostSystem,
    showFramelessSystem,
    state.posts,
    state.balcony,
    derivedFrameless,
  ])

  // foundation floor slab render (closed floors only)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (floorGroupRef.current) {
      scene.remove(floorGroupRef.current)
      floorGroupRef.current = null
    }

    const floor = state.foundation?.floor
    if (!floor?.closed) return

    const g = new THREE.Group()
    g.name = "foundation-floor"

    const fflWorldY = Number.isFinite(state.foundation.fflY) ? state.foundation.fflY : 0
    const slabThickness = 150

    const slab = buildFloorSlabMesh({
      floor,
      laserLevelY: state.balcony.laserLevelY,
      thickness: slabThickness,
    })
    if (slab) g.add(slab)

    const edges = buildEdgeWallMeshes({
      floor,
      laserLevelY: state.balcony.laserLevelY,
      slabThickness,
    })
    if (edges) g.add(edges)

    scene.add(g)
    floorGroupRef.current = g
  }, [
    state.foundation.fflY,
    JSON.stringify({
      closed: state.foundation.floor?.closed,
      verts: state.foundation.floor?.vertices?.map(v => [v.x, v.z]),
      edges: state.foundation.floor?.edges?.map(e => ({
        edgeType: (e as any)?.edgeType,
        thickness: (e as any)?.thickness,
        height: (e as any)?.height,
        offset: (e as any)?.offset,
        refType: (e as any)?.refType,
      })),
    }),
  ])

  // debug: planes at ALL toprail joins (mitres + 180 stock joins)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (debugGroupRef.current) {
      scene.remove(debugGroupRef.current)
      debugGroupRef.current = null
    }

    if (!shouldRenderToprail) return
    if (!state.debug.showMitrePlanes) return

    const g = new THREE.Group()
    g.name = "debug-toprail-join-planes"

    const planeGeo = new THREE.PlaneGeometry(80, 80)
    const debugProfile = getToprailProfileMm({
      toprailType: isFramelessDesignActive ? state.balcony.framelessToprailType : state.toprail,
      isFrameless: isFramelessDesignActive,
      framelessToprailHeight: state.balcony.framelessToprailHeight,
    })

    const y = state.balcony.topY - debugProfile.height / 2

    const runs =
      state.balcony.balustradePaths?.length
        ? state.balcony.balustradePaths
        : [state.balcony.balustradePath]

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

      // 1) Mitre planes at path vertices for this run
      if (runPath.length >= 3) {
        for (let i = 1; i < runPath.length - 1; i++) {
          const prev = runPath[i - 1]
          const v = runPath[i]
          const next = runPath[i + 1]

          const dIn = norm2(v.x - prev.x, v.z - prev.z)
          const dOut = norm2(next.x - v.x, next.z - v.z)

          const theta =
            (Math.acos(clamp01(dot2(dIn.x, dIn.z, dOut.x, dOut.z))) * 180) / Math.PI

          if (theta < 0.5) continue
          if (theta > 179.5) continue

          const nx = dIn.x + dOut.x
          const nz = dIn.z + dOut.z
          const n = norm2(nx, nz)

          const yaw = -Math.atan2(n.z, n.x) + Math.PI / 2

          const m = new THREE.Mesh(planeGeo, matDebugMitre.current)
          m.position.set(v.x, y, v.z)
          m.rotation.set(0, yaw, 0)
          g.add(m)
        }
      }

      // 2) Stock join planes for this run
      const pieces = buildToprailPieces({
        balcony: runBalcony as any,
        posts: state.posts,
        profile: debugProfile,
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

      if (pieces && pieces.length >= 2) {
        for (let i = 0; i < pieces.length - 1; i++) {
          const a = pieces[i]
          const b = pieces[i + 1]

          const dxJoin = b.start.x - a.end.x
          const dzJoin = b.start.z - a.end.z
          if (Math.hypot(dxJoin, dzJoin) > 1e-3) continue

          const dx = a.end.x - a.start.x
          const dz = a.end.z - a.start.z
          const l = Math.hypot(dx, dz)
          if (l < 1e-6) continue

          const d = norm2(dx, dz)
          const yaw = -Math.atan2(d.z, d.x) + Math.PI / 2

          const m = new THREE.Mesh(planeGeo, matDebugMitre.current)
          m.position.set(a.end.x, y, a.end.z)
          m.rotation.set(0, yaw, 0)
          g.add(m)
        }
      }
    }

    scene.add(g)
    debugGroupRef.current = g
  }, [
    shouldRenderToprail,
    isFramelessDesignActive,
    state.design,
    state.debug.showMitrePlanes,
    state.posts,
    state.balcony.balustradePath,
    state.balcony.balustradePaths,
    state.balcony.topY,
    state.balcony.endExtensions,
    state.balcony.endExtensionsByRun,
    state.balcony.framelessToprailHeight,
  ])

  // build/update gizmo (posts OR rail)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (gizmoGroupRef.current) {
      scene.remove(gizmoGroupRef.current)
      gizmoGroupRef.current = null
    }

    if (!canShowBalustrade) return
    if (state.laserHeightListEditMode) return

    // Rail end extension tool (no selection required) — multi-run
    if (state.gizmoTool === "anchor") {
      const runs = state.balcony.balustradePaths?.length ? state.balcony.balustradePaths : [state.balcony.balustradePath]
      if (!runs.length) return

      const g = new THREE.Group()
      g.name = "gizmo"
      g.userData.kind = "gizmo-root"

      const y = state.balcony.topY - railH / 2
      const { min: endExtMin, max: endExtMax } = getToprailEndExtensionLimits(
        isFramelessDesignActive,
        postW
      )

      const arrowLen = 260
      const coneGeo = new THREE.ConeGeometry(35, 90, 16)
      const shaftGeo = new THREE.CylinderGeometry(12, 12, arrowLen, 10)

      for (let runIndex = 0; runIndex < runs.length; runIndex++) {
        const path = runs[runIndex]
        if (!path || path.length < 2) continue

        const ext = state.balcony.endExtensionsByRun?.[runIndex] ?? (runIndex === 0 ? state.balcony.endExtensions : undefined)
        const startExt = clamp(ext?.start ?? endExtMin, endExtMin, endExtMax)
        const endExt = clamp(ext?.end ?? endExtMin, endExtMin, endExtMax)

        const startV = path[0]
        const startNext = path[1]
        const startDir = norm2(startNext.x - startV.x, startNext.z - startV.z)
        const startOut = { x: -startDir.x, z: -startDir.z }

        const endV = path[path.length - 1]
        const endPrev = path[path.length - 2]
        const endDir = norm2(endV.x - endPrev.x, endV.z - endPrev.z)
        const endOut = { x: endDir.x, z: endDir.z }

        {
          const sx = startV.x + startOut.x * (startExt + arrowLen / 2)
          const sz = startV.z + startOut.z * (startExt + arrowLen / 2)

          const shaft = new THREE.Mesh(shaftGeo, matGizmoWhite.current)
          shaft.position.set(sx, y, sz)
          setAxisYToDir(shaft, startOut)
          shaft.userData = { kind: "gizmo", tool: "anchor", end: "start", runIndex }
          g.add(shaft)

          const tip = new THREE.Mesh(coneGeo, matGizmoX.current)
          tip.position.set(startV.x + startOut.x * (startExt + arrowLen + 45), y, startV.z + startOut.z * (startExt + arrowLen + 45))
          setAxisYToDir(tip, startOut)
          tip.userData = { kind: "gizmo", tool: "anchor", end: "start", runIndex }
          g.add(tip)
        }

        {
          const ex = endV.x + endOut.x * (endExt + arrowLen / 2)
          const ez = endV.z + endOut.z * (endExt + arrowLen / 2)

          const shaft = new THREE.Mesh(shaftGeo, matGizmoWhite.current)
          shaft.position.set(ex, y, ez)
          setAxisYToDir(shaft, endOut)
          shaft.userData = { kind: "gizmo", tool: "anchor", end: "end", runIndex }
          g.add(shaft)

          const tip = new THREE.Mesh(coneGeo, matGizmoX.current)
          tip.position.set(endV.x + endOut.x * (endExt + arrowLen + 45), y, endV.z + endOut.z * (endExt + arrowLen + 45))
          setAxisYToDir(tip, endOut)
          tip.userData = { kind: "gizmo", tool: "anchor", end: "end", runIndex }
          g.add(tip)
        }
      }

      scene.add(g)
      gizmoGroupRef.current = g
      return
    }

    const selectedId = state.selectedPostIds.length === 1 ? state.selectedPostIds[0] : null
    if (!selectedId) return

    const post = state.posts.find((p) => p.id === selectedId)
    if (!post) return

    const g = new THREE.Group()
    g.name = "gizmo"
    g.userData.kind = "gizmo-root"

    const height = Math.max(50, (post.position.yTop - railH) - post.position.yBottom)
    const baseY = post.position.yBottom
    const centerY = baseY + height / 2
    const topY = baseY + height

    g.position.set(post.position.x, 0, post.position.z)

    if (state.gizmoTool === "translate") {
      const arrowLen = 500
      const coneGeo = new THREE.ConeGeometry(35, 90, 16)
      const centerGeo = new THREE.BoxGeometry(90, 20, 90)

      const xCone = new THREE.Mesh(coneGeo, matGizmoX.current)
      xCone.position.set(arrowLen, centerY, 0)
      xCone.rotation.z = -Math.PI / 2
      xCone.userData = { kind: "gizmo", tool: "translate", axis: "x", postId: post.id }
      g.add(xCone)

      const zCone = new THREE.Mesh(coneGeo, matGizmoZ.current)
      zCone.position.set(0, centerY, arrowLen)
      zCone.rotation.x = Math.PI / 2
      zCone.userData = { kind: "gizmo", tool: "translate", axis: "z", postId: post.id }
      g.add(zCone)

      const center = new THREE.Mesh(centerGeo, matGizmoWhite.current)
      center.position.set(0, centerY, 0)
      center.userData = { kind: "gizmo", tool: "translate", axis: "xz", postId: post.id }
      g.add(center)
    }

    if (state.gizmoTool === "rotate") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(250, 12, 12, 64), matGizmoY.current)
      ring.position.set(0, centerY, 0)
      ring.rotation.x = Math.PI / 2
      ring.userData = { kind: "gizmo", tool: "rotate", axis: "y", postId: post.id }
      g.add(ring)
    }

    if (state.gizmoTool === "extend") {
      const coneGeo = new THREE.ConeGeometry(35, 90, 16)

      const topArrow = new THREE.Mesh(coneGeo, matGizmoY.current)
      topArrow.position.set(0, topY + 200, 0)
      topArrow.userData = { kind: "gizmo", tool: "extend", axis: "yTop", postId: post.id }
      g.add(topArrow)

      const bottomArrow = new THREE.Mesh(coneGeo, matGizmoY.current)
      bottomArrow.position.set(0, baseY - 200, 0)
      bottomArrow.rotation.x = Math.PI
      bottomArrow.userData = { kind: "gizmo", tool: "extend", axis: "yBottom", postId: post.id }
      g.add(bottomArrow)
    }

    scene.add(g)
    gizmoGroupRef.current = g
  }, [canShowBalustrade, state.selectedPostIds, state.posts, state.gizmoTool, state.laserHeightListEditMode, state.balcony.balustradePath, state.balcony.balustradePaths, state.balcony.topY, state.balcony.endExtensions, state.balcony.endExtensionsByRun])

  // interaction: pick posts + gizmo drag
  useEffect(() => {
    const renderer = rendererRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!renderer || !camera || !controls) return

    const dom = renderer.domElement

    const setPointerFromEvent = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      pointerNdcRef.current.set(x, y)
      raycasterRef.current.setFromCamera(pointerNdcRef.current, camera)
    }

    const intersectAll = () => {
      const objects: THREE.Object3D[] = []

      if (canShowBalustrade) {
        objects.push(...Array.from(meshByIdRef.current.values()))
        if (gizmoGroupRef.current) objects.push(gizmoGroupRef.current)
        if (debugGroupRef.current) objects.push(debugGroupRef.current)
        if (toprailPickGroupRef.current) objects.push(toprailPickGroupRef.current)
        if (bottomRailGroupRef.current) objects.push(bottomRailGroupRef.current)
        if (bayPlaneGroupRef.current) objects.push(bayPlaneGroupRef.current)
        if (bayPlaneNormalGroupRef.current) objects.push(bayPlaneNormalGroupRef.current)
        if (framelessGroupRef.current) objects.push(framelessGroupRef.current)
      }

      return raycasterRef.current.intersectObjects(objects, true)
    }

    const intersectHorizontalPlane = (planeY: number) => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)
      const hit = new THREE.Vector3()
      const ok = raycasterRef.current.ray.intersectPlane(plane, hit)
      return ok ? hit : null
    }

    const findTaggedObject = (obj: THREE.Object3D | null): THREE.Object3D | null => {
      let current: THREE.Object3D | null = obj

      while (current) {
        const ud = current.userData as any
        if (
          ud?.postId ||
          ud?.kind === "toprail" ||
          ud?.kind === "bottom-rail" ||
          ud?.kind === "bay-assembly" ||
          ud?.kind === "gizmo" ||
          ud?.kind === "frameless-panel" ||
          ud?.kind === "frameless-spigot"
        ) {
          return current
        }
        current = current.parent
      }

      return null
    }

    const targetFromObject = (obj: THREE.Object3D): InspectorTarget => {
      const tagged = findTaggedObject(obj)
      const ud = tagged?.userData as any
      if (!ud) return null

      if (ud.postId) return { kind: "post", postId: ud.postId }

      if (ud.kind === "toprail" && Number.isFinite(ud.runIndex) && Number.isFinite(ud.pieceIndex)) {
        return { kind: "toprail", runIndex: ud.runIndex, pieceIndex: ud.pieceIndex }
      }

      if ((ud.kind === "bottom-rail" || ud.kind === "bay-assembly") && ud.bayId) {
        return { kind: "bottom-rail", bayId: ud.bayId }
      }

      if (ud.kind === "gizmo" && ud.tool === "anchor" && (ud.end === "start" || ud.end === "end")) {
        const runIndex = Number.isFinite(ud.runIndex) ? ud.runIndex : 0

        return (
          getLinkedToprailTargetFromRailEnd({
            state,
            runIndex,
            end: ud.end,
          }) ?? {
            kind: "rail-end",
            runIndex,
            end: ud.end,
          }
        )
      }

      if (ud.kind === "frameless-panel" && ud.panelId) {
        return { kind: "frameless-panel", panelId: ud.panelId }
      }

      if (ud.kind === "frameless-spigot" && ud.panelId && (ud.side === "left" || ud.side === "right")) {
        return { kind: "frameless-spigot", panelId: ud.panelId, side: ud.side }
      }

      return null
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      setPointerFromEvent(e)

      const hits = intersectAll()
      if (hits.length === 0) {
        dispatch({ type: "CLEAR_SELECTION" })
        onSelectTargetChange(null)
        return
      }

      const hitObj = hits[0].object as THREE.Object3D
      const taggedObj = findTaggedObject(hitObj) ?? hitObj
      const ud = taggedObj.userData as any

      if (ud?.kind === "gizmo" && ud?.tool === "anchor" && (ud?.end === "start" || ud?.end === "end")) {
        controls.enabled = false
        dom.setPointerCapture(e.pointerId)

        const runIndex = Number.isFinite(ud.runIndex) ? ud.runIndex : 0
        const runs = state.balcony.balustradePaths?.length ? state.balcony.balustradePaths : [state.balcony.balustradePath]
        const path = runs[runIndex]
        if (!path || path.length < 2) {
          controls.enabled = true
          return
        }

        const { min: endExtMin, max: endExtMax } = getToprailEndExtensionLimits(
          isFramelessDesignActive,
          postW
        )

        const y = state.balcony.topY - railH / 2
        const startHit = intersectHorizontalPlane(y)
        if (!startHit) {
          controls.enabled = true
          return
        }

        const ext = state.balcony.endExtensionsByRun?.[runIndex] ?? (runIndex === 0 ? state.balcony.endExtensions : undefined)

        let dir = { x: 0, z: 0 }
        let startExt = 0

        if (ud.end === "start") {
          const v0 = path[0]
          const v1 = path[1]
          const d = norm2(v1.x - v0.x, v1.z - v0.z)
          dir = { x: -d.x, z: -d.z }
          startExt = clamp(ext?.start ?? endExtMin, endExtMin, endExtMax)
        } else {
          const vn = path[path.length - 1]
          const vp = path[path.length - 2]
          const d = norm2(vn.x - vp.x, vn.z - vp.z)
          dir = { x: d.x, z: d.z }
          startExt = clamp(ext?.end ?? endExtMin, endExtMin, endExtMax)
        }

        dispatch({ type: "CLEAR_SELECTION" })
        onSelectTargetChange(
          getLinkedToprailTargetFromRailEnd({
            state,
            runIndex,
            end: ud.end,
          }) ?? { kind: "rail-end", runIndex, end: ud.end }
        )

        dragRef.current = {
          kind: "rail-extend",
          runIndex,
          end: ud.end,
          planeY: y,
          startHit,
          startExt,
          dir,
          endExtMin,
          endExtMax,
        }
        return
      }

      if (ud?.kind === "gizmo" && ud?.postId) {
        if (state.mode !== "balustrade") return
        if (state.laserHeightListEditMode) return

        const postId = ud.postId as string
        const post = state.posts.find((p) => p.id === postId)
        if (!post) return

        dispatch({ type: "SELECT_POST", id: postId })
        onSelectTargetChange({ kind: "post", postId })

        controls.enabled = false
        dom.setPointerCapture(e.pointerId)

        if (ud.tool === "translate") {
          const height = Math.max(50, (post.position.yTop - railH) - post.position.yBottom)
          const planeY = post.position.yBottom + height / 2
          const startHit = intersectHorizontalPlane(planeY)
          if (!startHit) {
            controls.enabled = true
            return
          }

          const segments = deriveAllBalconySegments(state.balcony)
          const seg = segments.find((s) => s.id === post.segmentId)
          if (!seg) {
            controls.enabled = true
            return
          }

          const dir = norm2(seg.end.x - seg.start.x, seg.end.z - seg.start.z)
          const normal = { x: dir.z, z: -dir.x }

          const sx = seg.start.x
          const sz = seg.start.z

          const tPointer = dot2(startHit.x - sx, startHit.z - sz, dir.x, dir.z)
          const tPost = dot2(post.position.x - sx, post.position.z - sz, dir.x, dir.z)
          const perp = dot2(post.position.x - sx, post.position.z - sz, normal.x, normal.z)

          dragRef.current = {
            kind: "move",
            postId,
            axis: ud.axis as "x" | "z" | "xz",
            planeY,
            startHit,
            startPos: { x: post.position.x, z: post.position.z },
            sx,
            sz,
            dx: dir.x,
            dz: dir.z,
            nx: normal.x,
            nz: normal.z,
            segLen: seg.length,
            perp,
            tDelta: tPointer - tPost,
          }
          return
        }

        if (ud.tool === "rotate") {
          dragRef.current = { kind: "rotate", postId, startClientX: e.clientX, startRotDeg: post.rotationY }
          return
        }

        if (ud.tool === "extend" && ud.axis === "yTop") {
          dragRef.current = {
            kind: "extend",
            postId,
            startClientY: e.clientY,
            startYTop: post.position.yTop,
            yBottom: post.position.yBottom,
          }
          return
        }

        if (ud.tool === "extend" && ud.axis === "yBottom") {
          dragRef.current = {
            kind: "height",
            postId,
            startClientY: e.clientY,
            startYBottom: post.position.yBottom,
          }
          return
        }

        return
      }

      const pickedTarget = targetFromObject(taggedObj)
      if (
        pickedTarget?.kind === "toprail" ||
        pickedTarget?.kind === "bottom-rail" ||
        pickedTarget?.kind === "frameless-panel" ||
        pickedTarget?.kind === "frameless-spigot"
      ) {
        dispatch({ type: "CLEAR_SELECTION" })
        onSelectTargetChange(pickedTarget)
        return
      }

      const postId = (taggedObj as any).userData?.postId as string | undefined
      if (postId) {
        dispatch({ type: "SELECT_POST", id: postId })
        onSelectTargetChange(state.laserHeightListEditMode ? null : { kind: "post", postId })
        return
      }

      dispatch({ type: "CLEAR_SELECTION" })
      onSelectTargetChange(null)
    }

    const onPointerMove = (e: PointerEvent) => {
      setPointerFromEvent(e)

      if (!dragRef.current) {
        const hits = intersectAll()
        const nextHover =
          hits.length > 0
            ? targetFromObject(findTaggedObject(hits[0].object as THREE.Object3D) ?? (hits[0].object as THREE.Object3D))
            : null
        onHoverTargetChange(nextHover)
        return
      }

      const d = dragRef.current

      if (d.kind === "rail-extend") {
        const hit = intersectHorizontalPlane(d.planeY)
        if (!hit) return

        const dx = hit.x - d.startHit.x
        const dz = hit.z - d.startHit.z
        const delta = dx * d.dir.x + dz * d.dir.z

        let value = d.startExt + delta
        value = clamp(value, d.endExtMin, d.endExtMax)
        value = state.snapEnabled ? snap(value, snapY) : value

        dispatch({ type: "UPDATE_TOPRAIL_END_EXTENSION", end: d.end, value, runIndex: d.runIndex })
        return
      }

      if (d.kind === "move") {
        const hit = intersectHorizontalPlane(d.planeY)
        if (!hit) return

        const tPointer = dot2(hit.x - d.sx, hit.z - d.sz, d.dx, d.dz)

        let tDragged = tPointer - d.tDelta
        tDragged = clamp(tDragged, 0, d.segLen)

        if (state.snapEnabled) {
          const snapped = snap(tDragged, snapXZ)
          const endSnapThreshold = snapXZ / 2

          tDragged =
            d.segLen - tDragged <= endSnapThreshold
              ? d.segLen
              : clamp(snapped, 0, d.segLen)
        }

        const nx = d.sx + d.dx * tDragged + d.nx * d.perp
        const nz = d.sz + d.dz * tDragged + d.nz * d.perp

        dispatch({ type: "UPDATE_POST_POSITION", id: d.postId, x: nx, z: nz })
        return
      }

      if (d.kind === "rotate") {
        const px = e.clientX - d.startClientX
        const approxDeg = px * 0.2
        const stepped = snap(d.startRotDeg + approxDeg, rotateStep)
        dispatch({ type: "UPDATE_POST_ROTATION", id: d.postId, rotationY: stepped })
        return
      }

      if (d.kind === "extend") {
        const py = e.clientY - d.startClientY
        const cam = cameraRef.current
        const ctr = controlsRef.current
        if (!cam || !ctr) return

        const dist = cam.position.distanceTo(ctr.target)
        const mmPerPixel = dist / 1200
        const delta = -py * mmPerPixel

        let yTop = d.startYTop + delta
        yTop = Math.max(d.yBottom + 50, yTop)
        yTop = state.snapEnabled ? snap(yTop, snapY) : yTop

        dispatch({ type: "UPDATE_POST_HEIGHT", id: d.postId, yTop })
        return
      }

      if (d.kind === "height") {
        const py = e.clientY - d.startClientY
        const cam = cameraRef.current
        const ctr = controlsRef.current
        if (!cam || !ctr) return

        const dist = cam.position.distanceTo(ctr.target)
        const mmPerPixel = dist / 1200
        const delta = -py * mmPerPixel

        let yBottom = d.startYBottom + delta
        yBottom = state.snapEnabled ? snap(yBottom, snapY) : yBottom

        dispatch({ type: "UPDATE_POST_HEIGHT", id: d.postId, yBottom })
        return
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      dragRef.current = null
      controls.enabled = true
      try {
        dom.releasePointerCapture(e.pointerId)
      } catch {}
    }

    dom.addEventListener("pointerdown", onPointerDown)
    dom.addEventListener("pointermove", onPointerMove)
    dom.addEventListener("pointerup", onPointerUp)
    dom.addEventListener("pointercancel", onPointerUp)

    return () => {
      dom.removeEventListener("pointerdown", onPointerDown)
      dom.removeEventListener("pointermove", onPointerMove)
      dom.removeEventListener("pointerup", onPointerUp)
      dom.removeEventListener("pointercancel", onPointerUp)
      onHoverTargetChange(null)
    }
  }, [dispatch, canShowBalustrade, isFramelessDesignActive, state.mode, state.snapEnabled, state.gizmoTool, state.laserHeightListEditMode, state.posts, state.balcony, state.debug.showMitrePlanes])

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <EditorToolbar state={state} dispatch={dispatch} onSave={onSave} isSaving={isSaving} saveDisabled={saveDisabled} title={toolbarTitle}>
        {showPostSystem && state.mode === "balustrade" && selectedTarget?.kind === "post" && !state.laserHeightListEditMode ? (
          <PostSelectionCard state={state} dispatch={dispatch} />
        ) : null}

        {showPostSystem && state.mode === "balustrade" && selectedTarget?.kind === "toprail" ? (
          <ToprailSelectionCard
            state={state}
            dispatch={dispatch}
            runIndex={selectedTarget.runIndex}
            pieceIndex={selectedTarget.pieceIndex}
          />
        ) : null}

        {showPostSystem && state.mode === "balustrade" && selectedTarget?.kind === "bottom-rail" ? (
          <BaySelectionCard state={state} dispatch={dispatch} bayId={selectedTarget.bayId} />
        ) : null}

        {showFramelessSystem && state.mode === "balustrade" && selectedTarget?.kind === "frameless-panel" ? (
          <FramelessSelectionCard state={state} dispatch={dispatch} panelId={selectedTarget.panelId} />
        ) : null}

        {showFramelessSystem && state.mode === "balustrade" && selectedTarget?.kind === "frameless-spigot" ? (
          <FramelessSelectionCard state={state} dispatch={dispatch} panelId={selectedTarget.panelId} />
        ) : null}

        {canShowBalustrade && state.mode === "balustrade" && state.laserHeightListEditMode ? (
          <LaserHeightListCard state={state} dispatch={dispatch} />
        ) : null}
      </EditorToolbar>
      <div style={{ position: "absolute", right: 12, bottom: 12, width: 340, zIndex: 20, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <ConstraintInspector
            state={state}
            hoveredTarget={hoveredTarget}
            selectedTarget={selectedTarget}
            compact
            title="3D details"
          />
        </div>
      </div>
    </div>
  )
}