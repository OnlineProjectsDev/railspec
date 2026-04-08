// /app/(rs)/shopdrawings-editor/templates/A3ModelViewport.tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { buildToprailPieces, getToprailProfileMm } from "@/lib/toprail"
import {
  buildBalustradeBayAssemblyPartMeshes,
  buildBalustradePostPartMeshes,
  buildFramelessPartMeshes,
} from "@/lib/render3d/balustrade"
import { buildBalustradePartInstance, getToprailTerminationPartName } from "@/lib/render3d/balustradeParts"
import { buildFloorSlabMesh, buildEdgeWallMeshes } from "@/lib/render3d/foundation"
import { designIsFrameless } from "@/lib/jobDesignRules"
import { getToprailClipPlanesForPiece } from "@/lib/render3d/toprailClipping"
import type { RootState } from "@/lib/types"
import type { ShopDrawingSheetData } from "../types"

type Props = {
  sheet: ShopDrawingSheetData
  view3d?: ShopDrawingSheetData["view3d"]
  onView3dChange?: (view: NonNullable<ShopDrawingSheetData["view3d"]>) => void
}

function makeDefaultView3D(): NonNullable<ShopDrawingSheetData["view3d"]> {
  return {
    camera: {
      position: { x: 3000, y: 3000, z: 3000 },
      target: { x: 0, y: 0, z: 0 },
      fov: 60,
    },
    placement: null,
  }
}

function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  viewportWidth: number,
  viewportHeight: number,
  offset = 1.35
) {
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) return

  const size = new THREE.Vector3()
  const center = new THREE.Vector3()

  box.getSize(size)
  box.getCenter(center)

  const paddedSizeX = size.x * offset
  const paddedSizeY = size.y * offset
  const paddedSizeZ = size.z * offset

  const aspect = Math.max(0.01, viewportWidth / Math.max(1, viewportHeight))
  const fov = THREE.MathUtils.degToRad(camera.fov)
  const fitHeightDistance = paddedSizeY / (2 * Math.tan(fov / 2))
  const fitWidthDistance = (paddedSizeX / aspect) / (2 * Math.tan(fov / 2))
  const distance = Math.max(fitHeightDistance, fitWidthDistance, paddedSizeZ)

  const dir = new THREE.Vector3(1, 0.75, 1).normalize()

  camera.position.copy(center.clone().add(dir.multiplyScalar(distance)))
  camera.near = Math.max(1, distance / 100)
  camera.far = Math.max(10000, distance * 100)
  camera.updateProjectionMatrix()

  controls.target.copy(center)
  controls.update()
}

function norm2(x: number, z: number) {
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

function createLights() {
  const group = new THREE.Group()

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

function getToprailTerminationTypeForRunEnd(
  balcony: RootState["balcony"],
  runIndex: number,
  end: "start" | "end"
): "EC" | "WC" {
  const byRun = balcony.toprailTerminationTypesByRun?.[runIndex]
  const legacy = balcony.toprailTerminationTypes
  return byRun?.[end] ?? legacy?.[end] ?? "EC"
}

async function buildReadOnlySceneGroup(state: RootState) {
  const group = new THREE.Group()
  group.name = "sheet-readonly-model"

  const canShowBalustrade = state.hasDerivedBalustrade
  const isFramelessDesignActive = designIsFrameless(state.design)
  const showPostSystem = canShowBalustrade && !isFramelessDesignActive
  const showFramelessSystem = canShowBalustrade && isFramelessDesignActive
  const hasFramelessToprail =
    isFramelessDesignActive &&
    state.balcony.framelessToprailType != null &&
    state.balcony.framelessToprailType !== "None"
  const shouldRenderToprail =
    canShowBalustrade && (!isFramelessDesignActive || hasFramelessToprail)

  const railH = 31
  const postW = 45

  if (state.foundation.floor?.closed) {
    const slab = buildFloorSlabMesh({
      floor: state.foundation.floor,
      laserLevelY: state.balcony.laserLevelY,
      thickness: 150,
    })
    if (slab) group.add(slab)

    const edgeWalls = buildEdgeWallMeshes({
      floor: state.foundation.floor,
      laserLevelY: state.balcony.laserLevelY,
      slabThickness: 150,
    })
    if (edgeWalls) group.add(edgeWalls)
  }

  if (showPostSystem) {
    const posts = await buildBalustradePostPartMeshes({
      balcony: state.balcony,
      posts: state.posts,
      railHeight: railH,
      powdercoatColor: state.color.hex,
      selectedPostIds: [],
      failingPostIds: new Set<string>(),
    })
    group.add(posts)

    const bayAssemblies = await buildBalustradeBayAssemblyPartMeshes({
      balcony: state.balcony,
      design: state.design,
      toprailType: state.toprail,
      infillType: state.infill,
      posts: state.posts,
      powdercoatColor: state.color.hex,
      selectedBayId: null,
      failingBayIds: new Set<string>(),
    })
    group.add(bayAssemblies)
  }

  if (showFramelessSystem) {
    const frameless = await buildFramelessPartMeshes({
      state,
      powdercoatColor: state.color.hex,
    })
    group.add(frameless)
  }

  if (shouldRenderToprail && !isFramelessDesignActive) {
    const runs =
      state.balcony.balustradePaths?.length
        ? state.balcony.balustradePaths
        : [state.balcony.balustradePath]

    const profile = getToprailProfileMm({
      toprailType: state.toprail,
      isFrameless: false,
      framelessToprailHeight: state.balcony.framelessToprailHeight,
    })

    const y = state.balcony.topY - profile.height
    const toprailPartName = getToprailPartName(state.toprail)

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
          endExtMin: getToprailEndExtensionLimits(false, postW).min,
          endExtMax: getToprailEndExtensionLimits(false, postW).max,
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
            powdercoatColor: state.color.hex,
            leftPlane,
            rightPlane,
            userData: {
              kind: "toprail",
              runIndex,
              pieceIndex,
            },
          })

          if (instance) group.add(instance)

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
                powdercoatColor: state.color.hex,
                userData: {
                  kind: "toprail-termination",
                  runIndex,
                  end: "start",
                  terminationType: startTerminationType,
                },
              })

              if (startTermination) group.add(startTermination)
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
                powdercoatColor: state.color.hex,
                userData: {
                  kind: "toprail-termination",
                  runIndex,
                  end: "end",
                  terminationType: endTerminationType,
                },
              })

              if (endTermination) group.add(endTermination)
            }
          }
        }
      }
    }
  }

  return group
}

export default function A3ModelViewport({ sheet, view3d, onView3dChange }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const frameRef = useRef<number | null>(null)
  const sceneGroupRef = useRef<THREE.Group | null>(null)

  const resolvedView3d = useMemo(() => view3d ?? makeDefaultView3D(), [view3d])

  const hasSavedCamera = !!view3d?.camera

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      resolvedView3d.camera.fov,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      1,
      100000
    )
    camera.position.set(
      resolvedView3d.camera.position.x,
      resolvedView3d.camera.position.y,
      resolvedView3d.camera.position.z
    )
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.localClippingEnabled = true
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(
      resolvedView3d.camera.target.x,
      resolvedView3d.camera.target.y,
      resolvedView3d.camera.target.z
    )
    controls.update()
    controlsRef.current = controls

    const lights = createLights()
    scene.add(lights)

    const onControlsEnd = () => {
      if (!cameraRef.current || !controlsRef.current || !onView3dChange) return

      onView3dChange({
        camera: {
          position: {
            x: cameraRef.current.position.x,
            y: cameraRef.current.position.y,
            z: cameraRef.current.position.z,
          },
          target: {
            x: controlsRef.current.target.x,
            y: controlsRef.current.target.y,
            z: controlsRef.current.target.z,
          },
          fov: cameraRef.current.fov,
        },
        placement: resolvedView3d.placement ?? null,
      })
    }

    controls.addEventListener("end", onControlsEnd)

    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return

      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight

      rendererRef.current.setSize(width, height)
      cameraRef.current.aspect = width / Math.max(1, height)
      cameraRef.current.updateProjectionMatrix()
    })

    resizeObserver.observe(mount)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      controls.removeEventListener("end", onControlsEnd)
      resizeObserver.disconnect()

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }

      controls.dispose()
      renderer.dispose()

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }

      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
    }
  }, [onView3dChange, resolvedView3d])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const sourceState = sheet.render3d?.model.sourceState
    if (!sourceState) return

    let cancelled = false

    if (sceneGroupRef.current) {
      scene.remove(sceneGroupRef.current)
      sceneGroupRef.current = null
    }

    ;(async () => {
      const group = await buildReadOnlySceneGroup(sourceState)

      if (cancelled) return

      scene.add(group)
      sceneGroupRef.current = group

      if (!hasSavedCamera && cameraRef.current && controlsRef.current && mountRef.current) {
        fitCameraToObject(
          cameraRef.current,
          controlsRef.current,
          group,
          mountRef.current.clientWidth,
          mountRef.current.clientHeight
        )

        if (onView3dChange) {
          onView3dChange({
            camera: {
              position: {
                x: cameraRef.current.position.x,
                y: cameraRef.current.position.y,
                z: cameraRef.current.position.z,
              },
              target: {
                x: controlsRef.current.target.x,
                y: controlsRef.current.target.y,
                z: controlsRef.current.target.z,
              },
              fov: cameraRef.current.fov,
            },
            placement: resolvedView3d.placement ?? null,
          })
        }
      }
    })()

    return () => {
      cancelled = true

      if (sceneGroupRef.current) {
        scene.remove(sceneGroupRef.current)
        sceneGroupRef.current = null
      }
    }
  }, [sheet, hasSavedCamera, onView3dChange, resolvedView3d.placement])

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return

    cameraRef.current.position.set(
      resolvedView3d.camera.position.x,
      resolvedView3d.camera.position.y,
      resolvedView3d.camera.position.z
    )
    cameraRef.current.fov = resolvedView3d.camera.fov
    cameraRef.current.updateProjectionMatrix()

    controlsRef.current.target.set(
      resolvedView3d.camera.target.x,
      resolvedView3d.camera.target.y,
      resolvedView3d.camera.target.z
    )
    controlsRef.current.update()
  }, [resolvedView3d])

  return <div ref={mountRef} className="w-full h-full bg-transparent" />
}