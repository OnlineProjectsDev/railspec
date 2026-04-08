// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/StageFabricationPartsTable.tsx
import type { StageFabricationPartRow } from "../../../deriveStageFabricationRawParts"

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "—"
}

function renderDetails(part: StageFabricationPartRow) {
  if (part.kind === "extrusion") {
    return [
      `Subtype: ${part.subtype}`,
      `Length: ${formatNumber(part.length)}`,
      `Height: ${formatNumber(part.height)}`,
      `Plane: ${formatNumber(part.planeCenterLength)}`,
      `HML/HMR: ${formatNumber(part.hml)} / ${formatNumber(part.hmr)}`,
      `VML/VMR: ${formatNumber(part.vml)} / ${formatNumber(part.vmr)}`,
      part.drilling ? `Drilling: ${part.drilling}` : null,
    ]
      .filter(Boolean)
      .join(" • ")
  }

  if (part.kind === "glass") {
    return [
      `Width: ${formatNumber(part.width)}`,
      `Height: ${formatNumber(part.height)}`,
      `Thickness: ${formatNumber(part.thickness)}`,
      part.glassType ? `Glass: ${part.glassType}` : null,
      part.polish ? `Polish: ${part.polish}` : null,
      `Edges T/B/L/R: ${formatNumber(part.topEdgeAngle)} / ${formatNumber(part.bottomEdgeAngle)} / ${formatNumber(part.leftEdgeAngle)} / ${formatNumber(part.rightEdgeAngle)}`,
    ]
      .filter(Boolean)
      .join(" • ")
  }

  return [
    `Qty: ${part.qty}`,
    part.sourcePostId != null ? `Post: ${part.sourcePostId}` : null,
    part.sourceBayId ? `Bay: ${part.sourceBayId}` : null,
  ]
    .filter(Boolean)
    .join(" • ")
}

export default function StageFabricationPartsTable({
  parts,
}: {
  parts: StageFabricationPartRow[]
}) {
  if (!parts.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No raw fabrication parts found for non-deleted balconies with derived balustrade on this stage.
      </p>
    )
  }

  return (
    <div className="rounded-md border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Balcony</th>
              <th className="text-left p-3 font-medium">Run ID</th>
              <th className="text-left p-3 font-medium">Kind</th>
              <th className="text-left p-3 font-medium">Part</th>
              <th className="text-left p-3 font-medium">Source</th>
              <th className="text-left p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, index) => (
              <tr key={`${part.balconyKey}::${part.kind}::${part.sourceId}::${part.partName}::${part.run_id ?? "no-run"}::${index}`} className="border-b align-top">
                <td className="p-3 whitespace-nowrap">
                  <div className="font-medium">{part.balconyLabel}</div>
                  <div className="text-xs text-muted-foreground">Editor balcony #{part.editorBalconyId}</div>
                </td>
                <td className="p-3 whitespace-nowrap">{part.run_id ?? "—"}</td>
                <td className="p-3 whitespace-nowrap">
                  {"subtype" in part ? `${part.kind} / ${part.subtype}` : part.kind}
                </td>
                <td className="p-3 whitespace-nowrap">{part.partName}</td>
                <td className="p-3 whitespace-nowrap">{part.sourceId}</td>
                <td className="p-3 min-w-[560px]">{renderDetails(part)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}