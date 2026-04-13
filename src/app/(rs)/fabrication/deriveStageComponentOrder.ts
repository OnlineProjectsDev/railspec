// /app/(rs)/fabrication/deriveStageComponentOrder.ts
import type { StageFabricationPartRow } from "./deriveStageFabricationRawParts"

export type StageComponentOrderRow = {
  partName: string
  qty: number
  details: string
}

function normalizeDetails(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : ""
  return text || "—"
}

function shouldIncludeComponent(
  part: StageFabricationPartRow
): part is Extract<StageFabricationPartRow, { kind: "component" }> {
  if (part.kind !== "component") return false
  if (part.partName === "BP" || part.partName === "DP") return false
  return true
}

function buildComponentKey(
  part: Extract<StageFabricationPartRow, { kind: "component" }>
) {
  return [
    part.partName,
    normalizeDetails(part.details),
  ].join("::")
}

export function deriveStageComponentOrder(parts: StageFabricationPartRow[]) {
  const grouped = new Map<string, StageComponentOrderRow>()

  for (const part of parts) {
    if (!shouldIncludeComponent(part)) continue

    const details = normalizeDetails(part.details)
    const key = buildComponentKey(part)
    const existing = grouped.get(key)

    if (existing) {
      existing.qty += part.qty
      continue
    }

    grouped.set(key, {
      partName: part.partName,
      qty: part.qty,
      details,
    })
  }

  return [...grouped.values()].sort((a, b) => {
    if (a.partName !== b.partName) {
      return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
    }

    return a.details.localeCompare(b.details, undefined, { numeric: true, sensitivity: "base" })
  })
}