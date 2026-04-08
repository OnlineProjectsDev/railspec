// src/app/(rs)/foundation-editor/playground/environmentTypes.ts

import type { Vec2 } from "../derive/deriveAdapter";

export type EnvKind = "FLOOR" | "WALL" | "HOB" | "LOW_WALL";

export type EnvSide = "LEFT" | "RIGHT";

export type EnvironmentShape =
  | {
      kind: "FLOOR";
      id: string;
      // Closed loop of slab edges. If closed=false, we still treat consecutive points as edges.
      points: Vec2[];
      closed: boolean;
    }
  | {
      kind: "WALL";
      id: string;
      points: Vec2[]; // open polyline
      closed: false;
    }
  | {
      kind: "HOB" | "LOW_WALL";
      id: string;
      points: Vec2[]; // open polyline is typical
      closed: boolean;
      thicknessMm: number; // e.g. 90, 110, 120
      heightMm: number; // e.g. hob 150, low wall 900
      side: EnvSide; // which face is the "reference edge"
    };

export type EnvSegment = { id: string; kind: EnvKind; a: Vec2; b: Vec2 };

function segmentsFromPolyline(id: string, kind: EnvKind, pts: Vec2[], closed: boolean): EnvSegment[] {
  const out: EnvSegment[] = [];
  if (!pts || pts.length < 2) return out;

  for (let i = 0; i < pts.length - 1; i++) {
    out.push({ id, kind, a: pts[i], b: pts[i + 1] });
  }

  if (closed && pts.length >= 3) {
    out.push({ id, kind, a: pts[pts.length - 1], b: pts[0] });
  }

  return out;
}

function norm2(x: number, z: number) {
  const d = Math.hypot(x, z);
  if (d < 1e-9) return { x: 0, z: 0, d: 0 };
  return { x: x / d, z: z / d, d };
}

// Offset a segment to LEFT or RIGHT of its direction (a->b) by distMm
function offsetSegment(seg: EnvSegment, distMm: number, side: EnvSide): EnvSegment {
  const dx = seg.b.x - seg.a.x;
  const dz = seg.b.z - seg.a.z;
  const u = norm2(dx, dz);
  // left normal = (-dz, dx), right normal = (dz, -dx)
  const nx = side === "LEFT" ? -u.z : u.z;
  const nz = side === "LEFT" ? u.x : -u.x;

  return {
    ...seg,
    a: { x: seg.a.x + nx * distMm, z: seg.a.z + nz * distMm },
    b: { x: seg.b.x + nx * distMm, z: seg.b.z + nz * distMm },
  };
}

/**
 * Returns drawable environment segments:
 * - FLOOR: edges of the loop/polyline
 * - WALL: segments
 * - HOB/LOW_WALL: chosen face edges (centerline offset by thickness/2 to side)
 */
export function envSegmentsFromShapes(shapes: EnvironmentShape[]): EnvSegment[] {
  const out: EnvSegment[] = [];

  for (const s of shapes ?? []) {
    if (s.kind === "FLOOR") {
      out.push(...segmentsFromPolyline(s.id, s.kind, s.points ?? [], s.closed));
      continue;
    }

    if (s.kind === "WALL") {
      out.push(...segmentsFromPolyline(s.id, s.kind, s.points ?? [], false));
      continue;
    }

    if (s.kind === "HOB" || s.kind === "LOW_WALL") {
      const segs = segmentsFromPolyline(s.id, s.kind, s.points ?? [], s.closed);
      const face = Math.max(0, (s.thicknessMm ?? 0) / 2);
      for (const seg of segs) out.push(offsetSegment(seg, face, s.side ?? "LEFT"));
      continue;
    }
  }

  return out;
}