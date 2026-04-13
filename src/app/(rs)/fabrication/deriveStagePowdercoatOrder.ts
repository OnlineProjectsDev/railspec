// /app/(rs)/fabrication/deriveStagePowdercoatOrder.ts
import { planExtrusionCuts } from "@/lib/fabrication/extrusionCutting"
import type { StageFabricationPartRow } from "./deriveStageFabricationRawParts"
import {
  POWDERCOAT_EXTRUSION_CATALOG,
  isPowdercoatComponentPartName,
  isPowdercoatExtrusionPartName,
} from "./powdercoatConfig"

export type StagePowdercoatLengthRow = {
  partName: string
  qty: number
  length: number
}

export type StagePowdercoatNonLengthRow = {
  partName: string
  qty: number
}

export type StagePowdercoatOrderData = {
  lengthRows: StagePowdercoatLengthRow[]
  nonLengthRows: StagePowdercoatNonLengthRow[]
  cutPlans: ReturnType<typeof planExtrusionCuts>
}

function roundLength(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

function buildLengthKey(partName: string, length: number) {
  return `${partName}::${length}`
}

export function deriveStagePowdercoatOrder(parts: StageFabricationPartRow[]): StagePowdercoatOrderData {
  const lengthMap = new Map<string, StagePowdercoatLengthRow>()
  const nonLengthMap = new Map<string, StagePowdercoatNonLengthRow>()

  for (const part of parts) {
    if (part.kind === "extrusion") {
      if (!isPowdercoatExtrusionPartName(part.partName)) continue

      const resolvedLength =
        roundLength(part.length) ??
        roundLength(part.height)

      if (resolvedLength != null) {
        const key = buildLengthKey(part.partName, resolvedLength)
        const existing = lengthMap.get(key)

        if (existing) {
          existing.qty += 1
        } else {
          lengthMap.set(key, {
            partName: part.partName,
            qty: 1,
            length: resolvedLength,
          })
        }

        continue
      }

      const existing = nonLengthMap.get(part.partName)

      if (existing) {
        existing.qty += 1
      } else {
        nonLengthMap.set(part.partName, {
          partName: part.partName,
          qty: 1,
        })
      }

      continue
    }

    if (part.kind === "component") {
      if (!isPowdercoatComponentPartName(part.partName)) continue

      const existing = nonLengthMap.get(part.partName)

      if (existing) {
        existing.qty += part.qty
      } else {
        nonLengthMap.set(part.partName, {
          partName: part.partName,
          qty: part.qty,
        })
      }
    }
  }

  const lengthRows = [...lengthMap.values()].sort((a, b) => {
    if (a.partName !== b.partName) {
      return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
    }

    return a.length - b.length
  })

  const nonLengthRows = [...nonLengthMap.values()].sort((a, b) => {
    return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
  })

  const cutPlans = planExtrusionCuts({
    rows: lengthRows.map((row) => ({
      partName: row.partName,
      length: row.length,
      qty: row.qty,
    })),
    catalog: POWDERCOAT_EXTRUSION_CATALOG,
  })

  return {
    lengthRows,
    nonLengthRows,
    cutPlans,
  }
}