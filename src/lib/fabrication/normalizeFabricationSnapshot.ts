// /lib/fabrication/normalizeFabricationSnapshot.ts
import type { StageFabricationPartRow } from "@/app/(rs)/fabrication/deriveStageFabricationRawParts"

function sortObjectDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectDeep(item)) as T
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortObjectDeep(val)])

    return Object.fromEntries(entries) as T
  }

  return value
}

export function normalizeFabricationSnapshot(
  parts: StageFabricationPartRow[]
) {
  return parts
    .map((p) => {
      if (p.kind === "extrusion") {
        return {
          balconyKey: p.balconyKey,
          kind: p.kind,
          subtype: p.subtype,
          partName: p.partName,
          run_id: p.run_id ?? null,

          length: p.length ?? null,
          height: p.height ?? null,
          planeCenterLength: p.planeCenterLength ?? null,

          hml: p.hml,
          hmr: p.hmr,
          vml: p.vml,
          vmr: p.vmr,

          drilling: p.drilling ?? null,
        }
      }

      if (p.kind === "glass") {
        return {
          balconyKey: p.balconyKey,
          kind: p.kind,
          partName: p.partName,
          run_id: p.run_id ?? null,

          width: p.width,
          height: p.height,
          thickness: p.thickness,

          glassType: p.glassType ?? null,
          polish: p.polish ?? null,
          topEdgeAngle: p.topEdgeAngle ?? null,
          bottomEdgeAngle: p.bottomEdgeAngle ?? null,
          leftEdgeAngle: p.leftEdgeAngle ?? null,
          rightEdgeAngle: p.rightEdgeAngle ?? null,
        }
      }

      return {
        balconyKey: p.balconyKey,
        kind: p.kind,
        partName: p.partName,
        run_id: p.run_id ?? null,
        qty: p.qty,
        details: p.details ?? null,
      }
    })
    .sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )
    .map((p) => sortObjectDeep(p))
}