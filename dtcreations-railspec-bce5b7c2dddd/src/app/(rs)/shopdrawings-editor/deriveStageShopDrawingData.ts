// /app/(rs)/shopdrawings-editor/deriveStageShopDrawingData.ts
import { deriveBays, derivePostDisplayNumbers } from "@/lib/balustrade/deriveBays"
import { buildEditorUiHydrationState } from "@/lib/editor-persistence/buildUiHydrationState"
import { hydrateRootStateFromPersisted } from "@/lib/editor-persistence/initializeEditorState"
import { loadOrInitializeBalconyEditorState } from "@/lib/editor-persistence/loadOrInitializeBalconyEditorState"
import { deriveFrameless } from "@/lib/frameless/deriveFrameless"
import { designIsFrameless } from "@/lib/jobDesignRules"
import { getEditorBalconiesForJobAndStageNo } from "@/lib/queries/getEditorBalcony"
import { deriveSegments } from "@/lib/segments"
import { buildToprailPieces, getToprailProfileMm } from "@/lib/toprail"
import { getToprailClipPlanesForPiece } from "@/lib/render3d/toprailClipping"

import type {
  ShopDrawingRender2DData,
  ShopDrawingRender3DData,
  ShopDrawingSheetData,
} from "./types"

function formatDimensionValue(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function round0(value: number) {
  return String(Math.round(value))
}

function norm2(dx: number, dz: number) {
  const len = Math.hypot(dx, dz) || 1

  return {
    x: dx / len,
    z: dz / len,
  }
}

function clamp01(value: number) {
  return Math.max(-1, Math.min(1, value))
}

function angleDegBetween2(ax: number, az: number, bx: number, bz: number) {
  const a = norm2(ax, az)
  const b = norm2(bx, bz)
  const dot = clamp01(a.x * b.x + a.z * b.z)

  return (Math.acos(dot) * (180 / Math.PI))
}

function getSegmentRotationDeg(segment: { start: { x: number; z: number }; end: { x: number; z: number } }) {
  return Math.atan2(
    segment.end.z - segment.start.z,
    segment.end.x - segment.start.x
  ) * (180 / Math.PI)
}

function getFramelessSpigotRotationDeg(
  start: { x: number; z: number },
  end: { x: number; z: number }
) {
  return -Math.atan2(
    end.z - start.z,
    end.x - start.x
  ) * (180 / Math.PI)
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

function getBalustradeAngleDimensions(
  balcony: Awaited<ReturnType<typeof hydrateRootStateFromPersisted>>["balcony"]
) {
  const runs =
    balcony.balustradePaths?.length
      ? balcony.balustradePaths
      : [balcony.balustradePath]

  const dimensions: Array<{
    id: string
    kind: "angle"
    from: { x: number; z: number }
    to: { x: number; z: number }
    vertex: { x: number; z: number }
    value: string
    offset: number
    rotationDeg: number
  }> = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const run = runs[runIndex]
    if (!run || run.length < 3) continue

    for (let vertexIndex = 1; vertexIndex < run.length - 1; vertexIndex++) {
      const prev = run[vertexIndex - 1]
      const curr = run[vertexIndex]
      const next = run[vertexIndex + 1]

      if (!prev || !curr || !next) continue

      const d1 = norm2(prev.x - curr.x, prev.z - curr.z)
      const d2 = norm2(next.x - curr.x, next.z - curr.z)

      const angle = angleDegBetween2(d1.x, d1.z, d2.x, d2.z)
      if (Math.abs(angle - 180) < 1e-6) continue
      if (angle < 0.5) continue

      const leg = 260

      dimensions.push({
        id: `balustrade-angle-r${runIndex}-v${vertexIndex}`,
        kind: "angle",
        from: {
          x: curr.x + d1.x * leg,
          z: curr.z + d1.z * leg,
        },
        to: {
          x: curr.x + d2.x * leg,
          z: curr.z + d2.z * leg,
        },
        vertex: {
          x: curr.x,
          z: curr.z,
        },
        value: formatDimensionValue(angle),
        offset: 130,
        rotationDeg: 0,
      })
    }
  }

  return dimensions
}

function getFloorOffsetEdges(state: Awaited<ReturnType<typeof hydrateRootStateFromPersisted>>) {
  const floor = state.foundation.floor

  if (!floor?.vertices?.length) return []

  const vertices = floor.vertices
  const count = floor.closed ? vertices.length : Math.max(0, vertices.length - 1)

  const edges: Array<{
    id: string
    x1: number
    z1: number
    x2: number
    z2: number
    refType: "include" | "exclude"
  }> = []

  for (let i = 0; i < count; i++) {
    const a = vertices[i]
    const b = floor.closed ? vertices[(i + 1) % vertices.length] : vertices[i + 1]

    if (!a || !b) continue

    const meta = floor.edges?.[i] as any
    const offset = Number.isFinite(meta?.offset) ? Number(meta.offset) : 0
    const refType = (meta?.refType ?? "include") as "include" | "exclude"

    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)

    if (len < 1e-6) continue

    const dirX = dx / len
    const dirZ = dz / len

    const normalX = -dirZ
    const normalZ = dirX

    edges.push({
      id: `floor-offset-${i}`,
      x1: a.x + normalX * offset,
      z1: a.z + normalZ * offset,
      x2: b.x + normalX * offset,
      z2: b.z + normalZ * offset,
      refType,
    })
  }

  return edges
}

function getFloorThickEdges(state: Awaited<ReturnType<typeof hydrateRootStateFromPersisted>>) {
  const floor = state.foundation.floor

  if (!floor?.vertices?.length) return []

  const vertices = floor.vertices
  const count = floor.closed ? vertices.length : Math.max(0, vertices.length - 1)

  const edges: Array<{
    id: string
    x1: number
    z1: number
    x2: number
    z2: number
    edgeType: string
  }> = []

  for (let i = 0; i < count; i++) {
    const a = vertices[i]
    const b = floor.closed ? vertices[(i + 1) % vertices.length] : vertices[i + 1]

    if (!a || !b) continue

    const meta = floor.edges?.[i] as any
    const edgeType = (meta?.edgeType ?? "floor") as string
    const thickness = Number.isFinite(meta?.thickness) ? Number(meta.thickness) : 0

    if (edgeType === "floor") continue
    if (Math.abs(thickness) < 1e-6) continue

    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)

    if (len < 1e-6) continue

    const dirX = dx / len
    const dirZ = dz / len

    const normalX = dirZ
    const normalZ = -dirX

    edges.push({
      id: `floor-thick-${i}`,
      x1: a.x + normalX * thickness,
      z1: a.z + normalZ * thickness,
      x2: b.x + normalX * thickness,
      z2: b.z + normalZ * thickness,
      edgeType,
    })
  }

  return edges
}

function buildInitialRender2D(params: {
  state: Awaited<ReturnType<typeof hydrateRootStateFromPersisted>>
  segments: ShopDrawingSheetData["plan"]["segments"]
  planPosts: ShopDrawingSheetData["plan"]["posts"]
  bays: ReturnType<typeof deriveBays>
  frameless: ReturnType<typeof deriveFrameless>
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}): ShopDrawingRender2DData {
  return {
    bounds: {
      minX: params.minX,
      maxX: params.maxX,
      minZ: params.minZ,
      maxZ: params.maxZ,
    },
    floor: params.state.foundation.floor
      ? {
          closed: params.state.foundation.floor.closed,
          vertices: params.state.foundation.floor.vertices.map((vertex) => ({
            x: vertex.x,
            z: vertex.z,
          })),
          offsetEdges: getFloorOffsetEdges(params.state),
          thickEdges: getFloorThickEdges(params.state),
        }
      : null,
    postBodies: params.frameless.enabled
      ? []
      : params.planPosts.map((post) => ({
          id: `post-body-${post.id}`,
          postId: post.id,
          label: post.label,
          center: {
            x: post.x,
            z: post.z,
          },
          width: 45,
          depth: 45,
          rotationY: post.rotationY,
          type: post.type,
        })),
    baseplates: params.frameless.enabled
      ? []
      : params.planPosts
          .filter((post) => post.type === "BP" || post.type === "DP")
          .map((post) => ({
            id: `baseplate-${post.id}`,
            postId: post.id,
            center: {
              x: post.x,
              z: post.z,
            },
            width: 110,
            depth: 80,
            rotationY: post.rotationY,
            type: post.type,
          })),
    dressRings: params.frameless.enabled
      ? []
      : params.planPosts
          .filter((post) => post.type === "CD")
          .map((post) => ({
            id: `dress-ring-${post.id}`,
            postId: post.id,
            center: {
              x: post.x,
              z: post.z,
            },
            diameter: 100,
            type: post.type,
          })),
    spigots: params.frameless.enabled
      ? Array.from(
          new Map(
            params.frameless.panels.flatMap((panel) => {
              const rotationY = getFramelessSpigotRotationDeg(panel.start, panel.end)

              return [
                [
                  `spigot-${panel.leftSpigot.type}-${Math.round(panel.leftSpigot.x)}-${Math.round(panel.leftSpigot.z)}`,
                  {
                    id: `spigot-${panel.id}-left`,
                    center: {
                      x: panel.leftSpigot.x,
                      z: panel.leftSpigot.z,
                    },
                    width:
                      panel.leftSpigot.type === "Spigot_SF" ||
                      panel.leftSpigot.type.includes("_RD")
                        ? 50
                        : 50,
                    depth:
                      panel.leftSpigot.type === "Spigot_SF" ||
                      panel.leftSpigot.type.includes("_RD")
                        ? 50
                        : 50,
                    rotationY,
                    type: panel.leftSpigot.type,
                  },
                ],
                [
                  `spigot-${panel.rightSpigot.type}-${Math.round(panel.rightSpigot.x)}-${Math.round(panel.rightSpigot.z)}`,
                  {
                    id: `spigot-${panel.id}-right`,
                    center: {
                      x: panel.rightSpigot.x,
                      z: panel.rightSpigot.z,
                    },
                    width:
                      panel.rightSpigot.type === "Spigot_SF" ||
                      panel.rightSpigot.type.includes("_RD")
                        ? 50
                        : 50,
                    depth:
                      panel.rightSpigot.type === "Spigot_SF" ||
                      panel.rightSpigot.type.includes("_RD")
                        ? 50
                        : 50,
                    rotationY,
                    type: panel.rightSpigot.type,
                  },
                ],
              ]
            })
          ).values()
        )
      : [],
    toprails: (() => {
      const isFramelessDesignActive = designIsFrameless(params.state.design)
      const framelessToprailType = params.state.balcony.framelessToprailType
      const selectedToprailType = isFramelessDesignActive ? framelessToprailType : params.state.toprail
      const partName = getToprailPartName(selectedToprailType)

      if (!partName) return []

      const profile = getToprailProfileMm({
        toprailType: selectedToprailType,
        isFrameless: isFramelessDesignActive,
        framelessToprailHeight: params.state.balcony.framelessToprailHeight,
      })

      if (!Number.isFinite(profile.width) || profile.width <= 0) return []

      const runs =
        params.state.balcony.balustradePaths?.length
          ? params.state.balcony.balustradePaths
          : [params.state.balcony.balustradePath]

      return runs.flatMap((runPath, runIndex) => {
        if (!runPath || runPath.length < 2) return []

        const runBalcony = {
          ...params.state.balcony,
          id:
            runIndex === 0
              ? params.state.balcony.id
              : `${params.state.balcony.id}-run-${runIndex}`,
          balustradePath: runPath,
        }

        const runEndExt =
          params.state.balcony.endExtensionsByRun?.[runIndex] ??
          params.state.balcony.endExtensions

        const pieces = buildToprailPieces({
          balcony: runBalcony as typeof params.state.balcony,
          posts: params.state.posts,
          profile,
          rules: {
            stockLen: 5500,
            postWidth: 45,
            endExtMin: isFramelessDesignActive ? -10 : 45 / 2,
            endExtMax: 200,
            joinOffset: 45 / 2,
          },
          design: params.state.design,
          state: params.state,
          endExtensions: runEndExt,
        })

        return pieces.map((piece, pieceIndex) => {
          const clipPlanes = getToprailClipPlanesForPiece({
            pieces,
            pieceIndex,
            runPath,
            y: 0,
          })

          return {
            id: `toprail-${runIndex}-${pieceIndex}-${piece.id}`,
            partName,
            start: {
              x: piece.start.x,
              z: piece.start.z,
            },
            end: {
              x: piece.end.x,
              z: piece.end.z,
            },
            center: {
              x: (piece.start.x + piece.end.x) / 2,
              z: (piece.start.z + piece.end.z) / 2,
            },
            width: profile.width,
            height: profile.height,
            rotationY: getSegmentRotationDeg({
              start: {
                x: piece.start.x,
                z: piece.start.z,
              },
              end: {
                x: piece.end.x,
                z: piece.end.z,
              },
            }),
            length: Math.hypot(piece.end.x - piece.start.x, piece.end.z - piece.start.z),
            leftPlane: clipPlanes.leftPlane
              ? {
                  x: clipPlanes.leftPlane.x,
                  z: clipPlanes.leftPlane.z,
                  v_x: clipPlanes.leftPlane.v_x,
                  v_z: clipPlanes.leftPlane.v_z,
                }
              : null,
            rightPlane: clipPlanes.rightPlane
              ? {
                  x: clipPlanes.rightPlane.x,
                  z: clipPlanes.rightPlane.z,
                  v_x: clipPlanes.rightPlane.v_x,
                  v_z: clipPlanes.rightPlane.v_z,
                }
              : null,
          }
        })
      })
    })(),
    glassPanels: params.frameless.enabled
      ? params.frameless.panels.map((panel) => {
          const start = {
            x: panel.leftPlanePoint.x,
            z: panel.leftPlanePoint.z,
          }

          const end = {
            x: panel.rightPlanePoint.x,
            z: panel.rightPlanePoint.z,
          }

          return {
            id: panel.id,
            start,
            end,
            center: {
              x: (start.x + end.x) / 2,
              z: (start.z + end.z) / 2,
            },
            width: Math.hypot(end.x - start.x, end.z - start.z),
            thickness: panel.glassThickness,
            rotationY: getSegmentRotationDeg({
              start,
              end,
            }),
            height: panel.glassHeight,
            label: panel.id,
          }
        })
      : (() => {
          const glassSpec = getGlassSpec(params.state.design)
          if (!glassSpec) return []

          return params.bays
            .filter((bay) => !bay.suppressed)
            .map((bay) => {
              const start = {
                x: bay.leftVec.x,
                z: bay.leftVec.z,
              }

              const end = {
                x: bay.rightVec.x,
                z: bay.rightVec.z,
              }

              return {
                id: `bay-glass-${bay.id}`,
                start,
                end,
                center: {
                  x: (start.x + end.x) / 2,
                  z: (start.z + end.z) / 2,
                },
                width: Math.hypot(end.x - start.x, end.z - start.z),
                thickness: glassSpec.thickness,
                rotationY: getSegmentRotationDeg({
                  start,
                  end,
                }),
                height: bay.panelHeight,
                label: bay.displayLabel,
              }
            })
        })(),
    verticalInfills: (() => {
      if (params.frameless.enabled) return []

      const verticalMode = getVerticalInfillMode(params.state.design)
      if (!verticalMode) return []

      return params.bays
        .filter((bay) => !bay.suppressed)
        .flatMap((bay) => {
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

          if (!Number.isFinite(len) || len < 1e-3) return []

          const dir = norm2(dx, dz)
          const mid = {
            x: (start.x + end.x) / 2,
            z: (start.z + end.z) / 2,
          }

          if (verticalMode === "balusters") {
            let spacing = 120
            const quantity = Math.max(1, Math.ceil((len - spacing + 19) / spacing))

            if (params.state.infill === "Balusters Equally Spaced") {
              spacing = (len + 19) / (quantity + 1)
            }

            const firstOffset = -spacing * (0.5 * (quantity - 1))

            return Array.from({ length: quantity }, (_, index) => {
              const d = firstOffset + index * spacing

              return {
                id: `vertical-infill-${bay.id}-${index}`,
                center: {
                  x: mid.x + dir.x * d,
                  z: mid.z + dir.z * d,
                },
                width: 19,
                depth: 18,
                rotationY: getSegmentRotationDeg({ start, end }),
                partName: "19x18 Baluster",
                length: bay.panelHeight,
              }
            })
          }

          let spacing = 165
          const quantity = Math.max(1, Math.ceil((len - spacing + 65) / spacing))

          if (params.state.infill === "Slats Equally Spaced") {
            spacing = (len + 65) / (quantity + 1)
          }

          const firstOffset = -spacing * (0.5 * (quantity - 1))

          return Array.from({ length: quantity }, (_, index) => {
            const d = firstOffset + index * spacing

            return {
              id: `vertical-infill-${bay.id}-${index}`,
              center: {
                x: mid.x + dir.x * d,
                z: mid.z + dir.z * d,
              },
              width: 16,
              depth: 65.8,
              rotationY: getSegmentRotationDeg({ start, end }) + 90,
              partName: "65x16 Slat",
              length: bay.panelHeight,
            }
          })
        })
    })(),
    bottomRails: params.frameless.enabled
      ? []
      : params.bays
          .filter((bay) => !bay.suppressed)
          .map((bay) => ({
            id: `bay-span-${bay.id}`,
            bayId: bay.id,
            start: {
              x: bay.from.x,
              z: bay.from.z,
            },
            end: {
              x: bay.to.x,
              z: bay.to.z,
            },
            center: {
              x: bay.derivedFrom.centerX,
              z: bay.derivedFrom.centerZ,
            },
            width: bay.length,
            height: 20,
            rotationY: getSegmentRotationDeg({
              start: {
                x: bay.from.x,
                z: bay.from.z,
              },
              end: {
                x: bay.to.x,
                z: bay.to.z,
              },
            }),
            length: bay.length,
          })),
    panelLabels: params.bays
      .filter((bay) => !bay.suppressed)
      .map((bay) => ({
        id: `panel-label-${bay.id}`,
        label: bay.displayLabel,
        x: bay.derivedFrom.centerX,
        z: bay.derivedFrom.centerZ,
        rotationDeg: getSegmentRotationDeg({
          start: {
            x: bay.from.x,
            z: bay.from.z,
          },
          end: {
            x: bay.to.x,
            z: bay.to.z,
          },
        }),
        description: null,
      })),
    dimensions: [
      ...params.segments.map((segment) => ({
        id: `segment-dim-${segment.id}`,
        kind: "segment" as const,
        from: {
          x: segment.start.x,
          z: segment.start.z,
        },
        to: {
          x: segment.end.x,
          z: segment.end.z,
        },
        value: formatDimensionValue(segment.length),
        offset: 400,
        rotationDeg: getSegmentRotationDeg(segment),
      })),
      ...params.bays
        .filter((bay) => !bay.suppressed)
        .map((bay) => ({
          id: `bay-dim-${bay.id}`,
          kind: "bay" as const,
          from: {
            x: bay.from.x,
            z: bay.from.z,
          },
          to: {
            x: bay.to.x,
            z: bay.to.z,
          },
          value: formatDimensionValue(bay.length),
          offset: 220,
          rotationDeg: getSegmentRotationDeg({
            start: {
              x: bay.from.x,
              z: bay.from.z,
            },
            end: {
              x: bay.to.x,
              z: bay.to.z,
            },
          }),
        })),
      ...getBalustradeAngleDimensions(params.state.balcony),
    ],
  }
}

function buildInitialRender3D(params: {
  state: Awaited<ReturnType<typeof hydrateRootStateFromPersisted>>
}): ShopDrawingRender3DData {
  return {
    model: {
      sourceState: params.state,
      posts: params.state.posts.map((post) => ({
        id: post.id,
        segmentId: post.segmentId,
        anchorage: post.anchorage,
        rotationY: post.rotationY,
        x: post.position.x,
        yBottom: post.position.yBottom,
        yTop: post.position.yTop,
        z: post.position.z,
        size: post.profile?.size ?? null,
      })),
      toprailPieces: [],
      floor: params.state.foundation.floor
        ? {
            closed: params.state.foundation.floor.closed,
            vertices: params.state.foundation.floor.vertices.map((vertex) => ({
              x: vertex.x,
              z: vertex.z,
            })),
            fflY: params.state.foundation.fflY,
            slabThickness: 150,
            edgeTypes: (params.state.foundation.floor.edges ?? []).map((edge) => ({
              edgeType: (edge as any)?.edgeType ?? "floor",
              thickness: Number.isFinite((edge as any)?.thickness) ? Number((edge as any).thickness) : null,
              height: Number.isFinite((edge as any)?.height) ? Number((edge as any).height) : null,
              offset: Number.isFinite((edge as any)?.offset) ? Number((edge as any).offset) : null,
              refType: (edge as any)?.refType ?? "include",
            })),
          }
        : null,
      colour: {
        name: params.state.color.name,
        hex: params.state.color.hex,
      },
      design: params.state.design,
      toprail: params.state.toprail,
      infill: params.state.infill,
    },
  }
}

export async function deriveStageShopDrawingData(params: {
  jobId: number
  jobNumber: number
  stageNo: number
  clientName: string
  siteAddressLine: string
  cityLine: string
}): Promise<ShopDrawingSheetData[]> {
  const balconies = await getEditorBalconiesForJobAndStageNo(
    params.jobId,
    params.stageNo,
    { includeDeleted: false }
  )

  const sheets: ShopDrawingSheetData[] = []

  for (const balconyRow of balconies) {
    if (balconyRow.isDeleted) continue

    const loaded = await loadOrInitializeBalconyEditorState(balconyRow.id)
    const persisted = loaded.persisted

    if (!persisted.balustradeState.hasDerivedBalustrade) continue

    const state = hydrateRootStateFromPersisted({
      persisted,
      uiState: buildEditorUiHydrationState(),
    })

    const postNumbersById = derivePostDisplayNumbers({
      balcony: state.balcony,
      posts: state.posts,
    })

    const segments = deriveSegments(state.balcony).map((segment) => ({
      id: segment.id,
      runId: segment.id,
      start: { x: segment.start.x, z: segment.start.z },
      end: { x: segment.end.x, z: segment.end.z },
      length: segment.length,
    }))

    const planPosts = state.posts.map((post) => ({
      id: post.id,
      label: `P${postNumbersById[post.id] ?? "?"}`,
      x: post.position.x,
      z: post.position.z,
      type: post.anchorage,
      rotationY: post.rotationY,
      length: post.position.yTop - post.position.yBottom,
    }))

    const floorVertices = state.foundation.floor?.vertices ?? []

    const allX = [
      ...segments.flatMap((segment) => [segment.start.x, segment.end.x]),
      ...planPosts.map((post) => post.x),
      ...floorVertices.map((vertex) => vertex.x),
    ]

    const allZ = [
      ...segments.flatMap((segment) => [segment.start.z, segment.end.z]),
      ...planPosts.map((post) => post.z),
      ...floorVertices.map((vertex) => vertex.z),
    ]

    const bays = deriveBays({
      balcony: state.balcony,
      design: state.design,
      toprailType: state.toprail,
      posts: state.posts,
    })

    const frameless = designIsFrameless(state.design)
      ? deriveFrameless(state)
      : {
          enabled: false,
          system: null,
          panels: [],
        }

    const minX = allX.length ? Math.min(...allX) : 0
    const maxX = allX.length ? Math.max(...allX) : 1
    const minZ = allZ.length ? Math.min(...allZ) : 0
    const maxZ = allZ.length ? Math.max(...allZ) : 1

    const render2d = buildInitialRender2D({
      state,
      segments,
      planPosts,
      bays,
      frameless,
      minX,
      maxX,
      minZ,
      maxZ,
    })

    const render3d = buildInitialRender3D({
      state,
    })

    sheets.push({
      id: `${balconyRow.drop}::${balconyRow.balconyNo}::${balconyRow.id}`,
      balconyId: balconyRow.id,
      meta: {
        jobNumber: String(params.jobNumber),
        stageNumber: String(params.stageNo),
        drop: balconyRow.drop,
        balconyNo: balconyRow.balconyNo,
        balconyLabel: `Drop ${balconyRow.drop} — Balcony ${balconyRow.balconyNo}`,
        clientName: params.clientName,
        siteAddressLine: params.siteAddressLine,
        cityLine: params.cityLine,
      },
      plan: {
        posts: planPosts,
        segments,
        minX,
        maxX,
        minZ,
        maxZ,
      },
      render2d,
      render3d,
      view2d: undefined,
      view3d: undefined,
      posts: state.posts.map((post) => ({
        postLabel: `P${postNumbersById[post.id] ?? "?"}`,
        type: post.anchorage,
        length: round0(post.position.yTop - post.position.yBottom),
        details: post.profile?.size === 46 ? "46 SQ" : "45 SQ",
      })),
      panels: bays
        .filter((bay) => !bay.suppressed)
        .map((bay, index) => ({
          panelLabel: `B${index + 1}`,
          width: round0(bay.length),
          height: round0(bay.panelHeight),
          details: bay.segmentId,
        })),
      legend: [
        { label: "Design", value: state.design },
        { label: "Toprail", value: state.toprail },
        { label: "Infill", value: state.infill },
        { label: "Colour", value: state.color.name },
      ],
    })
  }

  return sheets
}