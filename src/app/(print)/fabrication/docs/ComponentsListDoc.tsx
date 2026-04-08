//src/app/(print)/fabrication/docs/ComponentListDoc.tsx
"use client";

import React from "react";
import type { FabricationBalconyInput, FabricationBase, FabricationJobDefaults } from "@/app/(print)/fabrication/FabricationClient";
import { useFabricationAggregation } from "@/app/(print)/fabrication/FabricationClient";

export function ComponentsListDoc({
  base,
  balconies,
  jobDefaults,
}: {
  base: FabricationBase;
  balconies: FabricationBalconyInput[];
  jobDefaults: FabricationJobDefaults;
}) {
  const { ready, agg } = useFabricationAggregation(balconies, jobDefaults, base);

  return (
    <div className="print-page" style={{ padding: 0 }}>
      <div style={{ padding: "8mm" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>CUTTING SHEET</div>
            <div>Job: {base.jobNumber} &nbsp; Stage: {base.jobStage}</div>
            <div>Client: {base.clientName}</div>
            <div>Site: {base.siteAddressLine1}</div>
            {base.siteAddressLine2 ? <div>{base.siteAddressLine2}</div> : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <div>Date: {base.dateString}</div>
            <div>Colour: {base.colourName ?? "-"}</div>
          </div>
        </div>

        <hr style={{ margin: "6mm 0" }} />

        {!ready ? (
          <div>Building cut list…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #000", padding: "2mm" }}>Item</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #000", padding: "2mm" }}>Length (mm)</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #000", padding: "2mm" }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {agg.components.map((r) => (
                <tr key={r.key}>
                  <td style={{ padding: "2mm", borderBottom: "1px solid #ddd" }}>{r.partName}</td>
                  <td style={{ padding: "2mm", textAlign: "right", borderBottom: "1px solid #ddd" }}>{r.length ?? "-"}</td>
                  <td style={{ padding: "2mm", textAlign: "right", borderBottom: "1px solid #ddd" }}>{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
