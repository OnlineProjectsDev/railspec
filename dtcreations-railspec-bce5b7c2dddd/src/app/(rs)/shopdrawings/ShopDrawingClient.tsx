// /app/(rs)shopdrawings/ShopDrawingClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { A3Canvas } from "@/app/(rs)/shopdrawings/A3Canvas";
import type { A3CanvasProps, XYOffset, PanelLabel } from "@/app/(rs)/shopdrawings/A3Canvas";
import { distToPointXYZ } from "@/app/(rs)/shopdrawings/A3Canvas";

import { DropToPartslist } from "@/app/(rs)/shopdrawings/DropsToPartslist";
import { buildGlobalPanelLabelIndex } from "@/app/(rs)/shopdrawings/panelLabeling";
import type { PanelLabelRow } from "@/app/(rs)/shopdrawings/panelLabeling";

import {
  normalisePostsArray,
  normaliseFoundationArray,
  computeGeometryPosts,
} from "@/app/(rs)/shopdrawings/shopdrawingGeometry";


type BalconyForSheets = {
  id: number;
  drop: string;
  balconyNo: string;
  design?: string | null;
  toprail?: string | null;
  infill?: string | null;
  postsArray?: unknown;
  foundationArray?: unknown;
};

type ShopDrawingClientProps = {
  a3Base: Omit<
    A3CanvasProps,
    | "dropName"
    | "balconyNo"
    | "dropDesign"
    | "infillType"
    | "sheetRef"
    | "postsArray"
    | "postsDataArray"
    | "baseplatesDataArray"
    | "verticalInfillDataArray"
    | "glassInfillDataArray"
    | "midRailDataArray"
    | "topRailDataArray"
    | "fixedComponentsDataArray"
    | "postsVectorsArray"
    | "infillVectorsArray"
    | "toprailVectorsArray"
    | "sectionsArray"
    | "foundationArray"
  >;

  balconies: BalconyForSheets[];

  jobDefaults: {
    design_default?: string | null;
    toprail_default?: string | null;
    infill_default?: string | null;
  };
};

function incrementCharAscii(label: string): string {
  if (!label || label.length === 0) return "A";
  const code = label.charCodeAt(0);
  return String.fromCharCode(code + 1);
}

export function ShopDrawingClient({ a3Base, balconies, jobDefaults }: ShopDrawingClientProps) {
  const computed = useMemo(() => {
    // NOTE: do NOT keep this in useMemo([]) and reuse/mutate across renders
    // We want a deterministic single pass based on current balconies input.
    const counters = { toprailId: 1, toprailVectorId: 1 };

    const perBalcony = balconies.map((b) => {
      const design = b.design ?? jobDefaults.design_default ?? "RD-D1";
      const infillType = b.infill ?? jobDefaults.infill_default ?? "";

      const postsRaw = normalisePostsArray(b.postsArray);
      const foundationRaw = normaliseFoundationArray(b.foundationArray);
      const postsDerived = computeGeometryPosts(postsRaw);
      // console.log("derived: ",postsDerived)

      const partslist = DropToPartslist([...postsDerived], design, infillType, b.toprail ?? jobDefaults.toprail_default ?? "Elite", counters);

      // If DropToPartslist returns next counters, update them for the next balcony.
      // (If it mutates the counters object internally, this is harmless.)
      const anyParts = partslist as any;
      if (typeof anyParts?.nextToprailId === "number") counters.toprailId = anyParts.nextToprailId;
      if (typeof anyParts?.nextToprailVectorId === "number") counters.toprailVectorId = anyParts.nextToprailVectorId;

      // Apply the same mappings ShopDrawingSheet currently does (so labels/descriptions match)
      const postsDataArray =
        partslist.post_partslist.length && partslist.post_vectors.length && partslist.post_partslist.length === partslist.post_vectors.length
          ? partslist.post_partslist
          : [];

      const postsVectorsArray =
        partslist.post_partslist.length && partslist.post_vectors.length && partslist.post_partslist.length === partslist.post_vectors.length
          ? partslist.post_vectors
          : [];

      const baseplatesDataArray = (partslist.baseplate_partslist ?? []).map((p: any) => ({ ...p, type: p.partName }));
      const fixedComponentsDataArray = (partslist.fixed_components_partslist ?? []).map((p: any) => ({ ...p, type: p.partName }));

      const infillVectorsArray = partslist.infill_vectors?.length ? partslist.infill_vectors : [];

      const midRailDataArray =
        partslist.midrail_partslist?.length && partslist.infill_vectors?.length
          ? partslist.midrail_partslist.map((r: any) => ({ ...r, length: r.partName === "65x16 Slat" ? r.length : r.length}))
          : [];

      const verticalInfillDataArray =
        partslist.vertical_infill_partslist?.length && partslist.infill_vectors?.length
          ? partslist.vertical_infill_partslist.map((v: any) => ({ ...v, length: v.length}))
          : [];

      const glassInfillDataArray =
        partslist.glass_infill_partslist?.length && partslist.infill_vectors?.length ? partslist.glass_infill_partslist : [];

      const topRailDataArray =
        partslist.toprail_vectorslist?.length && partslist.toprail_partslist?.length
          ? partslist.toprail_partslist.map((t: any) => ({ ...t, length: t.length}))
          : [];

      const toprailVectorsArray =
        partslist.toprail_vectorslist?.length && partslist.toprail_partslist?.length ? partslist.toprail_vectorslist : [];

      // per balcony scale/plotOffset (unchanged logic, just moved here)
      let scale = 20;

      const minX = Math.min(...postsDerived.map((p: any) => p.x));
      const maxX = Math.max(...postsDerived.map((p: any) => p.x));
      const minZ = Math.min(...postsDerived.map((p: any) => p.z));
      const maxZ = Math.max(...postsDerived.map((p: any) => p.z));

      const box = { x: Math.abs(maxX - minX), z: Math.abs(maxZ - minZ) };

      while (box.x / scale > 152 * 4 || box.z / scale > 116 * 4) scale += 2;

      const MIN_SCALE = 2;
      const minTarget = 108 * 4;
      while (scale > MIN_SCALE && Math.max(box.x, box.z) / scale < minTarget) scale -= 2;
      scale = Math.max(scale, MIN_SCALE);

      const midX = (minX + maxX) / 2;
      const midZ = (minZ + maxZ) / 2;
      const plotOffset: XYOffset = { x: -midX, y: -midZ };

      // per balcony camera (unchanged logic, just moved here)
      const bounds3D = computeBoundsFromContributors(partslist.post_partslist, partslist.toprail_partslist);
      const cameraSettings = fitCameraToBounds(bounds3D, a3Base.cameraSettings?.fov ?? 75, {
        padding: 1.35,
        viewDir: { x: -1, y: 0.35, z: 1 },
        minDistance: 200,
      });

      return {
        balcony: b,
        design,
        infillType,
        postsDerived,
        foundationRaw,

        // arrays A3Canvas consumes today
        postsDataArray,
        baseplatesDataArray,
        verticalInfillDataArray,
        glassInfillDataArray,
        midRailDataArray,
        topRailDataArray,
        fixedComponentsDataArray,
        postsVectorsArray,
        infillVectorsArray,
        toprailVectorsArray,
        sectionsArray: [],

        // view config
        scale,
        plotOffset,
        cameraSettings,

        // for labeling
        partslist,
      };
    });

    // Build global label index ONCE across all balconies (Option B inside helper)
    const labelIndex = buildGlobalPanelLabelIndex(
      perBalcony.map((x) => ({
        balconyId: x.balcony.id,
        dropDesign: x.design,
        infill_vectors: x.partslist.infill_vectors,
        post_partslist: x.partslist.post_partslist,
        glass_infill_partslist: x.partslist.glass_infill_partslist,
        vertical_infill_partslist: x.partslist.vertical_infill_partslist,
        midrail_partslist: x.partslist.midrail_partslist,
        normalizeLengths: true,
      }))
    );

    return { perBalcony, labelIndex };
  }, [balconies, jobDefaults, a3Base.cameraSettings?.fov]);

  return (
    <div className="shopdrawing-pages flex flex-col gap-8">
      {computed.perBalcony.map((x, idx) => (
        <section key={x.balcony.id} id={`balcony-${x.balcony.id}`} className="print-page">
          <ShopDrawingSheet
            a3Base={a3Base}
            balcony={x.balcony}
            sheetRef={`${idx + 1} of ${computed.perBalcony.length}`}
            design={x.design}
            infillType={x.infillType}
            postsDerived={x.postsDerived}
            foundationRaw={x.foundationRaw}
            cameraSettings={x.cameraSettings}
            maxScale={x.scale}
            plotOffset={x.plotOffset}
            postsDataArray={x.postsDataArray}
            baseplatesDataArray={x.baseplatesDataArray}
            verticalInfillDataArray={x.verticalInfillDataArray}
            glassInfillDataArray={x.glassInfillDataArray}
            midRailDataArray={x.midRailDataArray}
            topRailDataArray={x.topRailDataArray}
            fixedComponentsDataArray={x.fixedComponentsDataArray}
            postsVectorsArray={x.postsVectorsArray}
            infillVectorsArray={x.infillVectorsArray}
            toprailVectorsArray={x.toprailVectorsArray}
            sectionsArray={x.sectionsArray}
            // NEW: panel labeling props
            panelLabelRows={computed.labelIndex.rowsByBalconyId.get(x.balcony.id) ?? []}
            globalKeyToLabel={computed.labelIndex.globalKeyToLabel}
          />
        </section>
      ))}
    </div>
  );
}

function ShopDrawingSheet({
  a3Base,
  balcony,
  sheetRef,

  design,
  infillType,
  postsDerived,
  foundationRaw,

  cameraSettings,
  maxScale,
  plotOffset,

  postsDataArray,
  baseplatesDataArray,
  verticalInfillDataArray,
  glassInfillDataArray,
  midRailDataArray,
  topRailDataArray,
  fixedComponentsDataArray,
  postsVectorsArray,
  infillVectorsArray,
  toprailVectorsArray,
  sectionsArray,

  // NEW
  panelLabelRows,
  globalKeyToLabel,
}: {
  a3Base: ShopDrawingClientProps["a3Base"];
  balcony: BalconyForSheets;
  sheetRef: string;

  design: string;
  infillType: string;
  postsDerived: any[];
  foundationRaw: any[];

  cameraSettings: any;
  maxScale: number;
  plotOffset: XYOffset;

  postsDataArray: any[];
  baseplatesDataArray: any[];
  verticalInfillDataArray: any[];
  glassInfillDataArray: any[];
  midRailDataArray: any[];
  topRailDataArray: any[];
  fixedComponentsDataArray: any[];
  postsVectorsArray: any[];
  infillVectorsArray: any[];
  toprailVectorsArray: any[];
  sectionsArray: any[];

  panelLabelRows: PanelLabelRow[];
  globalKeyToLabel: Map<string, string>;
}) {
  const dropName = `Drop ${balcony.drop}`;
  const dropDesign = design;

  return (
    <A3Canvas
      {...a3Base}
      sheetRef={sheetRef}
      dropName={dropName}
      balconyNo={balcony.balconyNo}
      dropDesign={dropDesign}
      infillType={infillType}
      cameraSettings={cameraSettings}
      scale={maxScale}
      plotOffset={plotOffset}
      postsArray={postsDerived as any}
      foundationArray={foundationRaw as any}
      postsDataArray={postsDataArray}
      baseplatesDataArray={baseplatesDataArray}
      verticalInfillDataArray={verticalInfillDataArray}
      glassInfillDataArray={glassInfillDataArray}
      midRailDataArray={midRailDataArray}
      topRailDataArray={topRailDataArray}
      fixedComponentsDataArray={fixedComponentsDataArray}
      postsVectorsArray={postsVectorsArray}
      infillVectorsArray={infillVectorsArray}
      toprailVectorsArray={toprailVectorsArray}
      sectionsArray={sectionsArray}
      // NEW: pass down for A3Canvas to use (A3Canvas will need prop support)
      panelLabelRows={panelLabelRows}
      globalKeyToLabel={globalKeyToLabel}
    />
  );
}



type CameraSettings = {
  x: number; y: number; z: number;
  o_x: number; o_y: number; o_z: number;
  fov: number;
};

type Bounds = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

function makeEmptyBounds(): Bounds {
  return {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
}

function expandBounds(b: Bounds, x: number, y: number, z: number) {
  if (x < b.min.x) b.min.x = x;
  if (y < b.min.y) b.min.y = y;
  if (z < b.min.z) b.min.z = z;
  if (x > b.max.x) b.max.x = x;
  if (y > b.max.y) b.max.y = y;
  if (z > b.max.z) b.max.z = z;
}

function expandBoundsByExtents(b: Bounds, cx: number, cy: number, cz: number, ex: number, ey: number, ez: number) {
  expandBounds(b, cx - ex, cy - ey, cz - ez);
  expandBounds(b, cx + ex, cy + ey, cz + ez);
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

// Uses the same “cheap extents” idea you had: posts are columns, rails are oriented sticks.
function computeBoundsFromContributors(
  posts: any[],
  toprails: any[]
): Bounds {
  const b = makeEmptyBounds();

  const postRadiusXZ = 30;
  const railHalfHeight = 30;
  const railHalfWidth = 30;
  const minSize = 1;

  for (const p of posts ?? []) {
    const y0 = p.y ?? 0;
    const y1 = (p.y ?? 0) + (p.height ?? 0);
    const cy = (y0 + y1) / 2;
    const ey = Math.max(minSize, Math.abs(y1 - y0) / 2);
    expandBoundsByExtents(b, p.x ?? 0, cy, p.z ?? 0, postRadiusXZ, ey, postRadiusXZ);
  }

  for (const r of toprails ?? []) {
    const halfLen = Math.max(minSize, (r.length ?? 0) / 2);
    const rad = degToRad(r.o ?? 0);
    const hx = Math.abs(Math.cos(rad)) * halfLen + railHalfWidth;
    const hz = Math.abs(Math.sin(rad)) * halfLen + railHalfWidth;
    expandBoundsByExtents(b, r.x ?? 0, r.y ?? 0, r.z ?? 0, hx, railHalfHeight, hz);
  }

  if (!Number.isFinite(b.min.x)) {
    return { min: { x: -500, y: -500, z: -500 }, max: { x: 500, y: 500, z: 500 } };
  }

  return b;
}

function fitCameraToBounds(
  bounds: Bounds,
  fovDeg: number,
  opts?: { padding?: number; viewDir?: { x: number; y: number; z: number }; minDistance?: number; }
): CameraSettings {
  const padding = opts?.padding ?? 1.35;
  const viewDir = opts?.viewDir ?? { x: -1, y: 0.35, z: 1 }; // 👈 same “left-ish” view you used
  const minDistance = opts?.minDistance ?? 200;

  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const cz = (bounds.min.z + bounds.max.z) / 2;

  const sx = bounds.max.x - bounds.min.x;
  const sy = bounds.max.y - bounds.min.y;
  const sz = bounds.max.z - bounds.min.z;

  const radius = 0.5 * Math.sqrt(sx * sx + sy * sy + sz * sz);

  const fovRad = degToRad(fovDeg);
  const dist = Math.max(minDistance, (radius / Math.tan(fovRad / 2)) * padding);

  const vLen = Math.sqrt(viewDir.x ** 2 + viewDir.y ** 2 + viewDir.z ** 2) || 1;
  const vx = viewDir.x / vLen;
  const vy = viewDir.y / vLen;
  const vz = viewDir.z / vLen;

  return { x: cx + vx * dist, y: cy + vy * dist, z: cz + vz * dist, o_x: cx, o_y: cy, o_z: cz, fov: fovDeg };
}
