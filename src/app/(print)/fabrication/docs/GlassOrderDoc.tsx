//src/app/(print)/fabrication/docs/GlassOrderDoc.tsx
"use client";

import React, { useMemo } from "react";
import type {
  FabricationBalconyInput,
  FabricationBase,
  FabricationJobDefaults,
} from "@/app/(print)/fabrication/FabricationClient";
import { useFabricationAggregation } from "@/app/(print)/fabrication/FabricationClient";

import { DropToPartslist } from "@/app/(rs)/shopdrawings/DropsToPartslist";
import { computeGeometryPosts, normalisePostsArray } from "@/app/(rs)/shopdrawings/shopdrawingGeometry";
import { buildGlobalPanelLabelIndex, type BalconyPartsForLabeling } from "@/app/(rs)/shopdrawings/panelLabeling";


type GlassRow = {
  qty: number;
  height: number | null;
  width: number | null;
  mark: string;
  polish: string;
  glassType: string;
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function clean(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
}

function inferGlassTypeFallback(thickness?: number | null) {
  if (typeof thickness !== "number" || !Number.isFinite(thickness)) return "";
  // keep this conservative – your real source should be balcony.infill / glassType field
  if (Math.abs(thickness - 10) < 0.3) return "10mm Clear Laminate";
  if (Math.abs(thickness - 6.38) < 0.5 || Math.abs(thickness - 6) < 0.8) return "6.38mm Clear Laminate";
  return `${thickness}mm Glass`;
}

function excelLabelToNumber(label: string): number {
  // A=1, Z=26, AA=27, ...
  let n = 0;
  const s = (label || "").trim().toUpperCase();

  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 65 || code > 90) continue; // ignore non A-Z
    n = n * 26 + (code - 64);
  }

  return n;
}

function compareExcelLabels(a: string, b: string): number {
  const na = excelLabelToNumber(a);
  const nb = excelLabelToNumber(b);
  if (na !== nb) return na - nb;
  // tie-breaker for weird inputs like "-" or empty
  return (a || "").localeCompare(b || "");
}


export function GlassOrderDoc({
  base,
  balconies,
  jobDefaults,
}: {
  base: FabricationBase;
  balconies: FabricationBalconyInput[];
  jobDefaults: FabricationJobDefaults;
}) {
  const { ready, agg } = useFabricationAggregation(balconies, jobDefaults, base);

  // Convert aggregation to rows (one row per unique panel size/type entry, with qty).
 const rows: GlassRow[] = useMemo(() => {
  // Rebuild the same per-balcony partslist that FabricationClient uses
  const idCounters = { toprailId: 1, toprailVectorId: 1 };

  const partsForLabeling: BalconyPartsForLabeling[] = balconies.map((b) => {
    const design = b.design ?? jobDefaults.design_default ?? "RD-D1";
    const toprail = b.toprail ?? jobDefaults.toprail_default ?? "Elite";
    const infill = b.infill ?? jobDefaults.infill_default ?? "";

    const postsRaw = normalisePostsArray(b.postsArray);
    const postsDerived = computeGeometryPosts(postsRaw);

    const partslist: any = DropToPartslist([...postsDerived], design, infill ?? "", toprail ?? "Elite", idCounters);

    return {
      balconyId: b.id,
      dropDesign: design,

      infill_vectors: (partslist.infill_vectors ?? []) as any[],
      post_partslist: (partslist.post_partslist ?? []) as any[],
      glass_infill_partslist: (partslist.glass_infill_partslist ?? []) as any[],
      vertical_infill_partslist: (partslist.vertical_infill_partslist ?? []) as any[],
      midrail_partslist: (partslist.midrail_partslist ?? []) as any[],

      // IMPORTANT: no +100 for real parts / shop drawings
      normalizeLengths: false,
    };
  });

  const labelIndex = buildGlobalPanelLabelIndex(partsForLabeling);

  // Aggregate by: glassType + height + width + mark(label) + polish
  const map = new Map<
    string,
    { glassType: string; height: number | null; width: number | null; mark: string; polish: string; qty: number }
  >();

  for (const p of partsForLabeling) {
    const spans = labelIndex.spansByBalconyId.get(p.balconyId) ?? [];
    const glassList = p.glass_infill_partslist as any[];

    for (const span of spans) {
      // Linkage rule (same as panelLabeling.ts): glass.post_id === infillVector.id
      const g = glassList.find((x) => x?.post_id === span.id);
      if (!g) continue;

      const h = typeof g.height === "number" && Number.isFinite(g.height) ? Math.round(g.height) : null;
      const w = typeof g.length === "number" && Number.isFinite(g.length) ? Math.round(g.length) : null;

      const mark = span.label || "-";
      const polish = "All Edges";

      const glassType =
        clean(g.glassType) ||
        clean(g.infill) ||
        inferGlassTypeFallback(typeof g.thickness === "number" ? g.thickness : null) ||
        clean(jobDefaults.infill_default) ||
        "";

      const key = [glassType, h ?? "", w ?? "", mark, polish].join("|");

      const ex = map.get(key);
      if (ex) ex.qty += 1;
      else map.set(key, { glassType, height: h, width: w, mark, polish, qty: 1 });
    }
  }

  return [...map.values()]
    .map((x) => ({
      qty: x.qty,
      height: x.height,
      width: x.width,
      mark: x.mark,
      polish: x.polish,
      glassType: x.glassType,
    }))
    .sort((a, b) => {
  const gt = a.glassType.localeCompare(b.glassType);
  if (gt) return gt;

  const mk = compareExcelLabels(a.mark, b.mark);
  if (mk) return mk;

  return (a.height ?? 0) - (b.height ?? 0) || (a.width ?? 0) - (b.width ?? 0);
});
}, [balconies, jobDefaults.design_default, jobDefaults.toprail_default, jobDefaults.infill_default]);

  // Group rows by glassType (each group prints separately, with its own pages)
  const grouped = useMemo(() => {
    const map = new Map<string, GlassRow[]>();
    for (const r of rows) {
      const key = r.glassType || "Glass";
      const arr = map.get(key);
      if (arr) arr.push(r);
      else map.set(key, [r]);
    }

    // stable sort: glassType name, then height/width
    const groups = [...map.entries()].map(([glassType, rs]) => {
      const sorted = [...rs].sort((a, b) => {
        const mk = compareExcelLabels(a.mark, b.mark);
        if (mk) return mk;
          // optional tie-breakers if two rows somehow share the same mark:
          return (a.height ?? 0) - (b.height ?? 0) || (a.width ?? 0) - (b.width ?? 0);
        });
      return { glassType, rows: sorted };
    });

    groups.sort((a, b) => a.glassType.localeCompare(b.glassType));
    return groups;
  }, [rows]);

  // IMPORTANT: keep this conservative so we never overflow A4 with your header+footer spacing.
  // You can tune upward once the layout is stable.
  const ROWS_PER_PAGE = 20;

  // Flatten into renderable pages while keeping glassType page breaks
  const pages = useMemo(() => {
    const out: Array<{
      glassType: string;
      pageRows: GlassRow[];
      pageIndexWithinType: number;
      pageCountWithinType: number;
      isLastOfType: boolean;
      totalQtyForType: number;
    }> = [];

    for (const g of grouped) {
      const totalQtyForType = g.rows.reduce((s, r) => s + (r.qty || 0), 0);
      const chunks = chunk(g.rows, ROWS_PER_PAGE);
      const pageCountWithinType = Math.max(1, chunks.length);

      for (let i = 0; i < pageCountWithinType; i++) {
        const pageRows = chunks[i] ?? [];
        out.push({
          glassType: g.glassType,
          pageRows,
          pageIndexWithinType: i + 1,
          pageCountWithinType,
          isLastOfType: i === pageCountWithinType - 1,
          totalQtyForType,
        });
      }
    }

    // if no rows, still return one page
    if (!out.length) {
      out.push({
        glassType: "",
        pageRows: [],
        pageIndexWithinType: 1,
        pageCountWithinType: 1,
        isLastOfType: true,
        totalQtyForType: 0,
      });
    }

    return out;
  }, [grouped]);

  const overallPageCount = pages.length;

  if (!ready) {
    return (
      <div className="print-page a4-fixed-page" style={{ padding: 0 }}>
        <div style={{ padding: "12mm", fontFamily: "Arial, sans-serif" }}>Building glass order…</div>
      </div>
    );
  }

  return (
    <>
      {pages.map((p, overallIdx) => {
        const overallPageNo = overallIdx + 1;

        return (
          <div
            key={`${p.glassType}-${p.pageIndexWithinType}-${overallIdx}`}
            className="print-page a4-fixed-page"
            style={{ padding: 0, fontFamily: "Arial, sans-serif" }}
          >
            {/* Full height column so footer is fixed at bottom */}
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "12mm",
                boxSizing: "border-box",
              }}
            >
              {/* Header: must be inside every print-page */}
              <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                <div style={{ fontWeight: 700 }}>Wallan Group Pty Ltd T/A</div>
                <div style={{ fontWeight: 700 }}>Railsafe</div>
                <div>ABN 86 149 388 090</div>
                <div>Wallan Group Pty Ltd (licensee) License No. 235510C</div>
                <div>2/12 Apollo St</div>
                <div>WARRIEWOOD 2102 NSW</div>
                <div>Email: sales@railsafe.com.au</div>
                <div>Web: www.railsafe.com.au</div>

                <div style={{ marginTop: "10mm", fontWeight: 700 }}>Deliver to :</div>

                <div style={{ marginTop: "6mm" }}>
                  <div style={{ fontWeight: 700 }}>GLASS TYPE:</div>
                  <div style={{ fontWeight: 700 }}>{p.glassType}</div>
                </div>
              </div>

              {/* Table for THIS PAGE ONLY (critical: prevents browser splitting) */}
              <div style={{ marginTop: "10mm" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000", width: "14mm" }}>QTY</th>
                      <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000", width: "22mm" }}>HEIGHT</th>
                      <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000", width: "22mm" }}>WIDTH</th>
                      <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000", width: "18mm" }}>MARK</th>
                      <th style={{ textAlign: "left", padding: "2mm 1mm", borderBottom: "2px solid #000" }}>POLISH</th>
                    </tr>
                  </thead>

                  <tbody>
                    {p.pageRows.map((r, i) => (
                      <tr key={`${overallIdx}-${i}`} style={{ breakInside: "avoid" as any }}>
                        <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>{r.qty}</td>
                        <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>{r.height ?? ""}</td>
                        <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>{r.width ?? ""}</td>
                        <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>{r.mark}</td>
                        <td style={{ padding: "2mm 1mm", borderBottom: "1px solid #ddd" }}>{r.polish}</td>
                      </tr>
                    ))}

                    {/* Optional: if this page has no rows, keep a little body space so header doesn't look broken */}
                    {!p.pageRows.length ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "6mm 1mm", borderBottom: "1px solid #ddd", color: "#666" }}>
                          No glass panels for this type.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* Push footer to bottom */}
              <div style={{ flex: 1 }} />

              {/* Footer */}
              <div style={{ fontSize: 12 }}>
                {p.isLastOfType ? (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "6mm", fontWeight: 700 }}>
                    Total:&nbsp;{p.totalQtyForType}
                  </div>
                ) : (
                  <div style={{ height: "6mm" }} />
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14mm", alignItems: "end" }}>
                  <FooterField label="TO" value={base.clientName} />
                  <FooterField label="DATE" value={base.dateString} />
                  <FooterField label="ORDER NUMBER" value={base.jobNumber} />
                </div>

                {/* Overall page number (across all glass types) */}
                <div style={{ marginTop: "6mm" }}>{`Page ${overallPageNo} of ${overallPageCount}`}</div>

                {/* Optional: also show per-type page index if you want */}
                {/* <div style={{ marginTop: "2mm", color: "#666" }}>{`${p.glassType}: Page ${p.pageIndexWithinType} of ${p.pageCountWithinType}`}</div> */}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function FooterField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ borderBottom: "1px solid #000", paddingBottom: "2mm", minHeight: 18 }}>{value}</div>
    </div>
  );
}
