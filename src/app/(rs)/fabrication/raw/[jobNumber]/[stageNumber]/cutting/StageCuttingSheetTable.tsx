// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/cutting/StageCuttingSheetTable.tsx
export type StageCuttingSheetRow = {
  editorBalconyId: number
  jobId: number
  jobStageId: number
  drop: string
  balconyNo: string
  balconySortOrder: number
  balconyLabel: string
  balconyKey: string
  run_id: string | null

  sourceId: string
  sourceSegmentId?: string
  sourcePostId?: number
  sourceBayId?: string

  kind: "extrusion"
  subtype: string
  partName: string
  qty: number

  sourceX?: number
  sourceY?: number
  sourceZ?: number

  drillingDirX?: number
  drillingDirZ?: number

  planeCenterLength?: number
  length?: number
  height?: number

  hml: number
  hmr: number
  vml: number
  vmr: number

  drilling?: string
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value * 100) / 100)
    : "—"
}

function renderDetails(row: StageCuttingSheetRow) {
  return [
    `Subtype: ${row.subtype}`,
    `Cut Length: ${formatNumber(row.length)}`,
    `Height: ${formatNumber(row.height)}`,
    `Plane: ${formatNumber(row.planeCenterLength)}`,
    `HML/HMR: ${formatNumber(row.hml)} / ${formatNumber(row.hmr)}`,
    `VML/VMR: ${formatNumber(row.vml)} / ${formatNumber(row.vmr)}`,
    row.drilling ? `Drilling: ${row.drilling}` : null,
  ]
    .filter(Boolean)
    .join(" • ")
}

export default function StageCuttingSheetTable({
  rows,
}: {
  rows: StageCuttingSheetRow[]
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No extrusion fabrication parts found for non-deleted balconies with derived balustrade on this stage.
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
                key={`${row.balconyKey}::${row.run_id ?? "no-run"}::${row.subtype}::${row.partName}::${row.length ?? "no-length"}::${row.height ?? "no-height"}::${row.planeCenterLength ?? "no-plane"}::${row.hml}::${row.hmr}::${row.vml}::${row.vmr}::${row.drilling ?? "no-drilling"}::${index}`}
                className="border-b align-top"
              >
                <td className="p-3 whitespace-nowrap">
                  <div className="font-medium">{row.balconyLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    Editor balcony #{row.editorBalconyId}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">{row.run_id ?? "—"}</td>
                <td className="p-3 whitespace-nowrap">
                  <div>{row.partName}</div>
                  <div className="text-xs text-muted-foreground">{row.subtype}</div>
                </td>
                <td className="p-3 whitespace-nowrap font-medium">{row.qty}</td>
                <td className="p-3 min-w-[720px]">{renderDetails(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}