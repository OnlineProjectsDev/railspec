//src/app/(print)/fabrication/docs/PowdercoatOrderDoc.tsx
"use client";

import React, { useMemo } from "react";
import type {
  FabricationBalconyInput,
  FabricationBase,
  FabricationJobDefaults,
} from "@/app/(print)/fabrication/FabricationClient";
import { useFabricationAggregation } from "@/app/(print)/fabrication/FabricationClient";

import { planExtrusionCuts, EXTRUSION_CATALOG } from "@/lib/fabrication/extrusionCutting";

function clean(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function isFilteredName(name: string) {
  return name === "No Post" || name === "No BP";
}

function isPositiveInt(n: unknown) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function toLengthMm(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  return undefined;
}

type PowderRow = {
  key: string;
  partName: string;
  length?: number; // mm
  qty: number;
};

type NonLengthRow = {
  key: string;
  partName: string;
  qty: number;
};

function addNonLengthRow(map: Map<string, NonLengthRow>, partName: string, qty: number) {
  const key = partName;
  const ex = map.get(key);
  if (ex) ex.qty += qty;
  else map.set(key, { key, partName, qty });
}

function findCatalogSpec(name: string) {
  const needle = clean(name);
  if (!needle) return null;

  for (const spec of EXTRUSION_CATALOG.specs) {
    if (spec.name === needle) return spec;
    for (const a of spec.aliases ?? []) {
      if (clean(a) === needle) return spec;
    }
  }
  return null;
}

export function PowdercoatOrderDoc({
  base,
  balconies,
  jobDefaults,
}: {
  base: FabricationBase;
  balconies: FabricationBalconyInput[];
  jobDefaults: FabricationJobDefaults;
}) {
  const { ready, agg } = useFabricationAggregation(balconies, jobDefaults, base);

  const designName = useMemo(() => {
    const d =
      balconies.find((b) => typeof b.design === "string" && b.design)?.design ??
      jobDefaults.design_default ??
      "";
    return clean(d) || "-";
  }, [balconies, jobDefaults.design_default]);

  // Normalise agg.powdercoat into a safe list
  const powderList: PowderRow[] = useMemo(() => {
    const list = agg.powdercoat ?? [];
    return list
      .map((r) => {
        const partName = clean((r as any).partName);
        const length = toLengthMm((r as any).length);
        const qty = isPositiveInt((r as any).qty) ? Math.round((r as any).qty) : 0;

        return {
          key: String((r as any).key ?? `${partName}|${length ?? ""}`),
          partName,
          length,
          qty,
        };
      })
      .filter((r) => r.partName && !isFilteredName(r.partName) && r.qty > 0);
  }, [agg.powdercoat]);

  // ✅ Fixed components / other component buckets (non-length summary input)
  const componentNonLength = useMemo(() => {
    const list = agg.components ?? [];
    return list
      .map((r) => ({
        partName: clean((r as any).partName),
        qty:
          typeof (r as any).qty === "number" && Number.isFinite((r as any).qty) && (r as any).qty > 0
            ? Math.round((r as any).qty)
            : 0,
      }))
      .filter((r) => r.partName && !isFilteredName(r.partName) && r.qty > 0);
  }, [agg.components]);

  // ✅ Non-length items (qty aggregation) — now includes BOTH:
  // - non-length items from powdercoat list
  // - non-length items from fixed components list
  const nonLengthRows: NonLengthRow[] = useMemo(() => {
    const map = new Map<string, NonLengthRow>();

    // From powdercoat rows that have no length
    for (const r of powderList) {
      if (typeof r.length === "number") continue;
      addNonLengthRow(map, r.partName, r.qty);
    }

    // From component rows (always treated as "non-length" for this summary)
    for (const c of componentNonLength) {
      addNonLengthRow(map, c.partName, c.qty);
    }

    return [...map.values()].sort((a, b) => a.partName.localeCompare(b.partName));
  }, [powderList, componentNonLength]);

  // Length-based rows for cut planning
  const cutInputRows = useMemo(() => {
    return powderList
      .map((r) => ({
        partName: r.partName,
        length: r.length,
        qty: r.qty,
      }))
      .filter((r) => typeof r.length === "number" && r.length > 0 && r.qty > 0);
  }, [powderList]);

  const cutPlans = useMemo(() => {
    return planExtrusionCuts({ rows: cutInputRows });
  }, [cutInputRows]);

  const totalPages = 1 + (cutPlans.length ? cutPlans.length : 0);

  if (!ready) {
    return (
      <div className="print-page" style={{ padding: 0 }}>
        <div style={{ padding: "12mm", fontFamily: "Arial, sans-serif" }}>
          Building powdercoat order…
        </div>
      </div>
    );
  }

  return (
    <>
      {/* PAGE 1 — SUMMARY */}
      <div className="print-page" style={{ padding: 0, fontFamily: "Arial, sans-serif" }}>
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "12mm",
            boxSizing: "border-box",
          }}
        >
          <Header base={base} designName={designName} />

          <div style={{ marginTop: "10mm" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>SUMMARY</div>
            <div style={{ fontSize: 12, marginTop: "2mm" }}>
              Colour: <b>{base.colourName ?? "-"}</b>
            </div>
          </div>

          {/* Extrusions required */}
          <div style={{ marginTop: "8mm" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: "3mm" }}>
              Extrusions required
            </div>

            {cutPlans.length === 0 ? (
              <div style={{ fontSize: 12 }}>
                No length-based extrusions matched the catalog / cut planner yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000" }}>
                      Profile
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "2mm 1mm",
                        borderBottom: "2px solid #000",
                        width: "28mm",
                      }}
                    >
                      Stock (mm)
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "2mm 1mm",
                        borderBottom: "2px solid #000",
                        width: "16mm",
                      }}
                    >
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cutPlans.map((p) => {
                    const spec = findCatalogSpec(p.profile);
                    const stock = typeof spec?.stockLength === "number" ? spec.stockLength : undefined;

                    return (
                      <tr key={p.profile}>
                        <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>
                          {p.profile}
                        </td>
                        <td style={{ padding: "2mm 1mm", textAlign: "right", borderBottom: "1px solid #ddd" }}>
                          {typeof stock === "number" ? stock : ""}
                        </td>
                        <td style={{ padding: "2mm 1mm", textAlign: "right", borderBottom: "1px solid #ddd" }}>
                          {p.totalBarsWithSpare}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Non-length items */}
          <div style={{ marginTop: "10mm" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: "3mm" }}>
              Non-length items
            </div>

            {nonLengthRows.length === 0 ? (
              <div style={{ fontSize: 12 }}>None</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000" }}>
                      Item
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "2mm 1mm",
                        borderBottom: "2px solid #000",
                        width: "16mm",
                      }}
                    >
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nonLengthRows.map((r) => (
                    <tr key={r.key}>
                      <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>
                        {r.partName}
                      </td>
                      <td style={{ padding: "2mm 1mm", textAlign: "right", borderBottom: "1px solid #ddd" }}>
                        {r.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <Footer page={1} total={totalPages} />
        </div>
      </div>

      {/* PAGES 2..N — CUT PLANS */}
      {cutPlans.map((plan, idx) => {
        const pageNo = 2 + idx;

        return (
          <div
            key={`cutplan-${plan.profile}-${idx}`}
            className="print-page"
            style={{ padding: 0, fontFamily: "Arial, sans-serif" }}
          >
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "12mm",
                boxSizing: "border-box",
              }}
            >
              <Header base={base} designName={designName} />

              <div style={{ marginTop: "10mm" }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>CUT OPTIMISATION</div>
                <div style={{ marginTop: "2mm", fontSize: 13, fontWeight: 700 }}>{plan.profile}</div>

                <div style={{ fontSize: 12, marginTop: "2mm" }}>
                  Bars: <b>{plan.totalBars}</b> &nbsp; Used: <b>{Math.round(plan.totalUsed)}</b>mm &nbsp; Waste:{" "}
                  <b>{Math.round(plan.totalWaste)}</b>mm
                </div>
              </div>

              <div style={{ marginTop: "8mm" }}>
                {plan.bars.map((bar, barIdx) => (
                  <div
                    key={barIdx}
                    style={{ marginBottom: "6mm", breakInside: "avoid", pageBreakInside: "avoid" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>
                        Bar {barIdx + 1} — Stock {bar.stockLength}mm (usable {bar.usableLength}mm)
                      </div>
                      <div>
                        Used {Math.round(bar.used)}mm &nbsp; Waste {Math.round(bar.waste)}mm
                      </div>
                    </div>

                    <div style={{ marginTop: "2mm", borderTop: "1px solid #000" }} />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "2mm", fontSize: 12 }}>
                      {bar.cuts.map((c, i) => (
                        <span
                          key={i}
                          style={{
                            border: "1px solid #ddd",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {c.length}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1 }} />

              {plan.uncuttable.length ? (
                <div style={{ fontSize: 11, marginTop: "6mm" }}>
                  <div style={{ fontWeight: 700 }}>Uncuttable items:</div>
                  {plan.uncuttable.slice(0, 8).map((u, i) => (
                    <div key={i}>
                      {u.partName} {u.length}mm — {u.reason}
                    </div>
                  ))}
                  {plan.uncuttable.length > 8 ? <div>…and {plan.uncuttable.length - 8} more</div> : null}
                </div>
              ) : null}

              <Footer page={pageNo} total={totalPages} />
            </div>
          </div>
        );
      })}
    </>
  );
}

function Header({ base, designName }: { base: FabricationBase; designName: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>POWDERCOAT ORDER</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          Job: <b>{base.jobNumber}</b> &nbsp; Stage: <b>{base.jobStage}</b>
        </div>
        <div style={{ fontSize: 12 }}>Customer: {base.clientName}</div>
        <div style={{ fontSize: 12 }}>Address: {base.siteAddressLine1}</div>
        {base.siteAddressLine2 ? <div style={{ fontSize: 12 }}>{base.siteAddressLine2}</div> : null}
      </div>

      <div style={{ textAlign: "right", fontSize: 12 }}>
        <div>Date: {base.dateString}</div>
        <div>Design: {designName}</div>
        <div>Colour: {base.colourName ?? "-"}</div>
      </div>
    </div>
  );
}

function Footer({ page, total }: { page: number; total: number }) {
  return <div style={{ marginTop: "6mm", fontSize: 12 }}>{`Page ${page} of ${total}`}</div>;
}
