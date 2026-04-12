// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/components/StageComponentOrderTable.tsx
import type { StageComponentOrderRow } from "@/app/(rs)/fabrication/deriveStageComponentOrder"

export default function StageComponentOrderTable({
  rows,
}: {
  rows: StageComponentOrderRow[]
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No component rows found for this stage after excluding BP and DP.
      </p>
    )
  }

  return (
    <div className="rounded-md border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Part</th>
              <th className="text-right p-3 font-medium">Qty</th>
              <th className="text-left p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.partName}::${row.details}::${index}`} className="border-b align-top">
                <td className="p-3 whitespace-nowrap">{row.partName}</td>
                <td className="p-3 whitespace-nowrap text-right">{row.qty}</td>
                <td className="p-3">{row.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}