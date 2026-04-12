//src/app/(print)/fabrication/docs/CuttingsheetDoc.tsx
"use client";

import React, { useMemo } from "react";
import type {
  FabricationBalconyInput,
  FabricationBase,
  FabricationJobDefaults,
} from "@/app/(print)/fabrication/FabricationClient";
import { useFabricationAggregation } from "@/app/(print)/fabrication/FabricationClient";
import { RAILSAFE_LOGO_URL } from "@/lib/branding/railsafeLogo";

type CutRow = {
  key: string;

  dropLevel: string;
  no?: number;

  // ✅ new (from Fabrication aggregation merge)
  noList?: number[];

  // ✅ what we actually print in the "No." column
  noDisplay: string;

  component: string;
  drilling?: string;

  length?: number;
  hml?: number;
  hmr?: number;
  vml?: number;
  vmr?: number;

  qty: number;

  // sorting helper
  dropIndex: number;
};

type ComponentPage = {
  component: string;
  rows: CutRow[];
};

function firstNonEmpty(...vals: Array<string | null | undefined>) {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function normaliseDropLevel(s: unknown) {
  const v = typeof s === "string" ? s.trim() : "";
  return v || "-";
}

function toIntOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : undefined;
}

function joinNoList(noList: unknown, fallbackNo: number | undefined) {
  if (Array.isArray(noList) && noList.length) {
    const nums = noList
      .map((n) => (typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : undefined))
      .filter((n): n is number => typeof n === "number")
      .sort((a, b) => a - b);

    if (nums.length) return nums.join(", ");
  }
  return typeof fallbackNo === "number" ? String(fallbackNo) : "";
}

export function CuttingSheetDoc({
  base,
  balconies,
  jobDefaults,
}: {
  base: FabricationBase;
  balconies: FabricationBalconyInput[];
  jobDefaults: FabricationJobDefaults;
}) {
  const { ready, agg } = useFabricationAggregation(balconies, jobDefaults, base);

  // Drop Level sort order = balcony sequence
  const dropOrder = useMemo(() => {
    const m = new Map<string, number>();
    balconies.forEach((b, i) => {
      const dl = normaliseDropLevel(b.balconyNo);
      if (!m.has(dl)) m.set(dl, i);
    });
    return m;
  }, [balconies]);

  const designName = useMemo(() => {
    const d =
      balconies.find((b) => typeof b.design === "string" && b.design)?.design ??
      firstNonEmpty(jobDefaults.design_default ?? undefined) ??
      "";
    return d || "-";
  }, [balconies, jobDefaults.design_default]);

  const rowsSorted: CutRow[] = useMemo(() => {
    const list = agg.cutlist ?? [];

    const rows: CutRow[] = list.map((r: any) => {
      const dropLevel = normaliseDropLevel(r.dropLevel);
      const dropIndex = dropOrder.get(dropLevel) ?? 9999;

      const length =
        typeof r.length === "number" && Number.isFinite(r.length) && r.length > 0
          ? Math.round(r.length)
          : typeof r.height === "number" && Number.isFinite(r.height) && r.height > 0
            ? Math.round(r.height)
            : undefined;

      const no = toIntOrUndef(r.no);
      const noList = Array.isArray(r.noList) ? (r.noList as number[]) : undefined;

      return {
        key: r.key,
        dropLevel,
        dropIndex,
        no,
        noList,
        noDisplay: joinNoList(noList, no),
        component: r.partName ?? "-",
        drilling: r.drilling ?? "",
        length,
        hml: typeof r.hml === "number" ? r.hml : 90,
        hmr: typeof r.hmr === "number" ? r.hmr : 90,
        vml: typeof r.vml === "number" ? r.vml : 90,
        vmr: typeof r.vmr === "number" ? r.vmr : 90,
        qty: r.qty ?? 1,
      };
    });

    // Component -> Drop level (balcony sequence) -> No.
    rows.sort((a, b) => {
      const c = a.component.localeCompare(b.component);
      if (c) return c;
      const d = a.dropIndex - b.dropIndex;
      if (d) return d;
      return (a.no ?? 0) - (b.no ?? 0);
    });

    return rows;
  }, [agg.cutlist, dropOrder]);

  const pages: ComponentPage[] = useMemo(() => {
    const byComponent = new Map<string, CutRow[]>();
    for (const r of rowsSorted) {
      const k = r.component || "-";
      const arr = byComponent.get(k);
      if (arr) arr.push(r);
      else byComponent.set(k, [r]);
    }

    const componentNames = [...byComponent.keys()].sort((a, b) => a.localeCompare(b));

    const ROWS_PER_PAGE = 18;

    const out: ComponentPage[] = [];
    for (const comp of componentNames) {
      const rows = byComponent.get(comp) ?? [];
      for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
        out.push({ component: comp, rows: rows.slice(i, i + ROWS_PER_PAGE) });
      }
    }

    if (!out.length) out.push({ component: "-", rows: [] });
    return out;
  }, [rowsSorted]);

  const pageCount = pages.length;

  if (!ready) {
    return (
      <div className="print-page" style={{ padding: 0 }}>
        <div style={{ padding: "10mm", fontFamily: "Arial, sans-serif" }}>Building cut list…</div>
      </div>
    );
  }

  return (
    <>
      {pages.map((p, pageIdx) => (
        <div
          key={`${p.component}-${pageIdx}`}
          className="print-page"
          style={{
            position: "relative",
            width: "210mm",
            height: "297mm",
            padding: 0,
            fontFamily: "Arial, sans-serif",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
          }}
        >
          {/* Header + meta */}
          <div style={{ padding: "10mm" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <img
                    src={RAILSAFE_LOGO_URL}
                    alt="Railsafe Balustrading"
                    style={{
                      width: 120,
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 13, marginTop: 6 }}>Cutting Sheet</div>
            </div>

            <div
              style={{
                marginTop: "10mm",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "18mm",
              }}
            >
              <div style={{ fontSize: 12 }}>
                <Line label="Job#" value={base.jobNumber} />
                <Line label="Customer" value={base.clientName} />
                <Line label="Address" value={base.siteAddressLine1} />
                <Line label="" value={base.siteAddressLine2 ?? ""} />
                <Line label="Measurer" value={""} />
              </div>

              <div style={{ fontSize: 12 }}>
                <Line label="Design" value={designName} />
                <Line label="Colour" value={base.colourName ?? "-"} />
                <Line label="" value={""} />
                <Line label="" value={""} />
                <Line label="" value={""} />
              </div>
            </div>

            <div style={{ marginTop: "10mm", fontWeight: 700, fontSize: 12 }}>{p.component}</div>
          </div>

          {/* Table */}
          <div style={{ padding: "0 10mm" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={thLeft}>Drop Level</th>
                  <th style={{ ...thRight, width: "14mm" }}>No.</th>
                  <th style={thLeft}>Component</th>
                  <th style={thLeft}>Drilling</th>
                  <th style={{ ...thRight, width: "22mm" }}>Length</th>
                  <th style={{ ...thRight, width: "16mm" }}>HML</th>
                  <th style={{ ...thRight, width: "16mm" }}>HMR</th>
                  <th style={{ ...thRight, width: "16mm" }}>VML</th>
                  <th style={{ ...thRight, width: "16mm" }}>VMR</th>
                  <th style={{ ...thRight, width: "16mm" }}>Qty</th>
                </tr>
              </thead>

              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.key}>
                    <td style={tdLeft}>{r.dropLevel}</td>
                    {/* ✅ print grouped No list */}
                    <td style={tdRight}>{r.noDisplay}</td>
                    <td style={tdLeft}>{r.component}</td>
                    <td style={{ ...tdLeft, whiteSpace: "nowrap" }}>{r.drilling ?? ""}</td>
                    <td style={tdRight}>{typeof r.length === "number" ? r.length : "-"}</td>

                    <td style={tdRight}>{r.hml ?? 90}</td>
                    <td style={tdRight}>{r.hmr ?? 90}</td>
                    <td style={tdRight}>{r.vml ?? 90}</td>
                    <td style={tdRight}>{r.vmr ?? 90}</td>

                    <td style={tdRight}>{r.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "0 10mm 10mm 10mm",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontSize: 11,
            }}
          >
            <div>{`Page ${pageIdx + 1} of ${pageCount}`}</div>
            <div />
          </div>
        </div>
      ))}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div>{label ? `${label}:` : ""}</div>
      <div
        style={{
          borderBottom: "1px solid #000",
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const thLeft: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #000",
  padding: "2mm",
};

const thRight: React.CSSProperties = {
  textAlign: "right",
  borderBottom: "1px solid #000",
  padding: "2mm",
};

const tdLeft: React.CSSProperties = {
  padding: "2mm",
  borderBottom: "1px solid #ddd",
};

const tdRight: React.CSSProperties = {
  padding: "2mm",
  textAlign: "right",
  borderBottom: "1px solid #ddd",
};
