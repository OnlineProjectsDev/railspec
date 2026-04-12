// src/app/(rs)/foundation-editor/derive/deriveAdapter.ts
import type { FoundationType } from "./foundationTypes";

export type DeriveOptions = {
  spacingMm: number; // allowed_spacing (max section length)
  validateInvariants?: boolean; // dev-only toggle (defaults true in dev, false in prod)
};

export type Vec2 = { x: number; z: number };

type RunPreview = {
  runId: string;
  centerlinePoints: Vec2[]; // solid-only reference (for sanity). Full reference path is in foundationDerived.referencePoints
  offsetPolylinePoints: Vec2[];
  bbox: { minX: number; minZ: number; maxX: number; maxZ: number };
  turns: Array<{
    vertexIndex: number; // index into offsetPolylinePoints (interior vertices only)
    angleDeg: number; // signed; + = right turn (clockwise), - = left turn
    type: "STRAIGHT" | "LEFT" | "RIGHT";
    corner: "NONE" | "INSIDE" | "OUTSIDE";
  }>;
  debug?: {
    solidCount: number;
    startTrimMm: number;
    endTrimMm: number;
    startTrimSourceIndex: number | null;
    endTrimSourceIndex: number | null;
  };
};

export type DeriveResult = {
  foundationDerived: {
  referencePoints: Vec2[]; // dotted grey path: ALL raw segments (including SPACE/WALL/gaps)
  referenceSegments: Array<{ a: Vec2; b: Vec2; type: string }>; // ✅ typed segments for styling
  runs: RunPreview[]; // solid stretches only (FLOOR/HOB/LOW_WALL)
};
  postRefDerived: {
    markers: Array<{ runId: string; x: number; z: number; t: number }>;
    spans: Array<{ runId: string; spanIndex: number; lengthMm: number; sections: number; sectionLengthMm: number; dirX: number; dirZ: number; aX: number; aZ: number; bX: number; bZ: number; }>;
  };
  debug?: {
    spacingMm: number;
    runCount: number;
    note: string;
    warnings: string[];
    invariants: {
      runsChecked: number;
      spansChecked: number;
      markersChecked: number;
      violations: number;
    };
  };
};

// ------------------------------
// helpers (math)
// ------------------------------
const EPS = 1e-9;

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function clampAngleDeg(a: number) {
  let x = a;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}
function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}
function mul(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, z: a.z * s };
}
function dot(a: Vec2, b: Vec2) {
  return a.x * b.x + a.z * b.z;
}
function cross(a: Vec2, b: Vec2) {
  return a.x * b.z - a.z * b.x;
}
function len(a: Vec2) {
  return Math.hypot(a.x, a.z);
}
function norm(a: Vec2): Vec2 {
  const L = len(a);
  if (L < EPS) return { x: 0, z: 0 };
  return { x: a.x / L, z: a.z / L };
}

/**
 * Heading convention (matches your clarified UX):
 * - x increases left->right
 * - z increases top->bottom
 * - positive heading angle rotates clockwise (0 => +X, +90 => +Z)
 */
function dirFromHeadingDeg(headingDeg: number): Vec2 {
  const r = degToRad(headingDeg);
  return { x: Math.cos(r), z: Math.sin(r) };
}

/**
 * User-facing "angle between segments":
 * - 180 means straight (no turn)
 * - +90 means right turn
 * - -90 means left turn
 *
 * Therefore per segment the heading delta is: turnDeg = (180 - angleDeg)
 */
function applySegmentAngleToHeading(prevHeadingDeg: number, segmentAngleDeg: number): number {
  const a = clampAngleDeg(segmentAngleDeg);
  const turnDeg = 180 - a;
  return prevHeadingDeg + turnDeg;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ------------------------------
// domain helpers
// ------------------------------
function roleOf(row: FoundationType) {
  return row.meta?.role;
}

function isRunBreak(row: FoundationType) {
  return roleOf(row) === "RUN_BREAK";
}

function isSolidSupportType(type: string) {
  return type === "FLOOR" || type === "HOB" || type === "LOW_WALL";
}

/**
 * "Trim influencer" types: wall/space surfaces that do NOT draw solid balustrade,
 * but shorten/extend the computed OFFSET path at adjacent ends using their row.offset.
 */
function isTrimInfluencerType(type: string) {
  return type === "WALL" || type === "SPACE";
}

// ------------------------------
// offset polyline building
// ------------------------------

/**
 * Right normal (positive offset goes to the RIGHT of the reference direction)
 * For dir=(+1,0) => right is +z, so normal=(0,+1) => (-dir.z, dir.x)
 */
function rightNormal(dir: Vec2): Vec2 {
  return { x: -dir.z, z: dir.x };
}

function intersectLines(p: Vec2, r: Vec2, q: Vec2, s: Vec2): Vec2 | null {
  // p + t r = q + u s
  const rxs = cross(r, s);
  if (Math.abs(rxs) < EPS) return null; // parallel
  const t = cross(sub(q, p), s) / rxs;
  return add(p, mul(r, t));
}

type SolidSeg = {
  start: Vec2;
  end: Vec2;
  dir: Vec2; // unit
  offsetMm: number; // parallel offset distance for this seg (mm)
};

function buildOffsetPolylineFromSolidSegments(segs: SolidSeg[], startTrimMm: number, endTrimMm: number, warnings: string[]) {
  if (segs.length === 0) return [];

  // Build per-seg offset lines
  const oStarts: Vec2[] = [];
  const oEnds: Vec2[] = [];

  for (const s of segs) {
    const n = rightNormal(s.dir);
    const off = isFiniteNum(s.offsetMm) ? s.offsetMm : 0;
    oStarts.push(add(s.start, mul(n, off)));
    oEnds.push(add(s.end, mul(n, off)));
  }

  // Corner intersection joining (parallel lines that intersect at a dot)
  const pts: Vec2[] = [];
  pts.push(oStarts[0]);
  const joinFallbackAt: number[] = [];

  for (let i = 0; i < segs.length - 1; i++) {
    const a0 = oStarts[i];
    const a1 = oEnds[i];
    const b0 = oStarts[i + 1];
    const b1 = oEnds[i + 1];

    const ar = sub(a1, a0);
    const bs = sub(b1, b0);

    const p = intersectLines(a0, ar, b0, bs);
    if (p) {
      pts.push(p);
    } else {
      // parallel or near-parallel: fall back to end of current
      joinFallbackAt.push(i);
      pts.push(a1);
    }
  }

  pts.push(oEnds[oEnds.length - 1]);

  if (joinFallbackAt.length > 0) {
    warnings.push(
      `[0.6] offset join fallback used ${joinFallbackAt.length} time(s) at joins: ${joinFallbackAt.join(", ")} (near-parallel segments)`
    );
  }



  // Apply trims ALONG run direction (as-if 90° trim), per your rule:
  // - positive trim shortens
  // - negative trim elongates
  // Start trim uses first solid direction; end trim uses last solid direction.
  if (pts.length >= 2) {
    const firstDir = segs[0].dir;
    const lastDir = segs[segs.length - 1].dir;

    // start: move forward by +trim (negative extends backwards)
    pts[0] = add(pts[0], mul(firstDir, startTrimMm));

    // end: shorten by moving backwards by +trim => subtract lastDir * trim
    pts[pts.length - 1] = add(pts[pts.length - 1], mul(lastDir, -endTrimMm));

    // sanity: if trims invert a tiny polyline, keep but warn
    if (len(sub(pts[pts.length - 1], pts[0])) < 0.5 && segs.length === 1) {
      warnings.push("Trim distances nearly collapsed a 1-span offset polyline.");
    }
  }

  return pts;
}

// ------------------------------
// sectioning (matches DropAnalyser intent: equal sections per span, cap by spacing)
// ------------------------------
function buildMarkersAndSpansFromOffsetRuns(runs: RunPreview[], spacingMm: number) {
  const markers: Array<{ runId: string; x: number; z: number; t: number }> = [];
  const spans: Array<{ runId: string; spanIndex: number; lengthMm: number; sections: number; sectionLengthMm: number; dirX: number; dirZ: number;  aX: number; aZ: number; bX: number; bZ: number; }> = [];

  let skippedZeroLenSpans = 0;
  let skippedRunsNoPts = 0;

  for (const run of runs) {
    const pts = run.offsetPolylinePoints;
    if (!pts || pts.length < 2) {
      skippedRunsNoPts++;
      continue;
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const v = sub(b, a);
      const L = len(v);

      if (L < 1e-6) {
        skippedZeroLenSpans++;
        continue;
      }

      const sections = Math.max(1, Math.ceil(L / Math.max(1, spacingMm)));
      const step = L / sections;

      const dir = mul(v, 1 / L);

      spans.push({
        runId: run.runId,
        spanIndex: i,
        lengthMm: L,
        sections,
        sectionLengthMm: step,
        dirX: dir.x,
        dirZ: dir.z,
        aX: a.x,
        aZ: a.z,
        bX: b.x,
        bZ: b.z,
      });

      for (let s = 0; s <= sections; s++) {
        // avoid double-adding the first marker of spans after the first (it matches previous span end)
        if (i > 0 && s === 0) continue;

        const p = add(a, mul(dir, step * s));
        markers.push({ runId: run.runId, x: p.x, z: p.z, t: i + s / sections });
      }
    }
  }

  return { markers, spans, skippedZeroLenSpans, skippedRunsNoPts };
}

function validateInvariants(
  runs: RunPreview[],
  postRef: {
    markers: Array<{ runId: string; x: number; z: number; t: number }>;
    spans: Array<{ runId: string; spanIndex: number; lengthMm: number; sections: number; sectionLengthMm: number; dirX: number; dirZ: number; aX: number; aZ: number; bX: number; bZ: number; }>;
  },
  spacingMm: number,
  warnings: string[]
) {
  let violations = 0;

  // Group by runId for checks
  const spansByRun = new Map<string, Array<{ runId: string; spanIndex: number; lengthMm: number; sections: number; sectionLengthMm: number }>>();
  for (const s of postRef.spans) {
    const arr = spansByRun.get(s.runId) ?? [];
    arr.push(s);
    spansByRun.set(s.runId, arr);
  }
  for (const [rid, arr] of spansByRun) {
    arr.sort((a, b) => a.spanIndex - b.spanIndex);
    spansByRun.set(rid, arr);
  }

  const markersByRun = new Map<string, Array<{ runId: string; x: number; z: number; t: number }>>();
  for (const m of postRef.markers) {
    const arr = markersByRun.get(m.runId) ?? [];
    arr.push(m);
    markersByRun.set(m.runId, arr);
  }
  for (const [rid, arr] of markersByRun) {
    arr.sort((a, b) => a.t - b.t);
    markersByRun.set(rid, arr);
  }

  const runById = new Map(runs.map((r) => [r.runId, r] as const));

  for (const m of postRef.markers) {
    if (!runById.has(m.runId)) {
      warnings.push(`[0.6.3] marker references unknown runId ${m.runId}`);
      violations++;
      break;
    }
  }
  for (const s of postRef.spans) {
    if (!runById.has(s.runId)) {
      warnings.push(`[0.6.3] span references unknown runId ${s.runId}`);
      violations++;
      break;
    }
  }

  // ---- 0.6.1 Deterministic section guarantees
  for (const [rid, arr] of spansByRun) {
    for (const s of arr) {
      if (!(s.sections >= 1)) {
        warnings.push(`[0.6.1] run ${rid} span ${s.spanIndex}: sections < 1 (${s.sections})`);
        violations++;
      }
      const expected = s.lengthMm / Math.max(1, s.sections);
      if (Math.abs(expected - s.sectionLengthMm) > 1e-6) {
        warnings.push(`[0.6.1] run ${rid} span ${s.spanIndex}: sectionLength drift (expected ${expected.toFixed(6)} got ${s.sectionLengthMm.toFixed(6)})`);
        violations++;
      }
      if (s.sectionLengthMm - spacingMm > 1e-6) {
        // This should never happen if sectioning is correct; keep as a canary
        warnings.push(`[0.6.1] run ${rid} span ${s.spanIndex}: sectionLength exceeds spacing (${s.sectionLengthMm.toFixed(3)} > ${spacingMm})`);
        violations++;
      }
    }
  }

  // ---- 0.6.2 Marker invariants (t monotonic, endpoints exist)
  for (const [rid, marr] of markersByRun) {
    // t strictly increasing
    for (let i = 1; i < marr.length; i++) {
      if (!(marr[i].t > marr[i - 1].t + 1e-12)) {
        warnings.push(`[0.6.2] run ${rid}: marker t not strictly increasing at index ${i} (${marr[i - 1].t} -> ${marr[i].t})`);
        violations++;
        break;
      }
    }

    // boundary checks: first t should be 0 for runs that have spans
    const spans = spansByRun.get(rid) ?? [];

    if (spans.length > 0) {
      const expected = 1 + spans.reduce((acc, s) => acc + Math.max(1, s.sections), 0);
      if (marr.length !== expected) {
        warnings.push(`[0.6.2] run ${rid}: marker count mismatch (expected ${expected} got ${marr.length})`);
        violations++;
      }
    }

    if (spans.length > 0) {
      const first = marr[0];
      const last = marr[marr.length - 1];
      const expectedFirstT = spans[0].spanIndex; // typically 0
      const expectedLastT = spans[spans.length - 1].spanIndex + 1;

      if (!first || Math.abs(first.t - expectedFirstT) > 1e-9) {
        warnings.push(`[0.6.2] run ${rid}: first marker t mismatch (expected ${expectedFirstT} got ${first?.t ?? "none"})`);
        violations++;
      }
      if (!last || Math.abs(last.t - expectedLastT) > 1e-9) {
        warnings.push(`[0.6.2] run ${rid}: last marker t mismatch (expected ${expectedLastT} got ${last?.t ?? "none"})`);
        violations++;
      }

      // for every spanIndex i, ensure a marker exists at t=i and t=i+1
      // (note: we intentionally de-dup boundary markers, so t=i may come from previous span end)
      const tSet = new Set(marr.map((m) => m.t.toFixed(12)));
      for (const s of spans) {
        const aKey = s.spanIndex.toFixed(12);
        const bKey = (s.spanIndex + 1).toFixed(12);
        if (!tSet.has(aKey)) {
          warnings.push(`[0.6.2] run ${rid} span ${s.spanIndex}: missing boundary marker at t=${s.spanIndex}`);
          violations++;
        }
        if (!tSet.has(bKey)) {
          warnings.push(`[0.6.2] run ${rid} span ${s.spanIndex}: missing boundary marker at t=${s.spanIndex + 1}`);
          violations++;
        }
      }
    }
  }

  // ---- 0.6.4 Corner integrity (no duplicate boundary markers + endpoint alignment)
  for (const [rid, run] of runById) {
    const pts = run.offsetPolylinePoints ?? [];
    const spans = spansByRun.get(rid) ?? [];
    const marr = markersByRun.get(rid) ?? [];

    if (spans.length > 0 && pts.length >= 2) {
      const expectedSpanCount = pts.length - 1;
      if (spans.length !== expectedSpanCount) {
        warnings.push(`[0.6.4] run ${rid}: span count mismatch vs offset segments (spans=${spans.length}, offsetSegs=${expectedSpanCount})`);
        violations++;
      }

      // also ensure spanIndex set is exactly [0..expectedSpanCount-1]
      const spanIndexSet = new Set(spans.map((s) => s.spanIndex));
      for (let si = 0; si < expectedSpanCount; si++) {
        if (!spanIndexSet.has(si)) {
          warnings.push(`[0.6.4] run ${rid}: missing spanIndex ${si} (expected 0..${expectedSpanCount - 1})`);
          violations++;
          break;
        }
      }
    }


    if (pts.length < 2 || spans.length === 0 || marr.length === 0) continue;

    // (A) no duplicate t values
    for (let i = 1; i < marr.length; i++) {
      if (Math.abs(marr[i].t - marr[i - 1].t) < 1e-12) {
        warnings.push(`[0.6.4] run ${rid}: duplicate marker t at ${marr[i].t}`);
        violations++;
        break;
      }
    }

    // (B) boundary marker positions align to polyline vertices (t=i matches pts[i])
    // This uses your confirmed mapping: spanIndex corresponds to offset segment index.
    const byT = new Map<string, { x: number; z: number; t: number }>();
    for (const m of marr) byT.set(m.t.toFixed(12), m);

    for (let i = 0; i < pts.length; i++) {
      const key = i.toFixed(12);
      const m = byT.get(key);
      if (!m) continue; // already warned above if missing
      const dx = m.x - pts[i].x;
      const dz = m.z - pts[i].z;
      const delta = Math.hypot(dx, dz);
      if (delta > 1e-3) {
        const tag = delta > 1e-1 ? "[0.6 CRITICAL]" : "[0.6.4]";
        warnings.push(`${tag} run ${rid}: boundary marker at t=${i} not aligned to offset vertex ${i} (Δ=${delta.toFixed(6)}mm)`);
        violations++;
        if (delta > 1e-1) break; // only break on critical
      }
    }
  }

  // ---- 0.6.5 Zero-length safety: we don’t crash, but warn if spans were skipped
  // We can’t see skipped spans directly here without instrumentation, so this is a placeholder
  // (see step 3 below to add explicit skipped count warning).

  return {
    runsChecked: runs.length,
    spansChecked: postRef.spans.length,
    markersChecked: postRef.markers.length,
    violations,
  };
}

// ------------------------------
// main derive
// ------------------------------

/**
 * Milestone 0.3 (current confirmed logic):
 * - Dotted reference path (foundationDerived.referencePoints) walks ALL raw segments in order.
 *   - Uses accumulated angles with user-facing angles: heading += (180 - angle)
 *   - 180 = straight
 *   - +90 = right turn, -90 = left turn
 *   - z increases downward
 * - Solid balustrade offset path is computed ONLY for SOLID types: FLOOR/HOB/LOW_WALL
 * - SPACE/WALL rows:
 *   - are still part of the dotted reference path
 *   - do NOT draw as solid
 *   - DO trim adjacent solid offset path ends using their row.offset (shorten if +, extend if -)
 *   - adjacency rule: only the nearest SPACE/WALL to an end influences that trim
 *     - if there is only ONE SPACE/WALL between end and next start, it applies to BOTH ends (by adjacency)
 * - RUN_BREAK:
 *   - ends the current solid stretch group
 *   - may include a length (gap) that advances the dotted reference cursor
 *   - if it's also a SPACE, it can act as a trim influencer for both sides by the same adjacency behavior
 * - Raw x/z are ignored for now unless you explicitly move to compute from them later.
 */
export function deriveFromRawFoundationArray(raw: FoundationType[], opts?: DeriveOptions): DeriveResult {
  const spacingMm = Math.max(1, opts?.spacingMm ?? 1280);
  const warnings: string[] = [];

  const validate =
    typeof opts?.validateInvariants === "boolean"
      ? opts.validateInvariants
      : process.env.NODE_ENV !== "production";

  // Full dotted reference walk
  const referencePoints: Vec2[] = [];

  const referenceSegments: Array<{ a: Vec2; b: Vec2; type: string }> = [];

  // We build solid runs as contiguous SOLID stretches.
  const runs: RunPreview[] = [];

  let cursor: Vec2 = { x: 0, z: 0 };
  let headingDeg = 0;

  referencePoints.push({ ...cursor });

  // Solid-stretch state
  let solidSegs: SolidSeg[] = [];
  let solidCenterPts: Vec2[] = []; // start->end chain for the solid stretch

  let pendingStartTrimMm = 0;
  let pendingStartTrimSourceIndex: number | null = null;

  let pendingEndTrimMm = 0;
  let pendingEndTrimSourceIndex: number | null = null;

  // last seen trim influencer (for applying to the START of the next solid stretch)
  let lastTrimInfluencerMm = 0;
  let lastTrimInfluencerIndex: number | null = null;

  let runCounter = 1;

  const flushSolidStretch = () => {
    if (solidSegs.length === 0) return;

    const startTrimMm = pendingStartTrimMm;
    const endTrimMm = pendingEndTrimMm;

    const offsetPolylinePoints = buildOffsetPolylineFromSolidSegments(solidSegs, startTrimMm, endTrimMm, warnings);

    let bbox: { minX: number; minZ: number; maxX: number; maxZ: number };

    if (offsetPolylinePoints.length > 0) {
      let minX = offsetPolylinePoints[0].x;
      let maxX = offsetPolylinePoints[0].x;
      let minZ = offsetPolylinePoints[0].z;
      let maxZ = offsetPolylinePoints[0].z;

      for (let p = 1; p < offsetPolylinePoints.length; p++) {
        const pt = offsetPolylinePoints[p];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.z < minZ) minZ = pt.z;
        if (pt.z > maxZ) maxZ = pt.z;
      }

      bbox = { minX, minZ, maxX, maxZ };
    } else {
      // deterministic degenerate bbox when no points exist
      bbox = { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
    }

    const turns: Array<{ vertexIndex: number; angleDeg: number; type: "STRAIGHT" | "LEFT" | "RIGHT"; corner: "NONE" | "INSIDE" | "OUTSIDE"; }> = [];
    const TURN_EPS_DEG = 0.5;

    if (offsetPolylinePoints.length >= 3) {
      for (let vi = 1; vi < offsetPolylinePoints.length - 1; vi++) {
        const p0 = offsetPolylinePoints[vi - 1];
        const p1 = offsetPolylinePoints[vi];
        const p2 = offsetPolylinePoints[vi + 1];

        const v0 = sub(p1, p0);
        const v1 = sub(p2, p1);

        const L0 = len(v0);
        const L1 = len(v1);
        if (L0 < 1e-9 || L1 < 1e-9) continue;

        const d0 = mul(v0, 1 / L0);
        const d1 = mul(v1, 1 / L1);

        const c = cross(d0, d1);
        const d = dot(d0, d1);

        const angleDeg = (Math.atan2(c, d) * 180) / Math.PI;

        let type: "STRAIGHT" | "LEFT" | "RIGHT" = "STRAIGHT";
        if (Math.abs(angleDeg) >= TURN_EPS_DEG) type = angleDeg > 0 ? "RIGHT" : "LEFT";

        const corner: "NONE" | "INSIDE" | "OUTSIDE" = type === "STRAIGHT" ? "NONE" : type === "RIGHT" ? "INSIDE" : "OUTSIDE";
        turns.push({ vertexIndex: vi, angleDeg, type, corner });
      }
    }

    runs.push({
      runId: `RUN_${runCounter}`,
      centerlinePoints: solidCenterPts.length >= 2 ? solidCenterPts : [solidSegs[0].start, solidSegs[solidSegs.length - 1].end],
      offsetPolylinePoints,
      bbox,
      turns,
      debug: {
        solidCount: solidSegs.length,
        startTrimMm,
        endTrimMm,
        startTrimSourceIndex: pendingStartTrimSourceIndex,
        endTrimSourceIndex: pendingEndTrimSourceIndex,
      },
    });

    runCounter += 1;

    solidSegs = [];
    solidCenterPts = [];

    pendingStartTrimMm = 0;
    pendingStartTrimSourceIndex = null;
    pendingEndTrimMm = 0;
    pendingEndTrimSourceIndex = null;
  };

  const endCurrentSolidBecauseOfInfluencer = (trimMm: number, trimIndex: number) => {
    if (solidSegs.length === 0) return;

    // "only adjacent influencer applies": for ending, it's the FIRST influencer encountered after the solid
    pendingEndTrimMm = trimMm;
    pendingEndTrimSourceIndex = trimIndex;

    flushSolidStretch();
  };

  const beginSolidStretchIfNeeded = () => {
    if (solidSegs.length > 0) return;

    // If we have a trim influencer immediately before the start, it trims the start.
    pendingStartTrimMm = lastTrimInfluencerMm;
    pendingStartTrimSourceIndex = lastTrimInfluencerIndex;

    // reset "last influencer" so a chain of influencers still makes the LAST one adjacent to the start
    // (we overwrite it as we keep walking non-solids).
  };

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];

    const L = isFiniteNum(row.length) ? row.length : 0;
    const a = isFiniteNum(row.angle) ? row.angle : 180;

    // Update heading for this row (even for SPACE/WALL and RUN_BREAK)
    headingDeg = applySegmentAngleToHeading(headingDeg, a);
    const dir = dirFromHeadingDeg(headingDeg);

    // Compute this row's segment on the dotted path
    const start = cursor;
    const end = add(cursor, mul(dir, L));
    cursor = end;

    referencePoints.push({ ...cursor });

    if (len(sub(end, start)) > EPS) {
      referenceSegments.push({ a: { ...start }, b: { ...end }, type: row.type });
    }

    const rowType = row.type;
    const solid = isSolidSupportType(rowType);
    const influencer = isTrimInfluencerType(rowType);

    // If this row is a RUN_BREAK, it ends the current solid stretch grouping.
    // Also, if RUN_BREAK is a SPACE influencer by type, it can be used as trim.
    if (isRunBreak(row)) {
      // If we were in solid, and this break has influencer behavior, it trims end.
      if (influencer) {
        endCurrentSolidBecauseOfInfluencer(isFiniteNum(row.offset) ? row.offset : 0, i);
      } else {
        flushSolidStretch();
      }

      // Update last influencer for the NEXT start (adjacent on the other side of the break)
      if (influencer) {
        lastTrimInfluencerMm = isFiniteNum(row.offset) ? row.offset : 0;
        lastTrimInfluencerIndex = i;
      }

      continue;
    }

    // Non-solid influencer (SPACE/WALL):
    // - It is part of the dotted path already.
    // - It trims the END of a solid stretch if we are currently in one.
    // - It becomes the "last influencer" for the START of the next solid stretch.
    if (!solid && influencer) {
      if (solidSegs.length > 0) {
        endCurrentSolidBecauseOfInfluencer(isFiniteNum(row.offset) ? row.offset : 0, i);
      }
      // Adjacent-to-start uses the LAST influencer before the solid begins
      lastTrimInfluencerMm = isFiniteNum(row.offset) ? row.offset : 0;
      lastTrimInfluencerIndex = i;
      continue;
    }

    // Other non-solid, non-influencer (e.g. environment/path segments you might add later):
    // - If we are in a solid stretch and hit ANY non-solid length segment, we must break,
    //   otherwise we'd incorrectly bridge gaps.
    if (!solid) {
      flushSolidStretch();
      continue;
    }

    // Solid segment (FLOOR/HOB/LOW_WALL)
    beginSolidStretchIfNeeded();

    // For solid-only centerline chain:
    if (solidCenterPts.length === 0) solidCenterPts.push({ ...start });
    solidCenterPts.push({ ...end });

    // For offset polyline building:
    const segDir = norm(sub(end, start));
    const segOffset = isFiniteNum(row.offset) ? row.offset : 0;

    solidSegs.push({ start: { ...start }, end: { ...end }, dir: segDir, offsetMm: segOffset });

    // Once solid begins, any earlier influencer is now "consumed" as start-adjacent
    // (but we keep lastTrimInfluencer as-is; it will be overwritten by the next influencer encountered).
  }

  // flush trailing solid stretch
  flushSolidStretch();

  // Markers/spans from OFFSET polylines
  const postRefDerived = buildMarkersAndSpansFromOffsetRuns(runs, spacingMm);

  // 0.6(B): visible invariant warnings in debug panel
  if (postRefDerived.skippedRunsNoPts > 0) {
    warnings.push(`[0.6.5] skipped ${postRefDerived.skippedRunsNoPts} run(s) with <2 offset points`);
  }
  if (postRefDerived.skippedZeroLenSpans > 0) {
    warnings.push(`[0.6.5] skipped ${postRefDerived.skippedZeroLenSpans} zero-length span(s)`);
  }

  const invariants = validate
    ? validateInvariants(runs, postRefDerived, spacingMm, warnings)
    : {
        runsChecked: runs.length,
        spansChecked: postRefDerived.spans.length,
        markersChecked: postRefDerived.markers.length,
        violations: 0,
      };

  return {
    foundationDerived: {
      referencePoints,
      referenceSegments,
      runs,
    },
    postRefDerived,
    debug: {
      spacingMm,
      runCount: runs.length,
      note:
        "Milestone 0.3: dotted reference walks ALL raw segments using accumulated user-facing angles (180 straight, +90 right). Solid OFFSET uses FLOOR/HOB/LOW_WALL only. SPACE/WALL trims adjacent solid ends using row.offset (positive shortens, negative extends). Positive offset is to the RIGHT.",
      warnings,
      invariants,
    },
  };
}