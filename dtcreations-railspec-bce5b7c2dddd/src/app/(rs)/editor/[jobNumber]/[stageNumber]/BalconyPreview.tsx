// /app/(rs)/editor/[jobNumber]/[stageNumber]/BalconyPreview.tsx
"use client"

import { resolveBalconyPreview } from "./resolveBalconyPreview"

type Props = {
  balconyId: number
  drop: string
  balconyNo: string
  substrateOutline?: { x: number; z: number }[] | null
  substrateEdges?: {
    edgeType?: string | null
    thickness?: number | null
  }[] | null
  hasDerivedBalustrade?: boolean
  isFramelessSystem?: boolean
  previewPosts?: { x: number; z: number }[] | null
  previewBalustradeRuns?: { x: number; z: number }[][] | null

  // test controls (optional)
  previewMode?: "auto" | "image" | "svg" | "placeholder"
  imageUrl?: string | null
}

export default function BalconyPreview({
  balconyId,
  drop,
  balconyNo,
  substrateOutline,
  substrateEdges,
  hasDerivedBalustrade,
  isFramelessSystem,
  previewPosts,
  previewBalustradeRuns,
  previewMode,
  imageUrl,
}: Props) {
  const result = resolveBalconyPreview({
    balconyId,
    drop,
    balconyNo,
    substrateOutline,
    substrateEdges,
    hasDerivedBalustrade,
    isFramelessSystem,
    previewPosts,
    previewBalustradeRuns,
    previewMode,
    imageUrl,
  })

  if (result.type === "image") {
    return (
      <img
        src={result.src}
        alt={`Preview ${drop}-${balconyNo}`}
        className="w-full h-full object-cover rounded"
      />
    )
  }

  if (result.type === "svg") {
    return (
      <div
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
      No preview
    </div>
  )
}