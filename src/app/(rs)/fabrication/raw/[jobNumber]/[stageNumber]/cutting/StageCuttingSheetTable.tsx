// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/cutting/StageCuttingSheetTable.tsx
import React from "react"
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

function fmt(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value * 100) / 100)
    : "—"
}

const subtypeStyles: Record<string, string> = {
  post: "bg-rail-light-blue/10 text-rail-light-blue",
  toprail: "bg-purple-50 text-purple-700",
  midrail: "bg-orange-50 text-orange-700",
  vertical: "bg-gray-100 text-gray-600",
}

export default function StageCuttingSheetTable({
  rows,
}: {
  rows: StageCuttingSheetRow[]
}) {
  if (!rows.length) {
    return (
      <div className="px-4 py-10 flex flex-col items-center justify-center text-center gap-1.5">
        <p className="text-sm font-medium text-gray-500">No extrusions found</p>
        <p className="text-xs text-gray-400">No extrusion fabrication parts found for non-deleted balconies with derived balustrade on this stage.</p>
      </div>
    )
  }

  // Group rows by balcony
  const groups: { balconyKey: string; balconyLabel: string; editorBalconyId: number; rows: StageCuttingSheetRow[] }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.balconyKey === row.balconyKey) {
      last.rows.push(row)
    } else {
      groups.push({ balconyKey: row.balconyKey, balconyLabel: row.balconyLabel, editorBalconyId: row.editorBalconyId, rows: [row] })
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Run</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Part</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Qty</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Cut Length</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Height</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Plane</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">HML / HMR</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">VML / VMR</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Drilling</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <React.Fragment key={`${group.balconyKey}::${gi}`}>
              {/* Balcony group header */}
              <tr className={gi > 0 ? "border-t-2 border-gray-200" : ""}>
                <td colSpan={9} className="px-3 py-1.5 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-700">{group.balconyLabel}</span>
                    <span className="text-[10px] text-gray-400">#{group.editorBalconyId}</span>
                    <span className="text-[10px] text-gray-400">· {group.rows.length} {group.rows.length === 1 ? "piece" : "pieces"}</span>
                  </div>
                </td>
              </tr>
              {/* Rows for this balcony */}
              {group.rows.map((row, ri) => (
                <tr
                  key={`${row.balconyKey}::${row.run_id ?? ""}::${row.subtype}::${row.partName}::${row.length ?? ""}::${row.height ?? ""}::${row.planeCenterLength ?? ""}::${row.hml}::${row.hmr}::${row.vml}::${row.vmr}::${row.drilling ?? ""}::${ri}`}
                  className={`border-b last:border-b-0 hover:bg-blue-50/30 ${ri % 2 === 1 ? "bg-gray-50/50" : ""}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-500 pl-5">{row.run_id ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${subtypeStyles[row.subtype] ?? subtypeStyles.vertical}`}>
                        {row.subtype}
                      </span>
                      <span className="text-[11px] font-medium text-gray-700">{row.partName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <span className="text-[12px] font-bold text-gray-900">{row.qty}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-[11px] text-gray-800 font-medium">{fmt(row.length)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-[11px] text-gray-600">{fmt(row.height)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-[11px] text-gray-600">{fmt(row.planeCenterLength)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-[11px] text-gray-600">
                    {fmt(row.hml)} <span className="text-gray-300">/</span> {fmt(row.hmr)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-[11px] text-gray-600">
                    {fmt(row.vml)} <span className="text-gray-300">/</span> {fmt(row.vmr)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-500">{row.drilling ?? "—"}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}