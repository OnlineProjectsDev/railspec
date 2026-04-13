// /app/(rs)/fabrication/formatPostDrilling.ts

import type { FabricationPostDrilling, PostFace } from "./deriveFabricationParts"

function fmt0(n: number) {
  const r = Math.round(n)
  return Number.isInteger(r) ? String(r) : r.toFixed(0)
}

function toSpacing(vals: number[]) {
  const nums = vals
    .map((n) => Number(n))
    .filter(Number.isFinite)
    .map((n) => Math.round(n * 10) / 10)
    .sort((a, b) => a - b)

  if (!nums.length) return ""

  const out: number[] = [nums[0]]

  for (let i = 1; i < nums.length; i++) {
    out.push(nums[i] - nums[i - 1])
  }

  return out.map(fmt0).join(" _ ")
}

function pushFaceChunk(chunks: string[], drilling: FabricationPostDrilling, face: PostFace) {
  const vals = drilling[face]
  if (!Array.isArray(vals) || !vals.length) return

  const s = toSpacing(vals)
  if (!s) return

  chunks.push(`${face}: ${s}`)
}

function pushSpecialChunk(
  chunks: string[],
  drilling: FabricationPostDrilling,
  tag: "SF" | "WF",
  face: PostFace
) {
  const vals = drilling.special?.[tag]?.[face]
  if (!Array.isArray(vals) || !vals.length) return

  const s = toSpacing(vals)
  if (!s) return

  chunks.push(`${face} ${tag}: ${s}`)
}

export function formatPostDrilling(drilling?: FabricationPostDrilling) {
  if (!drilling) return undefined

  const chunks: string[] = []

  pushFaceChunk(chunks, drilling, "P1")
  pushFaceChunk(chunks, drilling, "P2")
  pushFaceChunk(chunks, drilling, "P3")
  pushFaceChunk(chunks, drilling, "P4")

  pushSpecialChunk(chunks, drilling, "SF", "P1")
  pushSpecialChunk(chunks, drilling, "SF", "P2")
  pushSpecialChunk(chunks, drilling, "SF", "P3")
  pushSpecialChunk(chunks, drilling, "SF", "P4")

  pushSpecialChunk(chunks, drilling, "WF", "P1")
  pushSpecialChunk(chunks, drilling, "WF", "P2")
  pushSpecialChunk(chunks, drilling, "WF", "P3")
  pushSpecialChunk(chunks, drilling, "WF", "P4")

  const unique = Array.from(new Set(chunks))
  return unique.length ? unique.join(" ") : undefined
}