// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/glass/page.tsx
export type StageGlassOrderRow = {
  editorBalconyId: number
  jobId: number
  jobStageId: number
  drop: string
  balconyNo: string
  balconySortOrder: number
  balconyLabel: string
  balconyKey: string
  run_id: string | null

  partName: string
  qty: number

  width?: number
  height?: number
  thickness?: number
  glassType?: string
  polish?: string
  topEdgeAngle?: number
  bottomEdgeAngle?: number
  leftEdgeAngle?: number
  rightEdgeAngle?: number
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value * 100) / 100)
    : "—"
}

function renderDetails(row: StageGlassOrderRow) {
  return [
    `Width: ${formatNumber(row.width)}`,
    `Height: ${formatNumber(row.height)}`,
    `Thickness: ${formatNumber(row.thickness)}`,
    row.glassType ? `Glass: ${row.glassType}` : null,
    row.polish ? `Polish: ${row.polish}` : null,
    `Edges T/B/L/R: ${formatNumber(row.topEdgeAngle)} / ${formatNumber(row.bottomEdgeAngle)} / ${formatNumber(row.leftEdgeAngle)} / ${formatNumber(row.rightEdgeAngle)}`,
  ]
    .filter(Boolean)
    .join(" • ")
}

export default function StageGlassOrderTable({
  rows,
}: {
  rows: StageGlassOrderRow[]
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No glass fabrication parts found for non-deleted balconies with derived balustrade on this stage.
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
              <th className="text-left p-3 font-medium">Part</th>
              <th className="text-left p-3 font-medium">Qty</th>
              <th className="text-left p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.balconyKey}::${row.partName}::${row.width ?? "no-width"}::${row.height ?? "no-height"}::${row.thickness ?? "no-thickness"}::${row.glassType ?? "no-glass"}::${row.polish ?? "no-polish"}::${row.topEdgeAngle ?? "no-top"}::${row.bottomEdgeAngle ?? "no-bottom"}::${row.leftEdgeAngle ?? "no-left"}::${row.rightEdgeAngle ?? "no-right"}::${index}`}
                className="border-b align-top"
              >
                <td className="p-3 whitespace-nowrap">
                  <div className="font-medium">{row.balconyLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    Editor balcony #{row.editorBalconyId}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">{row.run_id ?? "—"}</td>
                <td className="p-3 whitespace-nowrap">{row.partName}</td>
                <td className="p-3 whitespace-nowrap font-medium">{row.qty}</td>
                <td className="p-3 min-w-[640px]">{renderDetails(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}