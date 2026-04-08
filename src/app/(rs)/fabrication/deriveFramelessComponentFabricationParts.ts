// /app/(rs)/fabrication/deriveFramelessComponentFabricationParts.ts
import type { RootState } from "@/lib/types"
import type { FabricationComponentPart } from "./deriveFabricationParts"
import { deriveFrameless } from "@/lib/frameless/deriveFrameless"
import { designIsFrameless } from "@/lib/jobDesignRules"

export function deriveFramelessComponentFabricationParts(
  state: RootState
): FabricationComponentPart[] {
  if (!state.hasDerivedBalustrade) return []
  if (!designIsFrameless(state.design)) return []

  const derived = deriveFrameless(state)
  if (!derived.enabled) return []

  const out: FabricationComponentPart[] = []

  for (const panel of derived.panels) {
    out.push({
      kind: "component",
      sourceId: `${panel.id}::spigot::left`,
      sourceBayId: panel.id,
      sourceSegmentId: panel.segmentId,
      partName: panel.leftSpigot.type,
      qty: panel.leftSpigot.type === "Spigot_SF"
        ? Math.max(1, panel.leftSpigot.anchorageLaserHeights?.length ?? 0)
        : 1,
    })

    out.push({
      kind: "component",
      sourceId: `${panel.id}::spigot::right`,
      sourceBayId: panel.id,
      sourceSegmentId: panel.segmentId,
      partName: panel.rightSpigot.type,
      qty: panel.rightSpigot.type === "Spigot_SF"
        ? Math.max(1, panel.rightSpigot.anchorageLaserHeights?.length ?? 0)
        : 1,
    })
  }

  return out
}