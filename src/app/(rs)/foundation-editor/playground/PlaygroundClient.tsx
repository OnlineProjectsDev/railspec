// src/app/(rs)/foundation-editor/playground/PlaygroundClient.tsx
"use client";

import * as React from "react";
import { deriveFromRawFoundationArray } from "../derive/deriveAdapter";
import type { DeriveResult, Vec2 } from "../derive/deriveAdapter";
import type { FoundationType } from "../derive/foundationTypes";
import type { EnvironmentShape } from "./environmentTypes";
import { envSegmentsFromShapes } from "./environmentTypes";

type Marker = { runId: string; x: number; z: number; t: number };

type Span = { runId: string; spanIndex: number; lengthMm: number; sections: number; sectionLengthMm: number; dirX: number; dirZ: number;  aX: number; aZ: number; bX: number; bZ: number;  };

type EnvEdgeKey = string; // `${shapeId}:${segmentIndex}`

function envEdgeKey(shapeId: string, segmentIndex: number): EnvEdgeKey {
  return `${shapeId}:${segmentIndex}`;
}

function clampAngleDeg(a: number) {
  let x = a;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function normType(t?: string) {
  return (t ?? "").trim().toUpperCase();
}

function isSpaceType(t?: string) {
  return normType(t) === "SPACE";
}

function isWallType(t?: string) {
  return normType(t) === "WALL";
}

function toPrettyJson(v: unknown) {
  return JSON.stringify(v, null, 2);
}

type PlaygroundDoc = {
  foundation_array: FoundationType[];
  environment?: EnvironmentShape[];
};

function isPlaygroundDoc(v: any): v is PlaygroundDoc {
  return v && typeof v === "object" && Array.isArray(v.foundation_array);
}

function parsePlaygroundDoc(text: string): { doc: PlaygroundDoc | null; error: string | null } {
  try {
    const parsed = JSON.parse(text);

    // Backwards compatibility:
    // If user pasted FoundationType[] directly
    if (Array.isArray(parsed)) {
      return {
        doc: { foundation_array: parsed as FoundationType[], environment: [] },
        error: null,
      };
    }

    if (isPlaygroundDoc(parsed)) {
      return { doc: parsed, error: null };
    }

    return {
      doc: null,
      error:
        "JSON must be either FoundationType[] OR { foundation_array: FoundationType[], environment?: EnvironmentShape[] }",
    };
  } catch (e: any) {
    return { doc: null, error: e?.message ?? "Invalid JSON" };
  }
}

function stringifyPlaygroundDoc(
  foundation: FoundationType[],
  env: EnvironmentShape[]
) {
  const doc: PlaygroundDoc = {
    foundation_array: foundation,
    environment: env,
  };

  return JSON.stringify(doc, null, 2);
}

function boundsOf(points: Vec2[]) {
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;

  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
    if (p.x < minX) minX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.z > maxZ) maxZ = p.z;
  }

  if (!Number.isFinite(minX)) {
    minX = -500;
    minZ = -500;
    maxX = 500;
    maxZ = 500;
  }

  return { minX, minZ, maxX, maxZ };
}

function polylinePointsAttr(points: Vec2[], map: (p: Vec2) => { x: number; y: number }) {
  return points
    .map((p) => {
      const q = map(p);
      return `${q.x},${q.y}`;
    })
    .join(" ");
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function pointsText(pts?: Vec2[]) {
  return (pts ?? []).map((p) => `${p.x},${p.z}`).join("\n");
}

function parsePointsText(text: string): Vec2[] {
  const lines = text.split("\n");
  const pts: Vec2[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const [xs, zs] = t.split(",").map((s) => s.trim());
    const x = Number(xs);
    const z = Number(zs);

    if (Number.isFinite(x) && Number.isFinite(z)) pts.push({ x, z });
  }

  return pts;
}

function decodeT(t: number) {
  const spanIndex = Math.floor(t);
  const within = t - spanIndex; // 0..1
  return { spanIndex, within };
}

const sameT = (a?: number, b?: number) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-9;

const T_EPS = 1e-9;

function renderSectionTicks(span: Span, map: (p: Vec2) => { x: number; y: number }) {
  // tick size in WORLD mm (so it scales consistently with your PX_PER_MM mapping)
  const TICK_HALF_MM = 60; // total tick = 120mm
  const tickCount = Math.max(1, span.sections);

  // unit direction along the span
  const dirX = span.dirX;
  const dirZ = span.dirZ;

  // unit normal (perpendicular) for the tick marks
  const nX = -dirZ;
  const nZ = dirX;

  const out: React.ReactNode[] = [];

  for (let k = 0; k <= tickCount; k++) {
    const d = span.sectionLengthMm * k;

    const px = span.aX + dirX * d;
    const pz = span.aZ + dirZ * d;

    const a = map({ x: px - nX * TICK_HALF_MM, z: pz - nZ * TICK_HALF_MM });
    const b = map({ x: px + nX * TICK_HALF_MM, z: pz + nZ * TICK_HALF_MM });

    out.push(
      <line
        key={`tick-${span.runId}-${span.spanIndex}-${k}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth={2}
      />
    );
  }

  return <g>{out}</g>;
}

function angleDegFromDir(prevDir: Vec2 | null, dir: Vec2) {
  // Your RAW format uses "segment-to-segment" user-facing angle, where 180 = straight.
  // We'll compute signed turn in degrees, then convert to your convention:
  // straight => turn=0 => angle=180
  // right turn +90 => angle=+90
  // left turn -90 => angle=-90
  if (!prevDir) return 180;

  const a0 = Math.atan2(prevDir.z, prevDir.x);
  const a1 = Math.atan2(dir.z, dir.x);
  let turn = (a1 - a0) * (180 / Math.PI);
  while (turn > 180) turn -= 360;
  while (turn < -180) turn += 360;

  // turn=0 => straight => 180
  // right turn (+90) => +90
  // left turn (-90) => -90
  // This matches the comments in your CASES block.
  return turn === 0 ? 180 : turn;
}

function lengthMm(a: Vec2, b: Vec2) {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function dirUnit(a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-9) return { x: 1, z: 0 };
  return { x: dx / d, z: dz / d };
}

type FoundationFromEnvOptions = {
  runId?: string;
  defaultOffsetMm?: number; // fallback balustrade offset from reference edge (FLOOR)
  floorOffsetMm?: number;
  wallOffsetMm?: number;
  hobOffsetMm?: number;
  lowWallOffsetMm?: number;
};

function envKindToFoundationType(kind: string) {
  const k = (kind ?? "").toUpperCase();
  if (k === "FLOOR") return "FLOOR";
  if (k === "WALL") return "WALL";
  if (k === "HOB") return "HOB";
  if (k === "LOW_WALL") return "LOW_WALL";
  return "FLOOR";
}

/**
 * C6: build RAW foundation_array from environment edges.
 * - Each environment segment becomes a RUN_SEGMENT row.
 * - One runId by default (you can extend to multiple runs later).
 * - Offsets: per-kind defaults.
 * - Heights: HOB/LOW_WALL pull from shape where available (optional extension).
 */
function foundationFromEnvironment(
  environment: EnvironmentShape[],
  opts: FoundationFromEnvOptions = {}
): FoundationType[] {
  const runId = opts.runId ?? "ENV";
  const defaultOffsetMm = opts.defaultOffsetMm ?? 90;

  const segs = envSegmentsFromShapes(environment).filter((s) => {
    const k = (s.kind ?? "").toUpperCase();
    return k === "FLOOR" || k === "HOB" || k === "LOW_WALL";
  });
  // For first pass (C6): treat all env edges as one continuous run in the listed order.
  // Later you can group by adjacency / id / kind and insert RUN_BREAK / PERP trims.
  const out: FoundationType[] = [];
  let prevDir: Vec2 | null = null;
  let nextId = 1;

  for (const s of segs) {
    const len = lengthMm(s.a, s.b);
    if (len < 1e-6) continue;

    const d = dirUnit(s.a, s.b);
    const angle = angleDegFromDir(prevDir, d);

    const fType = envKindToFoundationType(s.kind);

    const offset =
      fType === "FLOOR"
        ? (opts.floorOffsetMm ?? defaultOffsetMm)
        : fType === "WALL"
          ? (opts.wallOffsetMm ?? 0) // walls often represent obstacles, not reference edges; set 0 by default
          : fType === "HOB"
            ? (opts.hobOffsetMm ?? defaultOffsetMm)
            : fType === "LOW_WALL"
              ? (opts.lowWallOffsetMm ?? defaultOffsetMm)
              : defaultOffsetMm;

    // Optional: set heights for HOB / LOW_WALL if you want it in RAW
    let height = 0;
    if (fType === "HOB" || fType === "LOW_WALL") {
      const src = environment.find((e) => e.id === s.id) as any;
      if (src && typeof src.heightMm === "number") height = src.heightMm;
    }

    out.push({
      id: nextId++,
      type: fType as any,
      length: len,
      angle,
      offset,
      sections: 1,
      height,
      x: 0,
      z: 0,
      y: 0,
      meta: { role: "RUN_SEGMENT", runId },
    } as FoundationType);

    prevDir = d;
  }

  return out;
}

/**
 * C6b: build RAW foundation_array from ONLY the user-selected environment edges.
 * - Only selected FLOOR edges are used for now.
 * - Offset comes from UI (generatedOffsetMm).
 * - Angles are computed in the selected-edge order.
 */
function foundationFromSelectedEnvironmentEdges(
  environment: EnvironmentShape[],
  selected: Set<EnvEdgeKey>,
  opts: { runId?: string; offsetMm?: number } = {}
): FoundationType[] {
  const runId = opts.runId ?? "ENV";
  const offsetMm = opts.offsetMm ?? 0;

  const allSegs = envSegmentsFromShapes(environment);

  const segIndexByOccurrence: number[] = [];
  const perShapeCount = new Map<string, number>();
  for (let i = 0; i < allSegs.length; i++) {
    const sid = allSegs[i].id;
    const next = perShapeCount.get(sid) ?? 0;
    segIndexByOccurrence[i] = next;
    perShapeCount.set(sid, next + 1);
  }

  const picked = allSegs.filter((seg, i) => {
    const kind = (seg.kind ?? "").toUpperCase();
    if (kind !== "FLOOR") return false;
    const key = envEdgeKey(seg.id, segIndexByOccurrence[i]);
    return selected.has(key);
  });

  if (!picked.length) return [];

  // Anchor from the first selected segment
  const first = picked[0];
  const firstDir = dirUnit(first.a, first.b);
  const anchorX = first.a.x;
  const anchorZ = first.a.z;
  const anchorHeadingDeg = (Math.atan2(firstDir.z, firstDir.x) * 180) / Math.PI;

  const out: FoundationType[] = [];
  let prevDir: Vec2 | null = null;
  let nextId = 1;

  for (let pi = 0; pi < picked.length; pi++) {
    const s = picked[pi];
    const len = lengthMm(s.a, s.b);
    if (len < 1e-6) continue;

    const d = dirUnit(s.a, s.b);
    const angle = angleDegFromDir(prevDir, d);

    out.push({
      id: nextId++,
      type: "FLOOR" as any,
      length: len,
      angle,
      offset: offsetMm,
      sections: 1,
      height: 0,

      // 👇 only the first segment carries the anchor position
      x: pi === 0 ? anchorX : 0,
      z: pi === 0 ? anchorZ : 0,
      y: 0,

      // 👇 deriveAdapter can read this to rotate from +X to the selected edge direction
      meta: {
        role: "RUN_SEGMENT",
        runId,
        anchorHeadingDeg: pi === 0 ? anchorHeadingDeg : undefined,
      },
    } as FoundationType);

    prevDir = d;
  }

  return out;
}
/**
 * Case intent:
 * - Angles are USER-FACING segment-to-segment angles (accumulated in deriveAdapter).
 * - 180 = straight, +90 = right turn, -90 = turn left.
 * - Positive offset places balustrade line to the RIGHT of the reference direction.
 * - PERP rows trim the START/END along the run direction (mm).
 */
const CASES: Record<string, { label: string; data: FoundationType[] }> = {
  case1: {
    label: "Case 1 — Simple FLOOR run (baseline)",
    data: [
      { id: 1, type: "SPACE", length: 0, angle: 180, offset: 120, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_START", runId: "A" } },
      { id: 2, type: "FLOOR", length: 3000, angle: clampAngleDeg(180), offset: 90, sections: 1, height: 0, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "A" } },
      { id: 3, type: "SPACE", length: 0, angle: 180, offset: 80, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_END", runId: "A" } },
    ],
  },

  case2: {
    label: "Case 2 — Single HOB run",
    data: [
      { id: 1, type: "SPACE", length: 0, angle: 180, offset: 60, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_START", runId: "H1" } },
      { id: 2, type: "HOB", length: 2400, angle: clampAngleDeg(180), offset: 75, sections: 1, height: 150, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "H1" } },
      { id: 3, type: "SPACE", length: 0, angle: 180, offset: 60, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_END", runId: "H1" } },
    ],
  },

  case3: {
    label: "Case 3 — Single LOW_WALL run",
    data: [
      { id: 1, type: "SPACE", length: 0, angle: 180, offset: 40, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_START", runId: "LW1" } },
      { id: 2, type: "LOW_WALL", length: 3600, angle: clampAngleDeg(180), offset: 90, sections: 1, height: 900, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "LW1" } },
      { id: 3, type: "SPACE", length: 0, angle: 180, offset: 40, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_END", runId: "LW1" } },
    ],
  },

  case4: {
    label: "Case 4 — Mixed (FLOOR → HOB right-turn → LOW_WALL left-turn back)",
    data: [
      { id: 1, type: "SPACE", length: 0, angle: 180, offset: 80, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_START", runId: "MIX" } },

      // segment 1: +X
      { id: 2, type: "FLOOR", length: 2000, angle: clampAngleDeg(180), offset: 90, sections: 1, height: 0, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "MIX" } },
      // segment 2: turn right (+90) => +Z (down)
      { id: 3, type: "HOB", length: 1500, angle: clampAngleDeg(90), offset: 75, sections: 1, height: 150, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "MIX" } },
      // segment 3: turn left (-90) => back to +X
      { id: 4, type: "LOW_WALL", length: 1800, angle: clampAngleDeg(-90), offset: 90, sections: 1, height: 900, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "MIX" } },

      { id: 5, type: "SPACE", length: 0, angle: 180, offset: 80, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_END", runId: "MIX" } },
    ],
  },

  case5: {
    label: "Case 5 — Two runs with 500mm SPACE gap (RUN_BREAK length)",
    data: [
      { id: 1, type: "SPACE", length: 0, angle: 180, offset: 60, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_START", runId: "R1" } },
      { id: 2, type: "FLOOR", length: 2400, angle: clampAngleDeg(180), offset: 90, sections: 1, height: 0, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "R1" } },
      { id: 3, type: "SPACE", length: 0, angle: 180, offset: 60, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_END", runId: "R1" } },

      // Gap in the reference walk (not solid), then new run group
      { id: 4, type: "SPACE", length: 500, angle: clampAngleDeg(180), offset: 0, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "RUN_BREAK" } },
      { id: 5, type: "SPACE", length: 500, angle: clampAngleDeg(-90), offset: 0, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "RUN_BREAK" } },

      { id: 6, type: "SPACE", length: 0, angle: 180, offset: 80, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_START", runId: "R2" } },
      { id: 7, type: "HOB", length: 1800, angle: clampAngleDeg(180), offset: 75, sections: 1, height: 150, x: 0, z: 0, y: 0, meta: { role: "RUN_SEGMENT", runId: "R2" } },
      { id: 8, type: "SPACE", length: 0, angle: 180, offset: 80, sections: 0, height: 0, x: 0, z: 0, y: 0, meta: { role: "PERP_OFFSET_END", runId: "R2" } },
    ],
  },
};

export default function PlaygroundClient() {
  const defaultKey = "case1";

  const [selectedCaseKey, setSelectedCaseKey] = React.useState<string>(defaultKey);

  // Decide what the initial env should be on first load.
  // If you want the initial sample env visible, keep initialEnv as your current default.
  // If you want cases to start empty, set initialEnv to [].
  const initialEnv: EnvironmentShape[] = [
    {
      kind: "FLOOR",
      id: "floor-1",
      points: [
        { x: -500, z: -500 },
        { x: 3500, z: -500 },
        { x: 3500, z: 2000 },
        { x: -500, z: 2000 },
      ],
      closed: true,
    },
    {
      kind: "WALL",
      id: "wall-1",
      points: [
        { x: 0, z: 0 },
        { x: 2000, z: 0 },
        { x: 2000, z: 1000 },
      ],
      closed: false,
    },
  ];

  const [rawText, setRawText] = React.useState<string>(() => stringifyPlaygroundDoc(CASES[defaultKey].data, initialEnv));
  const [raw, setRaw] = React.useState<FoundationType[]>(CASES[defaultKey].data);
  const [parseError, setParseError] = React.useState<string | null>(null);

  // view toggles (visual sanity, not CAD)
  const [showCenterline, setShowCenterline] = React.useState(true);
  const [showOffset, setShowOffset] = React.useState(true);
  const [showMarkers, setShowMarkers] = React.useState(true);
  const [highlightSpan, setHighlightSpan] = React.useState(true);
  const [showEnvironment, setShowEnvironment] = React.useState(true);

  // sectioning spacing
  const [allowedSpacingMm, setAllowedSpacingMm] = React.useState<number>(1280);

  const [generatedOffsetMm, setGeneratedOffsetMm] = React.useState<number>(0);

  // run filter (0.5.1)
  const [activeRunId, setActiveRunId] = React.useState<string>("ALL");

  // 0.5.3: marker hover/click (single source of truth)
  const [hoverMarker, setHoverMarker] = React.useState<Marker | null>(null);
  const [selectedMarker, setSelectedMarker] = React.useState<Marker | null>(null);

  const [environment, setEnvironment] = React.useState<EnvironmentShape[]>(initialEnv);

  const [selectedEnvId, setSelectedEnvId] = React.useState<string | null>(initialEnv[0]?.id ?? null);
  
  type EnvEdgeKey = string; // e.g. `${shapeId}:${segmentIndex}`

  const [selectedEnvEdges, setSelectedEnvEdges] = React.useState<Set<EnvEdgeKey>>(
    () => new Set()
  );

  const toggleEnvEdge = React.useCallback((key: EnvEdgeKey) => {
    setSelectedEnvEdges((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearEnvEdgeSelection = React.useCallback(() => {
    setSelectedEnvEdges(new Set());
  }, []);

  const syncDoc = React.useCallback(
    (nextFoundation: FoundationType[], nextEnv: EnvironmentShape[]) => {
      setRaw(nextFoundation);
      setEnvironment(nextEnv);
      setSelectedEnvEdges(new Set());
      setRawText(stringifyPlaygroundDoc(nextFoundation, nextEnv));
    },
    []
  );

  const onLoadCase = React.useCallback((key: string) => {
    const c = CASES[key];
    if (!c) return;

    const nextFoundation = c.data;
    const nextEnv: EnvironmentShape[] = []; // keep your chosen policy

    setSelectedCaseKey(key);
    setParseError(null);

    setHoverMarker(null);
    setSelectedMarker(null);

    setSelectedEnvId(nextEnv[0]?.id ?? null);

    syncDoc(nextFoundation, nextEnv);
  }, [syncDoc]);

  const onApply = React.useCallback(() => {
    const { doc, error } = parsePlaygroundDoc(rawText);
    if (!doc) {
      setParseError(error ?? "Invalid JSON");
      return;
    }

    const nextFoundation = doc.foundation_array ?? [];
    const nextEnv = doc.environment ?? [];

    setParseError(null);

    setHoverMarker(null);
    setSelectedMarker(null);

    setSelectedEnvId(nextEnv[0]?.id ?? null);

    syncDoc(nextFoundation, nextEnv);
  }, [rawText, syncDoc]);

  const derived = React.useMemo<DeriveResult>(() => {
    return deriveFromRawFoundationArray(raw, {
      spacingMm: allowedSpacingMm,
      validateInvariants: true, // Playground always validates
    });
  }, [raw, allowedSpacingMm]);

  const addEnvFloorRect = React.useCallback(() => {
    const id = uid("floor");
    const x = -500, z = -500, w = 2000, h = 1200;

    const next: EnvironmentShape[] = [
      ...environment,
      {
        kind: "FLOOR",
        id,
        points: [
          { x, z },
          { x: x + w, z },
          { x: x + w, z: z + h },
          { x, z: z + h },
        ],
        closed: true,
      },
    ];

    setSelectedEnvId(id);
    syncDoc(raw, next);
  }, [environment, raw, syncDoc]);

  const addEnvWallPolyline = React.useCallback(() => {
    const id = uid("wall");
    const next: EnvironmentShape[] = [
      ...environment,
      { kind: "WALL", id, points: [{ x: 0, z: 0 }, { x: 1500, z: 0 }], closed: false },
    ];
    setSelectedEnvId(id);
    syncDoc(raw, next);
  }, [environment, raw, syncDoc]);

  const deleteSelectedEnv = React.useCallback(() => {
    if (!selectedEnvId) return;
    const next = environment.filter((s) => s.id !== selectedEnvId);
    setSelectedEnvId(next[0]?.id ?? null);
    syncDoc(raw, next);
  }, [environment, raw, selectedEnvId, syncDoc]);

  const updateSelectedEnv = React.useCallback(
    (patch: Partial<EnvironmentShape>) => {
      if (!selectedEnvId) return;
      const next = environment.map((s) => (s.id === selectedEnvId ? ({ ...s, ...patch } as EnvironmentShape) : s));
      syncDoc(raw, next);
    },
    [environment, raw, selectedEnvId, syncDoc]
  );

  // 0.5.2: group spans/markers by run + compute run summaries + first/last marker lookup
  const inspection = React.useMemo(() => {
    const spans: Span[] = derived.postRefDerived.spans;
    const markers: Marker[] = derived.postRefDerived.markers;

    const spansByRun = new Map<string, Span[]>();
    for (const s of spans) {
      const arr = spansByRun.get(s.runId) ?? [];
      arr.push(s);
      spansByRun.set(s.runId, arr);
    }

    const markersByRun = new Map<string, Marker[]>();
    for (const m of markers) {
      const arr = markersByRun.get(m.runId) ?? [];
      arr.push(m);
      markersByRun.set(m.runId, arr);
    }

    // Ensure marker order is stable (t increases along polyline)
    for (const [rid, arr] of markersByRun.entries()) {
      arr.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
      markersByRun.set(rid, arr);
    }

    const runIds = Array.from(
      new Set([
        ...Array.from(spansByRun.keys()),
        ...Array.from(markersByRun.keys()),
        ...derived.foundationDerived.runs.map((r) => r.runId),
      ])
    ).sort((a, b) => a.localeCompare(b));

    const summaryByRun = new Map<string, { totalOffsetLengthMm: number; maxSectionLengthMm: number; spanCount: number; markerCount: number }>();

    for (const rid of runIds) {
      const rs = spansByRun.get(rid) ?? [];
      const rm = markersByRun.get(rid) ?? [];

      const totalOffsetLengthMm = rs.reduce((acc, s) => acc + (s.lengthMm ?? 0), 0);
      const maxSectionLengthMm = rs.reduce((mx, s) => Math.max(mx, s.sectionLengthMm ?? 0), 0);

      summaryByRun.set(rid, {
        totalOffsetLengthMm,
        maxSectionLengthMm,
        spanCount: rs.length,
        markerCount: rm.length,
      });
    }

    const firstLastMarkerByRun = new Map<string, { first?: Marker; last?: Marker }>();
    for (const rid of runIds) {
      const rm = markersByRun.get(rid) ?? [];
      firstLastMarkerByRun.set(rid, { first: rm[0], last: rm[rm.length - 1] });
    }

    return { runIds, spansByRun, markersByRun, summaryByRun, firstLastMarkerByRun };
  }, [derived]);

  const preview = React.useMemo(() => {
    const referenceSegments = derived.foundationDerived.referenceSegments;
    const runs = derived.foundationDerived.runs;

    // ✅ include t here too (this prevents the "Property 't' does not exist" cascade)
    const markers: Marker[] = derived.postRefDerived.markers;

    const all: Vec2[] = [];

    const envSegments = envSegmentsFromShapes(environment);
    envSegments.forEach((seg) => {
      all.push(seg.a);
      all.push(seg.b);
    });

    const perRun = runs.map((r) => {
      const c = r.centerlinePoints ?? [];
      const o = r.offsetPolylinePoints ?? [];
      c.forEach((p) => all.push(p));
      o.forEach((p) => all.push(p));

      const centerSegs: Array<{ a: Vec2; b: Vec2; type: string }> = [];
      return { runId: r.runId, center: c, offset: o, centerSegs };
    });

    markers.forEach((m) => all.push({ x: m.x, z: m.z }));

    const b = boundsOf(all);
    return { perRun, markers, bounds: b, referenceSegments, envSegments };
  }, [derived, environment]);

  // world->svg mapping: X right positive, Z down positive (screen Y down)
  const PX_PER_MM = 0.15;
  const PAD = 60;

  const spanX = Math.max(1, preview.bounds.maxX - preview.bounds.minX);
  const spanZ = Math.max(1, preview.bounds.maxZ - preview.bounds.minZ);

  const svgW = Math.ceil(spanX * PX_PER_MM + PAD * 2);
  const svgH = Math.ceil(spanZ * PX_PER_MM + PAD * 2);

  const map = React.useMemo(() => {
    const { minX, minZ } = preview.bounds;
    return (p: Vec2) => {
      const x = PAD + (p.x - minX) * PX_PER_MM;
      const y = PAD + (p.z - minZ) * PX_PER_MM; // z-down maps directly to y-down
      return { x, y };
    };
  }, [preview.bounds.minX, preview.bounds.minZ]);

  const pinned = selectedMarker ?? hoverMarker;

  const markerInfo = React.useMemo(() => {
    if (!pinned) return null;

    const decoded = decodeT(pinned.t);
    const spans = inspection.spansByRun.get(pinned.runId) ?? [];

    // If marker is exactly on a boundary (t is an integer) and not the very first marker (t=0),
    // treat it as the END of the previous span so we can still highlight the correct span.
    const isBoundary = Math.abs(decoded.within) < T_EPS;
    const spanIndexEffective = isBoundary && decoded.spanIndex > 0 ? decoded.spanIndex - 1 : decoded.spanIndex;
    const withinEffective = isBoundary && decoded.spanIndex > 0 ? 1 : decoded.within;

    const span = spans.find((s) => s.spanIndex === spanIndexEffective);

    const sections = span?.sections ?? 0;
    const sectionIndex = sections > 0 ? Math.round(withinEffective * sections) : null;

    const localDistMm = span ? withinEffective * span.lengthMm : null;

    const spacingOk = span ? span.sectionLengthMm <= allowedSpacingMm + 1e-9 : null;
    const spacingDeltaMm = span ? span.sectionLengthMm - allowedSpacingMm : null;

    return {
      ...pinned,

      // keep the "raw" decode visible if you ever want it
      spanIndex: decoded.spanIndex,
      within: decoded.within,

      // use these for span lookup / highlight correctness
      spanIndexEffective,
      withinEffective,

      sectionIndex,
      span,
      localDistMm,
      spacingOk,
      spacingDeltaMm,
    };
  }, [pinned, inspection, allowedSpacingMm]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xl font-semibold">Foundation Editor — Milestone 0 Playground</div>
        <div className="text-sm opacity-70">Standalone harness: load a case → edit RAW → derive → visual sanity check.</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="text-sm font-medium">Load test case:</div>
          <select className="rounded-xl border px-3 py-2 text-sm bg-transparent" value={selectedCaseKey} onChange={(e) => onLoadCase(e.target.value)}>
            {Object.entries(CASES).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>

          {selectedMarker ? (
            <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => setSelectedMarker(null)}>
              Clear marker
            </button>
          ) : null}

          <div className="flex items-center gap-3 text-xs opacity-80">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showCenterline} onChange={(e) => setShowCenterline(e.target.checked)} />
              Centerline
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showOffset} onChange={(e) => setShowOffset(e.target.checked)} />
              Offset
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} />
              Markers
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={highlightSpan} onChange={(e) => setHighlightSpan(e.target.checked)} />
              Highlight span
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showEnvironment} onChange={(e) => setShowEnvironment(e.target.checked)} />
              Environment
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">allowed_spacing (mm)</div>
            <input
              className="w-[120px] rounded-xl border px-3 py-2 text-sm bg-transparent"
              type="number"
              value={allowedSpacingMm}
              onChange={(e) => setAllowedSpacingMm(Number(e.target.value || 0))}
              min={1}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">generated_offset (mm)</div>
            <input
              className="w-[120px] rounded-xl border px-3 py-2 text-sm bg-transparent"
              type="number"
              value={generatedOffsetMm}
              onChange={(e) => setGeneratedOffsetMm(Number(e.target.value || 0))}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">Active run</div>
            <select className="rounded-xl border px-3 py-2 text-sm bg-transparent" value={activeRunId} onChange={(e) => setActiveRunId(e.target.value)}>
              <option value="ALL">All</option>
              {inspection.runIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>

            {activeRunId !== "ALL" ? (
              <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => setActiveRunId("ALL")}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Environment editor + RAW */}
        <div className="rounded-2xl border p-4 space-y-4">
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-medium">Environment editor (C5)</div>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border px-3 py-2 text-sm" onClick={addEnvFloorRect}>
                + FLOOR polyline
              </button>
              <button className="rounded-xl border px-3 py-2 text-sm" onClick={addEnvWallPolyline}>
                + WALL polyline
              </button>
              <button className="rounded-xl border px-3 py-2 text-sm" onClick={deleteSelectedEnv} disabled={!selectedEnvId}>
                Delete selected
              </button>
              <button
                className="rounded-xl border px-3 py-2 text-sm"
                onClick={() => {
                  const nextFoundation = foundationFromSelectedEnvironmentEdges(environment, selectedEnvEdges, {
                    runId: "ENV",
                    offsetMm: generatedOffsetMm,
                  });

                  setSelectedCaseKey("custom-env");
                  setParseError(null);
                  setHoverMarker(null);
                  setSelectedMarker(null);

                  syncDoc(nextFoundation, environment);
                }}
              >
                Generate RAW from env (C6)
              </button>
              <button
                className="rounded-xl border px-3 py-2 text-sm"
                onClick={clearEnvEdgeSelection}
                disabled={selectedEnvEdges.size === 0}
                title="Clears the currently selected FLOOR edges"
              >
                Clear edge selection ({selectedEnvEdges.size})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-2">
                <div className="text-xs font-semibold opacity-70 mb-2">Shapes</div>
                <div className="space-y-1">
                  {environment.length ? (
                    environment.map((s) => (
                      <button
                        key={s.id}
                        className={`w-full text-left rounded-lg border px-2 py-1 text-xs ${
                          s.id === selectedEnvId ? "opacity-100" : "opacity-70"
                        }`}
                        onClick={() => setSelectedEnvId(s.id)}
                      >
                        <span>
                          {s.kind} — {s.id}
                        </span>

                        {s.id === selectedEnvId ? (
                          <span className="ml-2 text-[10px] opacity-70">(selected)</span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs opacity-70">No environment shapes.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-2">
                <div className="text-xs font-semibold opacity-70 mb-2">Selected</div>
                {(() => {
                  const sel = environment.find((s) => s.id === selectedEnvId);
                  if (!sel) return <div className="text-xs opacity-70">None selected.</div>;

                  return (
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="opacity-70">kind:</span> {sel.kind}
                      </div>

                      {sel.kind === "FLOOR" ? (
                        <div className="space-y-2">
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={!!sel.closed}
                              onChange={(e) => updateSelectedEnv({ closed: e.target.checked } as any)}
                            />
                            closed loop
                          </label>

                          <label className="block space-y-1">
                            <div className="text-xs opacity-70">points (one “x,z” per line)</div>
                            <textarea
                              className="w-full h-[140px] rounded-lg border p-2 font-mono text-xs bg-transparent"
                              value={pointsText(sel.points)}
                              onChange={(e) => updateSelectedEnv({ points: parsePointsText(e.target.value) } as any)}
                            />
                          </label>
                        </div>
                      ) : sel.kind === "WALL" ? (
                        <div className="space-y-2">
                          <div className="text-xs opacity-70">Walls are open polylines (closed=false).</div>

                          <label className="block space-y-1">
                            <div className="text-xs opacity-70">points (one “x,z” per line)</div>
                            <textarea
                              className="w-full h-[140px] rounded-lg border p-2 font-mono text-xs bg-transparent"
                              value={pointsText(sel.points)}
                              onChange={(e) => updateSelectedEnv({ points: parsePointsText(e.target.value) } as any)}
                            />
                          </label>
                        </div>
                      ) : (
                        // HOB / LOW_WALL
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="space-y-1">
                              <div className="opacity-70">thicknessMm</div>
                              <input
                                className="w-full rounded-lg border px-2 py-1 bg-transparent"
                                type="number"
                                value={(sel as any).thicknessMm ?? 0}
                                onChange={(e) => updateSelectedEnv({ thicknessMm: Number(e.target.value || 0) } as any)}
                              />
                            </label>

                            <label className="space-y-1">
                              <div className="opacity-70">heightMm</div>
                              <input
                                className="w-full rounded-lg border px-2 py-1 bg-transparent"
                                type="number"
                                value={(sel as any).heightMm ?? 0}
                                onChange={(e) => updateSelectedEnv({ heightMm: Number(e.target.value || 0) } as any)}
                              />
                            </label>

                            <label className="space-y-1">
                              <div className="opacity-70">side</div>
                              <select
                                className="w-full rounded-lg border px-2 py-1 bg-transparent"
                                value={(sel as any).side ?? "LEFT"}
                                onChange={(e) => updateSelectedEnv({ side: e.target.value as any } as any)}
                              >
                                <option value="LEFT">LEFT</option>
                                <option value="RIGHT">RIGHT</option>
                              </select>
                            </label>

                            <label className="inline-flex items-center gap-2 text-xs mt-5">
                              <input
                                type="checkbox"
                                checked={!!sel.closed}
                                onChange={(e) => updateSelectedEnv({ closed: e.target.checked } as any)}
                              />
                              closed
                            </label>
                          </div>

                          <label className="block space-y-1">
                            <div className="text-xs opacity-70">points (one “x,z” per line)</div>
                            <textarea
                              className="w-full h-[140px] rounded-lg border p-2 font-mono text-xs bg-transparent"
                              value={pointsText(sel.points)}
                              onChange={(e) => updateSelectedEnv({ points: parsePointsText(e.target.value) } as any)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="text-xs opacity-70">Note: Any changes here immediately rewrite RAW JSON via stringifyPlaygroundDoc().</div>
          </div>

          <div className="font-medium">RAW PlaygroundDoc (JSON)</div>
          <textarea
            className="w-full h-[300px] rounded-xl border p-3 font-mono text-xs"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex items-center gap-3">
            <button className="rounded-xl border px-3 py-2 text-sm" onClick={onApply}>
              Apply JSON
            </button>
            {parseError ? <div className="text-sm text-red-600">{parseError}</div> : null}
          </div>
        </div>

        {/* RIGHT: SVG preview + debug + inspector */}
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-medium">2D Preview (planar X/Z)</div>
          <div className="text-sm opacity-70">Visual sanity: centerline + offset polyline + markers. Scroll to view full extents.</div>

          <div className="rounded-2xl border overflow-auto" style={{ maxWidth: 740, maxHeight: 420 }}>
            <svg width={svgW} height={svgH} className="block">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
                </pattern>
              </defs>

              <rect x="0" y="0" width={svgW} height={svgH} fill="url(#grid)" />

              {/* Environment shapes (FLOOR/WALL/etc) — C6: click-to-select + highlight */}
              {showEnvironment ? (
                <g>
                  {preview.envSegments.map((seg, i) => {
                    const a = map(seg.a);
                    const b = map(seg.b);

                    // Compute a stable "segmentIndex" per shape id, matching envSegmentsFromShapes ordering
                    // We rebuild counts here (cheap) so `${shapeId}:${segmentIndex}` matches the generator.
                    let segmentIndex = 0;
                    for (let j = 0; j < i; j++) {
                      if (preview.envSegments[j].id === seg.id) segmentIndex++;
                    }

                    const edgeKey = envEdgeKey(seg.id, segmentIndex);
                    const edgeSelected = selectedEnvEdges.has(edgeKey);

                    const kind = seg.kind.toUpperCase();
                    const isFloor = kind === "FLOOR";
                    const isWall = kind === "WALL";

                    const isSelected = seg.id === selectedEnvId;

                    const baseStrokeOpacity = isWall ? 0.95 : isFloor ? 0.35 : 0.6;
                    const baseStrokeWidth = isWall ? 3 : isFloor ? 2.5 : 2;
                    const dash = isWall ? "8 6" : undefined;

                    // Highlight selected shape by bumping opacity/width
                    const strokeOpacity = isSelected ? Math.min(1, baseStrokeOpacity + 0.35) : baseStrokeOpacity;
                    const strokeWidth = isSelected ? baseStrokeWidth + 1.5 : baseStrokeWidth;

                    // Edge selection (only for FLOOR)
                    const edgeStrokeOpacity = edgeSelected ? 0.95 : strokeOpacity;
                    const edgeStrokeWidth = edgeSelected ? strokeWidth + 2 : strokeWidth;

                    const onPick = (e: React.MouseEvent) => {
                      const kind = seg.kind.toUpperCase();

                      // Shift-click toggles edge selection (FLOOR only)
                      if (e.shiftKey && kind === "FLOOR") {
                        toggleEnvEdge(edgeKey);
                        return;
                      }

                      // Normal click selects the shape
                      setSelectedEnvId(seg.id);
                    };

                    return (
                      <g key={`env-${seg.id}-${i}`}>
                        {/* Invisible hit target (makes selection much easier) */}
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="currentColor"
                          strokeOpacity={0}
                          strokeWidth={Math.max(10, edgeStrokeWidth + 8)}
                          onClick={onPick}
                          style={{ cursor: "pointer" }}
                        />

                        {/* Visible stroke */}
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="currentColor"
                          strokeOpacity={edgeStrokeOpacity}
                          strokeWidth={edgeStrokeWidth}
                          strokeDasharray={dash}
                          onClick={onPick}
                          style={{ cursor: "pointer" }}
                        />
                      </g>
                    );
                  })}
                </g>
              ) : null}

              {/* Reference (ALL raw segments) with per-type styling */}
              {showCenterline
                ? preview.referenceSegments.map((seg, si) => {
                    const a = map(seg.a);
                    const b = map(seg.b);

                    const isSpace = isSpaceType(seg.type);
                    const isWall = isWallType(seg.type);

                    const strokeOpacity = isWall ? 0.9 : 0.35;
                    const dash = isSpace || isWall ? "6 6" : undefined;

                    return (
                      <line
                        key={`ref-${si}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="currentColor"
                        strokeOpacity={strokeOpacity}
                        strokeWidth={2}
                        strokeDasharray={dash}
                      />
                    );
                  })
                : null}

              {(activeRunId === "ALL" ? preview.perRun : preview.perRun.filter((r) => r.runId === activeRunId)).map((run, idx) => {
                const offsetPts = run.offset;

                return (
                  <g key={`${run.runId}-${idx}`}>
                    {showOffset && offsetPts.length >= 2 ? (
                      <polyline points={polylinePointsAttr(offsetPts, map)} fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="3" />
                    ) : null}

                    {showOffset && highlightSpan && markerInfo && markerInfo.runId === run.runId && markerInfo.span ? (
                      <g>
                        {(() => {
                          const a = map({ x: markerInfo.span.aX, z: markerInfo.span.aZ });
                          const b = map({ x: markerInfo.span.bX, z: markerInfo.span.bZ });
                          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={0.25} strokeWidth={8} />;
                        })()}
                        {renderSectionTicks(markerInfo.span, map)}
                      </g>
                    ) : null}

                    {showOffset && offsetPts.length >= 1 ? (
                      <>
                        {(() => {
                          const s = map(offsetPts[0]);
                          return <circle cx={s.x} cy={s.y} r={5.5} fill="#22c55e" opacity={0.95} />;
                        })()}
                        {(() => {
                          const e = map(offsetPts[offsetPts.length - 1]);
                          return <circle cx={e.x} cy={e.y} r={5.5} fill="#ef4444" opacity={0.85} />;
                        })()}
                      </>
                    ) : null}
                  </g>
                );
              })}

              {showMarkers
                ? (activeRunId === "ALL" ? preview.markers : preview.markers.filter((m) => m.runId === activeRunId)).map((m, i) => {
                    const p = map({ x: m.x, z: m.z });

                    const fl = inspection.firstLastMarkerByRun.get(m.runId);
                    const isFirst = sameT(fl?.first?.t, m.t);
                    const isLast = sameT(fl?.last?.t, m.t);

                    const fill = isFirst ? "#22c55e" : isLast ? "#ef4444" : "currentColor";
                    const opacity = isFirst || isLast ? 0.95 : 0.75;
                    const r = isFirst || isLast ? 4.5 : 3.5;

                    return (
                      <circle
                        key={`${m.runId}-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={r}
                        fill={fill}
                        opacity={opacity}
                        onMouseEnter={() => setHoverMarker({ runId: m.runId, t: m.t, x: m.x, z: m.z })}
                        onMouseLeave={() => setHoverMarker(null)}
                        onClick={() => setSelectedMarker({ runId: m.runId, t: m.t, x: m.x, z: m.z })}
                        style={{ cursor: "pointer" }}
                      />
                    );
                  })
                : null}
            </svg>
          </div>

          {/* ✅ 0.5.3: SINGLE marker inspector panel (this is the one you should see) */}
          <div className="rounded-xl border p-3 space-y-2">
            <div className="text-sm font-medium">Marker inspector</div>
            <div className="text-xs opacity-70">Hover or click a marker dot to inspect span/section mapping.</div>

            {markerInfo ? (
              <div className="text-xs space-y-1">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <span className="opacity-70">runId:</span> {markerInfo.runId}
                  </div>
                  <div>
                    <span className="opacity-70">t:</span> {markerInfo.t.toFixed(4)}
                  </div>
                  <div>
                    <span className="opacity-70">x/z:</span> ({markerInfo.x.toFixed(1)}, {markerInfo.z.toFixed(1)})
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <span className="opacity-70">spanIndex:</span> {markerInfo.spanIndexEffective}
                  </div>
                  <div>
                    <span className="opacity-70">sectionIndex:</span> {markerInfo.sectionIndex ?? "—"}
                    {markerInfo.span?.sections ? ` / ${markerInfo.span.sections}` : ""}
                  </div>
                  <div>
                    <span className="opacity-70">allowed_spacing:</span> {allowedSpacingMm}mm
                  </div>
                  <div>
                    <span className="opacity-70">sectionLength:</span>{" "}
                    {markerInfo.span?.sectionLengthMm != null ? markerInfo.span.sectionLengthMm.toFixed(2) : "—"}mm
                  </div>
                  <div>
                    <span className="opacity-70">spanLength:</span> {markerInfo.span?.lengthMm != null ? markerInfo.span.lengthMm.toFixed(2) : "—"}mm
                  </div>
                  <div>
                    <span className="opacity-70">localDist:</span> {markerInfo.localDistMm != null ? markerInfo.localDistMm.toFixed(2) : "—"}mm
                  </div>
                  {markerInfo.span ? (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1">
                      <div>
                        <span className="opacity-70">span A:</span> ({markerInfo.span.aX.toFixed(1)}, {markerInfo.span.aZ.toFixed(1)})
                      </div>
                      <div>
                        <span className="opacity-70">span B:</span> ({markerInfo.span.bX.toFixed(1)}, {markerInfo.span.bZ.toFixed(1)})
                      </div>
                      <div>
                        <span className="opacity-70">dir:</span> ({markerInfo.span.dirX.toFixed(4)}, {markerInfo.span.dirZ.toFixed(4)})
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <span className="opacity-70">spacing:</span>{" "}
                    {markerInfo.spacingOk == null ? (
                      "—"
                    ) : markerInfo.spacingOk ? (
                      "OK"
                    ) : (
                      <span className="text-red-600">
                        EXCEEDS{markerInfo.spacingDeltaMm != null ? ` by ${markerInfo.spacingDeltaMm.toFixed(2)}mm` : ""}
                      </span>
                    )}
                  </div>
                </div>

                {!markerInfo.span ? (
                  <div className="text-xs text-red-600 mt-2">
                    No span found for spanIndex {markerInfo.spanIndex} in {markerInfo.runId} (check spansByRun).
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-xs opacity-70">No marker selected.</div>
            )}
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs font-semibold opacity-70 mb-2">debug</div>
            <pre className="text-xs overflow-auto max-h-[180px]">{toPrettyJson((derived as any)?.debug ?? {})}</pre>
          </div>

          {/* 0.5.1: span + marker inspection */}
          <div className="rounded-xl border p-3 space-y-3">
            <div className="text-sm font-medium">Run inspection</div>

            {(() => {
              const runIds = activeRunId === "ALL" ? inspection.runIds : [activeRunId];

              return (
                <div className="space-y-4">
                  {runIds.map((rid) => {
                    const spans = inspection.spansByRun.get(rid) ?? [];
                    const marks = inspection.markersByRun.get(rid) ?? [];
                    const first = marks[0];
                    const last = marks[marks.length - 1];
                    const summary = inspection.summaryByRun.get(rid);

                    return (
                      <div key={rid} className="rounded-xl border p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-sm font-semibold">{rid}</div>
                          <div className="text-xs opacity-70">
                            spans: {spans.length} · markers: {marks.length}
                            {summary ? ` · total ${summary.totalOffsetLengthMm.toFixed(2)}mm · max section ${summary.maxSectionLengthMm.toFixed(2)}mm` : ""}
                            {first && last ? ` · first (${first.x.toFixed(1)}, ${first.z.toFixed(1)}) → last (${last.x.toFixed(1)}, ${last.z.toFixed(1)})` : ""}
                          </div>
                        </div>

                        <div className="mt-3 overflow-auto">
                          <table className="w-full text-xs">
                            <thead className="opacity-70">
                              <tr>
                                <th className="text-left py-1 pr-3">span</th>
                                <th className="text-left py-1 pr-3">length (mm)</th>
                                <th className="text-left py-1 pr-3">sections</th>
                                <th className="text-left py-1 pr-3">section (mm)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {spans.length ? (
                                spans.map((s) => (
                                  <tr key={`${rid}-${s.spanIndex}`} className="border-t">
                                    <td className="py-1 pr-3">{s.spanIndex}</td>
                                    <td className="py-1 pr-3">{s.lengthMm.toFixed(2)}</td>
                                    <td className="py-1 pr-3">{s.sections}</td>
                                    <td className="py-1 pr-3">{s.sectionLengthMm.toFixed(2)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr className="border-t">
                                  <td className="py-2 opacity-70" colSpan={4}>
                                    No spans for this run (no offset polyline).
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Full derived outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-medium">DERIVED foundationDerived</div>
          <pre className="text-xs overflow-auto max-h-[260px]">{toPrettyJson((derived as any)?.foundationDerived ?? {})}</pre>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-medium">DERIVED postRefDerived</div>
          <pre className="text-xs overflow-auto max-h-[260px]">{toPrettyJson((derived as any)?.postRefDerived ?? {})}</pre>
        </div>
      </div>
    </div>
  );
}