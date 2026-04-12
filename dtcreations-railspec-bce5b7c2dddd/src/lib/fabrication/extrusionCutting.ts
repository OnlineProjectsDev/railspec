// src/lib/fabrication/extrusionCutting.ts

export type CutInputRow = {
  partName: string;
  length?: number; // mm
  qty: number;
};

export type ExtrusionSpec = {
  /** Profile name (must match the partName you're feeding in, or map via aliases) */
  name: string;

  /** Max raw stock length in mm (e.g. 6500, 7000, 7200) */
  stockLength: number;

  /** Waste trimmed from each end (mm). Default 0. */
  endTrimEach?: number;

  /** Saw kerf per cut interface (mm). Default 3. */
  kerf?: number;

  /**
   * Spare bars rule: add 1 extra bar per N planned bars.
   * If omitted, uses catalog.defaults.spareBarEvery.
   * Set to 0 to disable spares for this profile.
   */
  spareBarEvery?: number;

  /** Optional alternate names that should map to this spec */
  aliases?: string[];
};

export type ExtrusionCatalog = {
  /** Default rules for any spec that doesn't override them */
  defaults: Required<Pick<ExtrusionSpec, "endTrimEach" | "kerf" | "spareBarEvery">>;
  specs: ExtrusionSpec[];
};

export type PlannedCut = {
  partName: string;
  length: number;
};

export type PlannedBar = {
  profile: string;
  stockLength: number;
  usableLength: number;
  kerf: number;
  endTrimEach: number;

  cuts: PlannedCut[];

  /** sum(cut lengths) + kerf*(cuts-1) */
  used: number;

  /** usableLength - used */
  waste: number;
};

export type CutPlan = {
  profile: string;
  bars: PlannedBar[];

  /** Planned bars actually used for parts (no spares included) */
  totalBars: number;

  /** Spare/extra bars to order (rule-based) */
  spareBars: number;

  /** totalBars + spareBars */
  totalBarsWithSpare: number;

  totalWaste: number;
  totalUsed: number;
  uncuttable: Array<{ partName: string; length: number; reason: string }>;
};

/**
 * Starter catalog.
 * Replace/extend with your real profiles + stock lengths.
 */
export const EXTRUSION_CATALOG: ExtrusionCatalog = {
  defaults: {
    endTrimEach: 20, // mm trimmed off EACH end by default
    kerf: 10, // mm kerf between pieces
    spareBarEvery: 30, // ✅ 1 extra bar per N planned bars
  },
  specs: [
    { name: "Elite Toprail", stockLength: 5600 },
    { name: "Glazing Rail", stockLength: 5600, aliases: ["Glazing Rail Top"] },
    { name: "U-Rail", stockLength: 5600, aliases: ["U-Rail Top"] },
    { name: "PST-001", stockLength: 5300 },
    { name: "19x18 Baluster", stockLength: 5600, aliases: ["Baluster", "19x18"] },

    // Example overrides:
    // { name: "Some Special Profile", stockLength: 7200, endTrimEach: 15, kerf: 10, spareBarEvery: 50 },
  ],
};

function cleanName(s: string) {
  return s.trim();
}

function buildSpecLookup(catalog: ExtrusionCatalog) {
  const map = new Map<string, ExtrusionSpec>();

  for (const spec of catalog.specs) {
    map.set(cleanName(spec.name), spec);
    for (const a of spec.aliases ?? []) {
      map.set(cleanName(a), spec);
    }
  }

  return map;
}

/**
 * Expand rows into individual cuts (qty times), filtered to valid lengths.
 * NOTE: Only rows with a numeric length participate in cut planning.
 */
export function expandCuts(rows: CutInputRow[]): PlannedCut[] {
  const out: PlannedCut[] = [];

  for (const r of rows) {
    const pn = cleanName(r.partName);
    const len = r.length;

    if (!pn) continue;
    if (typeof len !== "number" || !Number.isFinite(len) || len <= 0) continue;

    const qty =
      typeof r.qty === "number" && Number.isFinite(r.qty) && r.qty > 0 ? Math.round(r.qty) : 0;

    for (let i = 0; i < qty; i++) out.push({ partName: pn, length: Math.round(len) });
  }

  return out;
}

function computeSpareBars(totalBars: number, spareEvery: number) {
  if (!Number.isFinite(totalBars) || totalBars <= 0) return 0;
  if (!Number.isFinite(spareEvery) || spareEvery <= 0) return 0;
  // ✅ 1..N bars => 1 spare, N+1..2N => 2 spares, etc.
  return Math.ceil(totalBars / spareEvery);
}

/**
 * Bin-pack cuts into stock bars using First-Fit Decreasing (FFD).
 * - Works well in practice, fast, deterministic.
 * - Takes end trims and kerf into account.
 */
export function planExtrusionCutsForProfile(args: {
  profile: string;
  cuts: PlannedCut[];
  spec: ExtrusionSpec;
  catalog: ExtrusionCatalog;
}): CutPlan {
  const { profile, cuts, spec, catalog } = args;

  const endTrimEach = spec.endTrimEach ?? catalog.defaults.endTrimEach;
  const kerf = spec.kerf ?? catalog.defaults.kerf;

  const stockLength = spec.stockLength;
  const usableLength = stockLength - 2 * endTrimEach;

  const uncuttable: CutPlan["uncuttable"] = [];

  // Sort longest first (FFD)
  const sorted = [...cuts].sort((a, b) => b.length - a.length);

  const bars: PlannedBar[] = [];

  function barUsed(cutsInBar: PlannedCut[]) {
    if (!cutsInBar.length) return 0;
    const sumCuts = cutsInBar.reduce((s, c) => s + c.length, 0);
    const kerfTotal = kerf * Math.max(0, cutsInBar.length - 1);
    return sumCuts + kerfTotal;
  }

  function canFit(cutsInBar: PlannedCut[], nextCut: PlannedCut) {
    const nextCuts = [...cutsInBar, nextCut];
    return barUsed(nextCuts) <= usableLength;
  }

  for (const cut of sorted) {
    if (cut.length > usableLength) {
      uncuttable.push({
        partName: cut.partName,
        length: cut.length,
        reason: `Cut length ${cut.length} exceeds usable stock length ${usableLength} (stock ${stockLength} - 2*endTrim ${endTrimEach}).`,
      });
      continue;
    }

    let placed = false;

    for (const bar of bars) {
      if (canFit(bar.cuts, cut)) {
        bar.cuts.push(cut);
        placed = true;
        break;
      }
    }

    if (!placed) {
      bars.push({
        profile,
        stockLength,
        usableLength,
        kerf,
        endTrimEach,
        cuts: [cut],
        used: 0,
        waste: 0,
      });
    }
  }

  // finalize used/waste
  for (const bar of bars) {
    bar.used = barUsed(bar.cuts);
    bar.waste = Math.max(0, usableLength - bar.used);
  }

  const totalUsed = bars.reduce((s, b) => s + b.used, 0);
  const totalWaste = bars.reduce((s, b) => s + b.waste, 0);

  const totalBars = bars.length;

  const spareEvery = spec.spareBarEvery ?? catalog.defaults.spareBarEvery;
  const spareBars = computeSpareBars(totalBars, spareEvery);

  return {
    profile,
    bars,
    totalBars,
    spareBars,
    totalBarsWithSpare: totalBars + spareBars,
    totalUsed,
    totalWaste,
    uncuttable,
  };
}

/**
 * Plans cuts for all profiles that exist in the catalog.
 * Rows with part names not in the catalog are ignored (you can report them if you want).
 */
export function planExtrusionCuts(args: { rows: CutInputRow[]; catalog?: ExtrusionCatalog }) {
  const catalog = args.catalog ?? EXTRUSION_CATALOG;

  const specLookup = buildSpecLookup(catalog);
  const cuts = expandCuts(args.rows);

  // group cuts by resolved profile (via alias mapping)
  const grouped = new Map<string, { spec: ExtrusionSpec; cuts: PlannedCut[] }>();

  for (const c of cuts) {
    const spec = specLookup.get(cleanName(c.partName));
    if (!spec) continue; // not an extrusion we bin-pack (components etc)
    const profile = cleanName(spec.name);

    const g = grouped.get(profile);
    if (g) g.cuts.push(c);
    else grouped.set(profile, { spec, cuts: [c] });
  }

  const plans: CutPlan[] = [];

  for (const [profile, g] of grouped.entries()) {
    plans.push(
      planExtrusionCutsForProfile({
        profile,
        cuts: g.cuts,
        spec: g.spec,
        catalog,
      })
    );
  }

  // stable output order by profile name
  plans.sort((a, b) => a.profile.localeCompare(b.profile));

  return plans;
}
