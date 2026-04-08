// /src/app/(rs)/shopdrawings/A3Canvas.tsx
"use client";

import React, { FC, useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";

import type { PanelLabelRow } from "@/app/(rs)/shopdrawings/panelLabeling";
import { buildPanelDescription, makePanelKey } from "@/app/(rs)/shopdrawings/panelLabeling";


const ModelViewer = dynamic(
  () => import("@/app/(rs)/drawingtool/Renderer").then((m) => m.ModelViewer),
  { ssr: false }
);

// ------------------------
// Types for props
// ------------------------

export type PanelLabel = {
      length: number;
      label: string;
      quantity: number;
      description: string;
    };

export interface CameraSettings {
  x: number;
  y: number;
  z: number;
  o_x: number;
  o_y: number;
  o_z: number;
  fov: number;
}

export interface LightingSettings {
  ambient_intensity: number;
  ambient_color: number;
  light_intensity: number;
  light_color: number;
  x: number;
  y: number;
  z: number;
}
export type PlaneVec = { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number };

export type InfillVectorType = {
  id: number;
  left: PlaneVec;
  right: PlaneVec;
  top: PlaneVec;
  bottom: PlaneVec;
};

export type ToprailVectorType = {
  id: number;
  left: PlaneVec;
  right: PlaneVec;
};

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface XYOffset {
  x: number;
  y: number;
}

export interface PostsArrayItem {
  id: number;
  length: number;
  angle: number;
  height: number;
  x: number;
  z: number;
  y_ref1: number;
  y_ref2: number;
  y_ref3: number;
  type?: string;
}

export interface FoundationArrayItem {
  id: number;
  length: number;
  angle: number;
  height: number;
  x: number;
  z: number;
  y_ref1: number;
  y_ref2: number;
  y_ref3: number;
  type?: string;
}

export interface PostDataItem {
  post_id: number;
  id: number;
  type: string;
  height: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface BaseplateItem {
  partName: string;
  id: number;
  type: string;
  x: number;
  y: number;
  z: number;
  o: number;
}

export interface VerticalInfillItem {
  partName: string;
  post_id: number;
  id: number;
  length: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface GlassInfillItem {
  partName: string;
  post_id: number;
  id: number;
  height: number;
  length: number;
  thickness: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface MidRailItem {
  partName: string;
  id: number;
  length: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface TopRailItem {
  partName: string;
  id: number;
  length: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface FixedComponentItem {
  partName: string;
  id: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
  v_x: number;
  v_y: number;
  v_z: number;
}

export interface PostVectorItem {
  id: number;
  x: number;
  y: number;
  z: number;
  v_x: number;
  v_y: number;
  v_z: number;
}

export interface InfillVectorItem {
  id: number;
  post_id: number
  left: Vector3Like;
  right: Vector3Like;
  top: Vector3Like;
  bottom: Vector3Like;
}

export interface ToprailVectorItem {
  id: number;
  left: Vector3Like;
  right: Vector3Like;
}

export interface Overhang {
  wallfix: number;
  overhang_length: number;
}

export interface SectionDirection {
  x: number;
  y: number;
  z: number;
  v_x: number;
  v_y: number;
  v_z: number;
  scale?: number;
}

export interface SectionItem {
  id: number;
  direction: SectionDirection[];
}

export interface WallDataItem {
  partName: string;
  id: number;
  length: number;
  x: number;
  y: number;
  z: number;
  o: number;
  t: number;
}

export interface PowdercoatColor {
  name: string;
  hex: number;
}

export interface A3CanvasProps {
  dpi?: number;
  scale?: number;

  clientName: string;

  // client address (from customers table)
  clientAddress1: string;
  clientAddress2: string;
  clientCity: string;
  clientState: string;
  clientZip: string;

  jobNumber: string; // formatted e.g. "1234"
  dropName: string; // e.g. "Drop A"
  balconyNo: string; // balconies.balconyNo (varchar)
  dropDesign: string;
  dropColour: PowdercoatColor;
  dropColourHex: number;
  infillType: string;
  sheetRef: string;
  dateString: string;

  // job site details (install address)
  jobAddress1: string;
  jobAddress2: string;
  jobCity: string;
  jobState: string;
  jobZip: string;
  jobStage: number;

  cameraSettings: CameraSettings;
  lighting: LightingSettings;

  plotOffset?: XYOffset;
  maxSpacing: number;

  postsArray: PostsArrayItem[];
  foundationArray: FoundationArrayItem[];
  postsDataArray: PostDataItem[];
  baseplatesDataArray: BaseplateItem[];
  verticalInfillDataArray: VerticalInfillItem[];
  glassInfillDataArray: GlassInfillItem[];
  midRailDataArray: MidRailItem[];
  topRailDataArray: TopRailItem[];
  fixedComponentsDataArray: FixedComponentItem[];
  postsVectorsArray: PostVectorItem[];
  infillVectorsArray: InfillVectorItem[];
  toprailVectorsArray: ToprailVectorItem[];
  sectionsArray: SectionItem[];
  wallDataArray: WallDataItem[];
  panelLabelRows?: PanelLabelRow[];
globalKeyToLabel?: Map<string, string>;
}


// ------------------------
// Top rail utility (Option 1, in-file)
// ------------------------

interface TopRailProfile {
  /** Offset from centreline in mm (half the rail thickness). */
  offset: number;
  /** Rail height in mm (plan: currently fixed, to be customised later). */
  height: number;
}

const DEFAULT_TOPRAIL_HEIGHT = 31;

function getTopRailProfile(partName: string): TopRailProfile {
  // thickness is defined as half the real rail thickness (centreline → outer surface)
  let thickness = 0;

  switch (partName) {
    case "Elite Toprail":
      thickness = 55 / 2;
      break;
    case "Slenderline Toprail":
      thickness = 68 / 2;
      break;
    case "Visage Toprail":
      thickness = 98 / 2;
      break;
    case "Oval Toprail":
      thickness = 80 / 2;
      break;
    case "Round Toprail":
      thickness = 60 / 2;
      break;
    case "25mm Square Toprail":
      thickness = 25 / 2;
      break;
    case "25mm Round Toprail":
      thickness = 25 / 2;
      break;
    case "38mm Round Toprail":
      thickness = 38 / 2;
      break;
    case "42mm Round Toprail":
      thickness = 42 / 2;
      break;
    default:
      // Unknown profile – leave thickness at 0, still provide a height
      break;
  }

  return {
    offset: thickness,
    height: DEFAULT_TOPRAIL_HEIGHT,
  };
}

// ------------------------
// Component
// ------------------------

export const A3Canvas: FC<A3CanvasProps> = ({
  dpi = 300,
  scale = 1,
  clientName,

  clientAddress1,
  clientAddress2,
  clientCity,
  clientState,
  clientZip,

  jobNumber,
  dropName,
  balconyNo,
  dropDesign,
  dropColour,
  dropColourHex,
  infillType,
  sheetRef,
  dateString,

  jobAddress1,
  jobAddress2,
  jobCity,
  jobState,
  jobZip,
  jobStage,

  cameraSettings,
  lighting,
  plotOffset,
  maxSpacing,
  postsArray,
  foundationArray,
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
  wallDataArray,
  panelLabelRows,
  globalKeyToLabel,
}) => {
  const DPI = dpi;

  const posts3d = (postsDataArray as any[]).map((p) => ({
    partName: p.partName ?? "PST-001",
    ...p,
  }));

  const midRails3d = (midRailDataArray as any[]).map((r) => ({
    post_id: r.post_id ?? r.id, // fallback (only for typing; DropToPartslist usually provides post_id)
    ...r,
  }));

  const wallHeightFromName = (name?: string) => {
    const m = (name ?? "").match(/(\d+)\s*mm/i);
    return m ? Number(m[1]) : 0;
  };

  const walls3d = (wallDataArray as any[]).map((w) => ({
    height: w.height ?? wallHeightFromName(w.partName),
    ...w,
  }));

  

  // -----------------------------------------------------
  // A3 size in pixels at given DPI
  // -----------------------------------------------------
  const widthInPixels = (420 / 25.4) * DPI;
  const heightInPixels = (297 / 25.4) * DPI;

  // -----------------------------------------------------
  // Visual scale factor (not affecting drawing resolution)
  // -----------------------------------------------------
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const before = () => setIsPrinting(true);
    const after = () => setIsPrinting(false);

    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const displayScale = isPrinting ? 1 : 0.238;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef3 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef4 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef5 = useRef<HTMLCanvasElement | null>(null);

  type Layer = 1 | 2 | 3 | 4 | 5;

  function setContext(layer: Layer = 1): React.RefObject<HTMLCanvasElement | null> {
    switch (layer) {
      case 1:
        return canvasRef;
      case 2:
        return canvasRef2;
      case 3:
        return canvasRef3;
      case 4:
        return canvasRef4;
      case 5:
        return canvasRef5;
      default:
        return canvasRef; // fail-safe
    }
  }

  function addLine(
    x: number,
    y: number,
    x2: number,
    y2: number,
    _o: number = 0,
    color: string = "black",
    layer: Layer = 1
  ) {
    const canvas = setContext(layer).current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function addText(
    x: number,
    y: number,
    alignment: CanvasTextAlign,
    font: string,
    o: number,
    color: string,
    label: string,
    offset: { x: number; y: number } = { x: 0, y: 0 },
    layer: Layer = 1
  ) {
    const canvas = setContext(layer).current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = alignment;
    ctx.font = font;
    ctx.translate(x, y);
    ctx.rotate(-(o * Math.PI) / 180);
    ctx.translate(offset.x, offset.y);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  // Small local helper for normalization (plan-only, no THREE dependency)
function normalizeVec3(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (!len) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// 1) Dashed line ----------------------------------------------------

function adddottedLine(
  x: number = 0,
  y: number = 0,
  x2: number = 0,
  y2: number = 0,
  _o: number = 0,
  color: string = "black",
  layer: Layer = 1
) {
  const canvas = setContext(layer).current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.setLineDash([4, 16]);
  ctx.strokeStyle = color;
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// 2) Trapezium (generic 4-corner shape in plan) ---------------------

function addTrapezium(
  corner1: { x: number; y: number; z: number },
  corner2: { x: number; y: number; z: number },
  corner3: { x: number; y: number; z: number },
  corner4: { x: number; y: number; z: number },
  center: { x: number; y: number },
  color: string = "black",
  layer: Layer = 1
) {
  const canvas = setContext(layer).current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y);
  ctx.lineTo((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y);
  ctx.lineTo((corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y);
  ctx.lineTo((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 3) Hob slab (simple hob) -----------------------------------------

function addHob(
  rail: { x: number; y: number; z: number; o: number },
  railVector: { left: { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number }; right: { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number } },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const left = railVector.left;
  const right = railVector.right;

  const leftVec = normalizeVec3({ x: left.v_x, y: left.v_y, z: left.v_z });
  const rightVec = normalizeVec3({ x: right.v_x, y: right.v_y, z: right.v_z });
  const dir = normalizeVec3({ x: left.x - right.x, y: left.y - right.y, z: left.z - right.z });

  const thickness = 150 / 2;

  const corner1 = toPlane(
    { x: rail.x + thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    left,
    leftVec
  );
  const corner2 = toPlane(
    { x: rail.x + thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    right,
    rightVec
  );
  const corner3 = toPlane(
    { x: rail.x - thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z - thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    left,
    leftVec
  );
  const corner4 = toPlane(
    { x: rail.x - thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z - thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    right,
    rightVec
  );

  addTrapezium(corner1, corner2, corner3, corner4, center, "rgba(200, 200, 200, 0.5)", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
}

// 4) Hob + side-fix (inside / outside) -----------------------------

function addHobSF(
  rail: { x: number; y: number; z: number; o: number },
  railVector: { left: { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number }; right: { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number } },
  center: { x: number; y: number },
  inside: boolean = false,
  layer: Layer = 1
) {
  const left = railVector.left;
  const right = railVector.right;

  const leftVec = normalizeVec3({ x: left.v_x, y: left.v_y, z: left.v_z });
  const rightVec = normalizeVec3({ x: right.v_x, y: right.v_y, z: right.v_z });
  const dir = normalizeVec3({ x: left.x - right.x, y: left.y - right.y, z: left.z - right.z });

  const sign = inside ? -1 : 1;
  const thickness = 150 + 45 / 2;

  const corner1 = toPlane(
    { x: rail.x + sign * thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + sign * thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    left,
    leftVec
  );
  const corner2 = toPlane(
    { x: rail.x + sign * thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + sign * thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    right,
    rightVec
  );
  const corner3 = toPlane(
    { x: rail.x + sign * 23 * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + sign * 23 * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    left,
    leftVec
  );
  const corner4 = toPlane(
    { x: rail.x + sign * 23 * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + sign * 23 * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    right,
    rightVec
  );

  addTrapezium(corner1, corner2, corner3, corner4, center, "rgba(200, 200, 200, 0.5)", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "lightgrey", layer);
}

// 5) Top rail body (plan) ------------------------------------------

function addRail(
  rail: { partName: string; x: number; y: number; z: number; o: number },
  railVector: { left: { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number }; right: { x: number; y: number; z: number; v_x: number; v_y: number; v_z: number } },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const left = railVector.left;
  const right = railVector.right;

  const leftVec = normalizeVec3({ x: left.v_x, y: left.v_y, z: left.v_z });
  const rightVec = normalizeVec3({ x: right.v_x, y: right.v_y, z: right.v_z });
  const dir = normalizeVec3({ x: left.x - right.x, y: left.y - right.y, z: left.z - right.z });

  let thickness = 0;

  switch (rail.partName) {
    case "Elite Toprail":
      thickness = 55 / 2;
      break;
    case "Slenderline Toprail":
      thickness = 68 / 2;
      break;
    case "Visage Toprail":
      thickness = 98 / 2;
      break;
    case "Oval Toprail":
      thickness = 80 / 2;
      break;
    case "Round Toprail":
      thickness = 60 / 2;
      break;
    case "25mm Square Toprail":
      thickness = 25 / 2;
      break;
    case "25mm Round Toprail":
      thickness = 25 / 2;
      break;
    case "38mm Round Toprail":
      thickness = 38 / 2;
      break;
    case "42mm Round Toprail":
      thickness = 42 / 2;
      break;
    default:
      thickness = 25 / 2;
      break;
  }

  const corner1 = toPlane(
    { x: rail.x + thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    left,
    leftVec
  );
  const corner2 = toPlane(
    { x: rail.x + thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z + thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    right,
    rightVec
  );
  const corner3 = toPlane(
    { x: rail.x - thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z - thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    left,
    leftVec
  );
  const corner4 = toPlane(
    { x: rail.x - thickness * Math.sin((rail.o * Math.PI) / 180), y: rail.y, z: rail.z - thickness * Math.sin(((90 + rail.o) * Math.PI) / 180) },
    dir,
    right,
    rightVec
  );

  addTrapezium(corner1, corner2, corner3, corner4, center, "lightgrey", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "grey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "grey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "grey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "grey", layer);
}

// 6) Glass panel (plan) ---------------------------------------------

function addGlass(
  glass: { x: number; y: number; z: number; o: number; length: number; thickness: number },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const oRad = (glass.o * Math.PI) / 180;
  const o90Rad = ((90 + glass.o) * Math.PI) / 180;

  const corner1 = {
    x: glass.x + 0.5 * glass.length * Math.sin(oRad) - 0.5 * glass.thickness * Math.sin(o90Rad),
    y: glass.y,
    z: glass.z + 0.5 * glass.length * Math.sin(o90Rad) + 0.5 * glass.thickness * Math.sin(oRad),
  };
  const corner2 = {
    x: glass.x + 0.5 * glass.length * Math.sin(oRad) + 0.5 * glass.thickness * Math.sin(o90Rad),
    y: glass.y,
    z: glass.z + 0.5 * glass.length * Math.sin(o90Rad) - 0.5 * glass.thickness * Math.sin(oRad),
  };
  const corner3 = {
    x: glass.x - 0.5 * glass.length * Math.sin(oRad) - 0.5 * glass.thickness * Math.sin(o90Rad),
    y: glass.y,
    z: glass.z - 0.5 * glass.length * Math.sin(o90Rad) + 0.5 * glass.thickness * Math.sin(oRad),
  };
  const corner4 = {
    x: glass.x - 0.5 * glass.length * Math.sin(oRad) + 0.5 * glass.thickness * Math.sin(o90Rad),
    y: glass.y,
    z: glass.z - 0.5 * glass.length * Math.sin(o90Rad) - 0.5 * glass.thickness * Math.sin(oRad),
  };

  addTrapezium(corner1, corner2, corner3, corner4, center, "cyan", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "cyan", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "cyan", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "cyan", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "cyan", layer);
}

// 7) 19x18 baluster (vertical) --------------------------------------

function addBaluster(
  item: { x: number; y: number; z: number; o: number },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const oRad = (item.o * Math.PI) / 180;
  const o90Rad = ((90 + item.o) * Math.PI) / 180;

  const corner1 = {
    x: item.x + 8.5 * Math.sin(oRad) - 9 * Math.sin(o90Rad),
    y: item.y,
    z: item.z + 8.5 * Math.sin(o90Rad) + 9 * Math.sin(oRad),
  };
  const corner2 = {
    x: item.x + 8.5 * Math.sin(oRad) + 9 * Math.sin(o90Rad),
    y: item.y,
    z: item.z + 8.5 * Math.sin(o90Rad) - 9 * Math.sin(oRad),
  };
  const corner3 = {
    x: item.x - 8.5 * Math.sin(oRad) - 9 * Math.sin(o90Rad),
    y: item.y,
    z: item.z - 8.5 * Math.sin(o90Rad) + 9 * Math.sin(oRad),
  };
  const corner4 = {
    x: item.x - 8.5 * Math.sin(oRad) + 9 * Math.sin(o90Rad),
    y: item.y,
    z: item.z - 8.5 * Math.sin(o90Rad) - 9 * Math.sin(oRad),
  };

  addTrapezium(corner1, corner2, corner3, corner4, center, "grey", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
}

// 8) 65x16 slat (vertical) ------------------------------------------

function addSlat_Vertical(
  item: { x: number; y: number; z: number; o: number },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const oRad = (item.o * Math.PI) / 180;
  const o90Rad = ((90 + item.o) * Math.PI) / 180;

  const corner1 = {
    x: item.x + 32.5 * Math.sin(oRad) - 8 * Math.sin(o90Rad),
    y: item.y,
    z: item.z + 32.5 * Math.sin(o90Rad) + 8 * Math.sin(oRad),
  };
  const corner2 = {
    x: item.x + 32.5 * Math.sin(oRad) + 8 * Math.sin(o90Rad),
    y: item.y,
    z: item.z + 32.5 * Math.sin(o90Rad) - 8 * Math.sin(oRad),
  };
  const corner3 = {
    x: item.x - 32.5 * Math.sin(oRad) - 8 * Math.sin(o90Rad),
    y: item.y,
    z: item.z - 32.5 * Math.sin(o90Rad) + 8 * Math.sin(oRad),
  };
  const corner4 = {
    x: item.x - 32.5 * Math.sin(oRad) + 8 * Math.sin(o90Rad),
    y: item.y,
    z: item.z - 32.5 * Math.sin(o90Rad) - 8 * Math.sin(oRad),
  };

  addTrapezium(corner1, corner2, corner3, corner4, center, "grey", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
}

// 9) Post body (plan square 45x45) ----------------------------------

function addPost(
  bp: { x: number; y: number; z: number; o: number },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const oRad = (bp.o * Math.PI) / 180;
  const o90Rad = ((90 + bp.o) * Math.PI) / 180;

  const half = 22.5;

  const corner1 = {
    x: bp.x + half * Math.sin(oRad) - half * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z + half * Math.sin(o90Rad) + half * Math.sin(oRad),
  };
  const corner2 = {
    x: bp.x + half * Math.sin(oRad) + half * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z + half * Math.sin(o90Rad) - half * Math.sin(oRad),
  };
  const corner3 = {
    x: bp.x - half * Math.sin(oRad) - half * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z - half * Math.sin(o90Rad) + half * Math.sin(oRad),
  };
  const corner4 = {
    x: bp.x - half * Math.sin(oRad) + half * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z - half * Math.sin(o90Rad) - half * Math.sin(oRad),
  };

  addTrapezium(corner1, corner2, corner3, corner4, center, "white", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
}

// 10) Baseplate (plan rectangle ~110x80) ----------------------------

function addBP(
  bp: { x: number; y: number; z: number; o: number },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const oRad = (bp.o * Math.PI) / 180;
  const o90Rad = ((90 + bp.o) * Math.PI) / 180;

  const longHalf = 55;
  const shortHalf = 40;

  const corner1 = {
    x: bp.x + longHalf * Math.sin(oRad) - shortHalf * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z + longHalf * Math.sin(o90Rad) + shortHalf * Math.sin(oRad),
  };
  const corner2 = {
    x: bp.x + longHalf * Math.sin(oRad) + shortHalf * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z + longHalf * Math.sin(o90Rad) - shortHalf * Math.sin(oRad),
  };
  const corner3 = {
    x: bp.x - longHalf * Math.sin(oRad) - shortHalf * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z - longHalf * Math.sin(o90Rad) + shortHalf * Math.sin(oRad),
  };
  const corner4 = {
    x: bp.x - longHalf * Math.sin(oRad) + shortHalf * Math.sin(o90Rad),
    y: bp.y,
    z: bp.z - longHalf * Math.sin(o90Rad) - shortHalf * Math.sin(oRad),
  };

  addTrapezium(corner1, corner2, corner3, corner4, center, "grey", layer);

  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner1.x * (DPI / scale)) / 100 + center.x, (corner1.z * (DPI / scale)) / 100 + center.y, (corner3.x * (DPI / scale)) / 100 + center.x, (corner3.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
  addLine((corner2.x * (DPI / scale)) / 100 + center.x, (corner2.z * (DPI / scale)) / 100 + center.y, (corner4.x * (DPI / scale)) / 100 + center.x, (corner4.z * (DPI / scale)) / 100 + center.y, 0, "darkgrey", layer);
}

// 11) Dress ring circle (CD) ----------------------------------------

function addDR(
  dr: { x: number; y: number; z: number },
  center: { x: number; y: number },
  layer: Layer = 1
) {
  const canvas = setContext(layer).current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cx = (dr.x * (DPI / scale)) / 100 + center.x;
  const cy = (dr.z * (DPI / scale)) / 100 + center.y;
  const radius = (50 * (DPI / scale)) / 100;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "grey";
  ctx.fill();
  ctx.strokeStyle = "darkgrey";
  ctx.stroke();
  ctx.restore();
}

  // -----------------------------------------------------
  // Border + title block + legend
  // -----------------------------------------------------
  function addTemplate(layer: Layer = 1) {
    const canvas = setContext(layer).current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    const offset = (10 / 25.4) * DPI; // 10mm margin
    const lineH = (4 * DPI) / 20; // base line height

    // Outer border
    addLine(offset, offset, width - offset, offset, 0, "black", layer);
    addLine(offset, offset, offset, height - offset, 0, "black", layer);
    addLine(offset, height - offset, width - offset, height - offset, 0, "black", layer);
    addLine(width - offset, offset, width - offset, height - offset, 0, "black", layer);

    // Bottom strip (title block region)
    addLine(offset, height - 5 * offset, width - offset, height - 5 * offset, 0, "black", layer);

    // Left/right border indexing lines (A–E + 1–6)
    const tabOffset = (width - 2 * offset) / 5;
    for (let i = 1; i < 5; i++) {
      addLine(offset + i * tabOffset, height - 5 * offset, offset + i * tabOffset, height - offset, 0, "black", layer);
      addLine(0, (i * height) / 5, offset, (i * height) / 5, 0, "black", layer);
      addLine(width - offset, (i * height) / 5, width, (i * height) / 5, 0, "black", layer);
    }
    for (let i = 1; i < 6; i++) {
      addLine((i * width) / 6, height - offset, (i * width) / 6, height, 0, "black", layer);
      addLine((i * width) / 6, 0, (i * width) / 6, offset, 0, "black", layer);
    }

    // Extra split lines on right part of title block
    addLine(offset + 1.5 * tabOffset, height - 5 * offset, offset + 1.5 * tabOffset, height - offset, 0, "black", layer);
    addLine(offset + 4.0 * tabOffset, height - 2.75 * offset, offset + 5 * tabOffset, height - 2.75 * offset, 0, "black", layer);
    addLine(offset + 4.0 * tabOffset, height - 1.75 * offset, offset + 5 * tabOffset, height - 1.75 * offset, 0, "black", layer);
    addLine(offset + 4.66 * tabOffset, height - 2.75 * offset, offset + 4.66 * tabOffset, height - offset, 0, "black", layer);
    addLine(offset + 4.2 * tabOffset, height - 1.75 * offset, offset + 4.2 * tabOffset, height - offset, 0, "black", layer);

    // Border indices A–E and 1–6
    let font = ((6 * DPI) / 20).toString().concat("px arial");
    addText(offset * 0.5, (4.5 * height) / 5, "center", font, 0, "black", "A", { x: 0, y: 0 }, layer);
    addText(width - offset * 0.5, (4.5 * height) / 5, "center", font, 0, "black", "A", { x: 0, y: 0 }, layer);
    addText(offset * 0.5, (3.5 * height) / 5, "center", font, 0, "black", "B", { x: 0, y: 0 }, layer);
    addText(width - offset * 0.5, (3.5 * height) / 5, "center", font, 0, "black", "B", { x: 0, y: 0 }, layer);
    addText(offset * 0.5, (2.5 * height) / 5, "center", font, 0, "black", "C", { x: 0, y: 0 }, layer);
    addText(width - offset * 0.5, (2.5 * height) / 5, "center", font, 0, "black", "C", { x: 0, y: 0 }, layer);
    addText(offset * 0.5, (1.5 * height) / 5, "center", font, 0, "black", "D", { x: 0, y: 0 }, layer);
    addText(width - offset * 0.5, (1.5 * height) / 5, "center", font, 0, "black", "D", { x: 0, y: 0 }, layer);
    addText(offset * 0.5, (0.5 * height) / 5, "center", font, 0, "black", "E", { x: 0, y: 0 }, layer);
    addText(width - offset * 0.5, (0.5 * height) / 5, "center", font, 0, "black", "E", { x: 0, y: 0 }, layer);

    for (let i = 1; i < 7; i++) {
      addText((-0.5 + i) * (width / 6), (offset + (4 * DPI) / 20) * 0.5, "center", font, 0, "black", (7 - i).toString(), { x: 0, y: 0 }, layer);
      addText((-0.5 + i) * (width / 6), height - (offset - (4 * DPI) / 20) * 0.5, "center", font, 0, "black", (7 - i).toString(), { x: 0, y: 0 }, layer);
    }

    // Railsafe address block (tab 1)
    font = ((2 * DPI) / 20).toString().concat("px arial");
    addText(offset * 1.3 + tabOffset, height - 4.5 * offset, "left", font, 0, "black", "Railsafe Balustrading", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + tabOffset, height - 4.5 * offset + 1 * lineH, "left", font, 0, "black", "2/12 Apollo St", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + tabOffset, height - 4.5 * offset + 2 * lineH, "left", font, 0, "black", "Warriewood NSW 2102", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + tabOffset, height - 4.5 * offset + 3 * lineH, "left", font, 0, "black", "Phone +61 2 9905 8773", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + tabOffset, height - 4.5 * offset + 4 * lineH, "left", font, 0, "black", "Email sales@railsafe.com.au", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + tabOffset, height - 4.5 * offset + 5 * lineH, "left", font, 0, "black", "Website www.railsafe.com.au", { x: 0, y: 0 }, layer);

    // Confidentiality text (tab 1–1.5)
    let smallFont = ((1.8 * DPI) / 20).toString().concat("px calibri");
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset, "left", smallFont, 0, "black", "Proprietry Confidential", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH, "left", smallFont, 0, "black", "This drawing remains the sole", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 1 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "property of the Wallan Group Pty Ltd.", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 2 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "It must not be reproduced in part or in", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 3 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "whole without written consent from", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 4 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "the Directors. Wallan Group Pty Ltd", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 5 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "reserves the right to amend drawings ", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 6 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "in interests of continuous", { x: 0, y: 0 }, layer);
    addText(offset * 1.3 + 1.5 * tabOffset, height - 4.5 * offset + 1 * lineH + 7 * ((2.0 * DPI) / 20), "left", smallFont, 0, "black", "improvement.", { x: 0, y: 0 }, layer);

    // Client + job info (tab 2 & 3)
    font = ((2 * DPI) / 20).toString().concat("px arial");

    // Client
    addText(offset * 1.3 + 2 * tabOffset, height - 4.5 * offset, "left", font, 0, "black", "Client", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 2 * tabOffset, height - 4.5 * offset, "left", font, 0, "black", clientName, { x: 0, y: 0 }, layer);

    // Job/site address (install address) for "Address" line
    const siteAddressLine = jobAddress2 ? `${jobAddress2}, ${jobAddress1}` : jobAddress1;

    addText(offset * 1.3 + 2 * tabOffset, height - 4.5 * offset + 1 * lineH, "left", font, 0, "black", "Address", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 2 * tabOffset, height - 4.5 * offset + 1 * lineH, "left", font, 0, "black", siteAddressLine, { x: 0, y: 0 }, layer);
    addText(offset * 3 + 2 * tabOffset, height - 4.5 * offset + 2 * lineH, "left", font, 0, "black", `${jobCity} ${jobState} ${jobZip}`, { x: 0, y: 0 }, layer);

    // Order / Section / Design / Colour / Glass (tab 3)
    addText(offset * 1.3 + 3 * tabOffset, height - 4.5 * offset, "left", font, 0, "black", "Order#", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 3 * tabOffset, height - 4.5 * offset, "left", font, 0, "black", jobNumber.toUpperCase() + " Stage " + jobStage.toString(), { x: 0, y: 0 }, layer);

    addText(offset * 1.3 + 3 * tabOffset, height - 4.5 * offset + 1 * lineH, "left", font, 0, "black", "Section", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 3 * tabOffset, height - 4.5 * offset + 1 * lineH, "left", font, 0, "black", dropName, { x: 0, y: 0 }, layer);

    addText(offset * 1.3 + 3 * tabOffset, height - 4.5 * offset + 2 * lineH, "left", font, 0, "black", "Design", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 3 * tabOffset, height - 4.5 * offset + 2 * lineH, "left", font, 0, "black", dropDesign, { x: 0, y: 0 }, layer);

    addText(offset * 1.3 + 3 * tabOffset, height - 4.5 * offset + 3 * lineH, "left", font, 0, "black", "Colour", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 3 * tabOffset, height - 4.5 * offset + 3 * lineH, "left", font, 0, "black", dropColour.name, { x: 0, y: 0 }, layer);

    addText(offset * 1.3 + 3 * tabOffset, height - 4.5 * offset + 4 * lineH, "left", font, 0, "black", "Infill", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 3 * tabOffset, height - 4.5 * offset + 4 * lineH, "left", font, 0, "black", infillType, { x: 0, y: 0 }, layer);

    // Title + DWG / Rev / Date / Sheet / Scale (tab 4)
    addText(offset * 1.3 + 4 * tabOffset, height - 4.4 * offset + 0 * lineH, "left", font, 0, "black", "Title", { x: 0, y: 0 }, layer);

    const bigTitleFont = ((3 * DPI) / 20).toString().concat("px arial");
    addText(offset * 3 + 4 * tabOffset, height - 4.4 * offset + 0 * ((5 * DPI) / 20), "left", bigTitleFont, 0, "black", "Title 1", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 4 * tabOffset, height - 4.4 * offset + 1 * ((5 * DPI) / 20), "left", bigTitleFont, 0, "black", "Title 2", { x: 0, y: 0 }, layer);
    addText(offset * 3 + 4 * tabOffset, height - 4.5 * offset + 2 * ((5 * DPI) / 20), "left", bigTitleFont, 0, "black", "Title 3", { x: 0, y: 0 }, layer);

    addText(offset * 1.3 + 4 * tabOffset, height - 4.5 * offset + 4.75 * lineH, "left", font, 0, "black", "DWG No", { x: 0, y: 0 }, layer);
    const dwgFont = ((2.5 * DPI) / 20).toString().concat("px arial");
    const dwgNo = `RS-#${jobNumber}-${jobStage}`.toUpperCase().replaceAll("_", "-");
    addText(offset * 3 + 4 * tabOffset, height - 4.5 * offset + 4.75 * lineH, "left", dwgFont, 0, "black", dwgNo, { x: 0, y: 0 }, layer);

    addText(offset * 1.3 + 4.66 * tabOffset, height - 4.5 * offset + 4.75 * lineH, "left", font, 0, "black", "Rev", { x: 0, y: 0 }, layer);
    addText(offset * 2.3 + 4.66 * tabOffset, height - 4.5 * offset + 4.75 * lineH, "left", font, 0, "black", "A", { x: 0, y: 0 }, layer);

    const bottomRowY = height - 4.5 * offset + 6.5 * lineH;

    addText(offset * 3 + 4 * tabOffset, bottomRowY, "left", font, 0, "black", "Date", { x: 0, y: 0 }, layer);
    addText(offset * 4 + 4 * tabOffset, bottomRowY, "left", font, 0, "black", dateString, { x: 0, y: 0 }, layer);

    addText(offset * 2.5 + 4.5 * tabOffset, bottomRowY, "left", font, 0, "black", "Sheet", { x: 0, y: 0 }, layer);
    addText(offset * 3.5 + 4.5 * tabOffset, bottomRowY, "left", font, 0, "black", sheetRef, { x: 0, y: 0 }, layer);

    addText(offset * 1.1 + 4 * tabOffset, bottomRowY, "left", font, 0, "black", "Scale", { x: 0, y: 0 }, layer);
    const effectiveScale = scale * (100 / 25.4); // exact based on your current mm->px conversion
    const scaleLabel = `1:${Math.round(effectiveScale)}`;

    addText(offset * 1.8 + 4 * tabOffset, bottomRowY, "left", font, 0, "black", scaleLabel, { x: 0, y: 0 }, layer);


    // Logo image
    const canvasEl = canvas as HTMLCanvasElement;
    const ctx = canvasEl.getContext("2d");
    if (ctx) {
      const image = new Image();
      image.src =
        "https:///qbievdkbyqjrluvsbwil.supabase.co/storage/v1/object/public/rbr/Railsafe-Secondary-Balustrading-Blackpng.png";

      image.onload = () => {
        ctx.drawImage(image, 1.5 * offset, height - 4.5 * offset, tabOffset - 0.8 * offset, 3 * offset);
      };

      image.onerror = (error) => {
        console.error("Error loading image:", error);
      };
    }

    // Legend (top right)
    const fontLegend = "bold " + font;
    addLine(width - (2 * tabOffset) / 3, offset, width - (2 * tabOffset) / 3, offset * (7 * 0.6 + 1), 0, "black", layer);
    addLine(width - tabOffset / 2, offset * (1 * 0.6 + 1), width - tabOffset / 2, offset * (7 * 0.6 + 1), 0, "black", layer);
    addText((width - (2 * tabOffset) / 3 + width - offset) / 2, offset * (1 * 0.6 + 0.8), "center", fontLegend, 0, "black", "Legend", { x: 0, y: 0 }, layer);

    const canvasLegend = canvasEl;
    const ctxLegend = canvasLegend.getContext("2d");
    if (ctxLegend) {
      for (let i = 1; i < 8; i++) {
        addLine(width - (2 * tabOffset) / 3, offset * (i * 0.6 + 1), width - offset, offset * (i * 0.6 + 1), 0, "black", layer);
      }

      ctxLegend.fillStyle = "white";
      ctxLegend.fillRect(width - (2 * tabOffset) / 3 + 0.2 * offset, offset * (1 * 0.6 + 1.12), tabOffset / 6 - 0.4 * offset, 0.4 * offset);
      ctxLegend.fillStyle = "grey";
      ctxLegend.fillRect(width - (2 * tabOffset) / 3 + 0.2 * offset, offset * (2 * 0.6 + 1.12), tabOffset / 6 - 0.4 * offset, 0.4 * offset);
      ctxLegend.fillStyle = "lightgrey";
      ctxLegend.fillRect(width - (2 * tabOffset) / 3 + 0.2 * offset, offset * (3 * 0.6 + 1.12), tabOffset / 6 - 0.4 * offset, 0.4 * offset);
      ctxLegend.fillStyle = "grey";
      ctxLegend.fillRect(width - (2 * tabOffset) / 3 + 0.2 * offset, offset * (4 * 0.6 + 1.12), tabOffset / 6 - 0.4 * offset, 0.4 * offset);
      ctxLegend.fillStyle = "blue";
      ctxLegend.fillRect(width - (2 * tabOffset) / 3 + 0.2 * offset, offset * (5 * 0.6 + 1.12), tabOffset / 6 - 0.4 * offset, 0.4 * offset);
      ctxLegend.fillStyle = "cyan";
      ctxLegend.fillRect(width - (2 * tabOffset) / 3 + 0.2 * offset, offset * (6 * 0.6 + 1.12), tabOffset / 6 - 0.4 * offset, 0.4 * offset);
    }

    addText(width - tabOffset / 2 + 0.3 * offset, offset * (2 * 0.6 + 0.8), "left", font, 0, "black", "WF or SF Post", { x: 0, y: 0 }, layer);
    addText(width - tabOffset / 2 + 0.3 * offset, offset * (3 * 0.6 + 0.8), "left", font, 0, "black", "Baluster/Slat", { x: 0, y: 0 }, layer);
    addText(width - tabOffset / 2 + 0.3 * offset, offset * (4 * 0.6 + 0.8), "left", font, 0, "black", "Top rail section", { x: 0, y: 0 }, layer);
    addText(width - tabOffset / 2 + 0.3 * offset, offset * (5 * 0.6 + 0.8), "left", font, 0, "black", "Baseplate/Dressring", { x: 0, y: 0 }, layer);
    addText(width - tabOffset / 2 + 0.3 * offset, offset * (6 * 0.6 + 0.8), "left", font, 0, "black", "Panel Label", { x: 0, y: 0 }, layer);
    addText(width - tabOffset / 2 + 0.3 * offset, offset * (7 * 0.6 + 0.8), "left", font, 0, "black", "Glass Panel", { x: 0, y: 0 }, layer);
  }

  // -----------------------------------------------------
  // LEFT-HAND POST TABLE
  // -----------------------------------------------------
  function drawPostsTable() {
    if (!postsDataArray.length || !postsArray.length) return;

    const canvas = setContext(2).current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const offset = (10 / 25.4) * DPI;
    const tabOffset = (canvas.width - 2 * offset) / 5;
    const font = ((2 * DPI) / 20).toString().concat("px arial");

    const center = plotOffset
      ? {
          x: widthInPixels / 3 + (plotOffset.x * (DPI / scale)) / 100,
          y: heightInPixels / 2 + (plotOffset.y * (DPI / scale)) / 100 - 2.5 * offset,
        }
      : { x: widthInPixels / 3, y: heightInPixels / 3 };

    postsDataArray.forEach((item, i) => {
      if (item.type !== "NP" && item.type !== "EC" && item.type !== "WC") {
        const above =
          i > 1 &&
          i < postsDataArray.length - 2 &&
          (distToPointXYZ(postsDataArray[i - 1], item) < 300 || distToPointXYZ(postsDataArray[i + 1], item) < 300);

        const labelOffsetY = above ? (-300 * (DPI / scale)) / 100 : (250 * (DPI / scale)) / 100;

        addText(
          (item.x * (DPI / scale)) / 100 + center.x,
          (item.z * (DPI / scale)) / 100 + center.y,
          "center",
          font,
          baseplatesDataArray[i] ? baseplatesDataArray[i].o -180 : item.o -180,
          "black",
          (item.post_id ?? item.id).toString(),
          { x: 0, y: labelOffsetY },
          2
        );

        const rowY = canvas.height - 5 * offset - (postsDataArray.length - i - 0.75) * ((4 * DPI) / 20);

        if (item.type !== "WF") {
          if (item.type === "BP" || item.type === "DP" || item.type === "CD") {
            const base = baseplatesDataArray[i] ?? (item as unknown as BaseplateItem);
            addText(3 * offset, rowY, "left", font, 0, "black", `${base.y}mm`, { x: 0, y: 0 }, 2);
            if (item.type === "CD") {
              addDR(base, center, 3);
            } else {
              addBP(base, center, 3);
            }
            addText(4.5 * offset, rowY, "left", font, 0, "black", `${postsArray[0].y_ref1 - base.y}mm`, { x: 0, y: 0 }, 2);
          } else if (item.type === "SF inside" || item.type === "SF outside") {
            const base = baseplatesDataArray[i] ?? (item as unknown as BaseplateItem);
            addText(3 * offset, rowY, "left", font, 0, "black", `${base.y}mm`, { x: 0, y: 0 }, 2);
            addPost(item, center, 3);
            addText(4.5 * offset, rowY, "left", font, 0, "black", `${postsArray[0].y_ref1 - base.y}mm`, { x: 0, y: 0 }, 2);
          }
        } else {
          addText(offset + 0.3 * tabOffset, rowY, "center", font, 0, "black", "Wall Fixed", { x: 0, y: 0 }, 2);
          addPost(item, center, 3);
        }

        const baseGap = baseplatesDataArray[i] ?? (item as unknown as BaseplateItem);
        addText(
          6.5 * offset,
          canvas.height - 5 * offset - (postsDataArray.length - i - 0.75) * ((4 * DPI) / 20),
          "left",
          font,
          0,
          "black",
          `${postsArray[0].y_ref3 - baseGap.y}mm`,
          { x: 0, y: 0 },
          2
        );
      } else if (item.type === "NP") {
        addText(
          (item.x * (DPI / scale)) / 100 + center.x,
          (item.z * (DPI / scale)) / 100 + center.y,
          "center",
          font,
          item.o + 45,
          "black",
          (item.post_id ?? item.id).toString(),
          { x: 0, y: (250 * (DPI / scale)) / 100 },
          2
        );
        const rowY = canvas.height - 5 * offset - (postsDataArray.length - i - 0.75) * ((4 * DPI) / 20);
        addText(offset + 0.3 * tabOffset, rowY, "center", font, 0, "black", "No Post", { x: 0, y: 0 }, 2);
      }

      addLine(
        offset,
        canvas.height - 5 * offset - (i + 1) * ((4 * DPI) / 20),
        offset + 1 * tabOffset,
        canvas.height - 5 * offset - (i + 1) * ((4 * DPI) / 20),
        0,
        "black",
        2
      );

      addText(
        1.5 * offset,
        canvas.height - 5 * offset - (postsDataArray.length - i - 0.75) * ((4 * DPI) / 20),
        "left",
        font,
        0,
        "black",
        (item.post_id ?? item.id).toString(),
        { x: 0, y: 0 },
        2
      );
    });

    fixedComponentsDataArray.map(fc => {
      switch (fc.partName){
        case "SPGT RDTF":
        case "SPGT RDCD":
          addDR(fc, center, 3)
          break
        case "SPGT SQTF":
        case "SPGT SQTF":
          addBP(fc, center, 3)
          break;

      }
      
    })

    const numRows = postsDataArray.length;
    addLine(offset, canvas.height - 5 * offset - (numRows + 1) * ((4 * DPI) / 20), offset + 1 * tabOffset, canvas.height - 5 * offset - (numRows + 1) * ((4 * DPI) / 20), 0, "black", 2);
    addLine(offset + 0.4 * tabOffset, canvas.height - 5 * offset - (numRows + 1) * ((4 * DPI) / 20), offset + 0.4 * tabOffset, canvas.height - 5 * offset, 0, "black", 2);
    addLine(offset + 0.2 * tabOffset, canvas.height - 5 * offset - (numRows + 1) * ((4 * DPI) / 20), offset + 0.2 * tabOffset, canvas.height - 5 * offset, 0, "black", 2);
    addLine(offset + 0.65 * tabOffset, canvas.height - 5 * offset - (numRows + 1) * ((4 * DPI) / 20), offset + 0.65 * tabOffset, canvas.height - 5 * offset, 0, "black", 2);
    addLine(offset + 1 * tabOffset, canvas.height - 5 * offset - (numRows + 2) * ((4 * DPI) / 20), offset + 1 * tabOffset, canvas.height - 5 * offset, 0, "black", 2);
    addLine(offset, canvas.height - 5 * offset - (numRows + 2) * ((4 * DPI) / 20), offset + 1 * tabOffset, canvas.height - 5 * offset - (numRows + 2) * ((4 * DPI) / 20), 0, "black", 2);

    addText(
      2.5 * offset + 0.2 * tabOffset,
      canvas.height - 5 * offset - (numRows + 1.25) * ((4 * DPI) / 20),
      "left",
      "bold " + font,
      0,
      "black",
      "Max allowed post spacing = " + maxSpacing + "mm",
      { x: 0, y: 0 },
      2
    );

    addText(offset + 0.2 * tabOffset, canvas.height - 5 * offset - (numRows + 1.25) * ((4 * DPI) / 20), "center", "bold " + font, 0, "black", "Laser level at 0mm,", { x: 0, y: 0 }, 2);
    addText(1.5 * offset, canvas.height - 5 * offset - (numRows + 0.25) * ((4 * DPI) / 20), "left", font, 0, "black", "Post#", { x: 0, y: 0 }, 2);
    addText(3 * offset, canvas.height - 5 * offset - (numRows + 0.25) * ((4 * DPI) / 20), "left", font, 0, "black", "Details", { x: 0, y: 0 }, 2);

    const hasWallFixBaseplate = baseplatesDataArray.find((obj) => obj.type === "SF inside" || obj.type === "SF outside");

    addText(
      4.5 * offset,
      canvas.height - 5 * offset - (numRows + 0.25) * ((4 * DPI) / 20),
      "left",
      font,
      0,
      "black",
      hasWallFixBaseplate ? "Top to wall" : "Top to floor",
      { x: 0, y: 0 },
      2
    );
    addText(6.5 * offset, canvas.height - 5 * offset - (numRows + 0.25) * ((4 * DPI) / 20), "left", font, 0, "black", "Bottom Gap", { x: 0, y: 0 }, 2);
  }

  // -----------------------------------------------------
  // RIGHT-HAND "PANEL DETAILS" TABLE
  // -----------------------------------------------------
  function drawPanelDetailsTable() {
    if (!infillVectorsArray.length) return;

    const canvas = setContext(2).current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const offset = (10 / 25.4) * DPI;
    const tabOffset = (canvas.width - 2 * offset) / 5;
    const font = ((2 * DPI) / 20).toString().concat("px arial");

    const center = plotOffset
      ? {
          x: widthInPixels / 3 + (plotOffset.x * (DPI / scale)) / 100,
          y: heightInPixels / 2 + (plotOffset.y * (DPI / scale)) / 100 - 2.5 * offset,
        }
      : { x: widthInPixels / 3, y: heightInPixels / 3 };

    const rows: PanelLabelRow[] = Array.isArray(panelLabelRows) ? panelLabelRows : [];
    const keyToLabel = globalKeyToLabel;

    const postIndexById = new Map<number, number>(postsArray.map((p, idx) => [p.id, idx]));

    // Keep plan-view label placement, but resolve label from the global map
infillVectorsArray.forEach((item, i) => {
  if (!item.left) { 
    // console.log("skip: no left", item.id); 
    return; }
  if (i === 0 || i === infillVectorsArray.length - 1) { 
    // console.log("skip: edge index", i, item.id); 
    return; }

  const length = Math.round(distToPointXYZ(item.left, item.right));

  const writePanelLabel = (panelLabel: string) => {
    const angle = (Math.atan2(item.left.z - item.right.z, item.right.x - item.left.x) * 180) / Math.PI;

    addText(
      (0.5 * (item.left.x + item.right.x) * (DPI / scale)) / 100 + center.x,
      (0.5 * (item.left.z + item.right.z) * (DPI / scale)) / 100 + center.y,
      "center",
      font,
      angle,
      "blue",
      panelLabel,
      { x: 0, y: (250 * (DPI / scale)) / 100 },
      1
    );

    // console.log("draw label", panelLabel, "vector", item.id, "post_id", item.post_id);
  };

  // ✅ Use post index adjacency instead of post_id + 1
  const ia = postIndexById.get(item.post_id);
  if (ia == null) { 
    // console.log("skip: no postA", item.post_id, item.id); 
    return; }

  const postA = postsArray[ia];
  const postB = postsArray[ia + 1];
  if (!postB) {
    // console.log("skip: no postB", item.post_id, item.id);
    return; }

  if (
    ["NP", "EC", "WC"].includes(postA.type ?? "") ||
    ["NP", "EC", "WC"].includes(postB.type ?? "")
  ) {
    // console.log("skip: blocked by type", postA.type, postB.type, item.id);
    return;
  }

  const description = buildPanelDescription({
    dropDesign,
    infillVectorId: item.id,
    infillVectorPostId: item.post_id,
    glass_infill_partslist: glassInfillDataArray,
    vertical_infill_partslist: verticalInfillDataArray,
    midrail_partslist: midRailDataArray,
    normalizeLengths: true,
  });

  const key = makePanelKey({ dropDesign, length, description });

  const resolved = keyToLabel?.get(key);
  if (!resolved) { 
    // console.log("skip: no resolved label for key", key, "vector", item.id); 
    return; }

  writePanelLabel(resolved);
});



    // Draw the bottom-right table
    rows.forEach((item, i) => {
    addLine(
      4 * tabOffset + offset,
      canvas.height - 5 * offset - (i + 1) * ((4 * DPI) / 20),
      5 * tabOffset + offset,
      canvas.height - 5 * offset - (i + 1) * ((4 * DPI) / 20),
      0,
      "black",
      2
    );

    const rowY = canvas.height - 5 * offset - (rows.length - i - 0.75) * ((4 * DPI) / 20);

    addText(4 * tabOffset + 1.5 * offset, rowY, "left", font, 0, "black", item.label, { x: 0, y: 0 }, 2);
    addText(4 * tabOffset + 3 * offset, rowY, "left", font, 0, "black", item.quantity.toString(), { x: 0, y: 0 }, 2);
    addText(4 * tabOffset + 4.5 * offset, rowY, "left", font, 0, "black", item.description, { x: 0, y: 0 }, 2);
  });

    addLine(
      4 * tabOffset + offset,
      canvas.height - 5 * offset - (rows.length + 1) * ((4 * DPI) / 20),
      5 * tabOffset + offset,
      canvas.height - 5 * offset - (rows.length + 1) * ((4 * DPI) / 20),
      0,
      "black",
      2
    );
    addLine(
      4 * tabOffset + offset + 0.4 * tabOffset,
      canvas.height - 5 * offset - (rows.length + 1) * ((4 * DPI) / 20),
      4 * tabOffset + offset + 0.4 * tabOffset,
      canvas.height - 5 * offset,
      0,
      "black",
      2
    );
    addLine(
      4 * tabOffset + offset + 0.2 * tabOffset,
      canvas.height - 5 * offset - (rows.length + 1) * ((4 * DPI) / 20),
      4 * tabOffset + offset + 0.2 * tabOffset,
      canvas.height - 5 * offset,
      0,
      "black",
      2
    );
    addLine(
      4 * tabOffset + offset,
      canvas.height - 5 * offset - (rows.length + 2) * ((4 * DPI) / 20),
      4 * tabOffset + offset,
      canvas.height - 5 * offset,
      0,
      "black",
      2
    );
    addLine(
      4 * tabOffset + offset,
      canvas.height - 5 * offset - (rows.length + 2) * ((4 * DPI) / 20),
      5 * tabOffset + offset,
      canvas.height - 5 * offset - (rows.length + 2) * ((4 * DPI) / 20),
      0,
      "black",
      2
    );

    addText(
      4 * tabOffset + offset + 0.5 * tabOffset,
      canvas.height - 5 * offset - (rows.length + 1.25) * ((4 * DPI) / 20),
      "center",
      "bold " + font,
      0,
      "black",
      "Panel details",
      { x: 0, y: 0 },
      2
    );
    addText(
      4 * tabOffset + 1.5 * offset,
      canvas.height - 5 * offset - (rows.length + 0.25) * ((4 * DPI) / 20),
      "left",
      font,
      0,
      "black",
      "Panel #",
      { x: 0, y: 0 },
      2
    );
    addText(
      4 * tabOffset + 3 * offset,
      canvas.height - 5 * offset - (rows.length + 0.25) * ((4 * DPI) / 20),
      "left",
      font,
      0,
      "black",
      "Quantity",
      { x: 0, y: 0 },
      2
    );
    addText(
      4 * tabOffset + 4.5 * offset,
      canvas.height - 5 * offset - (rows.length + 0.25) * ((4 * DPI) / 20),
      "left",
      font,
      0,
      "black",
      "Description",
      { x: 0, y: 0 },
      2
    );
  }

  // -----------------------------------------------------
  // Main draw effect
  // -----------------------------------------------------

  // NOTE:
// eslint exhaustive-deps is intentionally suppressed for this effect.
// This draw effect calls many in-component helper functions (addLine, addRail, addGlass, etc)
// which are recreated every render and would otherwise need to be included as dependencies.
// TODO: Refactor by moving drawing helpers to module scope (or memoising them)
// and passing required state explicitly, then re-enable exhaustive-deps.
  useEffect(() => {
    const canvas = canvasRef.current;
    const canvas2 = canvasRef2.current;
    const canvas3 = canvasRef3.current;
    const canvas4 = canvasRef4.current;
    const canvas5 = canvasRef5.current;

    if (!canvas || !canvas2 || !canvas3 || !canvas4 || !canvas5) return;

    const ctx = canvas.getContext("2d");
    const ctx2 = canvas2.getContext("2d");
    const ctx3 = canvas3.getContext("2d");
    const ctx4 = canvas4.getContext("2d");
    const ctx5 = canvas5.getContext("2d");

    if (!ctx || !ctx2 || !ctx3 || !ctx4 || !ctx5) return;

    canvas.width = widthInPixels;
    canvas.height = heightInPixels;
    canvas2.width = widthInPixels;
    canvas2.height = heightInPixels;
    canvas3.width = widthInPixels;
    canvas3.height = heightInPixels;
    canvas4.width = widthInPixels;
    canvas4.height = heightInPixels;
    canvas5.width = widthInPixels / 3;
    canvas5.height = heightInPixels / 2.5;

    const setCssSize = (c: HTMLCanvasElement, w: number, h: number) => {
      c.style.width = "100%";
      c.style.height = "100%";
    };

    setCssSize(canvas, widthInPixels, heightInPixels);
    setCssSize(canvas2, widthInPixels, heightInPixels);
    setCssSize(canvas3, widthInPixels, heightInPixels);
    setCssSize(canvas4, widthInPixels, heightInPixels);

    ctx.clearRect(0, 0, widthInPixels, heightInPixels);
    ctx2.clearRect(0, 0, widthInPixels, heightInPixels);
    ctx3.clearRect(0, 0, widthInPixels, heightInPixels);
    ctx4.clearRect(0, 0, widthInPixels, heightInPixels);
    ctx5.clearRect(0, 0, canvas5.width, canvas5.height);

    addTemplate(1);
    drawPostsTable();
    drawPanelDetailsTable();

    // -----------------------------
    // Plan view geometry & labels
    // -----------------------------
    const offset = (10 / 25.4) * DPI;
    const center = plotOffset
      ? {
          x: widthInPixels / 3 + (plotOffset.x * (DPI / scale)) / 100,
          y: heightInPixels / 2 + (plotOffset.y * (DPI / scale)) / 100 - 2.5 * offset,
        }
      : { x: widthInPixels / 3, y: heightInPixels / 3 };

    const font = ((2 * DPI) / 20).toString().concat("px arial");

    // ---- Top rails + hobs ----
    topRailDataArray.forEach((rail) => {
      const railVector = toprailVectorsArray.find((v) => v.id === rail.id);
      if (!railVector) return;

      // Draw the rail body
      addRail(rail, railVector, center, 2);

      // Draw hob / hob with side-fix depending on post types
      if (postsArray.some((p) => p.type === "SF inside")) {
        addHobSF(rail, railVector, center, true, 2);
      } else if (postsArray.some((p) => p.type === "SF outside")) {
        addHobSF(rail, railVector, center, false, 2);
      } else {
        addHob(rail, railVector, center, 2);
      }

      // Label the rail
      addText(
        (rail.x * (DPI / scale)) / 100 + center.x,
        (rail.z * (DPI / scale)) / 100 + center.y,
        "center",
        font,
        rail.o-180,
        "black",
        `${rail.partName} ${rail.id}`,
        { x: 0, y: (-500 * (DPI / scale)) / 100 },
        2
      );
    });

    // ---- Glass infill panels ----
    glassInfillDataArray.forEach((panel) => {
      addGlass(panel, center, 2);
    });

    // ---- Balusters / vertical slats ----
    verticalInfillDataArray.forEach((item) => {
      switch (item.partName) {
        case "19x18 Baluster":
          addBaluster(item, center, 2);
          break;
        case "65x16 Slat":
          addSlat_Vertical(item, center, 2);
          break;
        default:
          break;
      }
    });


   // -----------------------------
// Dimensions (post-by-post loop)
// -----------------------------

// Precompute centroid + "is colinear" once for this draw
const centroid = (() => {
  const c = postsArray.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
  const n = postsArray.length || 1;
  return { x: c.x / n, z: c.z / n };
})();

const isColinearLayout = (() => {
  if (postsArray.length < 3) return true;
  const a = postsArray[0];
  const b = postsArray[postsArray.length - 1];
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const abLen = Math.hypot(abx, abz);
  if (abLen < 1e-6) return true;

  // max perpendicular distance to the AB line (mm)
  let maxD = 0;
  for (const p of postsArray) {
    const apx = p.x - a.x;
    const apz = p.z - a.z;
    const cross = Math.abs(abx * apz - abz * apx);
    const d = cross / abLen;
    if (d > maxD) maxD = d;
  }
  return maxD < 15; // tolerance in mm
})();


postsArray.forEach((item, i) => {
  const next = i < postsArray.length - 1 ? postsArray[i + 1] : undefined;
  if (!next) return;

  // --- local helpers (only used here) ---
  const safeNorm2 = (vx: number, vz: number) => {
    const len = Math.hypot(vx, vz);
    if (!len) return { x: 0, z: 0 };
    return { x: vx / len, z: vz / len };
  };
  const normalFromDir = (d: { x: number; z: number }) => ({ x: -d.z, z: d.x }); // +90° in XZ

  // Segment direction (item -> next)
  const dx = next.x - item.x;
  const dz = next.z - item.z;
  const segDir = safeNorm2(dx, dz);

  // Perpendicular (used for dimension offset + ticks)
  let segN = normalFromDir(segDir);

  // Pick which side the dimension goes on
  {
    if (isColinearLayout) {
      // Colinear: ALWAYS "above relative to the segment" (your desired side)
      segN = { x: -segN.x, z: -segN.z }; // <-- flip to the other side
    } else {
      // Non-colinear: choose the normal that points AWAY from centroid (outside)
      const mid = { x: (item.x + next.x) / 2, z: (item.z + next.z) / 2 };
      const test = { x: mid.x + segN.x * 150, z: mid.z + segN.z * 150 };
      const distA = Math.hypot(test.x - centroid.x, test.z - centroid.z);
      const distB = Math.hypot(mid.x - centroid.x, mid.z - centroid.z);
      if (distA < distB) segN = { x: -segN.x, z: -segN.z };
    }
  }


  const offsetDist = 150;
  const segOffset = { x: segN.x * offsetDist, y: segN.z * offsetDist }; // y == Z offset in plan

  // ---- TICKS (ALWAYS draw both ends) ----
  addLine(
    (item.x + 1.25 * segOffset.x) * (DPI / scale) / 100 + center.x,
    (item.z + 1.25 * segOffset.y) * (DPI / scale) / 100 + center.y,
    (item.x + 0.5 * segOffset.x) * (DPI / scale) / 100 + center.x,
    (item.z + 0.5 * segOffset.y) * (DPI / scale) / 100 + center.y,
    0,
    "black",
    2
  );

  addLine(
    (next.x + 1.25 * segOffset.x) * (DPI / scale) / 100 + center.x,
    (next.z + 1.25 * segOffset.y) * (DPI / scale) / 100 + center.y,
    (next.x + 0.5 * segOffset.x) * (DPI / scale) / 100 + center.x,
    (next.z + 0.5 * segOffset.y) * (DPI / scale) / 100 + center.y,
    0,
    "black",
    2
  );

  // ---- MAIN DIMENSION LINE ----
  addLine(
    (item.x + segOffset.x) * (DPI / scale) / 100 + center.x,
    (item.z + segOffset.y) * (DPI / scale) / 100 + center.y,
    (next.x + segOffset.x) * (DPI / scale) / 100 + center.x,
    (next.z + segOffset.y) * (DPI / scale) / 100 + center.y,
    0,
    "black",
    2
  );

  // ---- TEXT (parallel to the segment) ----
  const thetaRad = Math.atan2(dz, dx);
  const thetaDeg = (thetaRad * 180) / Math.PI;
  const oText = -thetaDeg;

  // Put text on the same side as the dimension line (segN)
  const localYWorld = { x: -Math.sin(thetaRad), z: Math.cos(thetaRad) };
  const sign = (segN.x * localYWorld.x + segN.z * localYWorld.z) >= 0 ? 1 : -1;

  addText(
    0.5 * (next.x + item.x) * (DPI / scale) / 100 + center.x,
    0.5 * (next.z + item.z) * (DPI / scale) / 100 + center.y,
    "center",
    font,
    oText,
    "black",
    item.length.toString(),
    { x: 0, y: sign * (200 * (DPI / scale) / 100) },
    2
  );

  // ---- ANGLE TEXT (INSIDE, symmetric between panels) ----
  if (i > 0 && i < postsArray.length - 1 && item.angle !== 180) {
    const prev = postsArray[i - 1];

    // Vectors away from the corner
    const v1raw = { x: prev.x - item.x, z: prev.z - item.z };
    const v2raw = { x: next.x - item.x, z: next.z - item.z };

    const v1Len = Math.hypot(v1raw.x, v1raw.z) || 1;
    const v2Len = Math.hypot(v2raw.x, v2raw.z) || 1;

    const v1 = { x: v1raw.x / v1Len, z: v1raw.z / v1Len };
    const v2 = { x: v2raw.x / v2Len, z: v2raw.z / v2Len };

    // Interior angle bisector
    let bis = { x: v1.x + v2.x, z: v1.z + v2.z };
    const bisLen = Math.hypot(bis.x, bis.z);
    if (bisLen < 1e-6) return;
    bis = { x: bis.x / bisLen, z: bis.z / bisLen };

    // Force INSIDE: make bisector point TOWARDS centroid
    {
      const d = 350;
      const test = { x: item.x + bis.x * d, z: item.z + bis.z * d };
      const distTest = Math.hypot(test.x - centroid.x, test.z - centroid.z);
      const distCorner = Math.hypot(item.x - centroid.x, item.z - centroid.z);
      if (distTest > distCorner) bis = { x: -bis.x, z: -bis.z };
    }

    const dist = 350;
    const px = (item.x + bis.x * dist) * (DPI / scale) / 100 + center.x;
    const py = (item.z + bis.z * dist) * (DPI / scale) / 100 + center.y;

    // Keep the same "readable" text behaviour you already liked
    let rot = (Math.atan2(bis.x, bis.z) * 180) / Math.PI;
    rot = (rot + 360) % 360;
    if (rot > 90 && rot < 270) rot = (rot + 180) % 360;

    addText(
      px,
      py,
      "center",
      font,
      rot,
      "black",
      `${Math.abs(item.angle)}${String.fromCharCode(176)}`,
      { x: 0, y: 0 },
      2
    );
  }
});



// console.log("A3Canvas scale", scale, "dpi", DPI, "plotOffset", plotOffset);
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    DPI,
    widthInPixels,
    heightInPixels,
    clientName,
    jobNumber,
    dropName,
    balconyNo,
    dropDesign,
    dateString,
    sheetRef,
    scale,
    plotOffset,
    postsArray,
    postsDataArray,
    baseplatesDataArray,
    maxSpacing,
    jobAddress1,
    jobAddress2,
    jobCity,
    jobState,
    jobZip,
    glassInfillDataArray,
    verticalInfillDataArray,
    midRailDataArray,
    infillVectorsArray,
    topRailDataArray,
    toprailVectorsArray,
  ]);

  // const screenW = widthInPixels * displayScale;
  // const screenH = heightInPixels * displayScale;
  const previewScale = isPrinting ? 1 : 0.238;

  const foundation3d = (foundationArray as any[]).map((f) => ({
      x: f.x,
      y: 0, //(f.y_ref ?? f.y ?? 0),
      z: f.z,
    }));

    const hasPosts = Array.isArray(posts3d) && posts3d.some((p) => p && p.type !== "NP");
    const hasRails = Array.isArray(topRailDataArray) && topRailDataArray.length > 0;

    const hasModelData = hasPosts || hasRails;

    const hasRealCamera =
      cameraSettings &&
      Number.isFinite(cameraSettings.x) &&
      Number.isFinite(cameraSettings.y) &&
      Number.isFinite(cameraSettings.z) &&
      !(cameraSettings.x === 5 && cameraSettings.y === 5 && cameraSettings.z === 5);

    const canShowModel = hasModelData && hasRealCamera;

    // console.log("cameraSettings", cameraSettings);
    // console.log("posts3d[0]", posts3d?.[0]);
    // console.log("topRail[0]", topRailDataArray?.[0]);


  return (
    <div
      className="a3-sheet"
      style={{
        position: "relative",
        width: widthInPixels * previewScale,
        height: heightInPixels * previewScale,
        overflow: "hidden",
      }}
    >
      {/* SCALED DRAWING CONTENT */}
      <div
        className="a3-content"
        style={{
          position: "absolute",
          inset: 0,
          width: widthInPixels,
          height: heightInPixels,
          transform: `scale(${previewScale})`,
          transformOrigin: "top left",
        }}
      >
        {/* your canvases stay here exactly as-is */}
        <canvas ref={canvasRef} style={{ position: "absolute", top: (297 / 25.4) * DPI * 0.25, left: (420 / 25.4) * DPI * 0.625, inset: 0, zIndex: 0 }} />
        <canvas ref={canvasRef2} style={{ position: "absolute", top: (297 / 25.4) * DPI * 0.25, left: (420 / 25.4) * DPI * 0.625, inset: 0, zIndex: 1 }} />
        <canvas ref={canvasRef3} style={{ position: "absolute", top: (297 / 25.4) * DPI * 0.25, left: (420 / 25.4) * DPI * 0.625, inset: 0, zIndex: 2 }} />
        <canvas ref={canvasRef4} style={{ position: "absolute", top: (297 / 25.4) * DPI * 0.25, left: (420 / 25.4) * DPI * 0.625, inset: 0, zIndex: 3 }} />
        <canvas ref={canvasRef5} style={{ position: "absolute", top: "25%", left: "62.5%", width: "33.333%", height: "40%", zIndex: 4 }} />
      </div>

      {/* UNSCALED OVERLAY IN PREVIEW SPACE */}
      {!isPrinting && (
        <div
          // className="border border-black"
          style={{
            position: "absolute",
            top: `${25}%`,
            left: `${62.5}%`,
            width: `${33.333}%`,
            height: `${40}%`,
            zIndex: 6,
          }}
        >
          <ModelViewer

            ready={true}
            lighting={lighting}
            powdercoat_color={dropColourHex}
            posts_data_array={posts3d}
            baseplates_data_array={baseplatesDataArray as any}
            vertical_infill_data_array={verticalInfillDataArray as any}
            glass_infill_data_array={glassInfillDataArray as any}
            mid_rail_data_array={midRails3d}
            top_rail_data_array={topRailDataArray as any}
            fixed_components_data_array={fixedComponentsDataArray as any}
            posts_vectors_array={postsVectorsArray as any}
            infill_vectors_array={infillVectorsArray as any}
            toprail_vectors_array={toprailVectorsArray as any}
            wall_data_array={walls3d}
            foundation_array={foundation3d}
            allowed_length={maxSpacing}
            camera_on_load={cameraSettings as any}
            reset_camera={true}
            showLaser={false}
            showDimensions={false}
            showCuttingPlanes={false}
            box_width={100}
            box_height={100}
            enableControls={false}
          />
        </div>
      )}
    </div>
  );
};


// ----------------------------------------
// Calculation helpers
// ----------------------------------------

/**
 * Projects a point along a direction vector onto a plane
 * defined by a point `coor` and a normal `normal`.
 */
export function toPlane(point: Vec3, dir: Vec3, coor: Vec3, normal: Vec3): Vec3 {
  const d = normal.x * coor.x + normal.y * coor.y + normal.z * coor.z;
  const denom = normal.x * dir.x + normal.y * dir.y + normal.z * dir.z;

  // Avoid division by zero (parallel to plane) – return original point
  if (denom === 0) return { ...point };

  const dist =
    (d - normal.x * point.x - normal.y * point.y - normal.z * point.z) / denom;

  return {
    x: point.x + dist * dir.x,
    y: point.y + dist * dir.y,
    z: point.z + dist * dir.z,
  };
}

/**
 * Distance along a direction vector from `point` to the plane
 * defined by a point `coor` and a normal `normal`.
 */
export function disttoPlane(
  point: Vec3,
  dir: Vec3,
  coor: Vec3,
  normal: Vec3
): number {
  const d = normal.x * coor.x + normal.y * coor.y + normal.z * coor.z;
  const denom = normal.x * dir.x + normal.y * dir.y + normal.z * dir.z;

  if (denom === 0) return 0;

  const dist =
    (d - normal.x * point.x - normal.y * point.y - normal.z * point.z) / denom;

  return dist;
}

/**
 * Euclidean distance between two 3D points.
 */
export function distToPointXYZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Returns:
 *  1  if point is on the normal side of the plane
 * -1  if on the opposite side
 *  0  if on the plane
 *
 * Plane is defined by `normal` and scalar `constantD` (your `d` term).
 */
export function isPointOnNormalSideOfPlane(
  point: Vec3,
  normal: Vec3,
  constantD: number
): 1 | -1 | 0 {
  const result = normal.x * point.x + normal.y * point.y + normal.z * point.z + constantD;

  if (result > 0) return 1;
  if (result < 0) return -1;
  return 0;
}

/**
 * Increment a single ASCII character.
 * If empty/undefined, returns "A".
 */
export const incrementCharAscii = (label: string): string => {
  let result = "";
  let carry = 1;

  for (let i = label.length - 1; i >= 0; i--) {
    const charCode = label.charCodeAt(i) - 65; // A = 0, Z = 25
    const next = charCode + carry;

    if (next === 26) {
      result = "A" + result;
      carry = 1;
    } else {
      result = String.fromCharCode(65 + next) + result;
      carry = 0;
    }
  }

  if (carry === 1) {
    result = "A" + result;
  }

  return result;
};
