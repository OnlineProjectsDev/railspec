// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/powdercoat/StagePowdercoatOrderTable.tsx
import type { CutPlan } from "@/lib/fabrication/extrusionCutting"
import type {
  StagePowdercoatLengthRow,
  StagePowdercoatNonLengthRow,
} from "@/app/(rs)/fabrication/deriveStagePowdercoatOrder"

function renderBarCuts(bar: CutPlan["bars"][number]) {
  if (!bar.cuts.length) return "—"

  const counts = new Map<number, number>()

  for (const cut of bar.cuts) {
    const length = Math.round(cut.length * 100) / 100
    counts.set(length, (counts.get(length) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([length, qty]) => `${length} x ${qty}`)
    .join(" • ")
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "—"
}

export default function StagePowdercoatOrderTable({
  colourName,
  lengthRows,
  nonLengthRows,
  cutPlans,
}: {
  colourName: string
  lengthRows: StagePowdercoatLengthRow[]
  nonLengthRows: StagePowdercoatNonLengthRow[]
  cutPlans: CutPlan[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border bg-white overflow-hidden">
        <div className="p-3 border-b bg-muted/40">
          <div className="font-medium">Extrusions required</div>
          <div className="text-xs text-muted-foreground mt-1">
            Colour: {colourName}
          </div>
        </div>

        {!cutPlans.length ? (
          <div className="p-3 text-sm text-muted-foreground">
            No length-based powdercoated extrusions matched the catalog yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Profile</th>
                  <th className="text-right p-3 font-medium">Stock Length</th>
                  <th className="text-right p-3 font-medium">Planned Bars</th>
                  <th className="text-right p-3 font-medium">Spare Bars</th>
                  <th className="text-right p-3 font-medium">Order Qty</th>
                  <th className="text-right p-3 font-medium">Used</th>
                  <th className="text-right p-3 font-medium">Waste</th>
                </tr>
              </thead>
              <tbody>
                {cutPlans.map((plan) => (
                  <tr key={plan.profile} className="border-b align-top">
                    <td className="p-3 whitespace-nowrap">{plan.profile}</td>
                    <td className="p-3 whitespace-nowrap text-right">{formatNumber(plan.bars[0]?.stockLength)}</td>
                    <td className="p-3 whitespace-nowrap text-right">{plan.totalBars}</td>
                    <td className="p-3 whitespace-nowrap text-right">{plan.spareBars}</td>
                    <td className="p-3 whitespace-nowrap text-right font-medium">{plan.totalBarsWithSpare}</td>
                    <td className="p-3 whitespace-nowrap text-right">{formatNumber(plan.totalUsed)}</td>
                    <td className="p-3 whitespace-nowrap text-right">{formatNumber(plan.totalWaste)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="p-3 border-b bg-muted/40">
          <div className="font-medium">Length rows used for planning</div>
        </div>

        {!lengthRows.length ? (
          <div className="p-3 text-sm text-muted-foreground">
            No powdercoated extrusion rows found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Part</th>
                  <th className="text-right p-3 font-medium">Length</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lengthRows.map((row, index) => (
                  <tr key={`${row.partName}::${row.length}::${index}`} className="border-b align-top">
                    <td className="p-3 whitespace-nowrap">{row.partName}</td>
                    <td className="p-3 whitespace-nowrap text-right">{formatNumber(row.length)}</td>
                    <td className="p-3 whitespace-nowrap text-right">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="p-3 border-b bg-muted/40">
          <div className="font-medium">Cut breakdown per bar</div>
          <div className="text-xs text-muted-foreground mt-1">
            Each stock bar shows its allocated cuts, used length, and waste.
          </div>
        </div>

        {!cutPlans.length ? (
          <div className="p-3 text-sm text-muted-foreground">
            No cut breakdown available because no stock-planned extrusion rows matched the powdercoat catalog.
          </div>
        ) : (
          <div className="flex flex-col">
            {cutPlans.map((plan) => (
              <div key={plan.profile} className="border-b last:border-b-0">
                <div className="p-3 bg-muted/20 border-b">
                  <div className="font-medium">{plan.profile}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Stock {formatNumber(plan.bars[0]?.stockLength)} • Planned Bars {plan.totalBars} • Spare Bars {plan.spareBars} • Order Qty {plan.totalBarsWithSpare}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10">
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Bar</th>
                        <th className="text-left p-3 font-medium">Cuts</th>
                        <th className="text-right p-3 font-medium">Used</th>
                        <th className="text-right p-3 font-medium">Waste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.bars.map((bar, index) => (
                        <tr key={`${plan.profile}::bar::${index}`} className="border-b align-top">
                          <td className="p-3 whitespace-nowrap">Bar {index + 1}</td>
                          <td className="p-3 min-w-[520px]">{renderBarCuts(bar)}</td>
                          <td className="p-3 whitespace-nowrap text-right">{formatNumber(bar.used)}</td>
                          <td className="p-3 whitespace-nowrap text-right">{formatNumber(bar.waste)}</td>
                        </tr>
                      ))}

                      {plan.spareBars > 0 ? (
                        <tr className="align-top">
                          <td className="p-3 whitespace-nowrap">{`Spare Bars`}</td>
                          <td className="p-3 min-w-[520px] text-muted-foreground">Unallocated spare stock allowance</td>
                          <td className="p-3 whitespace-nowrap text-right">—</td>
                          <td className="p-3 whitespace-nowrap text-right">{plan.spareBars}</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="p-3 border-b bg-muted/40">
          <div className="font-medium">Non-length items</div>
        </div>

        {!nonLengthRows.length ? (
          <div className="p-3 text-sm text-muted-foreground">
            No non-length powdercoated items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {nonLengthRows.map((row, index) => (
                  <tr key={`${row.partName}::${index}`} className="border-b align-top">
                    <td className="p-3 whitespace-nowrap">{row.partName}</td>
                    <td className="p-3 whitespace-nowrap text-right">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}