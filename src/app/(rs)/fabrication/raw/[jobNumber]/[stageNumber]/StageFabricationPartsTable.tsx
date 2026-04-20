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
      .join(" · ")
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
      .join(" · ")
  }

  return [
    `Qty: ${part.qty}`,
    part.sourcePostId != null ? `Post: ${part.sourcePostId}` : null,
    part.sourceBayId ? `Bay: ${part.sourceBayId}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

const kindStyles: Record<string, string> = {
  extrusion: "bg-rail-light-blue/10 text-rail-light-blue",
  glass: "bg-teal-50 text-teal-700",
  component: "bg-gray-100 text-gray-600",
}

export default function StageFabricationPartsTable({
  parts,
}: {
  parts: StageFabricationPartRow[]
}) {
  if (!parts.length) {
    return (
      <div className="px-4 py-10 flex flex-col items-center justify-center text-center gap-1.5">
        <p className="text-sm font-medium text-gray-500">No parts found</p>
        <p className="text-xs text-gray-400">No raw fabrication parts found for non-deleted balconies with derived balustrade on this stage.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Balcony</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Run</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Kind</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Part</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Source</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Details</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => (
            <tr
              key={`${part.balconyKey}::${part.kind}::${part.sourceId}::${part.partName}::${part.run_id ?? "no-run"}::${index}`}
              className="border-b last:border-0 align-top hover:bg-gray-50/50"
            >
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="text-[11px] font-medium text-gray-800">{part.balconyLabel}</div>
                <div className="text-[10px] text-gray-400">#{part.editorBalconyId}</div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-600">{part.run_id ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${kindStyles[part.kind] ?? kindStyles.component}`}>
                  {"subtype" in part ? `${part.kind} / ${part.subtype}` : part.kind}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-[11px] font-medium text-gray-700">{part.partName}</td>
              <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-500">{part.sourceId}</td>
              <td className="px-3 py-2 text-[11px] text-gray-500 min-w-[480px]">{renderDetails(part)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
