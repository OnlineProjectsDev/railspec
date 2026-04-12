// /components/ConstraintInspector.tsx
"use client"

import { useMemo, useState, useEffect } from "react"
import { RootState } from "@/lib/types"
import { getAnchorageOptionsForDesign } from "@/lib/jobDesignRules"
import { buildToprailPieces } from "@/lib/toprail"
import {
  deriveBays,
  derivePostDisplayNumbers,
  formatBayDisplayLabel,
  formatPostDisplayLabel,
} from "@/lib/balustrade/deriveBays"
import { deriveFrameless } from "@/lib/frameless/deriveFrameless"
import { getSegmentJoinAvailability } from "@/lib/frameless/segmentJoinAvailability"
import { deriveBayFabricationParts } from "@/app/(rs)/fabrication/deriveBayFabricationParts"
import { deriveFabricationFromEditor } from "@/app/(rs)/fabrication/deriveFabricationFromEditor"
import { applyPostDrillingToFabricationParts } from "@/app/(rs)/fabrication/derivePostDrilling"
import { formatPostDrilling } from "@/app/(rs)/fabrication/formatPostDrilling"

export type InspectorTarget =
  | { kind: "post"; postId: string }
  | { kind: "bottom-rail"; bayId: string }
  | { kind: "toprail"; runIndex: number; pieceIndex: number }
  | { kind: "rail-end"; runIndex: number; end: "start" | "end" }
  | { kind: "balustrade-vertex"; runIndex: number; vertexIndex: number }
  | { kind: "frameless-panel"; panelId: string }
  | { kind: "frameless-spigot"; panelId: string; side: "left" | "right" }
  | null

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function getToprailEndExtensionForRunEnd(params: {
  balcony: RootState["balcony"]
  runIndex: number
  end: "start" | "end"
  min: number
  max: number
}) {
  const rawDefault =
    params.balcony.runBoundarySourceOffsetsByRun?.[params.runIndex]?.[params.end]

  const derivedDefault = Number.isFinite(rawDefault)
    ? Math.abs(Number(rawDefault))
    : params.min

  const ext =
    params.balcony.endExtensionsByRun?.[params.runIndex] ??
    params.balcony.endExtensions

  const raw = params.end === "start" ? ext?.start : ext?.end

  return typeof raw === "number" && Number.isFinite(raw)
    ? clamp(raw, params.min, params.max)
    : clamp(derivedDefault, params.min, params.max)
}

function formatMm(n: number | null | undefined) {
  if (!Number.isFinite(n)) return "—"
  const v = Math.round((n as number) * 10) / 10
  return Math.abs(v - Math.round(v)) < 1e-6 ? `${Math.round(v)} mm` : `${v.toFixed(1)} mm`
}

function formatDeg(n: number | null | undefined) {
  if (!Number.isFinite(n)) return "—"
  const v = Math.round((n as number) * 10) / 10
  return Math.abs(v - Math.round(v)) < 1e-6 ? `${Math.round(v)}°` : `${v.toFixed(1)}°`
}

function formatCornerType(value: string | null | undefined) {
  if (!value) return "—"
  if (value === "symmetric") return "Symmetric"
  if (value === "this_segment_dominant") return "This segment dominant"
  if (value === "other_segment_dominant") return "Other segment dominant"
  return value
}

function formatAnchorageLaserHeightLabel(index: number) {
  return `Anchorage laser height ${index + 1}`
}

function formatDegrees(n: number | null | undefined) {
  if (!Number.isFinite(n)) return "—"
  const v = Math.round((n as number) * 10) / 10
  return Math.abs(v - Math.round(v)) < 1e-6 ? `${Math.round(v)}°` : `${v.toFixed(1)}°`
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
      <div style={{ color: "#6B7280" }}>{label}</div>
      <div style={{ color: "#111827", fontWeight: 600, textAlign: "right" }}>{value}</div>
    </div>
  )
}

function Message({
  tone,
  children,
}: {
  tone: "neutral" | "warn" | "error"
  children: React.ReactNode
}) {
  const bg = tone === "error" ? "#FEF2F2" : tone === "warn" ? "#FFFBEB" : "#F9FAFB"
  const border = tone === "error" ? "#FECACA" : tone === "warn" ? "#FDE68A" : "#E5E7EB"
  const color = tone === "error" ? "#991B1B" : tone === "warn" ? "#92400E" : "#374151"

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        background: bg,
        color,
        borderRadius: 10,
        padding: "8px 10px",
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  )
}

function pushGroupedInspectorMessages(
  messages: { tone: "neutral" | "warn" | "error"; text: string }[],
  items: string[]
) {
  const grouped = new Map<string, number>()

  for (const item of items) {
    grouped.set(item, (grouped.get(item) ?? 0) + 1)
  }

  for (const [text, qty] of grouped.entries()) {
    messages.push({
      tone: "neutral",
      text: qty > 1 ? `${qty}x • ${text}` : text,
    })
  }
}

function hasDrillingValues(values: number[] | null | undefined) {
  return Array.isArray(values) && values.length > 0
}

export default function ConstraintInspector({
  state,
  hoveredTarget,
  selectedTarget,
  compact = false,
  title = "Inspector",
}: {
  state: RootState
  hoveredTarget: InspectorTarget
  selectedTarget: InspectorTarget
  compact?: boolean
  title?: string
}) {
  const activeTarget = selectedTarget ?? hoveredTarget
  const sourceLabel = selectedTarget ? "Selected" : hoveredTarget ? "Hover" : null
  const [showBayFabricationDetails, setShowBayFabricationDetails] = useState(false)

  const isBottomRailTarget = activeTarget?.kind === "bottom-rail"

  useEffect(() => {
    if (!isBottomRailTarget) {
      setShowBayFabricationDetails(false)
    }
  }, [isBottomRailTarget])

  const content = useMemo(() => {
    const postNumbersById = derivePostDisplayNumbers({
      balcony: state.balcony,
      posts: state.posts,
    })

    const fabricationParts = deriveFabricationFromEditor(state)

    const postParts = fabricationParts.filter(
      (part): part is typeof fabricationParts[number] & { kind: "extrusion"; subtype: "post" } =>
        part.kind === "extrusion" && part.subtype === "post"
    )

    const bayParts = fabricationParts.filter(
      (part): part is typeof fabricationParts[number] & { kind: "extrusion"; subtype: "midrail" | "vertical" } =>
        part.kind === "extrusion" &&
        (part.subtype === "midrail" || part.subtype === "vertical")
    )

    const drilledPostParts = applyPostDrillingToFabricationParts({
      state,
      postParts,
      bayParts,
    })
    if (!activeTarget) {
      return {
        heading: "Nothing selected",
        rows: [] as { label: string; value: React.ReactNode }[],
        messages: [
          {
            tone: "neutral" as const,
            text: "Hover or select a post, rail, or overhang control to inspect constraints and fix intent.",
          },
        ],
      }
    }

    if (activeTarget.kind === "post") {
      const post = state.posts.find((p) => p.id === activeTarget.postId)
      if (!post) {
        return {
          heading: "Post not found",
          rows: [],
          messages: [{ tone: "error" as const, text: `Missing post: ${activeTarget.postId}` }],
        }
      }

      const excluded = new Set(state.balcony.autoTopExcludePostIds ?? [])
      const fflY = Number.isFinite(state.foundation.fflY) ? state.foundation.fflY : 0

      const anchorageOptions = getAnchorageOptionsForDesign(
        state.design,
        post.anchorage === "SFI" || post.anchorage === "SFO" ? "SF" : post.anchorage
      ).options

      const anchorageLabel =
        post.anchorage === "SFI" || post.anchorage === "SFO"
          ? `${anchorageOptions.find((opt) => opt.id === "SF")?.label ?? "SF"} (${post.anchorage})`
          : post.anchorage === "WF"
            ? "Wall Fixed (WF)"
            : `${anchorageOptions.find((opt) => opt.id === post.anchorage)?.label ?? post.anchorage} (${post.anchorage})`

      const minBarrierHeight =
        state.balcony.segmentConstraintsById?.[post.segmentId]?.minBarrierHeight ??
        state.balcony.minBarrierHeight

      const maxBarrierHeight =
        state.balcony.segmentConstraintsById?.[post.segmentId]?.maxBarrierHeight ??
        state.balcony.maxBarrierHeight

      const bottomRef = excluded.has(post.id) ? fflY : post.position.yBottom
      const barrierHeight = post.position.yTop - bottomRef

      const hasMin = Number.isFinite(minBarrierHeight) && minBarrierHeight > 0
      const hasMax = Number.isFinite(maxBarrierHeight) && maxBarrierHeight > 0

      const anchorageLaserHeights = Array.isArray(post.anchorageLaserHeights)
        ? post.anchorageLaserHeights
        : []

      const postDisplayNo = postNumbersById[post.id]
      const drilledPostPart = drilledPostParts.find((part) => part.sourcePostId === postDisplayNo)
      const drillingData = drilledPostPart?.drillingData
      const drillingDisplay =
        drillingData
          ? formatPostDrilling(drillingData)
          : drilledPostPart?.drilling ?? ""

      const drillingRows: { label: string; value: React.ReactNode }[] = []

      if (hasDrillingValues(drillingData?.P1)) {
        drillingRows.push({
          label: "P1",
          value: drillingData?.P1?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.P2)) {
        drillingRows.push({
          label: "P2",
          value: drillingData?.P2?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.P3)) {
        drillingRows.push({
          label: "P3",
          value: drillingData?.P3?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.P4)) {
        drillingRows.push({
          label: "P4",
          value: drillingData?.P4?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.SF?.P1)) {
        drillingRows.push({
          label: "P1 SF",
          value: drillingData?.special?.SF?.P1?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.SF?.P2)) {
        drillingRows.push({
          label: "P2 SF",
          value: drillingData?.special?.SF?.P2?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.SF?.P3)) {
        drillingRows.push({
          label: "P3 SF",
          value: drillingData?.special?.SF?.P3?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.SF?.P4)) {
        drillingRows.push({
          label: "P4 SF",
          value: drillingData?.special?.SF?.P4?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.WF?.P1)) {
        drillingRows.push({
          label: "P1 WF",
          value: drillingData?.special?.WF?.P1?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.WF?.P2)) {
        drillingRows.push({
          label: "P2 WF",
          value: drillingData?.special?.WF?.P2?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.WF?.P3)) {
        drillingRows.push({
          label: "P3 WF",
          value: drillingData?.special?.WF?.P3?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      if (hasDrillingValues(drillingData?.special?.WF?.P4)) {
        drillingRows.push({
          label: "P4 WF",
          value: drillingData?.special?.WF?.P4?.map((v) => Math.round(v)).join(", ") ?? "—",
        })
      }

      const bays = deriveBays({
        balcony: state.balcony,
        posts: state.posts,
        design: state.design,
        toprailType: state.toprail
      })

      const relatedBottomGapFailures = bays.filter(
        (bay) =>
          (bay.from.postId === post.id && bay.fromBottomGapExceeded) ||
          (bay.to.postId === post.id && bay.toBottomGapExceeded)
      )

      const relatedSpacingFailures = bays.filter(
        (bay) =>
          bay.spacingExceeded &&
          (bay.from.postId === post.id || bay.to.postId === post.id)
      )

      const messages: { tone: "neutral" | "warn" | "error"; text: string }[] = []

      if (hasMin && barrierHeight < minBarrierHeight - 1e-6) {
        messages.push({
          tone: "error",
          text: `Barrier height is below minimum: ${formatMm(barrierHeight)} < ${formatMm(minBarrierHeight)}.`,
        })
      }

      if (hasMax && barrierHeight > maxBarrierHeight + 1e-6) {
        messages.push({
          tone: "error",
          text: `Barrier height is above maximum: ${formatMm(barrierHeight)} > ${formatMm(maxBarrierHeight)}.`,
        })
      }

      if (relatedBottomGapFailures.length > 0) {
        const worstBottomGapExceededBy = Math.max(
          ...relatedBottomGapFailures.map((bay) =>
            Math.max(bay.fromBottomGapExceededBy, bay.toBottomGapExceededBy)
          )
        )

        messages.push({
          tone: "error",
          text: `Bottom gap fails in ${relatedBottomGapFailures.length} ${relatedBottomGapFailures.length === 1 ? "bay" : "bays"} touching this post. Worst exceedance is ${formatMm(worstBottomGapExceededBy)}.`,
        })
      }

      if (relatedSpacingFailures.length > 0) {
        const worstSpacingExceededBy = Math.max(
          ...relatedSpacingFailures.map((bay) => bay.spacingExceededBy)
        )

        messages.push({
          tone: "error",
          text: `Post spacing fails in ${relatedSpacingFailures.length} ${relatedSpacingFailures.length === 1 ? "bay" : "bays"} touching this post. Worst exceedance is ${formatMm(worstSpacingExceededBy)}.`,
        })
      }

      if (post.anchorageLaserHeights.length > 0) {
        messages.push({
          tone: "neutral",
          text: "Anchorage laser heights are additional vertical drilling reference levels measured from the global laser. Positive values are below the laser, negative values are above it.",
        })
      }

      if (messages.length === 0) {
        messages.push({
          tone: "neutral",
          text: "No currently detected constraint failures for this post.",
        })
      }

      if (anchorageLaserHeights.length > 0) {
        messages.push({
          tone: "neutral",
          text: "Laser height values are measured relative to the global laser level. Positive values are below the laser. Negative values are above. Anchorage laser heights use the same format, and values greater than the post laser height are further below the measured support level.",
        })
      }

      return {
        heading: formatPostDisplayLabel(postNumbersById[post.id] ?? null),
        rows: [
          { label: "Type", value: anchorageLabel },
          { label: "Post no.", value: postDisplayNo ?? "—" },
          { label: "Segment", value: post.segmentId },
          { label: "X", value: formatMm(post.position.x) },
          { label: "Z", value: formatMm(post.position.z) },
          { label: "Laser height", value: formatMm(post.height) },
          ...anchorageLaserHeights.map((value, index) => ({
            label: formatAnchorageLaserHeightLabel(index),
            value: formatMm(value),
          })),
          { label: "yBottom", value: formatMm(post.position.yBottom) },
          { label: "yTop", value: formatMm(post.position.yTop) },
          { label: "Barrier height", value: formatMm(barrierHeight) },
          { label: "Min barrier", value: hasMin ? formatMm(minBarrierHeight) : "—" },
          { label: "Max barrier", value: hasMax ? formatMm(maxBarrierHeight) : "—" },
          { label: "Excluded from auto top", value: excluded.has(post.id) ? "Yes" : "No" },
          { label: "Drilling", value: drillingDisplay || "—" },
          ...drillingRows,
        ],
        messages,
      }
    }

    if (activeTarget.kind === "bottom-rail") {
      const bays = deriveBays({
        balcony: state.balcony,
        posts: state.posts,
        design: state.design,
        toprailType: state.toprail
      })

      const bay = bays.find((b: any) => b.id === activeTarget.bayId)
      if (!bay) {
        return {
          heading: "Bottom rail not found",
          rows: [],
          messages: [{ tone: "error" as const, text: `Missing bay: ${activeTarget.bayId}` }],
        }
      }

      const fabrication = deriveBayFabricationParts(state)
      const bayExtrusions = fabrication.extrusions.filter((part) => part.sourceBayId === bay.id)
      const bayGlass = fabrication.glass.filter((part) => part.sourceBayId === bay.id)

      const displayedLength = Math.hypot(
        bay.to.x - bay.from.x,
        bay.to.z - bay.from.z
      )

      const messages: { tone: "neutral" | "warn" | "error"; text: string }[] = []

      if (bay.spacingExceeded) {
        messages.push({
          tone: "error",
          text: `Post spacing exceeds maximum: ${formatMm(displayedLength)} > ${formatMm(bay.maxPostSpacing)} (exceeded by ${formatMm(bay.spacingExceededBy)}).`,
        })
      }

      if (bay.hasRailFailure && !bay.spacingExceeded && !bay.fromBottomGapExceeded && !bay.toBottomGapExceeded) {
        messages.push({
          tone: "error",
          text: "This rail span fails one or more bay constraints.",
        })
      }

      if (bay.fromBottomGapExceeded) {
        messages.push({
          tone: "error",
          text: `Start bottom gap exceeds maximum: ${formatMm(bay.bottomGapFrom)} > ${formatMm(bay.maxBottomGap)} (exceeded by ${formatMm(bay.fromBottomGapExceededBy)}) at ${bay.from.postId ?? "start"} point.`,
        })
      }

      if (bay.toBottomGapExceeded) {
        messages.push({
          tone: "error",
          text: `End bottom gap exceeds maximum: ${formatMm(bay.bottomGapTo)} > ${formatMm(bay.maxBottomGap)} (exceeded by ${formatMm(bay.toBottomGapExceededBy)}) at ${bay.to.postId ?? "end"} point.`,
        })
      }

      if (messages.length === 0) {
        messages.push({
          tone: "neutral",
          text: "No currently detected constraint failures for this bottom rail span.",
        })
      }

      if (bayExtrusions.length === 0 && bayGlass.length === 0) {
        messages.push({
          tone: "warn",
          text: "No fabrication parts were derived for this bay.",
        })
      } else if (showBayFabricationDetails) {
        const groupedExtrusionItems = bayExtrusions.map((part) => {
          const partBits = [
            part.partName,
            part.length != null ? `L ${formatMm(part.length)}` : null,
            part.planeCenterLength != null ? `CL ${formatMm(part.planeCenterLength)}` : null,
            `HML ${formatDegrees(part.hml)}`,
            `HMR ${formatDegrees(part.hmr)}`,
            `VML ${formatDegrees(part.vml)}`,
            `VMR ${formatDegrees(part.vmr)}`,
            part.drilling ? `Drilling ${part.drilling}` : null,
          ].filter(Boolean)

          return partBits.join(" • ")
        })

        const groupedGlassItems = bayGlass.map((part) => {
          const partBits = [
            part.partName,
            `W ${formatMm(part.width)}`,
            `H ${formatMm(part.height)}`,
            `T ${formatMm(part.thickness)}`,
          ].filter(Boolean)

          return partBits.join(" • ")
        })

        pushGroupedInspectorMessages(messages, groupedExtrusionItems)
        pushGroupedInspectorMessages(messages, groupedGlassItems)
      } else {
        messages.push({
          tone: "neutral",
          text: "Fabrication part details are hidden. Expand them only when you want to inspect per-part drilling and cut data.",
        })
      }

      return {
        heading:
          bay.displayLabel ??
          formatBayDisplayLabel(
            bay.fromPostNumber ?? null,
            bay.toPostNumber ?? null
          ),
        rows: [
          {
            label: "Type",
            value:
              bay.displayLabel ??
              formatBayDisplayLabel(
                bay.fromPostNumber ?? null,
                bay.toPostNumber ?? null
              ),
          },
          {
            label: "From",
            value:
              bay.fromPostNumber != null
                ? formatPostDisplayLabel(bay.fromPostNumber)
                : "Boundary",
          },
          {
            label: "To",
            value:
              bay.toPostNumber != null
                ? formatPostDisplayLabel(bay.toPostNumber)
                : "Boundary",
          },
          { label: "Length", value: formatMm(displayedLength) },
          { label: "Max spacing", value: formatMm(bay.maxPostSpacing) },
          { label: "Start bottom gap", value: formatMm(bay.bottomGapFrom) },
          { label: "End bottom gap", value: formatMm(bay.bottomGapTo) },
          { label: "Max bottom gap", value: formatMm(bay.maxBottomGap) },
          { label: "yRef", value: formatMm(bay.yRef) },
          { label: "Fabrication extrusions", value: bayExtrusions.length },
          { label: "Fabrication glass", value: bayGlass.length },
          { label: "Suppressed", value: bay.suppressed ? "Yes" : "No" },
        ],
        messages,
      }
    }

    if (activeTarget.kind === "toprail") {
      const runs =
        state.balcony.balustradePaths?.length
          ? state.balcony.balustradePaths
          : [state.balcony.balustradePath]

      const runPath = runs[activeTarget.runIndex]
      if (!runPath || runPath.length < 2) {
        return {
          heading: "Toprail not found",
          rows: [],
          messages: [{ tone: "error" as const, text: "Invalid run." }],
        }
      }

      const runBalcony = {
        ...state.balcony,
        id: activeTarget.runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${activeTarget.runIndex}`,
        balustradePath: runPath,
      } as any

      const runEndExt =
        state.balcony.endExtensionsByRun?.[activeTarget.runIndex] ??
        state.balcony.endExtensions

      const frameless = deriveFrameless(state)
      const isFramelessToprail =
        frameless.enabled &&
        state.balcony.framelessToprailType != null &&
        state.balcony.framelessToprailType !== "None"

      const profile = isFramelessToprail
        ? {
            width: 40,
            height: Number.isFinite(state.balcony.framelessToprailHeight)
              ? Number(state.balcony.framelessToprailHeight)
              : 21,
          }
        : { width: 55, height: 31 }

      const pieces = buildToprailPieces({
        balcony: runBalcony,
        posts: state.posts,
        profile,
        rules: {
          stockLen: 5500,
          postWidth: 45,
          endExtMin: 45 / 2,
          endExtMax: 200,
          joinOffset: 45 / 2,
        },
        design: state.design,
        endExtensions: runEndExt,
      })

      const piece = pieces[activeTarget.pieceIndex]
      if (!piece) {
        return {
          heading: "Toprail not found",
          rows: [],
          messages: [{ tone: "error" as const, text: "Invalid toprail piece index." }],
        }
      }

      const hasStartTermination = activeTarget.pieceIndex === 0
      const hasEndTermination = activeTarget.pieceIndex === pieces.length - 1

      const startOverhang = hasStartTermination
        ? getToprailEndExtensionForRunEnd({
            balcony: state.balcony,
            runIndex: activeTarget.runIndex,
            end: "start",
            min: 45 / 2,
            max: 200,
          })
        : null

      const endOverhang = hasEndTermination
        ? getToprailEndExtensionForRunEnd({
            balcony: state.balcony,
            runIndex: activeTarget.runIndex,
            end: "end",
            min: 45 / 2,
            max: 200,
          })
        : null

      return {
        heading: `Toprail R${activeTarget.runIndex} P${activeTarget.pieceIndex}`,
        rows: [
          { label: "Type", value: isFramelessToprail ? "Frameless toprail piece" : "Toprail piece" },
          { label: "Run", value: activeTarget.runIndex },
          { label: "Piece index", value: activeTarget.pieceIndex },
          ...(hasStartTermination
            ? [{ label: "Start overhang", value: formatMm(startOverhang) }]
            : []),
          ...(hasEndTermination
            ? [{ label: "End overhang", value: formatMm(endOverhang) }]
            : []),
          { label: "Plane centre length", value: formatMm(piece.planeCenterLength) },
          { label: "Cut length", value: formatMm(piece.length) },
          { label: "HML", value: formatDeg(piece.hml) },
          { label: "HMR", value: formatDeg(piece.hmr) },
          { label: "VML", value: formatDeg(piece.vml) },
          { label: "VMR", value: formatDeg(piece.vmr) },
          { label: "Start", value: `${formatMm(piece.start.x)}, ${formatMm(piece.start.z)}` },
          { label: "End", value: `${formatMm(piece.end.x)}, ${formatMm(piece.end.z)}` },
        ],
        messages: [
          {
            tone: "neutral" as const,
            text: "Plane centre length is the distance between mitre plane centres. Cut length is the fabrication piece length after mitre allowances are added at both ends.",
          },
          ...(hasStartTermination || hasEndTermination
            ? [
                {
                  tone: "neutral" as const,
                  text: "Overhang values shown here are the linked open-end termination lengths for this toprail piece.",
                },
              ]
            : []),
        ],
      }
    }

    if (activeTarget.kind === "rail-end") {
      const endExtMin = 45 / 2
      const endExtMax = 200
      const ext = state.balcony.endExtensionsByRun?.[activeTarget.runIndex] ?? state.balcony.endExtensions
      const value = activeTarget.end === "start" ? ext?.start : ext?.end
      const clamped = clamp(value ?? endExtMin, endExtMin, endExtMax)

      return {
        heading: `Rail overhang (${activeTarget.end})`,
        rows: [
          { label: "Type", value: "Open-end overhang" },
          { label: "Run", value: activeTarget.runIndex },
          { label: "Current", value: formatMm(clamped) },
          { label: "Minimum", value: formatMm(endExtMin) },
          { label: "Maximum", value: formatMm(endExtMax) },
        ],
        messages: [{ tone: "neutral" as const, text: "Adjust this to control toprail open-end extension." }],
      }
    }

    if (activeTarget.kind === "balustrade-vertex") {
      const runs =
        state.balcony.balustradePaths?.length
          ? state.balcony.balustradePaths
          : [state.balcony.balustradePath]

      const runPath = runs[activeTarget.runIndex]
      const vertexIndex = activeTarget.vertexIndex

      if (!runPath || runPath.length < 3) {
        return {
          heading: "Balustrade vertex not found",
          rows: [],
          messages: [{ tone: "error" as const, text: "Invalid run." }],
        }
      }

      if (vertexIndex <= 0 || vertexIndex >= runPath.length - 1) {
        return {
          heading: "Balustrade vertex not joinable",
          rows: [],
          messages: [{ tone: "warn" as const, text: "Only interior balustrade joints can be joined." }],
        }
      }

      const prev = runPath[vertexIndex - 1]
      const curr = runPath[vertexIndex]
      const next = runPath[vertexIndex + 1]

      const inDx = prev.x - curr.x
      const inDz = prev.z - curr.z
      const outDx = next.x - curr.x
      const outDz = next.z - curr.z

      const inLen = Math.hypot(inDx, inDz) || 1
      const outLen = Math.hypot(outDx, outDz) || 1

      const inUx = inDx / inLen
      const inUz = inDz / inLen
      const outUx = outDx / outLen
      const outUz = outDz / outLen

      const dot = clamp(inUx * outUx + inUz * outUz, -1, 1)
      const angleDeg = (Math.acos(dot) * 180) / Math.PI
      const canJoin = Math.abs(dot + 1) <= 1e-6

      return {
        heading: `Balustrade joint R${activeTarget.runIndex} V${vertexIndex}`,
        rows: [
          { label: "Type", value: "Balustrade joint" },
          { label: "Run", value: activeTarget.runIndex },
          { label: "Vertex index", value: vertexIndex },
          { label: "X", value: formatMm(curr.x) },
          { label: "Z", value: formatMm(curr.z) },
          { label: "Angle", value: `${Math.round(angleDeg * 10) / 10}°` },
          { label: "Join allowed", value: canJoin ? "Yes" : "No" },
        ],
        messages: canJoin
          ? [{ tone: "neutral" as const, text: "This is a straight-through 180° joint and can be joined." }]
          : [{ tone: "warn" as const, text: "Join is only available for exact 180° straight-through joints." }],
      }
    }

    if (activeTarget.kind === "frameless-panel" || activeTarget.kind === "frameless-spigot") {
      const frameless = deriveFrameless(state)
      const panel =
        activeTarget.kind === "frameless-panel"
          ? frameless.panels.find((p) => p.id === activeTarget.panelId)
          : frameless.panels.find((p) => p.id === activeTarget.panelId)

      const segmentConstraints =
        panel
          ? state.balcony.segmentConstraintsById?.[panel.segmentId]
          : undefined

      const cornerStartType =
        segmentConstraints?.cornerStartType ?? "symmetric"

      const cornerEndType =
        segmentConstraints?.cornerEndType ?? "symmetric"

      const cornerStartGap =
        segmentConstraints?.cornerStartGap ?? 10

      const cornerEndGap =
        segmentConstraints?.cornerEndGap ?? 10

      const { hasStartJoin, hasEndJoin } =
        panel
          ? getSegmentJoinAvailability(state.balcony, panel.segmentId)
          : { hasStartJoin: false, hasEndJoin: false }

      if (!panel) {
        return {
          heading: "Frameless panel not found",
          rows: [],
          messages: [{ tone: "error" as const, text: "Missing frameless panel." }],
        }
      }

      const messages: { tone: "neutral" | "warn" | "error"; text: string }[] = []

      messages.push({
        tone: "neutral",
        text: "Frameless glass bottom is controlled by the higher spigot support Y for the panel, then offset by the frameless glass bottom offset.",
      })

      messages.push({
        tone: "neutral",
        text: "Corner start/end type and gap are read from the segment constraint settings and drive local panel end adjustment at joined frameless corners.",
      })

      if (!hasStartJoin) {
        messages.push({
          tone: "neutral",
          text: "Start boundary is open, so no start corner join settings apply.",
        })
      }

      if (!hasEndJoin) {
        messages.push({
          tone: "neutral",
          text: "End boundary is open, so no end corner join settings apply.",
        })
      }

      if (activeTarget.kind === "frameless-spigot") {
        const spigot = activeTarget.side === "left" ? panel.leftSpigot : panel.rightSpigot

        if (spigot.anchorageLaserHeights.length > 0) {
          messages.push({
            tone: "neutral",
            text: "Spigot anchorage laser heights are additional vertical drilling reference levels measured from the global laser. Positive values are below the laser, negative values are above it.",
          })
        }

        return {
          heading: `${activeTarget.side === "left" ? "Left" : "Right"} spigot`,
          rows: [
            { label: "Type", value: spigot.type },
            { label: "Panel", value: panel.id },
            { label: "Segment", value: panel.segmentId },
            { label: "X", value: formatMm(spigot.x) },
            { label: "Z", value: formatMm(spigot.z) },
            { label: "Support Y", value: formatMm(spigot.supportY) },
            ...spigot.anchorageLaserHeights.map((value, index) => ({
              label: formatAnchorageLaserHeightLabel(index),
              value: formatMm(value),
            })),
            { label: "Glass bottom", value: formatMm(panel.glassBottomY) },
            ...(hasStartJoin
              ? [
                  { label: "Start corner type", value: formatCornerType(cornerStartType) },
                  { label: "Start corner gap", value: formatMm(cornerStartGap) },
                ]
              : []),
            ...(hasEndJoin
              ? [
                  { label: "End corner type", value: formatCornerType(cornerEndType) },
                  { label: "End corner gap", value: formatMm(cornerEndGap) },
                ]
              : []),
          ],
          messages: [
            ...messages,
            ...(spigot.anchorageLaserHeights.length > 0
              ? [
                  {
                    tone: "neutral" as const,
                    text: "Anchorage laser heights use the same laser-height convention: positive is below the global laser and negative is above.",
                  },
                ]
              : []),
          ],
        }
      }

      return {
        heading: `Frameless panel R${panel.runIndex} S${panel.segmentIndex}`,
        rows: [
          { label: "Segment", value: panel.segmentId },
          { label: "Length", value: formatMm(panel.length) },
          { label: "Glass thickness", value: formatMm(panel.glassThickness) },
          { label: "Left support Y", value: formatMm(panel.leftSupportY) },
          { label: "Right support Y", value: formatMm(panel.rightSupportY) },
          { label: "Controlling support Y", value: formatMm(panel.controllingSupportY) },
          { label: "Glass bottom", value: formatMm(panel.glassBottomY) },
          { label: "Glass top", value: formatMm(panel.glassTopY) },
          { label: "Toprail type", value: panel.toprailType ?? "None" },
          { label: "Toprail bottom", value: formatMm(panel.toprailBottomY) },
          ...(hasStartJoin
            ? [
                { label: "Start corner type", value: formatCornerType(cornerStartType) },
                { label: "Start corner gap", value: formatMm(cornerStartGap) },
              ]
            : []),
          ...(hasEndJoin
            ? [
                { label: "End corner type", value: formatCornerType(cornerEndType) },
                { label: "End corner gap", value: formatMm(cornerEndGap) },
              ]
            : []),
        ],
        messages,
      }
    }

    return {
      heading: "Inspector",
      rows: [],
      messages: [{ tone: "neutral" as const, text: "Unsupported target." }],
    }
  }, [activeTarget, state, showBayFabricationDetails])

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        background: "#FFFFFF",
        boxShadow: compact ? "0 6px 16px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.04)",
        padding: compact ? 10 : 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
        maxHeight: compact ? "70vh" : "80vh",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 700, color: "#111827", fontSize: compact ? 13 : 14 }}>{title}</div>
        {sourceLabel ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: selectedTarget ? "#1D4ED8" : "#6B7280",
              background: selectedTarget ? "#DBEAFE" : "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: 999,
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {sourceLabel}
          </span>
        ) : null}
      </div>

      <div style={{ fontWeight: 600, color: "#111827", fontSize: compact ? 13 : 14 }}>{content.heading}</div>

      {content.rows.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {content.rows.map((row, i) => (
            <DetailRow key={i} label={row.label} value={row.value} />
          ))}
        </div>
      ) : null}

      {activeTarget?.kind === "bottom-rail" ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setShowBayFabricationDetails((v) => !v)}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#374151",
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: 999,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {showBayFabricationDetails ? "Hide fabrication details" : "Show fabrication details"}
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {content.messages.map((m, i) => (
          <Message key={i} tone={m.tone}>
            {m.text}
          </Message>
        ))}
      </div>
    </div>
  )
}