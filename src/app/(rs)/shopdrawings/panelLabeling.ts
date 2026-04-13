// src/app/(rs)/shopdrawings/panelLabeling.ts
//
// Global panel-label evaluation for Shop Drawings.
// - Labels run continuously across ALL balconies: A..Z, AA..AZ, BA..
// - Option B uniqueness: key includes design + rounded span length + description
// - Blocks ONLY NP / EC / WC for now (S/G will be added later when conditions exist)

export type PanelLabelRow = {
  key: string; // dropDesign|length|description
  label: string; // A..Z..AA..
  length: number; // rounded mm span length
  quantity: number; // per-balcony quantity for this key
  description: string;
};

export type PanelSpanLookup = {
  key: string;
  label: string;
  infillIndex: number; // index within infill_vectors for debugging/trace
  post_id: number; // the span’s left-post id (used for adjacency gating)
  id: number; // infill vector id (used by glass linkage)
};

export type GlobalPanelLabelIndex = {
  globalKeyToLabel: Map<string, string>;
  rowsByBalconyId: Map<number, PanelLabelRow[]>;
  spansByBalconyId: Map<number, PanelSpanLookup[]>;
};

export type BalconyPartsForLabeling = {
  balconyId: number;
  dropDesign: string;

  infill_vectors: unknown[];
  post_partslist: unknown[];
  glass_infill_partslist: unknown[];
  vertical_infill_partslist: unknown[];
  midrail_partslist: unknown[];

  // If true, match ShopDrawingSheet’s state mapping behaviour for lengths:
  // - vertical length: +100
  // - midrail length: +100 unless partName === "65x16 Slat"
  normalizeLengths?: boolean;
};

type Vec3Like = { x: number; y?: number; z: number };
type InfillVectorLike = { id: number; post_id: number; left?: Vec3Like; right?: Vec3Like };
type PostLike = { id: number; type?: string };
type GlassLike = { post_id?: number; length?: number; height?: number; thickness?: number };
type VerticalLike = { post_id?: number; length?: number; partName?: string };
type MidrailLike = { post_id?: number; length?: number; partName?: string };

const BLOCKED_POST_TYPES = new Set<string>(["NP", "EC", "WC"]);

export function buildGlobalPanelLabelIndex(balconies: BalconyPartsForLabeling[]): GlobalPanelLabelIndex {
  const globalKeyToLabel = new Map<string, string>();
  const rowsByBalconyId = new Map<number, PanelLabelRow[]>();
  const spansByBalconyId = new Map<number, PanelSpanLookup[]>();

  let nextLabel = "A";

  for (const b of balconies) {
    const infillVectors = (b.infill_vectors as InfillVectorLike[]) ?? [];
    const posts = (b.post_partslist as PostLike[]) ?? [];
    const glass = (b.glass_infill_partslist as GlassLike[]) ?? [];
    const verticals = (b.vertical_infill_partslist as VerticalLike[]) ?? [];
    const midrails = (b.midrail_partslist as MidrailLike[]) ?? [];

    // per-balcony table rows (grouped by key)
    const balconyRowMap = new Map<string, PanelLabelRow>();
    const balconySpans: PanelSpanLookup[] = [];

    infillVectors.forEach((item, i) => {
      // Match your existing gating: skip first/last, skip missing geometry
      if (!item?.left || !item?.right || i === 0 || i === infillVectors.length - 1) return;

      const spanLen = Math.round(distToPointXYZ(item.left, item.right));

      // Post adjacency gating (NP/EC/WC only, for now)
      const postA = posts.find((p) => p.id === item.post_id);
      const postB = posts.find((p) => p.id === item.post_id + 1);
      if (!postA || !postB) return;

      const typeA = typeof postA.type === "string" ? postA.type : "";
      const typeB = typeof postB.type === "string" ? postB.type : "";
      if (BLOCKED_POST_TYPES.has(typeA) || BLOCKED_POST_TYPES.has(typeB)) return;

      const description = buildPanelDescription({
        dropDesign: b.dropDesign,
        infillVectorId: item.id,
        infillVectorPostId: item.post_id,
        glass_infill_partslist: glass,
        vertical_infill_partslist: verticals,
        midrail_partslist: midrails,
        normalizeLengths: b.normalizeLengths,
      });

      const key = makePanelKey({ dropDesign: b.dropDesign, length: spanLen, description });

      if (b.dropDesign === "RD-D3" || b.dropDesign === "RD-D4") {
  // console.log("index key", key, "normalize", b.normalizeLengths);
}

      let label = globalKeyToLabel.get(key);
      if (!label) {
        label = nextLabel;
        globalKeyToLabel.set(key, label);
        nextLabel = incrementExcelLabel(nextLabel);
      }

      // Record span lookup (useful for debugging/optional rendering logic)
      balconySpans.push({ key, label, infillIndex: i, post_id: item.post_id, id: item.id });

      // Update per-balcony table grouping
      const existingRow = balconyRowMap.get(key);
      if (existingRow) {
        existingRow.quantity += 1;
      } else {
        balconyRowMap.set(key, { key, label, length: spanLen, quantity: 1, description });
      }
    });

    rowsByBalconyId.set(b.balconyId, [...balconyRowMap.values()]);
    spansByBalconyId.set(b.balconyId, balconySpans);
  }

  return { globalKeyToLabel, rowsByBalconyId, spansByBalconyId };
}

export function makePanelKey(args: { dropDesign: string; length: number; description: string }): string {
  return `${args.dropDesign}|${args.length}|${args.description}`;
}

export function buildPanelDescription(args: {
  dropDesign: string;
  infillVectorId: number; // item.id (used by glass linkage)
  infillVectorPostId: number; // item.post_id (used by vertical/midrail linkage)
  glass_infill_partslist: GlassLike[];
  vertical_infill_partslist: VerticalLike[];
  midrail_partslist: MidrailLike[];
  normalizeLengths?: boolean;
}): string {
  const glassForPanel = args.glass_infill_partslist.find((g) => g.post_id === args.infillVectorId);
  const vertsForPanel = args.vertical_infill_partslist.filter((v) => v.post_id === args.infillVectorPostId);
  const midRailsForPanel = args.midrail_partslist.filter((m) => m.post_id === args.infillVectorPostId);

  const makeGlassDesc = () =>
    glassForPanel
      ? `Glass ${Math.round(toNumber(glassForPanel.length))}x${Math.round(toNumber(glassForPanel.height))}x${Math.round(
          toNumber(glassForPanel.thickness)
        )}mm`
      : "";

    const makeBalusterDesc = () => {
    const first = vertsForPanel[0];
    if (!first) return "";
    const len = Math.round(normalizedVerticalLength(first, args.normalizeLengths));
    // console.log("VERT len raw", first?.length, "normalize?", args.normalizeLengths);
    return `${vertsForPanel.length} x 19x18x${len} SQ Balusters`;
    };

    const makeSlatDesc = () => {
    const first = vertsForPanel[0];
    if (!first) return "";
    const len = Math.round(normalizedVerticalLength(first, args.normalizeLengths));
    // console.log("VERT len raw", first?.length, "normalize?", args.normalizeLengths);
    return `${vertsForPanel.length} x 65x16x${len} SLATS`;
    };


  const makeMidrailDesc = () => {
    const first = midRailsForPanel[0];
    if (!first) return "";
    const len = Math.round(normalizedMidrailLength(first, args.normalizeLengths));
    return `${midRailsForPanel.length} x 65x16x${len} SLATS`;
  };

  switch (args.dropDesign) {
    case "RD-D1":
    case "RD-D2":
    case "RD-D6":
    case "RD-D7":
    case "RD-D8":
    case "RD-D10":
    case "RD-D11":
    case "RD-D12":
    case "RD-D13":
    case "RD-D14":
      return makeGlassDesc();
    case "RD-D3":
      return makeBalusterDesc();
    case "RD-D4":
      return makeBalusterDesc();
    case "RD-D3SLATS":
      return makeSlatDesc();
    case "RD-D4SLATS":
      return makeSlatDesc();
    case "RD-D5":
      return makeMidrailDesc();
    default:
      return "";
  }
}

// ------------------------------------------------------------
// Internal helpers (kept local to avoid dependency assumptions)
// ------------------------------------------------------------

function distToPointXYZ(a: Vec3Like, b: Vec3Like): number {
  const dx = a.x - b.x;
  const dy = (a.y ?? 0) - (b.y ?? 0);
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizedVerticalLength(v: VerticalLike, normalize?: boolean): number {
  const base = toNumber(v.length);

  // RD-D3/RD-D4 style: always +100 when normalize is requested
  if (normalize) return base + 100;

  return base;
}


function normalizedMidrailLength(m: MidrailLike, normalize?: boolean): number {
  const base = toNumber(m.length);
  if (!normalize) return base;
  const name = typeof m.partName === "string" ? m.partName : "";
  return name === "65x16 Slat" ? base : base + 100;
}

// Strict Excel-style uppercase increment:
// A..Z, AA..AZ, BA..BZ, ...
function incrementExcelLabel(label: string): string {
  // Assumes valid uppercase A-Z string (caller controls start value)
  let result = "";
  let carry = 1;

  for (let i = label.length - 1; i >= 0; i--) {
    const charCode = label.charCodeAt(i) - 65; // A=0..Z=25
    const next = charCode + carry;

    if (next === 26) {
      result = "A" + result;
      carry = 1;
    } else {
      result = String.fromCharCode(65 + next) + result;
      carry = 0;
    }
  }

  if (carry === 1) result = "A" + result;

  return result;
}
