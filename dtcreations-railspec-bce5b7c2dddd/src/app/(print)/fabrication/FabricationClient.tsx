// /app/(print)/fabrication/FabricationClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { DropToPartslist } from "@/app/(rs)/shopdrawings/DropsToPartslist";
import { computeGeometryPosts, normalisePostsArray } from "@/app/(rs)/shopdrawings/shopdrawingGeometry";

export type FabricationBalconyInput = {
  id: number;
  drop: string | number;
  balconyNo: string;
  design?: string | null;
  toprail?: string | null;
  infill?: string | null;
  postsArray: unknown;
  foundationArray: unknown;
};

export type FabricationJobDefaults = {
  design_default?: string | null;
  toprail_default?: string | null;
  infill_default?: string | null;
};

export type FabricationBase = {
  jobNumber: string;
  jobStage: number;

  clientName: string;
  siteAddressLine1: string;
  siteAddressLine2?: string;

  colourName?: string;
  colourHex?: number;

  dateString: string;
};

type AggregatedRow = {
  key: string;

  dropLevel?: string; // table "Drop Level" (Balcony name)
  no?: number; // table "No." (post_id) — KEEP numeric for sorting

  // Option 1: keep "no" numeric, expose "noList" for display ("1, 2, 3")
  noList?: number[];

  partName: string;
  drilling?: string;

  length?: number;
  height?: number;
  thickness?: number;
  glassType?: string;
  colour?: string;

  hml?: number;
  hmr?: number;
  vml?: number;
  vmr?: number;

  qty: number;
};

function keyFor(item: {
  dropLevel?: string;
  no?: number;
  partName?: string;
  drilling?: string;
  length?: number;
  height?: number;
  thickness?: number;
  glassType?: string;
  colour?: string;
  hml?: number;
  hmr?: number;
  vml?: number;
  vmr?: number;
}) {
  return [
    item.dropLevel ?? "",
    item.no ?? "",
    item.partName ?? "",
    item.drilling ?? "",
    item.length ?? "",
    item.height ?? "",
    item.thickness ?? "",
    item.glassType ?? "",
    item.colour ?? "",
    item.hml ?? "",
    item.hmr ?? "",
    item.vml ?? "",
    item.vmr ?? "",
  ].join("|");
}

// Same key as above, but EXCLUDES "no" so we can merge multiple No’s into noList
function keyForWithoutNo(item: {
  dropLevel?: string;
  partName?: string;
  drilling?: string;
  length?: number;
  height?: number;
  thickness?: number;
  glassType?: string;
  colour?: string;
  hml?: number;
  hmr?: number;
  vml?: number;
  vmr?: number;
}) {
  return [
    item.dropLevel ?? "",
    item.partName ?? "",
    item.drilling ?? "",
    item.length ?? "",
    item.height ?? "",
    item.thickness ?? "",
    item.glassType ?? "",
    item.colour ?? "",
    item.hml ?? "",
    item.hmr ?? "",
    item.vml ?? "",
    item.vmr ?? "",
  ].join("|");
}

function addAgg(map: Map<string, AggregatedRow>, row: Omit<AggregatedRow, "qty" | "key" | "noList">, qty: number) {
  const key = keyFor(row);
  const existing = map.get(key);
  if (existing) existing.qty += qty;
  else map.set(key, { key, ...row, qty });
}

function isFilteredName(name?: string) {
  return name === "No Post" || name === "No BP";
}

const DEFAULT_ANGLE = 90;

function pickPostId(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function fmt0(n: number) {
  const r = Math.round(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(0);
}

function fmt1(n: number) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function toDrillingString(item: any): string | undefined {
  // 1) If your parts already provide a preformatted string, use it (rails/vertical etc)
  if (typeof item?.drilling === "string" && item.drilling.trim()) {
    return item.drilling.trim();
  }

  const drillingObj =
    item?.drilling && typeof item.drilling === "object" ? item.drilling : undefined;

  const chunks: string[] = [];

  // convert absolute positions -> from-top _ hole-to-hole _ ...
  const toSpacing = (vals: any[]) => {
    const nums = vals
      .map((n) => Number(n))
      .filter(Number.isFinite)
      .map((n) => Math.round(n * 10) / 10)
      .sort((a, b) => a - b);

    if (!nums.length) return "";

    const out: number[] = [nums[0]];
    for (let i = 1; i < nums.length; i++) out.push(nums[i] - nums[i - 1]);

    return out.map(fmt0).join(" _ ");
  };

  // ---------- Normal faces P1..P4 ----------
  for (const key of ["P1", "P2", "P3", "P4", "p1", "p2", "p3", "p4"]) {
    const label = key.toUpperCase();

    const v =
      drillingObj?.[key] ??
      drillingObj?.[label] ??
      item?.[key] ??
      item?.[label];

    if (Array.isArray(v)) {
      const s = toSpacing(v);
      if (s) chunks.push(`${label}: ${s}`);
    } else if (v && typeof v === "object") {
      const a = Number((v as any).a ?? (v as any).start ?? (v as any).x1);
      const b = Number((v as any).b ?? (v as any).end ?? (v as any).x2);

      if (Number.isFinite(a) && Number.isFinite(b)) {
        const s = toSpacing([a, b]);
        if (s) chunks.push(`${label}: ${s}`);
      }
    } else if (Number.isFinite(Number(v))) {
      const n = Math.round(Number(v) * 10) / 10;
      chunks.push(`${label}: ${fmt0(n)}`);
    }
  }

  // ---------- Special drilling: SF / WF ----------
  const special = drillingObj?.special;
  if (special && typeof special === "object") {
    for (const tag of ["SF", "WF"] as const) {
      const tagVal = (special as any)[tag];
      if (!tagVal) continue;

      // OLD SHAPE: special.SF = number[]
      if (Array.isArray(tagVal)) {
        const s = toSpacing(tagVal);
        if (s) chunks.push(`P? ${tag}: ${s}`);
        continue;
      }

      // NEW SHAPE: special.SF.P3 = number[]
      if (typeof tagVal === "object") {
        for (const face of ["P1", "P2", "P3", "P4"] as const) {
          const v = tagVal?.[face];

          if (Array.isArray(v)) {
            const s = toSpacing(v);
            if (s) chunks.push(`${face} ${tag}: ${s}`);
          } else if (Number.isFinite(Number(v))) {
            const n = Math.round(Number(v) * 10) / 10;
            chunks.push(`${face} ${tag}: ${fmt0(n)}`);
          }
        }
      }
    }
  }

  const unique = Array.from(new Set(chunks));
  return unique.length ? unique.join(" ") : undefined;
}




/**
 * Post-process merge:
 * - group rows that match on all keys EXCEPT "no"
 * - produce noList: [1,2,3]
 * - sum qty
 * - keep numeric "no" = smallest for stable sorting
 */
function mergeCutlistByNo(sortedCut: AggregatedRow[], dropOrder: Map<string, number>) {
  type Merged = AggregatedRow & { noList: number[] };

  const map = new Map<string, Merged>();

  for (const r of sortedCut) {
    const k = keyForWithoutNo(r);

    const noVal = typeof r.no === "number" && Number.isFinite(r.no) ? r.no : undefined;

    const ex = map.get(k);
    if (ex) {
      ex.qty += r.qty;
      if (typeof noVal === "number" && !ex.noList.includes(noVal)) ex.noList.push(noVal);
    } else {
      map.set(k, {
        ...r,
        noList: typeof noVal === "number" ? [noVal] : [],
      });
    }
  }

  const out = [...map.values()].map((r) => {
    r.noList.sort((a, b) => a - b);
    // keep numeric "no" as smallest for sorting compatibility
    if (r.noList.length) r.no = r.noList[0];
    return r;
  });

  // Keep your existing sort shape
  out.sort((a, b) => {
    const c = a.partName.localeCompare(b.partName);
    if (c) return c;

    const ao = dropOrder.get(a.dropLevel ?? "") ?? Number.MAX_SAFE_INTEGER;
    const bo = dropOrder.get(b.dropLevel ?? "") ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;

    const an = a.no ?? Number.MAX_SAFE_INTEGER;
    const bn = b.no ?? Number.MAX_SAFE_INTEGER;
    if (an !== bn) return an - bn;

    const al = a.length ?? a.height ?? 0;
    const bl = b.length ?? b.height ?? 0;
    if (al !== bl) return al - bl;

    return (a.drilling ?? "").localeCompare(b.drilling ?? "");
  });

  return out;
}

export function useFabricationAggregation(balconies: FabricationBalconyInput[], jobDefaults: FabricationJobDefaults, base: FabricationBase) {
  const [ready, setReady] = useState(false);

  const [agg, setAgg] = useState(() => ({
    cutlist: [] as AggregatedRow[],
    powdercoat: [] as AggregatedRow[],
    glass: [] as AggregatedRow[],
    components: [] as AggregatedRow[],
  }));

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setReady(false);

      const cutMap = new Map<string, AggregatedRow>();
      const powderMap = new Map<string, AggregatedRow>();
      const glassMap = new Map<string, AggregatedRow>();
      const compMap = new Map<string, AggregatedRow>();

      // ✅ Drop sorting must be by balcony sequence (array order), not alphabetic
      const dropOrder = new Map<string, number>();
      balconies.forEach((b, idx) => dropOrder.set(String(b.balconyNo), idx));
      const idCounters = { toprailId: 1, toprailVectorId: 1 };

      for (const b of balconies) {
        const design = b.design ?? jobDefaults.design_default ?? "RD-D1";

        const postsRaw = normalisePostsArray(b.postsArray);
        const postsDerived = computeGeometryPosts(postsRaw);
        const partslist = DropToPartslist([...postsDerived], design, b.infill ?? "", b.toprail ?? "Elite", idCounters);

        // ✅ "Drop Level corresponds to Balcony name"
        const dropLevel = String(b.balconyNo);

        // ---- CUT LIST (length-based items) ----
        for (const t of partslist.toprail_partslist ?? []) {
          if (!isFilteredName(t.partName)) {
            addAgg(
              cutMap,
              {
                dropLevel,
                no: t.id,
                partName: t.partName,
                length: Math.round(t.length),
                drilling: toDrillingString(t),
                hml: t.lhc,
                hmr: t.rhc,
                vml: t.lvc,
                vmr: t.rvc,
              },
              1
            );
          }
        }

        for (const m of partslist.midrail_partslist ?? []) {
          if (!isFilteredName(m.partName)) {
            addAgg(
              cutMap,
              {
                dropLevel,
                no: pickPostId(m.post_id),
                partName: m.partName,
                length: Math.round(m.length),
                drilling: toDrillingString(m),
                hml: m.lhc,
                hmr: m.rhc,
                vml: m.lvc,
                vmr: m.rvc,
              },
              1
            );
          }
        }

        for (const v of partslist.vertical_infill_partslist ?? []) {
          if (!isFilteredName(v.partName)) {
            addAgg(
              cutMap,
              {
                dropLevel,
                no: pickPostId(v.post_id),
                partName: v.partName,
                length: Math.round(v.length),
                drilling: toDrillingString(v),
                hml: DEFAULT_ANGLE,
                hmr: DEFAULT_ANGLE,
                vml: DEFAULT_ANGLE,
                vmr: DEFAULT_ANGLE,
              },
              1
            );
          }
        }

        for (const p of partslist.post_partslist ?? []) {
          const postNo = pickPostId((p as any).post_id);

          if (typeof (p as any).height === "number" && (p as any).height > 0) {
            if (!isFilteredName(p.partName)) {
              addAgg(
                cutMap,
                {
                  dropLevel,
                  no: postNo,
                  partName: (p as any).partName ?? "Post",
                  height: Math.round((p as any).height),
                  drilling: toDrillingString(p),
                  hml: DEFAULT_ANGLE,
                  hmr: DEFAULT_ANGLE,
                  vml: DEFAULT_ANGLE,
                  vmr: DEFAULT_ANGLE,
                },
                1
              );
            }
          }
        }

        // ---- POWDERCOAT ----
        for (const t of partslist.toprail_partslist ?? []) {
          if (!isFilteredName(t.partName)) {
            addAgg(
              powderMap,
              {
                dropLevel,
                partName: t.partName,
                length: Math.round(t.length),
                colour: base.colourName,
              },
              1
            );
          }
        }

        for (const m of partslist.midrail_partslist ?? []) {
          if (!isFilteredName(m.partName)) {
            addAgg(
              powderMap,
              {
                dropLevel,
                no: pickPostId(m.post_id),
                partName: m.partName,
                length: Math.round(m.length),
                colour: base.colourName,
              },
              1
            );
          }
        }

        for (const v of partslist.vertical_infill_partslist ?? []) {
          if (!isFilteredName(v.partName)) {
            addAgg(
              powderMap,
              {
                dropLevel,
                no: pickPostId(v.post_id),
                partName: v.partName,
                length: Math.round(v.length),
                colour: base.colourName,
              },
              1
            );
          }
        }

        for (const p of partslist.post_partslist ?? []) {
          if (!isFilteredName(p.partName)) {
            addAgg(
              powderMap,
              {
                dropLevel,
                no: pickPostId(p.id),
                partName: p.partName ?? "Post",
                length: typeof p.height === "number" ? Math.round(p.height) : undefined,
                colour: base.colourName,
              },
              1
            );
          }
        }

        // ---- GLASS ----
        for (const g of partslist.glass_infill_partslist ?? []) {
          addAgg(
            glassMap,
            {
              dropLevel,
              no: pickPostId((g as any).post_id),
              partName: (g as any).partName ?? "Glass",
              glassType: (g as any).glassType ?? "",
              length: Math.round((g as any).length),
              height: Math.round((g as any).height),
              thickness: Math.round((g as any).thickness),
            },
            1
          );
        }

        // ---- COMPONENTS ----
        for (const bp of partslist.baseplate_partslist ?? []) {
          const name = typeof bp.partName === "string" ? bp.partName.trim() : "";
          if (!isFilteredName(bp.partName)) {
            addAgg(
              powderMap,
              {
                dropLevel,
                no: pickPostId(bp.id),
                partName: name || "Baseplate",
                colour: base.colourName,
              },
              1
            );
          }
        }

        for (const fc of partslist.fixed_components_partslist ?? []) {
          if (!isFilteredName(fc.partName)) {
            addAgg(compMap, { dropLevel, no: pickPostId((fc as any).post_id), partName: (fc as any).partName ?? "Component" }, 1);
          }
        }
      }

      // ✅ Sorting: Component -> Drop level (balcony sequence) -> No.
      const sortedCut = [...cutMap.values()].sort((a, b) => {
        const c = a.partName.localeCompare(b.partName);
        if (c) return c;

        const ao = dropOrder.get(a.dropLevel ?? "") ?? Number.MAX_SAFE_INTEGER;
        const bo = dropOrder.get(b.dropLevel ?? "") ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;

        const an = a.no ?? Number.MAX_SAFE_INTEGER;
        const bn = b.no ?? Number.MAX_SAFE_INTEGER;
        if (an !== bn) return an - bn;

        const al = a.length ?? a.height ?? 0;
        const bl = b.length ?? b.height ?? 0;
        if (al !== bl) return al - bl;

        return (a.drilling ?? "").localeCompare(b.drilling ?? "");
      });

      // ✅ NEW: merge rows that only differ by "No" into { noList: [1,2,3], qty: sum }
      const mergedCut = mergeCutlistByNo(sortedCut, dropOrder);

      const next = {
        cutlist: mergedCut,
        powdercoat: [...powderMap.values()].sort((a, b) => a.partName.localeCompare(b.partName) || (a.length ?? 0) - (b.length ?? 0)),
        glass: [...glassMap.values()].sort((a, b) => a.partName.localeCompare(b.partName) || (a.thickness ?? 0) - (b.thickness ?? 0)),
        components: [...compMap.values()].sort((a, b) => a.partName.localeCompare(b.partName)),
      };

      if (!cancelled) {
        setAgg(next);
        setReady(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [balconies, jobDefaults, base.colourName]);

  return { ready, agg };
}
