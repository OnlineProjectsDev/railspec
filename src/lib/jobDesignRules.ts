// lib/jobDesignRules.ts

// This should match your job wind_load type
export type WindLoad = {
  bldg_height: number;
  wind_region: "A" | "B" | "C" | "D";
  terrain_category: number;
};

export type DesignCode =
  | "RD-D1"
  | "RD-D2"
  | "RD-D3"
  | "RD-D3SLATS"
  | "RD-D4"
  | "RD-D4SLATS"
  | "RD-D5"
  | "RD-D6"
  | "RD-D7"
  | "RD-D8"
  | "RD-D9"
  | "RD-D10"
  | "RD-D11"
  | "RD-D12"
  | "RD-D13";

export const ALL_DESIGN_OPTIONS: DesignOption[] = [
  { id: "RD-D1", label: "RD-D1", image: "/images/designs/RD-D1.png" },
  { id: "RD-D2", label: "RD-D2", image: "/images/designs/RD-D2.png" },
  { id: "RD-D3", label: "RD-D3", image: "/images/designs/RD-D3.png" },
  { id: "RD-D3SLATS", label: "RD-D3 SLATS", image: "/images/designs/RD-D3SLATS.png" },
  { id: "RD-D4", label: "RD-D4", image: "/images/designs/RD-D4.png" },
  { id: "RD-D4SLATS", label: "RD-D4 SLATS", image: "/images/designs/RD-D4SLATS.png" },
  { id: "RD-D5", label: "RD-D5", image: "/images/designs/RD-D5.png" },
  { id: "RD-D6", label: "RD-D6", image: "/images/designs/RD-D6.png" },
  { id: "RD-D7", label: "RD-D7", image: "/images/designs/RD-D7.png" },
  { id: "RD-D8", label: "RD-D8", image: "/images/designs/RD-D8.png" },
  { id: "RD-D9", label: "RD-D9", image: "/images/designs/RD-D9.png" },
  { id: "RD-D10", label: "RD-D10", image: "/images/designs/RD-D10.png" },
  { id: "RD-D11", label: "RD-D11", image: "/images/designs/RD-D11.png" },
  { id: "RD-D12", label: "RD-D12", image: "/images/designs/RD-D12.png" },
  { id: "RD-D13", label: "RD-D13", image: "/images/designs/RD-D13.png" },
];

// 🔹 Placeholder – future wind-load rules plug in here
export function getDesignOptionsForWindLoad(
  wind: WindLoad | null | undefined
): DesignOption[] {
  // Later you can filter based on wind.bldg_height / region / terrain_category
  // For now, return all designs unchanged:
  return ALL_DESIGN_OPTIONS;
}

// 🔹 Existing glass rules
export const DESIGNS_REQUIRING_GLASS = new Set([
  "RD-D1",
  "RD-D2",
  "RD-D6",
  "RD-D7",
  "RD-D8",
  "RD-D10",
  "RD-D11",
  "RD-D12",
  "RD-D13",
]);

export function designNeedsGlass(design?: string | null): boolean {
  if (!design) return false;
  return DESIGNS_REQUIRING_GLASS.has(design);
}

// the shape we care about on the stage
export type StageDefaultsLite = {
  design_default?: string;
  glass_default?: string;
};

// still available if you want it server-side later
export function getEffectiveDesignAndGlass(opts: {
  job: { design_default?: string | null; glass_default?: string | null };
  stageDefaults: StageDefaultsLite;
}) {
  const { job, stageDefaults } = opts;

  const effectiveDesign =
    stageDefaults.design_default ?? job.design_default ?? null;

  const effectiveGlass =
    stageDefaults.glass_default ?? job.glass_default ?? null;

  return { effectiveDesign, effectiveGlass };
}

// ---------------------------------------------------------------------------
// 🔹 New: shared option + design rule helpers
// ---------------------------------------------------------------------------

export type DesignOption = { id: string; label: string, 
    image?: string };


// Elite variants
const ELITE_IMAGE_STANDARD = "/images/toprails/Elite-Toprail.png";      // Visage-compatible designs
const ELITE_IMAGE_OVAL_ROUND = "/images/toprails/Elite-Adapter-Toprail.png";   // RD-D7 / RD-D8 etc.

// Toprail base options for most designs
const STANDARD_TOPRAILS: DesignOption[] = [
  { id: "Elite",       label: "Elite Toprail" },
  { id: "Visage", label: "Visage Toprail", image: "/images/toprails/Visage-Toprail.png" },
  { id: "Slenderline", label: "Slenderline Toprail", image: "/images/toprails/Slenderline-Adapter-Toprail.png" },
  { id: "Oval", label: "Oval", image: "/images/toprails/Oval-Adapter-Toprail.png" },
  { id: "Round", label: "Round", image: "/images/toprails/Round-Adapter-Toprail.png" },
];

// Special frameless / minimal toprail set
const FRAMELESS_TOPRAILS: DesignOption[] = [
  { id: "None",          label: "No toprail" },
  { id: "25mm Round",    label: "25mm Round" },
  { id: "25mm Square",   label: "25mm Square" },
  { id: "38mm Round",    label: "38mm Round" },
  { id: "38mm Handrail",   label: "38mm Handrail" },
];

// RD-D10..13: frameless glass designs
const FRAMELESS_TOPRAIL_DESIGNS = ["RD-D10", "RD-D11", "RD-D12", "RD-D13"];

export const FRAMELESS_DESIGNS = new Set<DesignCode>([
  "RD-D10",
  "RD-D11",
  "RD-D12",
  "RD-D13",
])

export type FramelessDesignCode =
  | "RD-D10"
  | "RD-D11"
  | "RD-D12"
  | "RD-D13"

export function designIsFrameless(design?: string | null): design is FramelessDesignCode {
  if (!design) return false
  return FRAMELESS_DESIGNS.has(design as DesignCode)
}

export function getFramelessGlassThicknessForDesign(design?: string | null): number | null {
  if (design === "RD-D10" || design === "RD-D11") return 12
  if (design === "RD-D12" || design === "RD-D13") return 13.52
  return null
}

export function getFramelessDefaultSpigotForDesign(design?: string | null): string | null {
  if (design === "RD-D10") return "Spigot_RDTF"
  if (design === "RD-D11") return "Spigot_SF"
  if (design === "RD-D12") return "Spigot_HDTF"
  if (design === "RD-D13") return "Spigot_SF"
  return null
}

export function getFramelessDefaultToprailForDesign(design?: string | null): string | null {
  if (!designIsFrameless(design)) return null
  return "25mm Square"
}

// Anchorage base options
const ALL_ANCHORAGES: DesignOption[] = [
  { id: "BP", label: "Baseplate", image: "/images/anchorage/BP-Anchorage.png" },
  { id: "DP", label: "Deckplate", image: "/images/anchorage/DP-Anchorage.png" },
  { id: "CD", label: "Core Drilled", image: "/images/anchorage/CD-Anchorage.png" },
  { id: "SF", label: "Side Fixed", image: "/images/anchorage/SF-Anchorage.png" },
];

const SPIGOT_ANCHORAGE_SF: DesignOption = {
  id: "Spigot_SF",
  label: "Spigot Side Fixed",
};

const SPIGOT_ANCHORAGE_D10: DesignOption[] = [
  {id: "Spigot_RDTF", label: "Spigot Round Top Fixed"},
  {id: "Spigot_SQTF", label: "Spigot Square Top Fixed"},
  {id: "Spigot_RDCD", label: "Spigot Round Core Drilled"},
  {id: "Spigot_SQCD", label: "Spigot Square Core Drilled"},
];

const SPIGOT_ANCHORAGE_D12: DesignOption[] = [
  {id: "Spigot_HDTF", label: "Spigot Square Top Fixed"},
  {id: "Spigot_HDCD", label: "Spigot Square Core Drilled"},
];

// 🔸 Design groups (easy to expand)
const DISALLOW_BP_ANCHORAGE_DESIGNS = ["RD-D6"];      // BP not allowed
const DISALLOW_CD_ANCHORAGE_DESIGNS = ["RD-D9"];      // CD not allowed

// 🔸 Design groups (easy to expand)
const SLENDERLINE_ONLY_DESIGNS = ["RD-D6"];                    // only Slenderline allowed
const OVAL_ROUND_ONLY_DESIGNS = ["RD-D7", "RD-D8"];            // Oval/Round only allowed here
const VISAGE_DISALLOWED_DESIGNS = ["RD-D7", "RD-D8"];          // Visage not allowed here

function isInGroup(
  design: string | null | undefined,
  group: string[]
): boolean {
  if (!design) return false;
  return group.includes(design);
}

/**
 * Toprail rules for a given design + current selection.
 *
 * NOTE: later we can introduce a variant that also takes WindLoad:
 *   getToprailOptionsForWizard(design, currentToprail, wind)
 * and apply wind-load-based filtering especially for FRAMELESS_TOPRAIL_DESIGNS.
 */
export function getToprailOptionsForDesign(
  design: string | null | undefined,
  currentToprail: string | null | undefined
): { options: DesignOption[]; clashing: boolean } {
  const current = currentToprail ?? "";
  const d = design ?? "";

  let allowed: DesignOption[];

  // 1) Frameless designs → dedicated set
  if (FRAMELESS_TOPRAIL_DESIGNS.includes(d)) {
    allowed = [...FRAMELESS_TOPRAILS];
    // (placeholder for wind-load filtering later)
  }

  // 2) RD-D6 → Slenderline only
  else if (SLENDERLINE_ONLY_DESIGNS.includes(d)) {
    allowed = STANDARD_TOPRAILS.filter((o) => o.id === "Slenderline");
  }

  // 3) All other designs use the standard set with extra rules
  else {
    allowed = [...STANDARD_TOPRAILS];

    // 3a) Oval & Round are only available for RD-D7 and RD-D8
    if (!OVAL_ROUND_ONLY_DESIGNS.includes(d)) {
      allowed = allowed.filter((o) => o.id !== "Oval" && o.id !== "Round");
    }

    // 3b) Visage is NOT available on RD-D7 and RD-D8
    if (VISAGE_DISALLOWED_DESIGNS.includes(d)) {
      allowed = allowed.filter((o) => o.id !== "Visage");
    }

    // 3c) Slenderline is only allowed on RD-D6 (handled above),
    // so remove it from all "standard" designs here:
    allowed = allowed.filter((o) => o.id !== "Slenderline");
  }

  // 🔹 Inject correct Elite image per design
  const allowedWithImages: DesignOption[] = allowed.map((opt) => {
    if (opt.id !== "Elite") return opt;

    const isOvalRoundDesign = isInGroup(design, OVAL_ROUND_ONLY_DESIGNS);
    return {
      ...opt,
      image: isOvalRoundDesign ? ELITE_IMAGE_OVAL_ROUND : ELITE_IMAGE_STANDARD,
    };
  });

  const clashing =
    !!current && !allowedWithImages.some((o) => o.id === current);

  if (clashing) {
    return {
      options: [
        {
          id: current,
          label: `${current} (not allowed for ${design ?? "this design"})`,
        },
        ...allowedWithImages,
      ],
      clashing: true,
    };
  }

  return { options: allowedWithImages, clashing: false };
}



// 🔸 Anchorage rules for a given design + current selection
export function getAnchorageOptionsForDesign(
  design: string | null | undefined,
  currentAnchorage: string | null | undefined
): { options: DesignOption[]; clashing: boolean } {
  const current = currentAnchorage ?? "";
  const d = design ?? "";

  let allowed: DesignOption[];

  // 1) Spigot-only designs with design-specific option sets
  if (d === "RD-D10") {
    allowed = [...SPIGOT_ANCHORAGE_D10];
  } else if (d === "RD-D12") {
    allowed = [...SPIGOT_ANCHORAGE_D12];
  } else if (d === "RD-D11" || d === "RD-D13") {
    allowed = [SPIGOT_ANCHORAGE_SF];
  } else {
    // 2) Normal designs → start from all
    allowed = [...ALL_ANCHORAGES];

    // 2a) Remove BP for certain designs
    if (DISALLOW_BP_ANCHORAGE_DESIGNS.includes(d)) {
      allowed = allowed.filter((o) => o.id !== "BP");
    }

    // 2b) Remove CD for certain designs
    if (DISALLOW_CD_ANCHORAGE_DESIGNS.includes(d)) {
      allowed = allowed.filter((o) => o.id !== "CD");
    }
  }

  const clashing = !!current && !allowed.some((o) => o.id === current);

  if (clashing) {
    return {
      options: [
        {
          id: current,
          label: `${current} (not allowed for ${design ?? "this design"})`,
        },
        ...allowed,
      ],
      clashing: true,
    };
  }

  return { options: allowed, clashing: false };
}


// ---------------------------------------------------------------------------
// Glass options per design
// ---------------------------------------------------------------------------

// Base glass option sets
const GLASS_6_38: DesignOption[] = [
  { id: "6.38mm Clear Laminate", label: "6.38mm Clear Laminate" },
  { id: "6.38mm Translucent", label: "6.38mm Translucent" },
  { id: "6.38mm Sand Blasted", label: "6.38mm Sand Blasted" },
  { id: "6.38mm Grey", label: "6.38mm Grey" },
];

const GLASS_9_52: DesignOption[] = [
  { id: "9.52mm Clear Laminate", label: "9.52mm Clear Laminate" },
  { id: "9.52mm Translucent", label: "9.52mm Translucent" },
  { id: "9.52mm Sand Blasted", label: "9.52mm Sand Blasted" },
  { id: "9.52mm Grey", label: "9.52mm Grey" },
];

const GLASS_10: DesignOption[] = [
  { id: "10mm Clear Laminate", label: "10mm Clear Laminate" },
  { id: "10mm Translucent", label: "10mm Translucent" },
];

const GLASS_12: DesignOption[] = [
  { id: "12mm Clear Laminate", label: "12mm Clear Laminate" },
  { id: "12mm Translucent", label: "12mm Translucent" },
  { id: "12mm Cerafic Coated", label: "12mm Cerafic Coated" },
  { id: "12mm Grey", label: "12mm Grey" },
];

const GLASS_13_52: DesignOption[] = [
  { id: "13.52mm Clear Laminate", label: "13.52mm Clear Laminate" },
  { id: "13.52mm Translucent", label: "13.52mm Translucent" },
  { id: "13.52mm Cerafic Coated", label: "13.52mm Cerafic Coated" },
  { id: "13.52mm Grey", label: "13.52mm Grey" },
];

// Non-glass infill option sets
const INFILL_BALUSTERS: DesignOption[] = [
  { id: "Balusters Default Spaced", label: "Balusters Default Spaced" },
  { id: "Balusters Equally Spaced", label: "Balusters Equally Spaced" },
];

const INFILL_SLATS_VERTICAL: DesignOption[] = [
  { id: "Slats Default Spaced", label: "Slats Default Spaced" },
  { id: "Slats Equally Spaced", label: "Slats Equally Spaced" },
];

const INFILL_SLATS_HORIZONTAL: DesignOption[] = [
  { id: "Slats 9mm Spacers", label: "Slats 9mm Spacers" },
  { id: "Slats 5mm Spacers", label: "Slats 5mm Spacers" },
];

const INFILL_STUBBY_POSTS: DesignOption[] = [
  { id: "Empty", label: "Empty" },
  { id: "Midrail", label: "Midrail" },
];

// convenient "all" (for non-requiring designs, or fallback)
const ALL_GLASSES: DesignOption[] = [
  ...GLASS_6_38,
  ...GLASS_9_52,
  ...GLASS_10,
  ...GLASS_12,
  ...GLASS_13_52,
];

// which designs map to which glass thickness group
const DESIGN_TO_GLASS_MAP: Record<string, DesignOption[]> = {
  "RD-D1": GLASS_6_38,
  "RD-D2": GLASS_6_38,

  "RD-D6": GLASS_10,

  "RD-D7": GLASS_9_52,
  "RD-D8": GLASS_9_52,

  "RD-D10": GLASS_12,
  "RD-D11": GLASS_12,

  "RD-D12": GLASS_13_52,
  "RD-D13": GLASS_13_52,
};

// Designs → non-glass infill mapping
const DESIGN_TO_NON_GLASS_INFILL_MAP: Record<string, DesignOption[]> = {
  // Balusters
  "RD-D3": INFILL_BALUSTERS,
  "RD-D4": INFILL_BALUSTERS,

  // Vertical slats
  "RD-D3SLATS": INFILL_SLATS_VERTICAL,
  "RD-D4SLATS": INFILL_SLATS_VERTICAL,

  // Horizontal slats
  "RD-D5": INFILL_SLATS_HORIZONTAL,

  // Stubby Posts
  "RD-D9": INFILL_STUBBY_POSTS,
};

// Main helper: returns options + whether current selection clashes with design's thickness set
export function getGlassOptionsForDesign(
  design: string | null | undefined,
  currentGlass: string | null | undefined
): { options: DesignOption[]; clashing: boolean } {
  const current = currentGlass ?? "";

  // If the design doesn't require glass at all, just return all options
  // (your separate glassClashing logic already flags "glass not applicable" for such designs)
  if (!designNeedsGlass(design)) {
    return {
      options: ALL_GLASSES,
      clashing: false,
    };
  }

  const allowed = DESIGN_TO_GLASS_MAP[design ?? ""] ?? ALL_GLASSES;

  const clashing =
    !!current && !allowed.some((o) => o.id === current);

  if (clashing) {
    return {
      options: [
        {
          id: current,
          label: `${current} (not allowed thickness for ${design})`,
        },
        ...allowed,
      ],
      clashing: true,
    };
  }

  return { options: allowed, clashing: false };
}

/**
 * Infill rules for a given design + current selection.
 * - Glass-required designs: delegates to getGlassOptionsForDesign (thickness filtering)
 * - Non-glass designs: filtered to the design’s allowed infill types (Balusters / Slats Vertical / Slats Horizontal)
 */
export function getInfillOptionsForDesign(
  design: string | null | undefined,
  currentInfill: string | null | undefined
): { options: DesignOption[]; clashing: boolean } {
  const current = currentInfill ?? "";

  // Glass-required designs → reuse the existing glass thickness rules
  if (designNeedsGlass(design)) {
    return getGlassOptionsForDesign(design, current);
  }

  // Non-glass designs → filter by design group
  const allowed = DESIGN_TO_NON_GLASS_INFILL_MAP[design ?? ""] ?? [];

  const clashing = !!current && !allowed.some((o) => o.id === current);

  if (clashing) {
    return {
      options: [
        {
          id: current,
          label: `${current} (not allowed infill for ${design ?? "this design"})`,
        },
        ...allowed,
      ],
      clashing: true,
    };
  }

  return { options: allowed, clashing: false };
}

// ---------------------------------------------------------------------------
// Post spacing limits (wind-load tables)
// ---------------------------------------------------------------------------

export type BalustradeHeightMm = number;
export type BuildingHeightM = number;

type WindRegionAB = "A" | "B";
type Terrain23 = 2 | 3;
type BldgBand = 30 | 50 | 75;
type BalMaxBand = 1050 | 1100 | 1200;

type SpacingTable = Record<
  WindRegionAB,
  Record<Terrain23, Record<BldgBand, Record<BalMaxBand, number>>>
>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function clampBldgBand(bldgHeightM: BuildingHeightM): BldgBand {
  if (!Number.isFinite(bldgHeightM)) return 75;
  if (bldgHeightM <= 30) return 30;
  if (bldgHeightM <= 50) return 50;
  return 75;
}

function clampBalMaxBand(balHeightMm: BalustradeHeightMm): BalMaxBand {
  if (!Number.isFinite(balHeightMm)) return 1200;
  if (balHeightMm <= 1050) return 1050;
  if (balHeightMm <= 1100) return 1100;
  return 1200;
}

// ---------------------------------------------------------------------------
// DESIGN TABLES
// ---------------------------------------------------------------------------

// RD-D1
const RD_D1_POST_SPACING: SpacingTable = {
  A: {
    2: {
      30: { 1050: 1280, 1100: 1200, 1200: 1090 },
      50: { 1050: 1280, 1100: 1170, 1200: 980 },
      75: { 1050: 1200, 1100: 1100, 1200: 920 },
    },
    3: {
      30: { 1050: 1280, 1100: 1200, 1200: 1100 },
      50: { 1050: 1280, 1100: 1200, 1200: 1100 },
      75: { 1050: 1280, 1100: 1200, 1200: 1090 },
    },
  },
  B: {
    2: {
      30: { 1050: 840, 1100: 760, 1200: 640 },
      50: { 1050: 750, 1100: 690, 1200: 580 },
      75: { 1050: 710, 1100: 640, 1200: 540 },
    },
    3: {
      30: { 1050: 1050, 1100: 960, 1200: 800 },
      50: { 1050: 920, 1100: 840, 1200: 700 },
      75: { 1050: 840, 1100: 760, 1200: 640 },
    },
  },
};

// RD-D2 → RD-D8
// (kept separate even if identical for audit / spec reasons)
const RD_D2_POST_SPACING = RD_D1_POST_SPACING;
const RD_D3_POST_SPACING = RD_D1_POST_SPACING;
const RD_D3SLATS_POST_SPACING = RD_D1_POST_SPACING;
const RD_D4_POST_SPACING = RD_D1_POST_SPACING;
const RD_D4SLATS_POST_SPACING = RD_D1_POST_SPACING;
const RD_D5_POST_SPACING = RD_D1_POST_SPACING;
const RD_D6_POST_SPACING = RD_D1_POST_SPACING;
const RD_D7_POST_SPACING = RD_D1_POST_SPACING;
const RD_D8_POST_SPACING = RD_D1_POST_SPACING;

// RD-D10 (panel-width based table reused as spacing cap)
const RD_D10_POST_SPACING: SpacingTable = {
  A: {
    2: {
      30: { 1050: 1300, 1100: 1220, 1200: 1120 },
      50: { 1050: 1300, 1100: 1220, 1200: 1030 },
      75: { 1050: 1250, 1100: 1140, 1200: 960 },
    },
    3: {
      30: { 1050: 1300, 1100: 1220, 1200: 1120 },
      50: { 1050: 1300, 1100: 1220, 1200: 1120 },
      75: { 1050: 1300, 1100: 1220, 1200: 1120 },
    },
  },
  B: {
    2: {
      30: { 1050: 870, 1100: 800, 1200: 670 },
      50: { 1050: 790, 1100: 720, 1200: 600 },
      75: { 1050: 740, 1100: 670, 1200: 560 },
    },
    3: {
      30: { 1050: 1100, 1100: 1000, 1200: 840 },
      50: { 1050: 960, 1100: 870, 1200: 730 },
      75: { 1050: 870, 1100: 800, 1200: 670 },
    },
  },
};

// Placeholders (explicit aliases, not shared implicitly)
const RD_D11_POST_SPACING = RD_D10_POST_SPACING;
const RD_D12_POST_SPACING = RD_D10_POST_SPACING;
const RD_D13_POST_SPACING = RD_D10_POST_SPACING;
const RD_D14_POST_SPACING = RD_D10_POST_SPACING;

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function getMaxPostCentresSpacingMm(opts: {
  design: DesignCode | string | null | undefined;
  wind: WindLoad;
  balustradeHeightMm: number | null | undefined;
}): number | null {
  const design = opts.design ?? "";
  const wind = opts.wind;
  const balH = opts.balustradeHeightMm;

  if (balH == null || !Number.isFinite(balH)) return null;

  // RD-D9 special rule
  if (design === "RD-D9") {
    if (balH > 270) return null; // invalid height
    return 1280;
  }

  const region = wind.wind_region;
  const terrain = wind.terrain_category;
  if ((region !== "A" && region !== "B") || (terrain !== 2 && terrain !== 3)) {
    return null;
  }

  const table: SpacingTable | null =
    design === "RD-D1" ? RD_D1_POST_SPACING :
    design === "RD-D2" ? RD_D2_POST_SPACING :
    design === "RD-D3" ? RD_D3_POST_SPACING :
    design === "RD-D3SLATS" ? RD_D3SLATS_POST_SPACING :
    design === "RD-D4" ? RD_D4_POST_SPACING :
    design === "RD-D4SLATS" ? RD_D4SLATS_POST_SPACING :
    design === "RD-D5" ? RD_D5_POST_SPACING :
    design === "RD-D6" ? RD_D6_POST_SPACING :
    design === "RD-D7" ? RD_D7_POST_SPACING :
    design === "RD-D8" ? RD_D8_POST_SPACING :
    design === "RD-D10" ? RD_D10_POST_SPACING :
    design === "RD-D11" ? RD_D11_POST_SPACING :
    design === "RD-D12" ? RD_D12_POST_SPACING :
    design === "RD-D13" ? RD_D13_POST_SPACING :
    design === "RD-D14" ? RD_D14_POST_SPACING :
    null;

  if (!table) return null;

  const bldgBand = clampBldgBand(wind.bldg_height);
  const balBand = clampBalMaxBand(balH);

  return table[region][terrain][bldgBand][balBand];
}
