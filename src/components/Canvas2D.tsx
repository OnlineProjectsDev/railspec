// /components/Canvas2D.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { RootState, FloorEdgeType } from "@/lib/types"
import { Action } from "@/lib/reducer"
import { deriveSegments } from "@/lib/segments"
import styles from "./EditorShell.module.css"
import { validateDeleteFloorVertex } from "@/lib/math"
import NumericInput from "./NumericInput"
import { deriveBays } from "@/lib/balustrade/deriveBays"
import ConstraintInspector, { InspectorTarget } from "./ConstraintInspector"
import EditorToolbar from "./EditorToolbar"
import PostSelectionCard from "./PostSelectionCard"
import BaySelectionCard from "./BaySelectionCard"
import LaserHeightListCard from "./LaserHeightListCard"
import FramelessSelectionCard from "./FramelessSelectionCard"
import ToprailSelectionCard from "./ToprailSelectionCard"
import FloorVertexSelectionCard from "./FloorVertexSelectionCard"
import { deriveFrameless } from "@/lib/frameless/deriveFrameless"
import { designIsFrameless } from "@/lib/jobDesignRules"
import { buildToprailPieces, getToprailProfileMm } from "@/lib/toprail"

type Viewport = { x: number; y: number; w: number; h: number } // SVG viewBox
type RailLink = { id: string; x1: number; y1: number; x2: number; y2: number; value: number }
type FloorEdgePlus = { id: string; aIndex: number; bIndex: number; mx: number; my: number }

function computeBounds(posts: RootState["posts"], extraPoints?: { x: number; y: number }[]) {
  if (!posts.length && (!extraPoints || !extraPoints.length))
    return { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (const p of posts) {
    const x = p.position.x
    const y = p.position.z // world Z -> SVG Y
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  if (extraPoints?.length) {
    for (const pt of extraPoints) {
      const x = pt.x
      const y = pt.y
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (!Number.isFinite(minX)) return { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
  return { minX, minY, maxX, maxY }
}

function expandBounds(b: { minX: number; minY: number; maxX: number; maxY: number }, pad: number) {
  return { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function snap(n: number, step: number) {
  return Math.round(n / step) * step
}

function norm(x: number, y: number) {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

function dot(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by
}

function distSqPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLenSq = abx * abx + aby * aby
  if (abLenSq < 1e-9) {
    const dx = px - ax
    const dy = py - ay
    return dx * dx + dy * dy
  }
  let t = (apx * abx + apy * aby) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + abx * t
  const cy = ay + aby * t
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy
}

function clamp01(n: number) {
  return clamp(n, -1, 1)
}

function angleDegBetween(ax: number, ay: number, bx: number, by: number) {
  const a = norm(ax, ay)
  const b = norm(bx, by)
  const d = clamp01(dot(a.x, a.y, b.x, b.y))
  return (Math.acos(d) * 180) / Math.PI // 0..180
}
function signedAngleDegBetween(ax: number, ay: number, bx: number, by: number) {
  const a = norm(ax, ay)
  const b = norm(bx, by)
  const d = clamp01(dot(a.x, a.y, b.x, b.y))
  const c = a.x * b.y - a.y * b.x // 2D cross (z component)
  return -(Math.atan2(c, d) * 180) / Math.PI // (-180, 180]  (flip for SVG Y-down)
}

function formatDim(value: number) {
  const rounded = Math.round(value * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return `${Math.round(rounded)}`
  }
  return rounded.toFixed(1)
}

function getSegmentIdFromBayId(bayId: string) {
  const parts = String(bayId).split("::")
  return parts[0] || null
}

function getSegmentIdFromBalustradeVertexTarget(params: {
  balcony: RootState["balcony"]
  runIndex: number
  vertexIndex: number
}) {
  const runs =
    params.balcony.balustradePaths?.length
      ? params.balcony.balustradePaths
      : [params.balcony.balustradePath]

  const run = runs[params.runIndex]
  if (!run || run.length < 2) return null
  if (params.vertexIndex <= 0 || params.vertexIndex >= run.length - 1) return null

  const prefix =
    params.runIndex === 0
      ? params.balcony.id
      : `${params.balcony.id}-run-${params.runIndex}`

  return `${prefix}-seg-${params.vertexIndex}`
}

function getFramelessPanelIdForSegment(params: {
  frameless: ReturnType<typeof deriveFrameless>
  segmentId: string | null | undefined
}) {
  if (!params.segmentId) return null

  const panel =
    params.frameless.panels.find((p) => p.segmentId === params.segmentId) ?? null

  return panel?.id ?? null
}

function isFiniteNumber(n: any) {
  return typeof n === "number" && Number.isFinite(n)
}

function isLockedLen(meta: any) {
  return isFiniteNumber(meta?.lockedLength) && meta.lockedLength > 0
}

function isLockedAng(meta: any) {
  return isFiniteNumber(meta?.lockedAngle) && Math.abs(meta.lockedAngle) > 0.5
}

function getDefaultRailEndExtension(params: {
  balcony: RootState["balcony"]
  runIndex: number
  end: "start" | "end"
  min: number
  max: number
}) {
  const raw = params.balcony.runBoundarySourceOffsetsByRun?.[params.runIndex]?.[params.end]
  const fallback = params.min
  const value = Number.isFinite(raw) ? Math.abs(Number(raw)) : fallback
  return clamp(value, params.min, params.max)
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

function getFloorDimensionOffset(offset: number) {
  const baseOffset = 100
  const basePlacement = 300

  if (!Number.isFinite(offset)) return basePlacement
  if (offset >= baseOffset) return basePlacement

  return basePlacement + (baseOffset - offset)
}

export default function Canvas2D({
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
  const svgRef = useRef<SVGSVGElement | null>(null)

  const canShowBalustrade = state.hasDerivedBalustrade

  const isFramelessDesignActive = designIsFrameless(state.design)
  const showPostSystem = canShowBalustrade && !isFramelessDesignActive
  const showFramelessSystem = canShowBalustrade && isFramelessDesignActive

  const canEditSubstrate = state.mode === "substrate"
  const canEditBalustrade = canShowBalustrade && state.mode === "balustrade"

  const isAddPostToolArmed =
  state.postsTool === "add_mid_post" || state.postsTool === "add_posts_to_spacing"

  // When switching mode, clear “other” selection/edit state so you can’t
  // accidentally keep editing the wrong layer.
  useEffect(() => {
    if (state.mode === "substrate") {
      // disable post selection + rail end editing in substrate mode
      dispatch({ type: "CLEAR_SELECTION" })
    } else {
      // disable floor selection/edits in posts mode
      dispatch({ type: "SELECT_FLOOR_VERTEX", index: null })
    }
    // Local UI state cleared below (kept outside reducer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode])

  // ===== Balcony runs (single or multi) =====
  const balconyRuns = useMemo(() => {
    const runs = state.balcony.balustradePaths?.length ? state.balcony.balustradePaths : [state.balcony.balustradePath]
    return (runs ?? []).filter((p) => Array.isArray(p) && p.length >= 2)
  }, [state.balcony.balustradePath, state.balcony.balustradePaths])

  // Derive segments per run.
  // IMPORTANT: keep run 0 using the original balcony.id to preserve segment ids for existing single-run generation.
  // Additional runs use a stable suffix so segment ids can be unique (and posts can target them once generation is updated).
  const { segments, segIdsByRun } = useMemo(() => {
    const out: ReturnType<typeof deriveSegments> = []
    const idsByRun: string[][] = []

    for (let runIndex = 0; runIndex < balconyRuns.length; runIndex++) {
      const runPath = balconyRuns[runIndex]
      const runBalcony = {
        ...state.balcony,
        id: runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`,
        balustradePath: runPath,
      } as any

      const segs = deriveSegments(runBalcony)
      idsByRun[runIndex] = segs.map((s) => s.id)
      out.push(...segs)
    }

    return { segments: out, segIdsByRun: idsByRun }
  }, [state.balcony, balconyRuns])

  const segById = useMemo(() => {
    const m = new Map<string, (typeof segments)[number]>()
    for (const s of segments) m.set(s.id, s)
    return m
  }, [segments])

  const segMetaById = useMemo(() => {
    // We derive segments per run in order, so ids are stable:
    // run0: balcony.id-seg-0..n
    // runN: `${balcony.id}-run-${runIndex}`-seg-0..n
    const m = new Map<string, { runIndex: number; segInRun: number }>()
    for (let runIndex = 0; runIndex < balconyRuns.length; runIndex++) {
      const prefix = runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`
      const runPath = balconyRuns[runIndex]
      const segCount = Math.max(0, runPath.length - 1)
      for (let i = 0; i < segCount; i++) {
        m.set(`${prefix}-seg-${i}`, { runIndex, segInRun: i })
      }
    }
    return m
  }, [balconyRuns, state.balcony.id])

  // ===== Rail end virtual points (per run) =====
  const railEndVirtualPointsByRun = useMemo(() => {
  const { min: endExtMin, max: endExtMax } = getToprailEndExtensionLimits(
    isFramelessDesignActive,
    45
  )

    return balconyRuns.map((path, runIndex) => {
      if (!path || path.length < 2) {
        return {
          runIndex,
          start: null as null | { x: number; y: number },
          end: null as null | { x: number; y: number },
          startExt: 0,
          endExt: 0,
        }
      }

      const defaultStartExt = getDefaultRailEndExtension({
        balcony: state.balcony,
        runIndex,
        end: "start",
        min: endExtMin,
        max: endExtMax,
      })

      const defaultEndExt = getDefaultRailEndExtension({
        balcony: state.balcony,
        runIndex,
        end: "end",
        min: endExtMin,
        max: endExtMax,
      })

      // 1) prefer per-run override
      // 2) fallback to legacy single-run
      const ext = state.balcony.endExtensionsByRun?.[runIndex] ?? state.balcony.endExtensions

      const startExt = clamp(ext?.start ?? defaultStartExt, endExtMin, endExtMax)
      const endExt = clamp(ext?.end ?? defaultEndExt, endExtMin, endExtMax)

      const v0 = path[0]
      const v1 = path[1]
      const dStart = norm(v1.x - v0.x, v1.z - v0.z)
      const startOut = { x: -dStart.x, y: -dStart.y }

      const vn = path[path.length - 1]
      const vp = path[path.length - 2]
      const dEnd = norm(vn.x - vp.x, vn.z - vp.z)
      const endOut = { x: dEnd.x, y: dEnd.y }

      return {
        runIndex,
        startExt,
        endExt,
        start: { x: v0.x + startOut.x * startExt, y: v0.z + startOut.y * startExt },
        end: { x: vn.x + endOut.x * endExt, y: vn.z + endOut.y * endExt },
      }
    })
  }, [
    balconyRuns,
    segIdsByRun,
    isFramelessDesignActive,
    state.balcony,
    state.balcony.endExtensions,
    state.balcony.endExtensionsByRun,
    state.balcony.segmentSourceOffsetById,
  ])

  // Used for bounds + drawing links
  const railEndLinks = useMemo<RailLink[]>(() => {
    const links: RailLink[] = []

    const findVertexPost = (runIndex: number, vi: number) => {
      const a = state.posts.find((p) => p.id === `post-r${runIndex}-v-${vi}`)
      if (a) return a
      if (runIndex === 0) return state.posts.find((p) => p.id === `post-v-${vi}`) ?? null
      return null
    }

    for (const r of railEndVirtualPointsByRun) {
      const path = balconyRuns[r.runIndex]
      if (!path || path.length < 2) continue

      if (r.start) {
        const startPost = findVertexPost(r.runIndex, 0)
        const ref = startPost?.referencePosition ?? (startPost ? { x: startPost.position.x, z: startPost.position.z } : null)
        const x2 = ref?.x ?? path[0].x
        const y2 = ref?.z ?? path[0].z

        links.push({
          id: `__rail-link-start__r${r.runIndex}`,
          x1: r.start.x,
          y1: r.start.y,
          x2,
          y2,
          value: r.startExt,
        })
      }

      if (r.end) {
        const lastIndex = path.length - 1
        const endPost = findVertexPost(r.runIndex, lastIndex)
        const ref = endPost?.referencePosition ?? (endPost ? { x: endPost.position.x, z: endPost.position.z } : null)
        const x2 = ref?.x ?? path[lastIndex].x
        const y2 = ref?.z ?? path[lastIndex].z

        links.push({
          id: `__rail-link-end__r${r.runIndex}`,
          x1: r.end.x,
          y1: r.end.y,
          x2,
          y2,
          value: r.endExt,
        })
      }
    }

    return links
  }, [balconyRuns, railEndVirtualPointsByRun, state.posts])

  const initialView = useMemo<Viewport>(() => {
    const extra: { x: number; y: number }[] = []
    for (const r of railEndVirtualPointsByRun) {
      if (r.start) extra.push(r.start)
      if (r.end) extra.push(r.end)
    }

    const b0 = expandBounds(computeBounds(state.posts, extra), 800)
    const w = Math.max(1000, b0.maxX - b0.minX)
    const h = Math.max(1000, b0.maxY - b0.minY)
    return { x: b0.minX, y: b0.minY, w, h }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [view, setView] = useState<Viewport>(initialView)
  const [isPanning, setIsPanning] = useState(false)
  const [selectedFloorEdgeIndex, setSelectedFloorEdgeIndex] = useState<number | null>(null)

  const [selectedRailEnd, setSelectedRailEnd] = useState<null | { runIndex: number; end: "start" | "end" }>(null)

  const [isDraggingObject, setIsDraggingObject] = useState(false)

  const [hoveredSegId, setHoveredSegId] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<null | { postId: string }>(null)
  const [deleteSuppressedId, setDeleteSuppressedId] = useState<string | null>(null)

  const startAnyDrag = () => setIsDraggingObject(true)

  const endAnyDrag = () => setIsDraggingObject(false)

  const cancelDeleteDialog = () => {
    if (!deleteDialog) return
    setDeleteSuppressedId(deleteDialog.postId)
    setDeleteDialog(null)
  }

  // Clear local-only selection when mode changes.
  useEffect(() => {
    if (state.mode === "substrate") {
      setSelectedRailEnd(null)
    } else {
      setSelectedFloorEdgeIndex(null)
    }
    onHoverTargetChange(null)
  }, [state.mode, onHoverTargetChange])

  useEffect(() => {
    if (!canEditBalustrade) return

    if (state.postsTool !== "delete_post") {
      if (deleteDialog) setDeleteDialog(null)
      if (deleteSuppressedId) setDeleteSuppressedId(null)
      return
    }

    // Tool armed: if exactly one post is selected, open confirm unless suppressed for that post
    if (!deleteDialog && state.selectedPostIds.length === 1) {
      const sel = state.selectedPostIds[0]
      if (sel && deleteSuppressedId !== sel) {
        setDeleteDialog({ postId: sel })
      }
    }
  }, [canEditBalustrade, state.postsTool, state.selectedPostIds, deleteDialog, deleteSuppressedId])

    const touchPointsRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map())

  const gestureRef = useRef<
    | null
    | {
        mode: "pan"
        pointerId: number
        startClientX: number
        startClientY: number
        startView: Viewport
      }
    | {
        mode: "pinch"
        pointerIds: [number, number]
        startDist: number
        startMidClientX: number
        startMidClientY: number
        startWorldX: number
        startWorldY: number
        startView: Viewport
      }
  >(null)

  const panStart = useRef<{ clientX: number; clientY: number; view: Viewport } | null>(null)

  const dragRef = useRef<{
    postId: string
    pointerId: number
    segId: string
    segIndex: number
    sx: number
    sy: number
    dx: number
    dy: number
    nx: number
    ny: number
    segLen: number
    perp: number
    tDelta: number
    chainIds?: string[]
    chainIndex?: number
    perpById?: Record<string, number>
  } | null>(null)

  const floorDragRef = useRef<null | { pointerId: number; index: number }>(null)

  const floorInsertRef = useRef<
    | null
    | { pointerId: number; afterIndex: number; x: number; z: number; downClientX: number; downClientY: number; moved: boolean }
  >(null)

  const fitToContent = () => {
    const extra: { x: number; y: number }[] = []
    for (const r of railEndVirtualPointsByRun) {
      if (r.start) extra.push(r.start)
      if (r.end) extra.push(r.end)
    }

    const b0 = expandBounds(computeBounds(state.posts, extra), 800)
    const w = Math.max(1000, b0.maxX - b0.minX)
    const h = Math.max(1000, b0.maxY - b0.minY)
    setView({ x: b0.minX, y: b0.minY, w, h })
  }

  const clientToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY

    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }

    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  const snapStep = 50

  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault()
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * view.w + view.x
    const my = ((e.clientY - rect.top) / rect.height) * view.h + view.y

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9

    const newW = clamp(view.w * zoomFactor, 200, 200000)
    const newH = clamp(view.h * zoomFactor, 200, 200000)

    const nx = mx - ((mx - view.x) / view.w) * newW
    const ny = my - ((my - view.y) / view.h) * newH

    setView({ x: nx, y: ny, w: newW, h: newH })
  }

  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (e.button !== 1) return
    setIsPanning(true)
    panStart.current = { clientX: e.clientX, clientY: e.clientY, view }
  }

  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!isPanning || !panStart.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()

    const dxPx = e.clientX - panStart.current.clientX
    const dyPx = e.clientY - panStart.current.clientY

    const dxWorld = (dxPx / rect.width) * panStart.current.view.w
    const dyWorld = (dyPx / rect.height) * panStart.current.view.h

    setView({
      ...panStart.current.view,
      x: panStart.current.view.x - dxWorld,
      y: panStart.current.view.y - dyWorld,
    })
  }

  const getWorldFromClientWithView = (clientX: number, clientY: number, v: Viewport) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const rect = svg.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * v.w + v.x
    const y = ((clientY - rect.top) / rect.height) * v.h + v.y
    return { x, y }
  }

  const distanceBetweenTouches = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
  }

  const midpointBetweenTouches = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => {
    return {
      clientX: (a.clientX + b.clientX) / 2,
      clientY: (a.clientY + b.clientY) / 2,
    }
  }

  const stopPan = () => {
    setIsPanning(false)
    panStart.current = null
  }

  const stopDrag = () => {
    dragRef.current = null
    endAnyDrag()
  }

  const stopFloorDrag = () => {
    floorDragRef.current = null
    endAnyDrag()
  }

  const stopFloorInsert = () => {
    floorInsertRef.current = null
    endAnyDrag()
  }

  const gridStep = useMemo(() => {
    const targetLines = 20
    const raw = Math.max(view.w, view.h) / targetLines
    const steps = [50, 100, 200, 500, 1000, 2000, 5000, 10000]
    let best = steps[0]
    for (const s of steps) if (Math.abs(s - raw) < Math.abs(best - raw)) best = s
    return best
  }, [view.w, view.h])

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    const startX = Math.floor(view.x / gridStep) * gridStep
    const endX = Math.ceil((view.x + view.w) / gridStep) * gridStep
    const startY = Math.floor(view.y / gridStep) * gridStep
    const endY = Math.ceil((view.y + view.h) / gridStep) * gridStep

    for (let x = startX; x <= endX; x += gridStep) lines.push({ x1: x, y1: startY, x2: x, y2: endY })
    for (let y = startY; y <= endY; y += gridStep) lines.push({ x1: startX, y1: y, x2: endX, y2: y })

    return lines
  }, [view.x, view.y, view.w, view.h, gridStep])

  const selectedSet = useMemo(() => new Set(state.selectedPostIds), [state.selectedPostIds])

  const postsBySegmentOrdered = useMemo(() => {
    type Item = { id: string; x: number; y: number; t: number }

    const map = new Map<string, Item[]>()
    for (const seg of segments) map.set(seg.id, [])

    const segIndexById = new Map<string, number>()
    for (let i = 0; i < segments.length; i++) segIndexById.set(segments[i].id, i)

    const ANCHOR_EPS = 1e-3

    const tryAdd = (
      segId: string,
      p: {
        id: string
        position: { x: number; z: number }
        referencePosition?: { x: number; z: number }
      }
    ) => {
      const seg = segments[segIndexById.get(segId) ?? -1]
      if (!seg) return

      const sx = seg.start.x
      const sy = seg.start.z
      const d = norm(seg.end.x - seg.start.x, seg.end.z - seg.start.z)

      const px = p.referencePosition?.x ?? p.position.x
      const py = p.referencePosition?.z ?? p.position.z
      const t = dot(px - sx, py - sy, d.x, d.y)

      if (t < -50 || t > seg.length + 50) return
      map.get(segId)!.push({ id: p.id, x: px, y: py, t })
    }

    const hasRealPostAtAnchor = (segId: string, ax: number, ay: number) => {
      const list = map.get(segId) ?? []
      return list.some((it) => {
        if (it.id.startsWith("__")) return false
        return Math.hypot(it.x - ax, it.y - ay) <= ANCHOR_EPS
      })
    }

    // ===== Real posts =====
    for (const p of state.posts) {
      const isVertexPost = p.id.startsWith("post-v-") || /^post-r\d+-v-\d+$/.test(p.id)
      if (!isVertexPost) {
        tryAdd(p.segmentId, p)
        continue
      }

      // Legacy vertex post: post-v-{i}
      const m0 = p.id.match(/^post-v-(\d+)$/)
      if (m0) {
        // IMPORTANT:
        // For dimensions, do NOT force this post onto both adjacent segments.
        // Use the stored segmentId only; internal joint anchors will be added below
        // when there is no real post sitting on the joint.
        tryAdd(p.segmentId, p)
        continue
      }

      // Multi-run vertex post: post-r{run}-v-{i}
      const m1 = p.id.match(/^post-r(\d+)-v-(\d+)$/)
      if (m1) {
        // IMPORTANT:
        // For dimensions, do NOT force this post onto both adjacent segments.
        // Use the stored segmentId only; internal joint anchors will be added below
        // when there is no real post sitting on the joint.
        tryAdd(p.segmentId, p)
        continue
      }

      tryAdd(p.segmentId, p)
    }

    // ===== Internal joint anchors (owned by the PREVIOUS segment only) =====
    for (let runIndex = 0; runIndex < balconyRuns.length; runIndex++) {
      const ids = segIdsByRun?.[runIndex] ?? []
      if (!ids.length) continue

      for (let segInRun = 0; segInRun < ids.length; segInRun++) {
        const segId = ids[segInRun]
        const seg = segments[segIndexById.get(segId) ?? -1]
        if (!seg) continue

        // IMPORTANT:
        // Shared joints should be owned by the PREVIOUS segment end only.
        // Do not also add a start anchor on the next segment, otherwise the
        // selectable/visible joint appears to belong to the second segment.
        if (segInRun < ids.length - 1) {
          if (!hasRealPostAtAnchor(segId, seg.end.x, seg.end.z)) {
            map.get(segId)?.push({
              id: `__joint-end__${segId}`,
              x: seg.end.x,
              y: seg.end.z,
              t: seg.length,
            })
          }
        }
      }
    }

    // ===== Virtual “post centers” for toprail overhangs (per run) =====
    for (const r of railEndVirtualPointsByRun) {
      const runIndex = r.runIndex
      const ids = segIdsByRun?.[runIndex]
      if (!ids?.length) continue

      const firstSegId = ids[0]
      const lastSegId = ids[ids.length - 1]

      const firstSeg = segments[segIndexById.get(firstSegId) ?? -1]
      const lastSeg = segments[segIndexById.get(lastSegId) ?? -1]
      if (!firstSeg || !lastSeg) continue

      if (r.start) {
        map.get(firstSegId)?.push({
          id: `__rail-virt-start__r${runIndex}`,
          x: r.start.x,
          y: r.start.y,
          t: -r.startExt,
        })
      }

      if (r.end) {
        map.get(lastSegId)?.push({
          id: `__rail-virt-end__r${runIndex}`,
          x: r.end.x,
          y: r.end.y,
          t: lastSeg.length + r.endExt,
        })
      }
    }

    // ===== Sort + dedupe =====
    for (const [segId, list] of map.entries()) {
      list.sort((a, b) => {
        if (Math.abs(a.t - b.t) > 1e-6) return a.t - b.t
        return a.id.localeCompare(b.id)
      })

      const seen = new Set<string>()
      map.set(
        segId,
        list.filter((it) => {
          if (seen.has(it.id)) return false
          seen.add(it.id)
          return true
        })
      )
    }

    return map
  }, [segments, state.posts, railEndVirtualPointsByRun, balconyRuns, state.balcony.id, segIdsByRun])

    const spacingExceededByDimKey = useMemo(() => {
    const out = new Set<string>()

    for (const seg of segments) {
      const list = [...(postsBySegmentOrdered.get(seg.id) ?? [])].sort((a, b) => a.t - b.t)
      if (list.length < 2) continue

      const maxSpacing =
        state.balcony.segmentConstraintsById?.[seg.id]?.maxPostSpacing ??
        seg.maxPostSpacing ??
        state.balcony.maxPostSpacing

      if (!Number.isFinite(maxSpacing) || maxSpacing <= 0) continue

      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i]
        const b = list[i + 1]
        const dist = Math.hypot(b.x - a.x, b.y - a.y)
        if (dist > maxSpacing + 1e-6) {
          out.add(`${seg.id}::${a.id}::${b.id}`)
        }
      }
    }

    return out
  }, [segments, postsBySegmentOrdered, state.balcony.segmentConstraintsById, state.balcony.maxPostSpacing])

  const postsFailingBarrierHeight = useMemo(() => {
    const out = new Set<string>()
    const excluded = new Set(state.balcony.autoTopExcludePostIds ?? [])
    const fflY = Number.isFinite(state.foundation.fflY) ? state.foundation.fflY : 0

    for (const post of state.posts) {
      const minBarrierHeight =
        state.balcony.segmentConstraintsById?.[post.segmentId]?.minBarrierHeight ??
        state.balcony.minBarrierHeight

      const maxBarrierHeight =
        state.balcony.segmentConstraintsById?.[post.segmentId]?.maxBarrierHeight ??
        state.balcony.maxBarrierHeight

      const hasMin = Number.isFinite(minBarrierHeight) && minBarrierHeight > 0
      const hasMax = Number.isFinite(maxBarrierHeight) && maxBarrierHeight > 0
      if (!hasMin && !hasMax) continue

      const bottomRef = excluded.has(post.id) ? fflY : post.position.yBottom
      const barrierHeight = post.position.yTop - bottomRef

      if (hasMin && barrierHeight < minBarrierHeight - 1e-6) {
        out.add(post.id)
        continue
      }

      if (hasMax && barrierHeight > maxBarrierHeight + 1e-6) {
        out.add(post.id)
      }
    }

    return out
  }, [
    state.posts,
    state.foundation.fflY,
    state.balcony.autoTopExcludePostIds,
    state.balcony.segmentConstraintsById,
    state.balcony.minBarrierHeight,
    state.balcony.maxBarrierHeight,
  ])

  const postsFailingBottomGap = useMemo(() => {
    const out = new Set<string>()

    const bays = deriveBays({
      balcony: state.balcony,
      posts: state.posts,
      design: state.design,
      toprailType: state.toprail
    })

    for (const bay of bays) {
      if (bay.fromBottomGapExceeded && bay.from.postId) out.add(bay.from.postId)
      if (bay.toBottomGapExceeded && bay.to.postId) out.add(bay.to.postId)
    }

    return out
  }, [state.balcony, state.posts])

  const postsFailingAny = useMemo(() => {
    return new Set<string>([
      ...postsFailingBarrierHeight,
      ...postsFailingBottomGap,
    ])
  }, [postsFailingBarrierHeight, postsFailingBottomGap])
  
  const derivedBays = useMemo(() => {
    return deriveBays({
      balcony: state.balcony,
      posts: state.posts,
      design: state.design,
      toprailType: state.toprail
    })
  }, [state.balcony, state.posts])

  const bayDims = useMemo(() => {
    return derivedBays.map((bay) => {
      const x1 = bay.derivedFrom.leftX
      const y1 = bay.derivedFrom.leftZ
      const x2 = bay.derivedFrom.rightX
      const y2 = bay.derivedFrom.rightZ

      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.hypot(dx, dy)
      if (len < 1e-6) return null

      const dir = norm(dx, dy)
      const normal = { x: dir.y, y: -dir.x }

      return {
        bay,
        x1,
        y1,
        x2,
        y2,
        dir,
        normal,
        length: len,
      }
    }).filter(Boolean) as {
      bay: (typeof derivedBays)[number]
      x1: number
      y1: number
      x2: number
      y2: number
      dir: { x: number; y: number }
      normal: { x: number; y: number }
      length: number
    }[]
  }, [derivedBays])

  const bayDimensionSpans = useMemo(() => {
    return derivedBays.map((bay) => {
      const seg = segById.get(bay.segmentId)
      if (!seg) return null

      const dir = norm(seg.end.x - seg.start.x, seg.end.z - seg.start.z)
      const normal = { x: dir.y, y: -dir.x }

      const x1 = bay.from.x
      const y1 = bay.from.z
      const x2 = bay.to.x
      const y2 = bay.to.z

      const length = Math.hypot(x2 - x1, y2 - y1)
      if (length < 1e-6) return null

      return {
        bay,
        x1,
        y1,
        x2,
        y2,
        dir,
        normal,
        length,
      }
    }).filter(Boolean) as {
      bay: (typeof derivedBays)[number]
      x1: number
      y1: number
      x2: number
      y2: number
      dir: { x: number; y: number }
      normal: { x: number; y: number }
      length: number
    }[]
  }, [derivedBays, segById])

  const derivedFrameless = useMemo(() => {
    return deriveFrameless(state)
  }, [state])

  const framelessSelectionPanelId = useMemo(() => {
    if (!showFramelessSystem || !derivedFrameless.enabled) return null

    if (selectedTarget?.kind === "frameless-panel") {
      return selectedTarget.panelId
    }

    if (selectedTarget?.kind === "frameless-spigot") {
      return selectedTarget.panelId
    }

    if (selectedTarget?.kind === "bottom-rail") {
      const segmentId = getSegmentIdFromBayId(selectedTarget.bayId)
      return getFramelessPanelIdForSegment({
        frameless: derivedFrameless,
        segmentId,
      })
    }

    if (selectedTarget?.kind === "balustrade-vertex") {
      const segmentId = getSegmentIdFromBalustradeVertexTarget({
        balcony: state.balcony,
        runIndex: selectedTarget.runIndex,
        vertexIndex: selectedTarget.vertexIndex,
      })

      return getFramelessPanelIdForSegment({
        frameless: derivedFrameless,
        segmentId,
      })
    }

    return null
  }, [showFramelessSystem, derivedFrameless, selectedTarget, state.balcony])

  const dimOffset = 250
  const witness = 160
  const tick = 60
  const textOffset = 70

  // ===== Floor rendering helpers =====
  const floorDimOffset = 300
  const floorWitness = 180
  const floorTick = 60
  const floorTextOffset = 80

  const floorAngleR = 260
  const floorAngleLabelOffset = 130

  const floor = state.foundation?.floor
  const showFloorAngles = canEditSubstrate && !!floor?.vertices?.length
  const showBalustradeAngles = canEditBalustrade

  const floorPoints = useMemo(() => {
    if (!floor?.vertices?.length) return ""
    return floor.vertices.map((v) => `${v.x},${v.z}`).join(" ")
  }, [floor?.vertices])

  const floorOffsetSegs = useMemo(() => {
    if (!floor?.vertices?.length)
      return [] as { id: string; x1: number; y1: number; x2: number; y2: number; refType: "include" | "exclude" }[]

    const v = floor.vertices
    const n = v.length
    const edgeCount = floor.closed ? n : Math.max(0, n - 1)
    if (edgeCount <= 0) return []

    const ANG_EPS = 1e-6
    const MITER_LIMIT = 10

    const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx
    const rightNormal = (d: { x: number; y: number }) => ({ x: -d.y, y: d.x })

    const intersectLines = (
      p: { x: number; y: number },
      r: { x: number; y: number },
      q: { x: number; y: number },
      s: { x: number; y: number }
    ): { ok: true; x: number; y: number } | { ok: false } => {
      const rxs = cross(r.x, r.y, s.x, s.y)
      if (Math.abs(rxs) < ANG_EPS) return { ok: false }

      const qmpx = q.x - p.x
      const qmpy = q.y - p.y
      const t = cross(qmpx, qmpy, s.x, s.y) / rxs
      return { ok: true, x: p.x + r.x * t, y: p.y + r.y * t }
    }

    type RefType = "include" | "exclude"
    type OffEdge =
      | { ok: false }
      | {
          ok: true
          i: number
          refType: RefType
          offset: number
          dir: { x: number; y: number }
          aOff: { x: number; y: number }
          bOff: { x: number; y: number }
          draw: boolean
        }

    const edges: OffEdge[] = []

    for (let i = 0; i < edgeCount; i++) {
      const a = v[i]
      const b = floor.closed ? v[(i + 1) % n] : v[i + 1]
      if (!b) {
        edges.push({ ok: false })
        continue
      }

      const dx = b.x - a.x
      const dy = b.z - a.z
      const len = Math.hypot(dx, dy)
      if (len < 1e-6) {
        edges.push({ ok: false })
        continue
      }

      const dir = norm(dx, dy)
      const meta = floor.edges?.[i] ?? { offset: 0, refType: "include" as const }
      const refType = (meta.refType ?? "include") as RefType
      const offset = meta.offset ?? 0
      const draw = refType !== "exclude"

      const nR = rightNormal(dir)
      const aOff = { x: a.x + nR.x * offset, y: a.z + nR.y * offset }
      const bOff = { x: b.x + nR.x * offset, y: b.z + nR.y * offset }

      edges.push({ ok: true, i, refType, offset, dir, aOff, bOff, draw })
    }

    const prevValid = (i: number) => {
      for (let k = 1; k <= edgeCount; k++) {
        const j = (i - k + edgeCount) % edgeCount
        if (edges[j]?.ok) return j
      }
      return null
    }

    const nextValid = (i: number) => {
      for (let k = 1; k <= edgeCount; k++) {
        const j = (i + k) % edgeCount
        if (edges[j]?.ok) return j
      }
      return null
    }

    const joinPoint = (prev: Extract<OffEdge, { ok: true }>, curr: Extract<OffEdge, { ok: true }>) => {
      const isect = intersectLines(prev.bOff, prev.dir, curr.aOff, curr.dir)
      if (!isect.ok) return null
      const m = { x: isect.x, y: isect.y }

      const mag = Math.max(Math.abs(prev.offset), Math.abs(curr.offset), 1)
      const spike = Math.min(
        Math.hypot(m.x - prev.bOff.x, m.y - prev.bOff.y),
        Math.hypot(m.x - curr.aOff.x, m.y - curr.aOff.y)
      )
      if (spike > MITER_LIMIT * mag) return null
      return m
    }

    const out: { id: string; x1: number; y1: number; x2: number; y2: number; refType: RefType }[] = []

    for (let i = 0; i < edgeCount; i++) {
      const e = edges[i]
      if (!e.ok) continue

      const prevI = floor.closed ? prevValid(i) : i - 1 >= 0 ? (edges[i - 1]?.ok ? i - 1 : null) : null
      const nextI = floor.closed ? nextValid(i) : i + 1 < edgeCount ? (edges[i + 1]?.ok ? i + 1 : null) : null

      let s = { ...e.aOff }
      let t = { ...e.bOff }

      if (prevI !== null) {
        const p = edges[prevI] as Extract<OffEdge, { ok: true }>
        const m = joinPoint(p, e)
        if (m) s = m
      }

      if (nextI !== null) {
        const nx = edges[nextI] as Extract<OffEdge, { ok: true }>
        const m = joinPoint(e, nx)
        if (m) t = m
      }

      if (!e.draw) continue
      if (Math.hypot(t.x - s.x, t.y - s.y) < 1e-6) continue

      out.push({ id: `floor-off-${i}`, x1: s.x, y1: s.y, x2: t.x, y2: t.y, refType: e.refType })
    }

    return out
  }, [floor])

const floorThickSegs = useMemo(() => {
  if (!floor?.vertices?.length)
    return [] as { id: string; x1: number; y1: number; x2: number; y2: number; edgeType: FloorEdgeType }[]

  const v = floor.vertices
  const n = v.length
  const edgeCount = floor.closed ? n : Math.max(0, n - 1)
  if (edgeCount <= 0) return []

  const ANG_EPS = 1e-6
  const PAR_EPS = 1e-4
  const MITER_LIMIT = 10

  const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx
  const rightNormal = (d: { x: number; y: number }) => ({ x: -d.y, y: d.x })

  const intersectLines = (
    p: { x: number; y: number },
    r: { x: number; y: number },
    q: { x: number; y: number },
    s: { x: number; y: number }
  ): { ok: true; x: number; y: number } | { ok: false } => {
    const rxs = cross(r.x, r.y, s.x, s.y)
    if (Math.abs(rxs) < ANG_EPS) return { ok: false }

    const qmpx = q.x - p.x
    const qmpy = q.y - p.y
    const t = cross(qmpx, qmpy, s.x, s.y) / rxs
    return { ok: true, x: p.x + r.x * t, y: p.y + r.y * t }
  }

  type BaseEdge =
    | { ok: false }
    | { ok: true; i: number; dir: { x: number; y: number }; a: { x: number; y: number }; b: { x: number; y: number } }

  type ThickEdge =
    | { ok: false }
    | {
        ok: true
        i: number
        edgeType: FloorEdgeType
        thickness: number
        dir: { x: number; y: number }
        aOff: { x: number; y: number }
        bOff: { x: number; y: number }
        draw: boolean
      }

  const baseEdges: BaseEdge[] = []
  const edges: ThickEdge[] = []

  for (let i = 0; i < edgeCount; i++) {
    const a = v[i]
    const b = floor.closed ? v[(i + 1) % n] : v[i + 1]
    if (!b) {
      baseEdges.push({ ok: false })
      edges.push({ ok: false })
      continue
    }

    const dx = b.x - a.x
    const dy = b.z - a.z
    const len = Math.hypot(dx, dy)
    if (len < 1e-6) {
      baseEdges.push({ ok: false })
      edges.push({ ok: false })
      continue
    }

    const dir = norm(dx, dy)
    baseEdges.push({ ok: true, i, dir, a: { x: a.x, y: a.z }, b: { x: b.x, y: b.z } })

    const meta = floor.edges?.[i] as any
    const edgeType = ((meta?.edgeType ?? "floor") as FloorEdgeType) || "floor"
    const thickness = Number.isFinite(meta?.thickness) ? Number(meta.thickness) : 0

    // Only non-floor edges get thickening, and only if non-zero thickness.
    const draw = edgeType !== "floor" && Math.abs(thickness) > 1e-6

    // IMPORTANT: positive thickness should go LEFT of edge direction.
    // Your offset uses rightNormal(dir) * offset (positive = right).
    // So thickness must use rightNormal(dir) * (-thickness).
    const thickOffset = -thickness
    const nR = rightNormal(dir)

    const aOff = { x: a.x + nR.x * thickOffset, y: a.z + nR.y * thickOffset }
    const bOff = { x: b.x + nR.x * thickOffset, y: b.z + nR.y * thickOffset }

    edges.push({ ok: true, i, edgeType, thickness, dir, aOff, bOff, draw })
  }

  const prevValid = (i: number) => {
    for (let k = 1; k <= edgeCount; k++) {
      const j = (i - k + edgeCount) % edgeCount
      if (baseEdges[j]?.ok) return j
    }
    return null
  }

  const nextValid = (i: number) => {
    for (let k = 1; k <= edgeCount; k++) {
      const j = (i + k) % edgeCount
      if (baseEdges[j]?.ok) return j
    }
    return null
  }

  // Trim thick endpoints to the NEIGHBOUR *BASE* edge line (offset does not affect thickness trimming),
  // with a parallel guard fallback to "corner + this edge's thickness offset".
  const trimToNeighbourBase = (
    nb: Extract<BaseEdge, { ok: true }>,
    te: Extract<ThickEdge, { ok: true }>,
    end: "start" | "end",
    corner: { x: number; y: number },
    nR: { x: number; y: number },
    thickOffset: number
  ) => {
    // neighbour base direction vs this thick-line direction
    const cr = cross(nb.dir.x, nb.dir.y, te.dir.x, te.dir.y)
    if (Math.abs(cr) < PAR_EPS) return { x: corner.x + nR.x * thickOffset, y: corner.y + nR.y * thickOffset }

    // Intersect neighbour BASE line with this THICK line
    const p = end === "start" ? nb.b : nb.a
    const r = nb.dir
    const q = end === "start" ? te.aOff : te.bOff
    const s = te.dir

    const isect = intersectLines(p, r, q, s)
    if (!isect.ok) return { x: corner.x + nR.x * thickOffset, y: corner.y + nR.y * thickOffset }

    const m = { x: isect.x, y: isect.y }

    // miter/spike guard
    const mag = Math.max(Math.abs(te.thickness), 1)
    const ref = end === "start" ? te.aOff : te.bOff
    if (Math.hypot(m.x - ref.x, m.y - ref.y) > MITER_LIMIT * mag) {
      return { x: corner.x + nR.x * thickOffset, y: corner.y + nR.y * thickOffset }
    }

    return m
  }

  const out: { id: string; x1: number; y1: number; x2: number; y2: number; edgeType: FloorEdgeType }[] = []

  const pushSeg = (id: string, x1: number, y1: number, x2: number, y2: number, edgeType: FloorEdgeType) => {
    if (Math.hypot(x2 - x1, y2 - y1) < 1e-6) return
    out.push({ id, x1, y1, x2, y2, edgeType })
  }

  for (let i = 0; i < edgeCount; i++) {
    const e = edges[i]
    if (!e.ok) continue
    if (!e.draw) continue

    const prevI = floor.closed ? prevValid(i) : i - 1 >= 0 ? (baseEdges[i - 1]?.ok ? i - 1 : null) : null
    const nextI = floor.closed ? nextValid(i) : i + 1 < edgeCount ? (baseEdges[i + 1]?.ok ? i + 1 : null) : null

    let s = { ...e.aOff }
    let t = { ...e.bOff }

    const nR = rightNormal(e.dir)
    const thickOffset = -e.thickness

    const aBase = { x: v[i].x, y: v[i].z }
    const bV = floor.closed ? v[(i + 1) % n] : v[i + 1]
    if (!bV) continue
    const bBase = { x: bV.x, y: bV.z }

    if (prevI !== null) {
      const nb = baseEdges[prevI]
      if (nb?.ok) s = trimToNeighbourBase(nb, e, "start", aBase, nR, thickOffset)
    }

    if (nextI !== null) {
      const nb = baseEdges[nextI]
      if (nb?.ok) t = trimToNeighbourBase(nb, e, "end", bBase, nR, thickOffset)
    }

    // thick edge itself
    pushSeg(`floor-thick-${i}`, s.x, s.y, t.x, t.y, e.edgeType)

    // caps to "close" the 4-sided hob/low_wall/wall
    pushSeg(`floor-thick-cap-a-${i}`, aBase.x, aBase.y, s.x, s.y, e.edgeType)
    pushSeg(`floor-thick-cap-b-${i}`, bBase.x, bBase.y, t.x, t.y, e.edgeType)
  }

  return out
}, [floor])

  const selectedFloorEdge = useMemo(() => {
    if (!floor?.vertices?.length) return null
    if (selectedFloorEdgeIndex === null) return null

    const v = floor.vertices
    const i = selectedFloorEdgeIndex
    const edgeCount = floor.closed ? v.length : Math.max(0, v.length - 1)
    if (i < 0 || i >= edgeCount) return null

    const a = v[i]
    const b = floor.closed ? v[(i + 1) % v.length] : v[i + 1]
    if (!b) return null

    const dist = Math.hypot(b.x - a.x, b.z - a.z)
    const meta = floor.edges?.[i] ?? { offset: 0, refType: "include" as const }

    return { i, a, b, dist, meta }
  }, [floor, selectedFloorEdgeIndex])

  const selectedFloorCorner = useMemo(() => {
    if (!floor?.vertices?.length) return null
    const idx = state.selectedFloorVertexIndex
    if (idx == null) return null

    const v = floor.vertices
    const n = v.length
    if (n < 3) return null
    if (idx < 0 || idx >= n) return null

    // Only interior corners get angles (match your existing drawing rules)
    if (!floor.closed) {
      if (idx === 0 || idx === n - 1) return null
    }

    const prev = v[(idx - 1 + n) % n]
    const curr = v[idx]
    const next = v[(idx + 1) % n]

    const d1 = norm(prev.x - curr.x, prev.z - curr.z) // curr -> prev
    const d2 = norm(next.x - curr.x, next.z - curr.z) // curr -> next

    const ang = signedAngleDegBetween(d1.x, d1.y, d2.x, d2.y) // signed interior, straight = ±180
    if (!Number.isFinite(ang)) return null

    const abs = Math.abs(ang)
    // allow straight (±180) and near-straight; just reject near-zero degenerate
    if (abs < 0.5) return null

    const meta = floor.corners?.[idx] ?? { lockedAngle: null }
    return { i: idx, vx: curr.x, vy: curr.z, ang, meta }
  }, [floor, state.selectedFloorVertexIndex])

  const floorEdgePlusHandles = useMemo<FloorEdgePlus[]>(() => {
    if (!floor?.vertices?.length) return []
    const v = floor.vertices
    const edgeCount = floor.closed ? v.length : Math.max(0, v.length - 1)
    const out: FloorEdgePlus[] = []

    for (let i = 0; i < edgeCount; i++) {
      const a = v[i]
      const b = floor.closed ? v[(i + 1) % v.length] : v[i + 1]
      if (!b) continue

      const mx = (a.x + b.x) / 2
      const my = (a.z + b.z) / 2
      out.push({
        id: `floor-plus-${i}`,
        aIndex: i,
        bIndex: floor.closed ? (i + 1) % v.length : i + 1,
        mx,
        my,
      })
    }

    return out
  }, [floor?.vertices, floor?.closed])

  const floorEdgesForDims = useMemo(() => {
    if (!floor?.vertices?.length) return []
    const v = floor.vertices
    const edgeCount = floor.closed ? v.length : Math.max(0, v.length - 1)
    const edges: { i: number; a: { x: number; y: number }; b: { x: number; y: number }; dir: { x: number; y: number } }[] = []

    for (let i = 0; i < edgeCount; i++) {
      const a = v[i]
      const b = floor.closed ? v[(i + 1) % v.length] : v[i + 1]
      if (!b) continue

      const dx = b.x - a.x
      const dy = b.z - a.z
      const len = Math.hypot(dx, dy)
      if (len < 1e-6) continue

      edges.push({ i, a: { x: a.x, y: a.z }, b: { x: b.x, y: b.z }, dir: norm(dx, dy) })
    }

    return edges
  }, [floor?.vertices, floor?.closed])

  const floorCornersForAngles = useMemo(() => {
    if (!floor?.vertices?.length) return []
    const v = floor.vertices
    const n = v.length

    const corners: { i: number; vx: number; vy: number; d1: { x: number; y: number }; d2: { x: number; y: number }; ang: number }[] = []

    const start = floor.closed ? 0 : 1
    const end = floor.closed ? n - 1 : n - 2

    for (let i = start; i <= end; i++) {
      const prev = v[(i - 1 + n) % n]
      const curr = v[i]
      const next = v[(i + 1) % n]

      if (!floor.closed) {
        if (i - 1 < 0 || i + 1 >= n) continue
      }

      const inDx = curr.x - prev.x
      const inDy = curr.z - prev.z
      const outDx = next.x - curr.x
      const outDy = next.z - curr.z

      const inLen = Math.hypot(inDx, inDy)
      const outLen = Math.hypot(outDx, outDy)
      if (inLen < 1e-6 || outLen < 1e-6) continue

      const d1 = norm(prev.x - curr.x, prev.z - curr.z) // curr -> prev
      const d2 = norm(next.x - curr.x, next.z - curr.z) // curr -> next

      const ang = angleDegBetween(d1.x, d1.y, d2.x, d2.y)

      // Only treat as straight if it's numerically 180 (within tiny epsilon).
      // Keep 179.9 (and other near-straights) visible.
      const STRAIGHT_EPS = 1e-6
      if (Math.abs(ang - 180) <= STRAIGHT_EPS) continue

      if (ang < 0.5) continue

      corners.push({ i, vx: curr.x, vy: curr.z, d1, d2, ang })
    }

    return corners
  }, [floor?.vertices, floor?.closed])

  const getRailExt = (runIndex: number, end: "start" | "end") => {
    const { min: endExtMin, max: endExtMax } = getToprailEndExtensionLimits(
      isFramelessDesignActive,
      45
    )

    const defaultValue = getDefaultRailEndExtension({
      balcony: state.balcony,
      runIndex,
      end,
      min: endExtMin,
      max: endExtMax,
    })

    const ext = state.balcony.endExtensionsByRun?.[runIndex] ?? state.balcony.endExtensions
    const v = end === "start" ? ext?.start : ext?.end

    return typeof v === "number" && Number.isFinite(v)
      ? clamp(v, endExtMin, endExtMax)
      : defaultValue
  }

  const floorVertexSize = 110
  const floorVertexHalf = floorVertexSize / 2

  const plusR = 85
  const plusStroke = 10
  const plusArm = 42

  const { min: RAIL_END_EXT_MIN, max: RAIL_END_EXT_MAX } = getToprailEndExtensionLimits(
    isFramelessDesignActive,
    45
  )

  // For per-run drawings we only need points strings
  const balconyRunPoints = useMemo(() => {
    return balconyRuns.map((path) => path.map((v) => `${v.x},${v.z}`).join(" "))
  }, [balconyRuns])

  const inspectorTargetFromPostId = (postId: string): InspectorTarget => {
    return { kind: "post", postId }
  }

  const inspectorTargetFromRailEnd = (runIndex: number, end: "start" | "end"): InspectorTarget => {
    return { kind: "rail-end", runIndex, end }
  }

  const inspectorTargetFromBalustradeVertex = (runIndex: number, vertexIndex: number): InspectorTarget => {
    return { kind: "balustrade-vertex", runIndex, vertexIndex }
  }

  const inspectorTargetFromFramelessPanel = (panelId: string): InspectorTarget => {
    return { kind: "frameless-panel", panelId }
  }

  const inspectorTargetFromFramelessSpigot = (panelId: string, side: "left" | "right"): InspectorTarget => {
    return { kind: "frameless-spigot", panelId, side }
  }
  
  const getVertexPostRef = (postId: string): { runIndex: number; vertexIndex: number } | null => {
    const base = postId.match(/^post-v-(\d+)$/)
    if (base) {
      return { runIndex: 0, vertexIndex: Number(base[1]) }
    }

    const multi = postId.match(/^post-r(\d+)-v-(\d+)$/)
    if (multi) {
      return { runIndex: Number(multi[1]), vertexIndex: Number(multi[2]) }
    }

    return null
  }

  const isJoinableBalustradeVertex = (runIndex: number, vertexIndex: number) => {
    const runPath = balconyRuns[runIndex]
    if (!runPath || runPath.length < 3) return false
    if (vertexIndex <= 0 || vertexIndex >= runPath.length - 1) return false

    const prev = runPath[vertexIndex - 1]
    const curr = runPath[vertexIndex]
    const next = runPath[vertexIndex + 1]
    if (!prev || !curr || !next) return false

    const inDir = norm(prev.x - curr.x, prev.z - curr.z)
    const outDir = norm(next.x - curr.x, next.z - curr.z)
    const straightDot = dot(inDir.x, inDir.y, outDir.x, outDir.y)

    return Math.abs(straightDot + 1) <= 1e-6
  }

  const inspectorTargetFromToprailPiece = (runIndex: number, pieceIndex: number): InspectorTarget => {
    return { kind: "toprail", runIndex, pieceIndex }
  }

  const inspectorTargetFromLinkedToprailEnd = (
    runIndex: number,
    end: "start" | "end"
  ): InspectorTarget => {
    const runPath =
      balconyRuns[runIndex]

    if (!runPath || runPath.length < 2) return null

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
      profile: getToprailProfileMm({
        toprailType: isFramelessDesignActive ? state.balcony.framelessToprailType : state.toprail,
        isFrameless: isFramelessDesignActive,
        framelessToprailHeight: state.balcony.framelessToprailHeight,
      }),
      rules: {
        stockLen: 5500,
        postWidth: 45,
        endExtMin: RAIL_END_EXT_MIN,
        endExtMax: RAIL_END_EXT_MAX,
        joinOffset: 45 / 2,
      },
      design: state.design,
      state,
      endExtensions: runEndExt,
    })

    if (!pieces.length) return null

    return {
      kind: "toprail",
      runIndex,
      pieceIndex: end === "start" ? 0 : pieces.length - 1,
    }
  }

  const inspectorTargetFromBottomRail = (bayId: string): InspectorTarget => {
    return { kind: "bottom-rail", bayId }
  }

  return (
    <div className={styles.canvas2dRoot}>
      <EditorToolbar
        state={state}
        dispatch={dispatch}
        onFit={fitToContent}
        onSave={onSave}
        isSaving={isSaving}
        saveDisabled={saveDisabled}
        title={toolbarTitle}
      >
        {canShowBalustrade && canEditBalustrade && !state.laserHeightListEditMode && selectedTarget?.kind === "post" ? (
          <PostSelectionCard state={state} dispatch={dispatch} />
        ) : null}

        {canShowBalustrade && canEditBalustrade && selectedTarget?.kind === "toprail" ? (
          <ToprailSelectionCard
            state={state}
            dispatch={dispatch}
            runIndex={selectedTarget.runIndex}
            pieceIndex={selectedTarget.pieceIndex}
          />
        ) : null}
        {showPostSystem && canEditBalustrade && selectedTarget?.kind === "bottom-rail" ? (
          <BaySelectionCard
            state={state}
            dispatch={dispatch}
            bayId={selectedTarget.bayId}
          />
        ) : null}

        {showFramelessSystem && canEditBalustrade && framelessSelectionPanelId ? (
          <FramelessSelectionCard
            state={state}
            dispatch={dispatch}
            panelId={framelessSelectionPanelId}
          />
        ) : null}
        {canShowBalustrade && canEditBalustrade && state.laserHeightListEditMode ? (
          <LaserHeightListCard state={state} dispatch={dispatch} />
        ) : null}

        {canEditSubstrate && state.selectedFloorVertexIndex != null ? (
          <FloorVertexSelectionCard state={state} dispatch={dispatch} />
        ) : null}
        
        {/* ===== Floating cards (gated by mode) ===== */}
        {canEditBalustrade && selectedTarget?.kind === "balustrade-vertex"
          ? (() => {
              const { runIndex, vertexIndex } = selectedTarget
              const runPath = balconyRuns[runIndex]

              if (!runPath || runPath.length < 3 || vertexIndex <= 0 || vertexIndex >= runPath.length - 1) return null

              const prev = runPath[vertexIndex - 1]
              const curr = runPath[vertexIndex]
              const next = runPath[vertexIndex + 1]
              if (!prev || !curr || !next) return null

              const inDir = norm(prev.x - curr.x, prev.z - curr.z)
              const outDir = norm(next.x - curr.x, next.z - curr.z)
              const straightDot = dot(inDir.x, inDir.y, outDir.x, outDir.y)
              const canJoin = Math.abs(straightDot + 1) <= 1e-6

              return (
                <div className={styles.floatingCard}>
                  <div className={styles.metaText}>
                    Balustrade joint — Run {runIndex}, Vertex {vertexIndex}
                  </div>

                  <div className={styles.metaText} style={{ opacity: 0.8 }}>
                    X: {formatDim(curr.x)} / Z: {formatDim(curr.z)}
                  </div>

                  <button
                    className={styles.btn}
                    disabled={!canJoin}
                    onClick={() => {
                      if (!canJoin) return
                      dispatch({ type: "JOIN_BALUSTRADE_AT_VERTEX", runIndex, vertexIndex })
                    }}
                  >
                    Join balustrade at joint
                  </button>

                  {!canJoin ? (
                    <div className={styles.metaText} style={{ opacity: 0.75, marginTop: 8 }}>
                      Join is only available for exact 180° straight-through joints.
                    </div>
                  ) : null}
                </div>
              )
            })()
          : null}

        {canEditSubstrate && floor?.vertices?.length && selectedFloorEdgeIndex !== null
          ? (() => {
              const meta = floor?.edges?.[selectedFloorEdgeIndex] ?? ({ offset: 0, refType: "include" as const, edgeType: "floor" as const } as any)
              const edgeInfo = selectedFloorEdge

              return (
                <div className={styles.floatingCard}>
                    <button
                        className={styles.btn}
                        onClick={() =>
                            dispatch({ type: "CYCLE_FLOOR_EDGE_REF_TYPE", edgeIndex: selectedFloorEdgeIndex })
                        }
                        >
                        Edge {selectedFloorEdgeIndex} ({meta.refType}) — {(meta as any)?.edgeType ?? "floor"}
                    </button>

                  {edgeInfo ? (
                    <>
                      <label className={styles.label}>Length</label>
                      <NumericInput
                        key={`floor-edge-${selectedFloorEdgeIndex}-length`}
                        className={styles.input}
                        value={Math.round(edgeInfo.dist * 10) / 10}
                        min={0.0001}
                        step={0.1}
                        updateMode="commit"
                        onCommit={(next) => {
                            if (!Number.isFinite(next) || next <= 0) return
                            dispatch({ type: "SET_FLOOR_EDGE_LENGTH", edgeIndex: selectedFloorEdgeIndex, length: next })
                        }}
                      />

                      <button
                        className={styles.btn}
                        onClick={() => {
                          const curr = floor?.edges?.[selectedFloorEdgeIndex] as any
                          const locked = typeof curr?.lockedLength === "number" && Number.isFinite(curr.lockedLength)
                          dispatch({
                            type: "SET_FLOOR_EDGE_LOCKED_LENGTH",
                            edgeIndex: selectedFloorEdgeIndex,
                            lockedLength: locked ? null : Math.round(edgeInfo.dist * 10) / 10,
                          })
                        }}
                      >
                        {(floor?.edges?.[selectedFloorEdgeIndex] as any)?.lockedLength != null ? "Unlock length" : "Lock length"}
                      </button>
                    </>
                  ) : null}

                    <label className={styles.label}>Edge type</label>
                    <select
                        key={`floor-edge-${selectedFloorEdgeIndex}-edgeType`}
                        className={styles.input}
                        value={((meta as any)?.edgeType ?? "floor") as FloorEdgeType}
                        onChange={(ev) => {
                            const next = ev.target.value as FloorEdgeType
                            dispatch({ type: "SET_FLOOR_EDGE_TYPE", edgeIndex: selectedFloorEdgeIndex, edgeType: next })
                        }}
                    >
                    {((meta.refType ?? "include") === "exclude"
                        ? (["floor", "wall"] as FloorEdgeType[])
                        : (["floor", "hob", "low_wall"] as FloorEdgeType[])
                    ).map((t) => (
                        <option key={t} value={t}>
                        {t}
                        </option>
                    ))}
                    </select>

                    {(() => {
                        const edgeType = ((meta as any)?.edgeType ?? "floor") as FloorEdgeType
                        const show = edgeType === "hob" || edgeType === "low_wall" || edgeType === "wall"
                        if (!show) return null

                        return (
                            <>
                            <label className={styles.label}>Thickness (mm)</label>
                            <NumericInput
                                key={`floor-edge-${selectedFloorEdgeIndex}-thickness`}
                                className={styles.input}
                                value={Number.isFinite((meta as any)?.thickness) ? Number((meta as any).thickness) : 0}
                                min={-200}
                                max={200}
                                step={1}
                                updateMode="commit"
                                onCommit={(next) => {
                                    if (!Number.isFinite(next)) return
                                    dispatch({ type: "SET_FLOOR_EDGE_THICKNESS", edgeIndex: selectedFloorEdgeIndex, thickness: next })
                                }}
                            />

                            <label className={styles.label}>Height (mm)</label>
                            <NumericInput
                                key={`floor-edge-${selectedFloorEdgeIndex}-height`}
                                className={styles.input}
                                value={Number.isFinite((meta as any)?.height) ? Number((meta as any).height) : 0}
                                min={-5000}
                                max={5000}
                                step={1}
                                updateMode="commit"
                                onCommit={(next) => {
                                    if (!Number.isFinite(next)) return
                                    dispatch({ type: "SET_FLOOR_EDGE_HEIGHT", edgeIndex: selectedFloorEdgeIndex, height: next })
                                }}
                            />
                            </>
                        )
                        })()}

                  <label className={styles.label}>Offset</label>
                  <NumericInput
                    key={`floor-edge-${selectedFloorEdgeIndex}-offset`}
                    className={styles.input}
                    value={meta.offset ?? 0}
                    step={1}
                    updateMode="change"
                    onChange={(next) => {
                        dispatch({ type: "SET_FLOOR_EDGE_OFFSET", edgeIndex: selectedFloorEdgeIndex, offset: next })
                    }}
                  />

                </div>
              )
            })()
          : null}

      </EditorToolbar>

      {/* ===== Delete confirmation dialog (overlay). Render OUTSIDE toolbar so it truly overlays canvas. ===== */}
      {canEditBalustrade && deleteDialog ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
            zIndex: 50,
          }}
          onPointerDown={() => {
            // clicking overlay = cancel, keep selection
            cancelDeleteDialog()
          }}
        >
          <div
            style={{
              width: 360,
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #E5E7EB",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              padding: 14,
            }}
            onPointerDown={(e) => e.stopPropagation()} // don't treat clicking inside as cancel
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Delete post?</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
              This will permanently remove <span style={{ fontFamily: "monospace" }}>{deleteDialog.postId}</span>.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={styles.btn}
                style={{ flex: 1, padding: "10px 12px" }}
                onClick={() => {
                  cancelDeleteDialog()
                }}
              >
                Cancel
              </button>

              <button
                className={styles.btn}
                style={{ flex: 1, padding: "10px 12px", background: "#111827", color: "#fff" }}
                onClick={() => {
                  const id = deleteDialog.postId
                  setDeleteDialog(null)
                  setDeleteSuppressedId(null)
                  dispatch({ type: "DELETE_POST", id })
                  // Optional: disarm after delete (matches your add tool behavior)
                  dispatch({ type: "SET_POSTS_TOOL", tool: null })
                }}
              >
                Delete
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Tip: click outside this dialog to cancel.</div>
          </div>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={() => stopPan()}
        onMouseLeave={() => stopPan()}
        onPointerMove={(e) => {
          if (touchPointsRef.current.has(e.pointerId)) {
            touchPointsRef.current.set(e.pointerId, {
              clientX: e.clientX,
              clientY: e.clientY,
            })

            const gesture = gestureRef.current

            if (gesture?.mode === "pan" && gesture.pointerId === e.pointerId) {
              const rect = svgRef.current?.getBoundingClientRect()
              if (!rect) return

              const dxPx = e.clientX - gesture.startClientX
              const dyPx = e.clientY - gesture.startClientY

              const dxWorld = (dxPx / rect.width) * gesture.startView.w
              const dyWorld = (dyPx / rect.height) * gesture.startView.h

              setView({
                ...gesture.startView,
                x: gesture.startView.x - dxWorld,
                y: gesture.startView.y - dyWorld,
              })
              return
            }

            if (gesture?.mode === "pinch") {
              const a = touchPointsRef.current.get(gesture.pointerIds[0])
              const b = touchPointsRef.current.get(gesture.pointerIds[1])
              if (!a || !b) return

              const mid = midpointBetweenTouches(a, b)
              const dist = Math.max(1, distanceBetweenTouches(a, b))
              const scale = gesture.startDist / dist

              const newW = clamp(gesture.startView.w * scale, 200, 200000)
              const newH = clamp(gesture.startView.h * scale, 200, 200000)

              const rect = svgRef.current?.getBoundingClientRect()
              if (!rect) return

              const midDxPx = mid.clientX - gesture.startMidClientX
              const midDyPx = mid.clientY - gesture.startMidClientY

              const midDxWorld = (midDxPx / rect.width) * gesture.startView.w
              const midDyWorld = (midDyPx / rect.height) * gesture.startView.h

              const pannedX = gesture.startView.x - midDxWorld
              const pannedY = gesture.startView.y - midDyWorld

              const worldMidNow = getWorldFromClientWithView(mid.clientX, mid.clientY, {
                x: pannedX,
                y: pannedY,
                w: gesture.startView.w,
                h: gesture.startView.h,
              })

              const nx = gesture.startWorldX - ((gesture.startWorldX - worldMidNow.x) / gesture.startView.w) * newW
              const ny = gesture.startWorldY - ((gesture.startWorldY - worldMidNow.y) / gesture.startView.h) * newH

              setView({
                x: nx,
                y: ny,
                w: newW,
                h: newH,
              })
              return
            }
          }

          if (dragRef.current) {
            const d = dragRef.current
            if (e.pointerId !== d.pointerId) return
            if (!canEditBalustrade) return

            const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)
            const tPointer = dot(wx - d.sx, wy - d.sy, d.dx, d.dy)

            let tDragged = tPointer - d.tDelta
            tDragged = clamp(tDragged, 0, d.segLen)

            if (state.snapEnabled) {
              const snapped = snap(tDragged, snapStep)
              const endSnapThreshold = snapStep / 2

              tDragged =
                d.segLen - tDragged <= endSnapThreshold
                  ? d.segLen
                  : clamp(snapped, 0, d.segLen)
            }

            const perpDragged = d.perpById?.[d.postId] ?? d.perp
            const x = d.sx + d.dx * tDragged + d.nx * perpDragged
            const z = d.sy + d.dy * tDragged + d.ny * perpDragged

            dispatch({ type: "UPDATE_POST_POSITION", id: d.postId, x, z })
            return
          }

          if (floorDragRef.current) {
            const d = floorDragRef.current
            if (e.pointerId !== d.pointerId) return
            if (!floor) return
            if (!canEditSubstrate) return

            const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

            let nx = wx
            let nz = wy
            if (state.snapEnabled) {
              nx = snap(nx, snapStep)
              nz = snap(nz, snapStep)
            }

            dispatch({ type: "MOVE_FLOOR_VERTEX_DRAG", index: d.index, x: nx, z: nz })
            return
          }

          if (floorInsertRef.current) {
            const d = floorInsertRef.current
            if (e.pointerId !== d.pointerId) return
            if (!canEditSubstrate) return

            const dx = e.clientX - d.downClientX
            const dy = e.clientY - d.downClientY
            if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true

            const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)
            d.x = wx
            d.z = wy
            return
          }

        // ===== Tool hover highlighting (when an add-on-segment tool is armed) =====
        if (canEditBalustrade && isAddPostToolArmed) {
            const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

            // Pick the closest segment under cursor (within tolerance)
            const HIT_R = 140 // world mm tolerance (tune)
            const HIT_R_SQ = HIT_R * HIT_R

            let bestId: string | null = null
            let bestD = Infinity

            for (const s of segments) {
              const d2 = distSqPointToSegment(wx, wy, s.start.x, s.start.z, s.end.x, s.end.z)
              if (d2 < bestD) {
                bestD = d2
                bestId = s.id
              }
            }

            if (bestId && bestD <= HIT_R_SQ) setHoveredSegId(bestId)
            else setHoveredSegId(null)

            return
          }

          // Not armed (or not add tool): no highlight
          if (hoveredSegId) setHoveredSegId(null)
        }}
        onPointerUp={(e) => {
          if (touchPointsRef.current.has(e.pointerId)) {
            touchPointsRef.current.delete(e.pointerId)

            const gesture = gestureRef.current

            if (gesture?.mode === "pan" && gesture.pointerId === e.pointerId) {
              gestureRef.current = null
              setIsPanning(false)
            } else if (gesture?.mode === "pinch") {
              const remaining = Array.from(touchPointsRef.current.entries())

              if (remaining.length === 1) {
                const [nextId, nextPt] = remaining[0]
                gestureRef.current = {
                  mode: "pan",
                  pointerId: nextId,
                  startClientX: nextPt.clientX,
                  startClientY: nextPt.clientY,
                  startView: view,
                }
                setIsPanning(true)
              } else {
                gestureRef.current = null
                setIsPanning(false)
              }
            }

            try {
              ;(svgRef.current as any)?.releasePointerCapture?.(e.pointerId)
            } catch {}

            return
          }

          if (dragRef.current?.pointerId === e.pointerId) {
            try {
              ;(svgRef.current as any)?.releasePointerCapture?.(e.pointerId)
            } catch {}
            stopDrag()
          }

          if (floorDragRef.current?.pointerId === e.pointerId) {
            try {
              ;(svgRef.current as any)?.releasePointerCapture?.(e.pointerId)
            } catch {}
            stopFloorDrag()
          }

          if (floorInsertRef.current?.pointerId === e.pointerId) {
            const d = floorInsertRef.current
            try {
              ;(svgRef.current as any)?.releasePointerCapture?.(e.pointerId)
            } catch {}

            if (!canEditSubstrate) {
              stopFloorInsert()
              return
            }

            const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

            let nx = wx
            let nz = wy
            if (state.snapEnabled) {
              nx = snap(nx, snapStep)
              nz = snap(nz, snapStep)
            }

            dispatch({ type: "INSERT_FLOOR_VERTEX", afterIndex: d.afterIndex, x: nx, z: nz })
            stopFloorInsert()
          }
        }}
        onPointerCancel={(e) => {
            if (touchPointsRef.current.has(e.pointerId)) {
                touchPointsRef.current.delete(e.pointerId)

                const gesture = gestureRef.current
                if (gesture?.mode === "pan" && gesture.pointerId === e.pointerId) {
                gestureRef.current = null
                setIsPanning(false)
                } else if (gesture?.mode === "pinch") {
                const remaining = Array.from(touchPointsRef.current.entries())

                if (remaining.length === 1) {
                    const [nextId, nextPt] = remaining[0]
                    gestureRef.current = {
                    mode: "pan",
                    pointerId: nextId,
                    startClientX: nextPt.clientX,
                    startClientY: nextPt.clientY,
                    startView: view,
                    }
                    setIsPanning(true)
                } else {
                    gestureRef.current = null
                    setIsPanning(false)
                }
                }

                try {
                ;(svgRef.current as any)?.releasePointerCapture?.(e.pointerId)
                } catch {}
            }

            if (dragRef.current?.pointerId === e.pointerId) stopDrag()
            if (floorDragRef.current?.pointerId === e.pointerId) stopFloorDrag()
            if (floorInsertRef.current?.pointerId === e.pointerId) stopFloorInsert()
        }}
        onPointerDown={(e) => {
          // If confirmation dialog is open, clicking the canvas cancels (keep selection)
          if (deleteDialog) {
            cancelDeleteDialog()
            return
          }

          // IMPORTANT:
          // Do NOT require e.target === e.currentTarget.
          // Most of the canvas is made of <line>/<polyline> etc. which will otherwise eat clicks.
          // Interactive elements already call stopPropagation(), so this handler is the "fallthrough".
          if (e.button !== 0) return

          if (e.pointerType !== "mouse" && e.target === e.currentTarget) {
            touchPointsRef.current.set(e.pointerId, {
              clientX: e.clientX,
              clientY: e.clientY,
            })

            const pts = Array.from(touchPointsRef.current.entries())

            if (pts.length === 1) {
              gestureRef.current = {
                mode: "pan",
                pointerId: e.pointerId,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startView: view,
              }

              setIsPanning(true)

              try {
                ;(svgRef.current as any)?.setPointerCapture?.(e.pointerId)
              } catch {}

              return
            }

            if (pts.length === 2) {
              const [aEntry, bEntry] = pts
              const a = aEntry[1]
              const b = bEntry[1]

              const mid = midpointBetweenTouches(a, b)
              const worldMid = getWorldFromClientWithView(mid.clientX, mid.clientY, view)

              gestureRef.current = {
                mode: "pinch",
                pointerIds: [aEntry[0], bEntry[0]],
                startDist: Math.max(1, distanceBetweenTouches(a, b)),
                startMidClientX: mid.clientX,
                startMidClientY: mid.clientY,
                startWorldX: worldMid.x,
                startWorldY: worldMid.y,
                startView: view,
              }

              setIsPanning(true)

              try {
                ;(svgRef.current as any)?.setPointerCapture?.(aEntry[0])
              } catch {}

              try {
                ;(svgRef.current as any)?.setPointerCapture?.(bEntry[0])
              } catch {}

              return
            }
          }

            // If an add-on-segment tool is armed: click either places (if hovering a segment) or disarms (if not).
            if (canEditBalustrade && isAddPostToolArmed) {
                if (hoveredSegId) {
                    const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

                    if (state.postsTool === "add_mid_post") {
                    dispatch({ type: "ADD_MID_POST_ON_SEGMENT", segId: hoveredSegId, wx, wz: wy })
                    } else {
                    // add_posts_to_spacing
                    dispatch({ type: "ADD_POSTS_TO_MAX_SPACING_ON_SEGMENT", segId: hoveredSegId, wx, wz: wy })
                    }
                } else {
                    // click with no valid target disarms the tool
                    dispatch({ type: "SET_POSTS_TOOL", tool: null })
                }

                setHoveredSegId(null)
                return
            }

          // Delete tool armed, but user clicked empty canvas: un-arm
          if (canEditBalustrade && state.postsTool === "delete_post") {
            dispatch({ type: "SET_POSTS_TOOL", tool: null })
            setDeleteSuppressedId(null)
            return
          }

          // Otherwise: behave like your existing background click
          if (canEditBalustrade) {
            setSelectedRailEnd(null)
            dispatch({ type: "CLEAR_SELECTION" })
            onSelectTargetChange(null)
          } else {
            setSelectedFloorEdgeIndex(null)
            dispatch({ type: "SELECT_FLOOR_VERTEX", index: null })
            onSelectTargetChange(null)
          }
        }}
        style={{
            display: "block",
            cursor: isPanning ? "grabbing" : "default",
            touchAction: "none",
            }}
      >
        {/* Grid */}
        <g opacity={0.25}>
          {gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#cbd5e1" strokeWidth={1} />
          ))}
        </g>

        {/* Axes */}
        <g opacity={0.8}>
          <line x1={-100000} y1={0} x2={100000} y2={0} stroke="#ef4444" strokeWidth={3} />
          <line x1={0} y1={-100000} x2={0} y2={100000} stroke="#3b82f6" strokeWidth={3} />
        </g>

        {/* Foundation floor (draw always; interaction gated) */}
        {floor?.vertices?.length ? (
          <g>
            {floor.closed ? (
              <polygon points={floorPoints} fill="#111827" fillOpacity={0.04} stroke="#111827" strokeOpacity={0.35} strokeWidth={10} />
            ) : (
              <polyline points={floorPoints} fill="none" stroke="#111827" strokeOpacity={0.35} strokeWidth={10} />
            )}

            {floorOffsetSegs.length ? (
              <g pointerEvents="none">
                {floorOffsetSegs.map((s) => (
                  <line
                    key={s.id}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#111827"
                    strokeOpacity={0.35}
                    strokeWidth={6}
                    strokeDasharray="24 18"
                  />
                ))}
              </g>
            ) : null}

            {floorThickSegs.length ? (
            <g pointerEvents="none">
                {floorThickSegs.map((s) => (
                <line
                    key={s.id}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="#111827"
                    strokeOpacity={0.22}
                    strokeWidth={6}
                    strokeDasharray="60 55"
                    strokeLinecap="round"
                />
                ))}
            </g>
            ) : null}

            {/* Floor edge dimensions */}
            <g opacity={0.95} pointerEvents={isDraggingObject ? "none" : "auto"}>
              {floorEdgesForDims.map((e) => {
                const a = e.a
                const b = e.b
                const d = e.dir
                const nDim = { x: d.y, y: -d.x } // keep for dimensions ("above")

                const meta = floor?.edges?.[e.i] ?? { offset: 0, refType: "include" as const, lockedLength: null }
                const refType = meta.refType ?? "include"
                const isLockedLenLocal = typeof (meta as any).lockedLength === "number" && Number.isFinite((meta as any).lockedLength)
                const isExcluded = refType === "exclude"
                const isSelectedEdge = selectedFloorEdgeIndex === e.i

                const dist = Math.hypot(b.x - a.x, b.y - a.y)
                const floorDimLineOffset = getFloorDimensionOffset(Number(meta.offset ?? 0))

                const axo = a.x + nDim.x * floorDimLineOffset
                const ayo = a.y + nDim.y * floorDimLineOffset
                const bxo = b.x + nDim.x * floorDimLineOffset
                const byo = b.y + nDim.y * floorDimLineOffset

                const awx2 = a.x + nDim.x * (floorDimLineOffset - floorWitness)
                const awy2 = a.y + nDim.y * (floorDimLineOffset - floorWitness)
                const bwx2 = b.x + nDim.x * (floorDimLineOffset - floorWitness)
                const bwy2 = b.y + nDim.y * (floorDimLineOffset - floorWitness)

                const tdir = { x: -d.y, y: d.x }
                const tickAx1 = axo - tdir.x * (floorTick / 2)
                const tickAy1 = ayo - tdir.y * (floorTick / 2)
                const tickAx2 = axo + tdir.x * (floorTick / 2)
                const tickAy2 = ayo + tdir.y * (floorTick / 2)

                const tickBx1 = bxo - tdir.x * (floorTick / 2)
                const tickBy1 = byo - tdir.y * (floorTick / 2)
                const tickBx2 = bxo + tdir.x * (floorTick / 2)
                const tickBy2 = byo + tdir.y * (floorTick / 2)

                const mx = (axo + bxo) / 2
                const my = (ayo + byo) / 2
                const ang = (Math.atan2(d.y, d.x) * 180) / Math.PI

                const tx = mx + nDim.x * floorTextOffset
                const ty = my + nDim.y * floorTextOffset

                return (
                  <g key={`floor-dim-${e.i}`}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="transparent"
                      strokeWidth={90}
                      style={{ cursor: canEditSubstrate ? "pointer" : "default" }}
                      onPointerDown={(ev: React.PointerEvent<SVGLineElement>) => {
                        if (!canEditSubstrate) return
                        ev.stopPropagation()
                        setSelectedRailEnd(null)
                        dispatch({ type: "CLEAR_SELECTION" })
                        setSelectedFloorEdgeIndex(e.i)
                        if (ev.shiftKey) dispatch({ type: "CYCLE_FLOOR_EDGE_REF_TYPE", edgeIndex: e.i })
                      }}
                    />

                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isSelectedEdge ? "#2563eb" : "#111827"}
                      strokeOpacity={isSelectedEdge ? 0.95 : isExcluded ? 0.12 : 0.25}
                      strokeWidth={isSelectedEdge ? 18 : 10}
                      pointerEvents="none"
                    />

                    <line x1={a.x} y1={a.y} x2={awx2} y2={awy2} stroke="#111827" strokeOpacity={0.55} strokeWidth={6} />
                    <line x1={b.x} y1={b.y} x2={bwx2} y2={bwy2} stroke="#111827" strokeOpacity={0.55} strokeWidth={6} />

                    <line x1={axo} y1={ayo} x2={bxo} y2={byo} stroke="#111827" strokeOpacity={0.75} strokeWidth={6} />

                    <line x1={tickAx1} y1={tickAy1} x2={tickAx2} y2={tickAy2} stroke="#111827" strokeOpacity={0.85} strokeWidth={6} />
                    <line x1={tickBx1} y1={tickBy1} x2={tickBx2} y2={tickBy2} stroke="#111827" strokeOpacity={0.85} strokeWidth={6} />

                    <text
                      x={tx}
                      y={ty}
                      fontSize={90}
                      fill="#111827"
                      opacity={0.9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${ang} ${tx} ${ty})`}
                      style={{ cursor: canEditSubstrate ? "pointer" : "default" }}
                      onPointerDown={(ev) => {
                        if (!canEditSubstrate) return
                        ev.stopPropagation()

                        const nextLocked = isLockedLenLocal ? null : Math.round(dist * 10) / 10
                        dispatch({
                          type: "SET_FLOOR_EDGE_LOCKED_LENGTH",
                          edgeIndex: e.i,
                          lockedLength: nextLocked,
                        })
                      }}
                    >
                      {formatDim(dist)}
                      <tspan dx="40" fill={isLockedLenLocal ? "#111827" : "#9ca3af"}>
                        {isLockedLenLocal ? "🔒" : "⊘"}
                      </tspan>
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Edge insert "+" handles — SUBSTRATE MODE ONLY */}
            {canEditSubstrate ? (
            <g opacity={0.7}>
                {floorEdgePlusHandles.map((h) => (
                <g
                    key={h.id}
                    transform={`translate(${h.mx} ${h.my})`}
                    style={{ cursor: canEditSubstrate ? "copy" : "default" }}
                    onPointerDown={(e) => {
                    if (!canEditSubstrate) return
                    e.stopPropagation()
                    if (e.button !== 0) return
                    if (!floor) return

                    const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

                    floorInsertRef.current = {
                        pointerId: e.pointerId,
                        afterIndex: h.aIndex,
                        x: wx,
                        z: wy,
                        downClientX: e.clientX,
                        downClientY: e.clientY,
                        moved: false,
                    }
                    startAnyDrag()

                    try {
                        ;(svgRef.current as any)?.setPointerCapture?.(e.pointerId)
                    } catch {}
                    }}
                >
                    <circle cx={0} cy={0} r={plusR} fill="#ffffff" fillOpacity={0.75} stroke="#111827" strokeOpacity={0.45} strokeWidth={10} />
                    <line x1={-plusArm} y1={0} x2={plusArm} y2={0} stroke="#111827" strokeOpacity={0.7} strokeWidth={plusStroke} strokeLinecap="round" />
                    <line x1={0} y1={-plusArm} x2={0} y2={plusArm} stroke="#111827" strokeOpacity={0.7} strokeWidth={plusStroke} strokeLinecap="round" />
                </g>
                ))}
            </g>
            ) : null}

            {/* Floor corner angles */}
            {showFloorAngles ? (
            <g opacity={0.95} pointerEvents={isDraggingObject ? "none" : "auto"}>
              {floorCornersForAngles.map((c) => {
                const vx = c.vx
                const vy = c.vy
                const d1 = c.d1
                const d2 = c.d2
                const ang = c.ang

                const bis = norm(d1.x + d2.x, d1.y + d2.y)
                const r = floorAngleR

                const a1 = Math.atan2(d1.y, d1.x)
                const a2 = Math.atan2(d2.y, d2.x)

                let start = a1
                let end = a2
                let sweep = end - start
                while (sweep <= -Math.PI) sweep += 2 * Math.PI
                while (sweep > Math.PI) sweep -= 2 * Math.PI
                if (sweep < 0) {
                  const tmp = start
                  start = end
                  end = tmp
                  sweep = -sweep
                }

                const x1 = vx + Math.cos(start) * r
                const y1 = vy + Math.sin(start) * r
                const x2 = vx + Math.cos(end) * r
                const y2 = vy + Math.sin(end) * r

                const largeArc = sweep > Math.PI ? 1 : 0
                const sweepFlag = 1

                const lx = vx + bis.x * (r + floorAngleLabelOffset)
                const ly = vy + bis.y * (r + floorAngleLabelOffset)

                const isSelectedCorner = state.selectedFloorVertexIndex === c.i
                const isLockedCorner =
                  typeof floor?.corners?.[c.i]?.lockedAngle === "number" && Number.isFinite(floor?.corners?.[c.i]?.lockedAngle)

                return (
                  <g key={`floor-ang-${c.i}`}>
                    {/* Click target */}
                    <path
                      d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={70}
                      style={{ cursor: canEditSubstrate ? "pointer" : "default" }}
                      onPointerDown={(ev) => {
                        if (!canEditSubstrate) return
                        ev.stopPropagation()
                        setSelectedRailEnd(null)
                        dispatch({ type: "CLEAR_SELECTION" })
                        setSelectedFloorEdgeIndex(null)
                        dispatch({ type: "SELECT_FLOOR_VERTEX", index: c.i })
                      }}
                    />

                    {/* Visible arc */}
                    <path
                      d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`}
                      fill="none"
                      stroke={isSelectedCorner ? "#2563eb" : "#111827"}
                      strokeOpacity={isSelectedCorner ? 0.95 : 0.75}
                      strokeWidth={6}
                      pointerEvents="none"
                    />

                    {/* Label */}
                    <text
                      x={lx}
                      y={ly}
                      fontSize={90}
                      fill="#111827"
                      opacity={0.9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ cursor: canEditSubstrate ? "pointer" : "default" }}
                      onPointerDown={(ev) => {
                        if (!canEditSubstrate) return
                        ev.stopPropagation()

                        const locked =
                          typeof floor?.corners?.[c.i]?.lockedAngle === "number" && Number.isFinite(floor?.corners?.[c.i]?.lockedAngle)

                        dispatch({
                          type: "SET_FLOOR_CORNER_LOCKED_ANGLE",
                          cornerIndex: c.i,
                          lockedAngle: locked ? null : Math.round(ang * 10) / 10,
                        })
                      }}
                    >
                      {ang.toFixed(1)}°
                      <tspan dx="40" fill={isLockedCorner ? "#111827" : "#9ca3af"} opacity={isLockedCorner ? 1 : 0.85}>
                        {isLockedCorner ? "🔒" : "⊘"}
                      </tspan>
                    </text>
                  </g>
                )
              })}
            </g>
            ) : null}

            {/* Floor vertices */}
            {floor.vertices.map((v, i) => {
              const selected = state.selectedFloorVertexIndex === i
              const cx = v.x
              const cy = v.z

              return (
                <g key={`floor-v-${i}`}>
                  <rect
                    x={cx - floorVertexHalf}
                    y={cy - floorVertexHalf}
                    width={floorVertexSize}
                    height={floorVertexSize}
                    fill="transparent"
                    style={{ cursor: canEditSubstrate ? "grab" : "default" }}
                    onPointerDown={(e) => {
                      if (!canEditSubstrate) return
                      e.stopPropagation()
                      setSelectedRailEnd(null)
                      dispatch({ type: "CLEAR_SELECTION" })
                      setSelectedFloorEdgeIndex(null)
                      dispatch({ type: "SELECT_FLOOR_VERTEX", index: i })
                      if (e.button !== 0) return

                      floorDragRef.current = { pointerId: e.pointerId, index: i }
                      startAnyDrag()
                      try {
                        ;(svgRef.current as any)?.setPointerCapture?.(e.pointerId)
                      } catch {}
                    }}
                  />

                  <circle
                    cx={cx}
                    cy={cy}
                    r={selected ? 55 : 48}
                    fill="#ffffff"
                    stroke={selected ? "#2563eb" : "#111827"}
                    strokeWidth={selected ? 14 : 8}
                    pointerEvents="none"
                  />
                </g>
              )
            })}
          </g>
        ) : null}

        {/* ===== Balcony polylines (single or multi) ===== */}
        {showPostSystem ? balconyRuns.map((runPath, runIndex) => {
          return runPath.slice(0, -1).map((a, pieceIndex) => {
            const b = runPath[pieceIndex + 1]
            if (!b) return null

            return (
              <line
                key={`bal-run-${runIndex}-piece-${pieceIndex}`}
                x1={a.x}
                y1={a.z}
                x2={b.x}
                y2={b.z}
                stroke="#111827"
                strokeOpacity={0.35}
                strokeWidth={12}
                pointerEvents="none"
              />
            )
          })
        }) : null}

        {/* Hovered segment highlight (when an add-on-segment tool is armed) */}
        {canShowBalustrade && canEditBalustrade && (state.postsTool === "add_mid_post" || state.postsTool === "add_posts_to_spacing") && hoveredSegId ? (
          (() => {
            const s = segById.get(hoveredSegId)
            if (!s) return null
            return (
              <line
                x1={s.start.x}
                y1={s.start.z}
                x2={s.end.x}
                y2={s.end.z}
                stroke="#2563eb"
                strokeOpacity={0.65}
                strokeWidth={28}
                pointerEvents="none"
              />
            )
          })()
        ) : null}

        {/* Frameless preview */}
        {showFramelessSystem && canEditBalustrade && derivedFrameless.enabled ? (
          <g pointerEvents="auto">
            {derivedFrameless.panels.map((panel) => {
              const panelTarget = inspectorTargetFromFramelessPanel(panel.id)
              const isPanelSelected =
                selectedTarget?.kind === "frameless-panel" &&
                selectedTarget.panelId === panel.id

              const isPanelHovered =
                hoveredTarget?.kind === "frameless-panel" &&
                hoveredTarget.panelId === panel.id

              return (
                <g key={panel.id}>
                  <line
                    x1={panel.start.x}
                    y1={panel.start.z}
                    x2={panel.end.x}
                    y2={panel.end.z}
                    stroke="transparent"
                    strokeWidth={140}
                    style={{ cursor: "pointer" }}
                    onPointerEnter={() => onHoverTargetChange(panelTarget)}
                    onPointerLeave={() => onHoverTargetChange(null)}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      onSelectTargetChange(panelTarget)
                    }}
                  />

                  <line
                    x1={panel.start.x}
                    y1={panel.start.z}
                    x2={panel.end.x}
                    y2={panel.end.z}
                    stroke="#0f766e"
                    strokeOpacity={isPanelSelected ? 0.95 : isPanelHovered ? 0.7 : 0.45}
                    strokeWidth={isPanelSelected ? 18 : 12}
                    pointerEvents="none"
                  />

                  <circle
                    cx={panel.leftSpigot.x}
                    cy={panel.leftSpigot.z}
                    r={42}
                    fill="#ffffff"
                    stroke="#0f766e"
                    strokeWidth={10}
                    style={{ cursor: "pointer" }}
                    onPointerEnter={() => onHoverTargetChange(inspectorTargetFromFramelessSpigot(panel.id, "left"))}
                    onPointerLeave={() => onHoverTargetChange(null)}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      onSelectTargetChange(inspectorTargetFromFramelessSpigot(panel.id, "left"))
                    }}
                  />

                  <circle
                    cx={panel.rightSpigot.x}
                    cy={panel.rightSpigot.z}
                    r={42}
                    fill="#ffffff"
                    stroke="#0f766e"
                    strokeWidth={10}
                    style={{ cursor: "pointer" }}
                    onPointerEnter={() => onHoverTargetChange(inspectorTargetFromFramelessSpigot(panel.id, "right"))}
                    onPointerLeave={() => onHoverTargetChange(null)}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      onSelectTargetChange(inspectorTargetFromFramelessSpigot(panel.id, "right"))
                    }}
                  />
                </g>
              )
            })}
          </g>
        ) : null}

        {/* ===== Rail end overhang links (click to edit) — POSTS MODE ONLY ===== */}
        {canShowBalustrade && railEndLinks.length ? (
        <g pointerEvents={canEditBalustrade && !isAddPostToolArmed ? "auto" : "none"}>
            {railEndLinks.map((l) => {
            const m = l.id.match(/^__rail-link-(start|end)__r(\d+)$/)
            if (!m) return null
            const end = m[1] as "start" | "end"
            const runIndex = Number(m[2])

            const linkedToprailTarget = inspectorTargetFromLinkedToprailEnd(runIndex, end)

            const isSel =
              (selectedRailEnd?.runIndex === runIndex && selectedRailEnd?.end === end) ||
              (selectedTarget?.kind === "toprail" &&
                linkedToprailTarget?.kind === "toprail" &&
                selectedTarget.runIndex === linkedToprailTarget.runIndex &&
                selectedTarget.pieceIndex === linkedToprailTarget.pieceIndex)

            const onPick = (ev: React.PointerEvent) => {
                if (!canEditBalustrade) return
                ev.stopPropagation()
                setSelectedFloorEdgeIndex(null)
                dispatch({ type: "SELECT_FLOOR_VERTEX", index: null })
                dispatch({ type: "CLEAR_SELECTION" })
                setSelectedRailEnd({ runIndex, end })
                onSelectTargetChange(
                  inspectorTargetFromLinkedToprailEnd(runIndex, end) ??
                    inspectorTargetFromRailEnd(runIndex, end)
                )
            }

            // We want the icon to point AWAY from the reference post (i.e. from x2,y2 toward x1,y1)
            const dx = l.x2 - l.x1
            const dy = l.y2 - l.y1
            const ang = (Math.atan2(-dy, -dx) * 180) / Math.PI

            // Icon sizing (world mm). Tuned to read similarly to your post square.
            const size = 110
            const capHalf = size * 0.45
            const shaftLen = size * 0.75
            const headLen = size * 0.35
            const headHalf = headLen * 0.7
            const strokeW = 12

            return (
                <g key={l.id}>
                {/* Big hit target around the icon */}
                <circle
                    cx={l.x1}
                    cy={l.y1}
                    r={180}
                    fill="transparent"
                    style={{ cursor: canEditBalustrade ? "pointer" : "default" }}
                    onPointerDown={onPick}
                />

                {/* |< icon: cap at origin, shaft+head pointing +X, rotated to 'ang' */}
                <g transform={`translate(${l.x1} ${l.y1}) rotate(${ang})`} pointerEvents="none">
                    {/* cap (|) */}
                    <line
                    x1={0}
                    y1={-capHalf}
                    x2={0}
                    y2={capHalf}
                    stroke={isSel ? "#2563eb" : "#111827"}
                    strokeOpacity={isSel ? 0.95 : 0.55}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    />

                    {/* shaft */}
                    <line
                    x1={0}
                    y1={0}
                    x2={shaftLen}
                    y2={0}
                    stroke={isSel ? "#2563eb" : "#111827"}
                    strokeOpacity={isSel ? 0.95 : 0.55}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    />

                    {/* head */}
                    <path
                    d={`M ${shaftLen} 0 L ${shaftLen - headLen} ${headHalf} M ${shaftLen} 0 L ${shaftLen - headLen} ${-headHalf}`}
                    stroke={isSel ? "#2563eb" : "#111827"}
                    strokeOpacity={isSel ? 0.95 : 0.55}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    fill="none"
                    />
                </g>

                {/* Optional: keep the dashed link line (visual only) */}
                <line
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke={isSel ? "#2563eb" : "#111827"}
                    strokeOpacity={isSel ? 0.75 : 0.25}
                    strokeWidth={8}
                    strokeDasharray="18 18"
                    pointerEvents="none"
                />
                </g>
            )
            })}
        </g>
        ) : null}

        {/* ===== Bottom rail bay hit targets — POSTS MODE ONLY ===== */}
        {canShowBalustrade && canEditBalustrade ? (
          <g pointerEvents={isAddPostToolArmed ? "none" : "auto"}>
            {derivedBays.map((bay) => {
              const target = inspectorTargetFromBottomRail(bay.id)

              const isSelected =
                selectedTarget?.kind === "bottom-rail" &&
                selectedTarget.bayId === bay.id

              const isHovered =
                hoveredTarget?.kind === "bottom-rail" &&
                hoveredTarget.bayId === bay.id

              const x1 = bay.derivedFrom.leftX
              const y1 = bay.derivedFrom.leftZ
              const x2 = bay.derivedFrom.rightX
              const y2 = bay.derivedFrom.rightZ

              return (
                <g key={`bay-hit-${bay.id}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={120}
                    style={{ cursor: "pointer" }}
                    onPointerEnter={() => {
                      if (isAddPostToolArmed) return
                      onHoverTargetChange(target)
                    }}
                    onPointerLeave={() => {
                      onHoverTargetChange(null)
                    }}
                    onPointerDown={(e) => {
                      if (isAddPostToolArmed) return
                      e.stopPropagation()
                      onSelectTargetChange(target)
                    }}
                  />

                  {isSelected || isHovered ? (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#2563eb"
                      strokeOpacity={isSelected ? 0.9 : 0.55}
                      strokeWidth={isSelected ? 22 : 16}
                      strokeDasharray="40 28"
                      pointerEvents="none"
                    />
                  ) : null}
                </g>
              )
            })}
          </g>
        ) : null}

        {/* Dimensions */}
        {canShowBalustrade ? (
          <g pointerEvents={isDraggingObject ? "none" : "auto"}>
            {bayDimensionSpans.map(({ bay, x1, y1, x2, y2, dir, normal, length }) => {
              const dimColor = bay.spacingExceeded ? "#dc2626" : "#111827"

              const axo = x1 + normal.x * dimOffset
              const ayo = y1 + normal.y * dimOffset
              const bxo = x2 + normal.x * dimOffset
              const byo = y2 + normal.y * dimOffset

              const awx2 = x1 + normal.x * (dimOffset - witness)
              const awy2 = y1 + normal.y * (dimOffset - witness)
              const bwx2 = x2 + normal.x * (dimOffset - witness)
              const bwy2 = y2 + normal.y * (dimOffset - witness)

              const tdir = { x: -dir.y, y: dir.x }
              const tickAx1 = axo - tdir.x * (tick / 2)
              const tickAy1 = ayo - tdir.y * (tick / 2)
              const tickAx2 = axo + tdir.x * (tick / 2)
              const tickAy2 = ayo + tdir.y * (tick / 2)

              const tickBx1 = bxo - tdir.x * (tick / 2)
              const tickBy1 = byo - tdir.y * (tick / 2)
              const tickBx2 = bxo + tdir.x * (tick / 2)
              const tickBy2 = byo + tdir.y * (tick / 2)

              const mx = (axo + bxo) / 2
              const my = (ayo + byo) / 2
              const ang = (Math.atan2(dir.y, dir.x) * 180) / Math.PI

              const tx = mx + normal.x * textOffset
              const ty = my + normal.y * textOffset

              const bottomRailTarget = !isAddPostToolArmed
                ? inspectorTargetFromBottomRail(bay.id)
                : null

              return (
                <g
                  key={`bay-dim-${bay.id}`}
                  onPointerEnter={() => {
                    if (!canEditBalustrade || !bottomRailTarget) return
                    onHoverTargetChange(bottomRailTarget)
                  }}
                  onPointerLeave={() => {
                    onHoverTargetChange(null)
                  }}
                  onPointerDown={(e) => {
                    if (!canEditBalustrade || !bottomRailTarget) return
                    e.stopPropagation()
                    onSelectTargetChange(bottomRailTarget)
                  }}
                  style={{ cursor: canEditBalustrade && bottomRailTarget ? "pointer" : "default" }}
                >
                  <line x1={x1} y1={y1} x2={awx2} y2={awy2} stroke={dimColor} strokeOpacity={0.55} strokeWidth={6} />
                  <line x1={x2} y1={y2} x2={bwx2} y2={bwy2} stroke={dimColor} strokeOpacity={0.55} strokeWidth={6} />

                  <line x1={axo} y1={ayo} x2={bxo} y2={byo} stroke={dimColor} strokeOpacity={0.75} strokeWidth={6} />

                  <line x1={tickAx1} y1={tickAy1} x2={tickAx2} y2={tickAy2} stroke={dimColor} strokeOpacity={0.85} strokeWidth={6} />
                  <line x1={tickBx1} y1={tickBy1} x2={tickBx2} y2={tickBy2} stroke={dimColor} strokeOpacity={0.85} strokeWidth={6} />

                  <text
                    x={tx}
                    y={ty}
                    fontSize={90}
                    fill={dimColor}
                    opacity={0.9}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${ang} ${tx} ${ty})`}
                  >
                    {formatDim(length)}
                  </text>
                </g>
              )
            })}
          </g>
        ) : null}

        {/* Corner angles / balustrade joint targets */}
        {canShowBalustrade && showBalustradeAngles ? (
          <g pointerEvents={isDraggingObject ? "none" : "auto"}>
            {balconyRuns.map((runPath, runIndex) => {
              if (!runPath || runPath.length < 3) return null

              return runPath.slice(1, -1).map((curr, localIndex) => {
                const vertexIndex = localIndex + 1
                const prev = runPath[vertexIndex - 1]
                const next = runPath[vertexIndex + 1]
                if (!prev || !curr || !next) return null

                const vx = curr.x
                const vy = curr.z

                const d1 = norm(prev.x - curr.x, prev.z - curr.z)
                const d2 = norm(next.x - curr.x, next.z - curr.z)

                const ang = angleDegBetween(d1.x, d1.y, d2.x, d2.y)
                if (ang < 0.5) return null

                const bis = norm(d1.x + d2.x, d1.y + d2.y)
                const r = 260

                const a1 = Math.atan2(d1.y, d1.x)
                const a2 = Math.atan2(d2.y, d2.x)

                let start = a1
                let end = a2
                let sweep = end - start
                while (sweep <= -Math.PI) sweep += 2 * Math.PI
                while (sweep > Math.PI) sweep -= 2 * Math.PI
                if (sweep < 0) {
                  const tmp = start
                  start = end
                  end = tmp
                  sweep = -sweep
                }

                const x1 = vx + Math.cos(start) * r
                const y1 = vy + Math.sin(start) * r
                const x2 = vx + Math.cos(end) * r
                const y2 = vy + Math.sin(end) * r

                const largeArc = sweep > Math.PI ? 1 : 0
                const sweepFlag = 1

                const lx = vx + bis.x * (r + 130)
                const ly = vy + bis.y * (r + 130)

                const target = inspectorTargetFromBalustradeVertex(runIndex, vertexIndex)
                const isSelected =
                  selectedTarget?.kind === "balustrade-vertex" &&
                  selectedTarget.runIndex === runIndex &&
                  selectedTarget.vertexIndex === vertexIndex

                const isHovered =
                  hoveredTarget?.kind === "balustrade-vertex" &&
                  hoveredTarget.runIndex === runIndex &&
                  hoveredTarget.vertexIndex === vertexIndex

                 return (
                  <g key={`bal-joint-r${runIndex}-v${vertexIndex}`}>
                    <circle
                      cx={vx}
                      cy={vy}
                      r={120}
                      fill="transparent"
                      style={{ cursor: canEditBalustrade ? "pointer" : "default" }}
                      onPointerEnter={() => {
                        if (!canEditBalustrade || isAddPostToolArmed) return
                        onHoverTargetChange(target)
                      }}
                      onPointerLeave={() => {
                        if (!canEditBalustrade || isAddPostToolArmed) return
                        onHoverTargetChange(null)
                      }}
                      onPointerDown={(e) => {
                        if (!canEditBalustrade || isAddPostToolArmed) return
                        e.stopPropagation()
                        onSelectTargetChange(target)
                      }}
                    />

                    <path
                      d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={70}
                      style={{ cursor: canEditBalustrade ? "pointer" : "default" }}
                      onPointerEnter={() => {
                        if (!canEditBalustrade || isAddPostToolArmed) return
                        onHoverTargetChange(target)
                      }}
                      onPointerLeave={() => {
                        if (!canEditBalustrade || isAddPostToolArmed) return
                        onHoverTargetChange(null)
                      }}
                      onPointerDown={(e) => {
                        if (!canEditBalustrade || isAddPostToolArmed) return
                        e.stopPropagation()
                        onSelectTargetChange(target)
                      }}
                    />

                    {(isSelected || isHovered) ? (
                      <circle
                        cx={vx}
                        cy={vy}
                        r={95}
                        fill="none"
                        stroke="#2563eb"
                        strokeOpacity={isSelected ? 0.95 : 0.55}
                        strokeWidth={isSelected ? 16 : 10}
                        pointerEvents="none"
                      />
                    ) : null}

                    <path
                      d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`}
                      fill="none"
                      stroke={isSelected ? "#2563eb" : "#111827"}
                      strokeOpacity={isSelected ? 0.95 : isHovered ? 0.75 : 0.75}
                      strokeWidth={isSelected ? 8 : 6}
                      pointerEvents="none"
                    />

                    <text
                      x={lx}
                      y={ly}
                      fontSize={90}
                      fill={isSelected ? "#2563eb" : "#111827"}
                      opacity={0.9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      {ang.toFixed(1)}°
                    </text>
                  </g>
                )
              })
            })}
          </g>
        ) : null}

        {/* Posts (selection + drag gated to POSTS mode only) */}
        {showPostSystem ? state.posts.map((post) => {
        const isSelected = selectedSet.has(post.id)
        const isFail = postsFailingAny.has(post.id)

        const size = post.profile?.size ?? 45
        const cx = post.position.x
        const cy = post.position.z
        const rot = post.rotationY || 0

        return (
            <g
            key={post.id}
            transform={`rotate(${rot} ${cx} ${cy})`}
            pointerEvents={canEditBalustrade ? "auto" : "none"}
            >
            <rect
                x={cx - size / 2}
                y={cy - size / 2}
                width={size}
                height={size}
                fill={isFail ? "#dc2626" : isSelected ? "#111827" : "#1f2937"}
                stroke={isSelected ? "#2563eb" : isFail ? "#dc2626" : "#111827"}
                strokeOpacity={isSelected ? 1 : isFail ? 0.9 : 0.15}
                strokeWidth={isSelected ? 18 : 6}
                style={{ cursor: canEditBalustrade ? "grab" : "default" }}
                onPointerEnter={() => {
                  if (!canEditBalustrade) return
                  onHoverTargetChange(inspectorTargetFromPostId(post.id))
                }}
                onPointerLeave={() => {
                  onHoverTargetChange(null)
                }}
                onPointerDown={(e) => {
                if (!canEditBalustrade) return
                e.stopPropagation()

                if (!state.laserHeightListEditMode) {
                  onSelectTargetChange(inspectorTargetFromPostId(post.id))
                } else {
                  onSelectTargetChange(null)
                }

                // If delete tool is armed: pick this post + open confirm dialog (no drag)
                if (state.postsTool === "delete_post") {
                    setSelectedFloorEdgeIndex(null)
                    dispatch({ type: "SELECT_FLOOR_VERTEX", index: null })
                    setSelectedRailEnd(null)

                    dispatch({ type: "SELECT_POST", id: post.id })
                    setDeleteSuppressedId(null)
                    setDeleteDialog({ postId: post.id })
                    return
                }

                // switching to posts selection should clear substrate selection
                setSelectedFloorEdgeIndex(null)
                dispatch({ type: "SELECT_FLOOR_VERTEX", index: null })
                setSelectedRailEnd(null)

                dispatch({ type: "SELECT_POST", id: post.id })

                if (e.button !== 0) return
                if (state.laserHeightListEditMode) return

                const seg = segById.get(post.segmentId)
                if (!seg) return
                const segIndex = segments.findIndex((s) => s.id === seg.id)

                const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

                const dir = norm(seg.end.x - seg.start.x, seg.end.z - seg.start.z)
                const n = { x: dir.y, y: -dir.x }

                const sx = seg.start.x
                const sy = seg.start.z

                const tPointer = dot(wx - sx, wy - sy, dir.x, dir.y)
                const tPost = dot(post.position.x - sx, post.position.z - sy, dir.x, dir.y)
                const perp = dot(post.position.x - sx, post.position.z - sy, n.x, n.y)

                let chainIds: string[] | undefined
                let chainIndex: number | undefined
                let perpById: Record<string, number> | undefined

                if (state.constraintMode === "even") {
                    const segPosts = state.posts
                    .filter((p) => p.segmentId === seg.id)
                    .map((p) => {
                        const t = dot(p.position.x - sx, p.position.z - sy, dir.x, dir.y)
                        return { id: p.id, t }
                    })
                    .sort((a, b) => (a.t === b.t ? a.id.localeCompare(b.id) : a.t - b.t))

                    chainIds = segPosts.map((it) => it.id)
                    chainIndex = chainIds.findIndex((id) => id === post.id)

                    perpById = {}
                    for (const p of state.posts) {
                    if (p.segmentId !== seg.id) continue
                    perpById[p.id] = dot(p.position.x - sx, p.position.z - sy, n.x, n.y)
                    }
                }

                startAnyDrag()
                dragRef.current = {
                    postId: post.id,
                    pointerId: e.pointerId,
                    segId: seg.id,
                    segIndex,
                    sx,
                    sy,
                    dx: dir.x,
                    dy: dir.y,
                    nx: n.x,
                    ny: n.y,
                    segLen: seg.length,
                    perp,
                    tDelta: tPointer - tPost,
                    chainIds,
                    chainIndex,
                    perpById,
                }

                try {
                    ;(svgRef.current as any)?.setPointerCapture?.(e.pointerId)
                } catch {}
                }}
            />
            </g>
        )
        }) : null}
      </svg>

      <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 12, color: "#6b7280" }}>
        {canEditBalustrade
          ? "Posts mode: drag posts along segment. Overhang icons editable."
          : "Substrate mode: edit floor vertices, edge lengths/offsets, and corner angles."}
      </div>

      <div style={{ position: "absolute", right: 12, bottom: 12, width: 340, zIndex: 20, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <ConstraintInspector
            state={state}
            hoveredTarget={hoveredTarget}
            selectedTarget={selectedTarget}
            compact
            title="2D details"
          />
        </div>
      </div>
    </div>
  )
}