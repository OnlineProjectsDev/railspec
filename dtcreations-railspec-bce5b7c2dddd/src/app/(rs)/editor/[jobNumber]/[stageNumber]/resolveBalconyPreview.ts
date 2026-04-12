// /app/(rs)/editor/[jobNumber]/[stageNumber]/resolveBalconyPreview.ts
export type BalconyPreviewResult =
  | { type: "image"; src: string }
  | { type: "svg"; svg: string }
  | { type: "placeholder" }

type PreviewPoint = {
  x: number
  z: number
}

type Params = {
  balconyId: number
  drop: string
  balconyNo: string
  previewMode?: "auto" | "image" | "svg" | "placeholder"
  imageUrl?: string | null
  substrateOutline?: PreviewPoint[] | null
  substrateEdges?: {
    edgeType?: string | null
    thickness?: number | null
    refType?: string | null
  }[] | null
  hasDerivedBalustrade?: boolean
  isFramelessSystem?: boolean
  previewPosts?: PreviewPoint[] | null
  previewBalustradeRuns?: PreviewPoint[][] | null
}

export function resolveBalconyPreview(params: Params): BalconyPreviewResult {
  const mode = params.previewMode ?? "auto"

  // ----------------------------
  // 1) Saved image (future support)
  // ----------------------------
  if ((mode === "auto" || mode === "image") && params.imageUrl) {
    return { type: "image", src: params.imageUrl }
  }

  // ----------------------------
  // 2) Generated SVG (current default)
  // ----------------------------
  if (mode === "auto" || mode === "svg") {
    const outline = params.substrateOutline?.filter(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.z)
    ) ?? []

    if (outline.length >= 2) {
      const minX = Math.min(...outline.map((point) => point.x))
      const maxX = Math.max(...outline.map((point) => point.x))
      const minZ = Math.min(...outline.map((point) => point.z))
      const maxZ = Math.max(...outline.map((point) => point.z))

      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxZ - minZ)

      const pad = 8
      const innerW = 120 - pad * 2
      const innerH = 80 - pad * 2
      const scale = Math.min(innerW / width, innerH / height)

      const scaledW = width * scale
      const scaledH = height * scale
      const offsetX = pad + (innerW - scaledW) / 2
      const offsetY = pad + (innerH - scaledH) / 2

      const toSvgPoint = (point: PreviewPoint) => {
        const x = offsetX + (point.x - minX) * scale
        const y = offsetY + (point.z - minZ) * scale
        return `${x},${y}`
      }

      const points = outline.map(toSvgPoint).join(" ")

      const wallPolygons = (params.substrateEdges ?? [])
        .map((edge, index) => {
          if (!edge) return null
          if (!["wall", "low_wall", "hob"].includes(String(edge.edgeType ?? ""))) return null

          const from = outline[index]
          const to = outline[(index + 1) % outline.length]
          if (!from || !to) return null

          const dx = to.x - from.x
          const dz = to.z - from.z
          const len = Math.hypot(dx, dz)
          if (len < 1e-6) return null

          const offset = Number(edge.thickness ?? 0)
          if (!Number.isFinite(offset) || Math.abs(offset) < 1e-6) return null

          const nx = -dz / len
          const nz = dx / len

          const fromOffset = {
            x: from.x + nx * -offset,
            z: from.z + nz * -offset,
          }

          const toOffset = {
            x: to.x + nx * -offset,
            z: to.z + nz * -offset,
          }

          return {
            edgeType: String(edge.edgeType),
            points: [
              toSvgPoint(from),
              toSvgPoint(to),
              toSvgPoint(toOffset),
              toSvgPoint(fromOffset),
            ].join(" "),
          }
        })
        .filter(Boolean) as { edgeType: string; points: string }[]

      const excludedEdgeLines = (params.substrateEdges ?? [])
        .map((edge, index) => {
          if (!edge) return null
          if (String(edge.refType ?? "") !== "exclude") return null
          if (["wall", "low_wall", "hob"].includes(String(edge.edgeType ?? ""))) return null

          const from = outline[index]
          const to = outline[(index + 1) % outline.length]
          if (!from || !to) return null

          return {
            x1: from.x,
            y1: from.z,
            x2: to.x,
            y2: to.z,
          }
        })
        .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[]

      const previewRunPolylines = (params.previewBalustradeRuns ?? [])
        .filter((run) => run.length >= 2)
        .map((run) => run.map(toSvgPoint).join(" "))

      const previewPostShapes = (params.previewPosts ?? [])
        .filter((post) => Number.isFinite(post.x) && Number.isFinite(post.z))
        .map((post) => {
          const x = offsetX + (post.x - minX) * scale
          const y = offsetY + (post.z - minZ) * scale

          if (params.isFramelessSystem) {
            const nearestSegment = (params.previewBalustradeRuns ?? [])
              .flatMap((run) =>
                run.slice(0, -1).map((from, index) => ({
                  from,
                  to: run[index + 1],
                }))
              )
              .filter((segment) => segment.from && segment.to)
              .map((segment) => {
                const dx = segment.to.x - segment.from.x
                const dz = segment.to.z - segment.from.z
                const lenSq = dx * dx + dz * dz

                if (lenSq < 1e-6) {
                  return {
                    distSq: Infinity,
                    tangentX: 1,
                    tangentZ: 0,
                  }
                }

                const t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((post.x - segment.from.x) * dx + (post.z - segment.from.z) * dz) / lenSq
                  )
                )

                const cx = segment.from.x + dx * t
                const cz = segment.from.z + dz * t
                const distSq = (post.x - cx) * (post.x - cx) + (post.z - cz) * (post.z - cz)
                const len = Math.sqrt(lenSq)

                return {
                  distSq,
                  tangentX: dx / len,
                  tangentZ: dz / len,
                }
              })
              .sort((a, b) => a.distSq - b.distSq)[0]

            const tangentX = nearestSegment?.tangentX ?? 1
            const tangentZ = nearestSegment?.tangentZ ?? 0
            const normalX = -tangentZ
            const normalY = tangentX
            const gapHalf = 2.2

            return `<line x1="${x - normalX * gapHalf}" y1="${y - normalY * gapHalf}" x2="${x + normalX * gapHalf}" y2="${y + normalY * gapHalf}" stroke="#0f766e" stroke-width="0.9" stroke-linecap="round" opacity="0.6"/>`
          }

          return `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" fill="#334155"/>`
        })
        .join(" ")

      const balustradeOverlay = params.hasDerivedBalustrade
        ? params.isFramelessSystem
          ? `
            ${previewRunPolylines
              .map((polyline) => `<polyline points="${polyline}" fill="none" stroke="#0f766e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`)
              .join("")}
            ${previewPostShapes}
          `
          : `
            ${previewRunPolylines
              .map((polyline) => `<polyline points="${polyline}" fill="none" stroke="#64748b" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`)
              .join("")}
            ${previewPostShapes}
          `
        : ""

      const svg = `
        <svg width="100%" height="100%" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="120" height="80" fill="#f5f5f5"/>
          ${wallPolygons
            .map((polygon) => `<polygon points="${polygon.points}" fill="#d1d5db"/>`)
            .join("")}
          <polygon points="${points}" fill="#f8fafc" stroke="#cbd5f5" stroke-width="0.8" stroke-linejoin="round"/>
          ${excludedEdgeLines
            .map((line) => `<line x1="${offsetX + (line.x1 - minX) * scale}" y1="${offsetY + (line.y1 - minZ) * scale}" x2="${offsetX + (line.x2 - minX) * scale}" y2="${offsetY + (line.y2 - minZ) * scale}" stroke="#f8fafc" stroke-width="0.8" stroke-linecap="butt"/><line x1="${offsetX + (line.x1 - minX) * scale}" y1="${offsetY + (line.y1 - minZ) * scale}" x2="${offsetX + (line.x2 - minX) * scale}" y2="${offsetY + (line.y2 - minZ) * scale}" stroke="#94a3b8" stroke-width="0.55" stroke-dasharray="4.4 4.2" stroke-linecap="round" opacity="0.95"/>`)
            .join("")}
          ${balustradeOverlay}
        </svg>
      `

      return { type: "svg", svg }
    }

    const svg = `
      <svg width="100%" height="100%" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="120" height="80" fill="#f5f5f5"/>
        <rect x="10" y="20" width="100" height="40" fill="#e5e5e5" stroke="#999"/>
      </svg>
    `

    return { type: "svg", svg }
  }

  // ----------------------------
  // 3) Fallback
  // ----------------------------
  return { type: "placeholder" }
}