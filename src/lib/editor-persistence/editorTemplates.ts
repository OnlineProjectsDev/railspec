// /lib/editor-persistence/editorTemplates.ts
import type { JobStageDefaults } from "@/lib/editor-persistence/types";
import type {
  Balcony,
  ColourValue,
  DesignCode,
  AnchorageType,
  ToprailType,
  InfillType,
  Floor,
  RootState,
} from "@/lib/types";
import type { WindLoad } from "@/lib/jobDesignRules";

const initialColor: ColourValue = {
  hex: 0x8c5343,
  name: "TBD",
};

const initialWindLoad: WindLoad = {
  bldg_height: 30,
  wind_region: "A",
  terrain_category: 2,
};

const baseBalcony: Balcony = {
  id: "balcony-1",
  balustradePath: [
    { x: -1910, z: -1910 },
    { x: 1910, z: -1910 },
    { x: 1910, z: 2910 },
    { x: -1910, z: 2910 },
  ],
  laserLevelY: 0,
  topY: 1020,
  minPostLength: 1020,
  toprailTerminationTypes: {
    start: "EC",
    end: "EC",
  },
  toprailTerminationTypesByRun: {},
  maxPostSpacing: 1280,
  minBarrierHeight: 1020,
  maxBarrierHeight: 1200,
  maxPanelHeight: 1000,
  maxBottomGap: 100,
  panelHeight: 950,
  autoTopExcludePostIds: [],
  bayOverridesById: {},
  framelessSpigotType: null,
  framelessGlassBottomOffset: 0,
  framelessToprailType: null,
  framelessToprailOffsetFromGlassTop: 0,
  framelessToprailHeight: 21,
};

const rectangularFloor: Floor = {
  id: "floor-1",
  vertices: [
    { x: -2000, z: -2000 },
    { x: 2000, z: -2000 },
    { x: 2000, z: 2000 },
    { x: -2000, z: 2000 },
    { x: -2000, z: 1500 },
    { x: -2000, z: 1300 },
    { x: -2000, z: 0 },
    { x: -2000, z: -1300 },
    { x: -2000, z: -1500 },
  ],
  closed: true,
  edges: [
    { offset: 90, refType: "include" },
    { offset: 90, refType: "include" },
    { offset: 90, refType: "include" },
    { offset: 90, refType: "exclude", edgeType: "wall", thickness: 150, height: 1800 },
    { offset: 90, refType: "exclude" },
    { offset: 90, refType: "exclude" },
    { offset: 90, refType: "exclude" },
    { offset: 90, refType: "exclude", edgeType: "wall", thickness: 150, height: 1800 },
  ],
};

const simpleRectangularFloor: Floor = {
  id: "floor-1",
  vertices: [
    { x: -2000, z: -2000 },
    { x: 2000, z: -2000 },
    { x: 2000, z: 3000 },
    { x: -2000, z: 3000 },
  ],
  closed: true,
  edges: [
    { offset: 90, refType: "include" },
    { offset: 90, refType: "include" },
    { offset: 90, refType: "include" },
    { offset: 10, refType: "exclude" },
  ],
};

const lowWallFramelessFloor: Floor = {
  id: "floor-1",
  vertices: [
    { x: -2000, z: -2000 },
    { x: 2000, z: -2000 },
    { x: 2000, z: 3000 },
    { x: -2000, z: 3000 },
  ],
  closed: true,
  edges: [
    { offset: 40, refType: "include", edgeType: "low_wall", thickness: 150, height: 500 },
    { offset: 40, refType: "include", edgeType: "low_wall", thickness: 150, height: 500 },
    { offset: 40, refType: "include", edgeType: "low_wall", thickness: 150, height: 500 },
    { offset: 0, refType: "exclude" },
  ],
};

const standardEdgeTypeDefaults: RootState["foundation"]["edgeTypeDefaults"] = {
  floor: { offset: 90, thickness: null, height: null },
  wall: { offset: 90, thickness: 150, height: 1800 },
  hob: { offset: -75, thickness: 150, height: 150 },
  low_wall: { offset: 23, thickness: 150, height: 400 },
};

const framelessEdgeTypeDefaults: RootState["foundation"]["edgeTypeDefaults"] = {
  floor: { offset: 90, thickness: null, height: null },
  wall: { offset: 10, thickness: 150, height: 1800 },
  hob: { offset: -75, thickness: 150, height: 150 },
  low_wall: { offset: 40, thickness: 150, height: 400 },
};

export type EditorTemplateTags = {
  designs: DesignCode[];
  anchorages: AnchorageType[];
  toprails: ToprailType[];
  infills: InfillType[];
  family: "standard" | "frameless";
};

export type EditorSeedTemplate = {
  id: string;
  label: string;
  description?: string;
  tags: EditorTemplateTags;
  mode?: RootState["mode"];
  view?: RootState["view"];
  snapEnabled?: boolean;
  constraintMode?: RootState["constraintMode"];
  gizmoTool?: RootState["gizmoTool"];
  hasDerivedBalustrade?: boolean;
  design?: DesignCode;
  anchorage?: AnchorageType;
  toprail?: ToprailType;
  infill?: InfillType;
  color?: ColourValue;
  windLoad?: WindLoad;
  foundation?: RootState["foundation"];
  balcony?: Partial<RootState["balcony"]>;
};

export const editorSeedTemplates: EditorSeedTemplate[] = [
  {
    id: "default-rectangular",
    label: "Default rectangular",
    description: "Standard rectangular starter for RD-D1 / BP / Elite / 6.38 laminate.",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    design: "RD-D1",
    anchorage: "BP",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,
    tags: {
      designs: [],
      anchorages: ["BP", "CD", "DP"],
      toprails: [],
      infills: [],
      family: "standard",
    },
    foundation: {
      floor: rectangularFloor,
      edgeTypeDefaults: standardEdgeTypeDefaults,
      fflHeight: 0,
      fflY: 0,
    },
    balcony: {
      ...baseBalcony,
    },
  },
  {
    id: "default-rectangular2",
    label: "Default rectangular 2",
    description: "Standard rectangular starter",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    design: "RD-D1",
    anchorage: "BP",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,
    tags: {
      designs: [],
      anchorages: ["BP", "CD", "DP"],
      toprails: [],
      infills: [],
      family: "standard",
    },
    foundation: {
      floor: simpleRectangularFloor,
      edgeTypeDefaults: standardEdgeTypeDefaults,
      fflHeight: 0,
      fflY: 0,
    },
    balcony: {
      ...baseBalcony,
    },
  },
  {
    id: "default-rectangular3",
    label: "Default rectangular 3",
    description: "Low wall rectangular starter",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    design: "RD-D1",
    anchorage: "SF",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,
    tags: {
      designs: [],
      anchorages: ["SF"],
      toprails: [],
      infills: [],
      family: "standard",
    },
    foundation: {
      floor: lowWallFramelessFloor,
      edgeTypeDefaults: standardEdgeTypeDefaults,
      fflHeight: 0,
      fflY: 0,
    },
    balcony: {
      ...baseBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "default-frameless",
    label: "Default frameless",
    description: "Frameless starter for RD-D10 / RD-D12",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    design: "RD-D10",
    anchorage: "Spigot_SQTF",
    toprail: "38mm Round",
    infill: "12mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,
    tags: {
      designs: ["RD-D10","RD-D12"],
      anchorages: [],
      toprails: [],
      infills: [],
      family: "frameless",
    },
    foundation: {
      floor: simpleRectangularFloor,
      edgeTypeDefaults: framelessEdgeTypeDefaults,
      fflHeight: 0,
      fflY: 0,
    },
    balcony: {
      ...baseBalcony,
      framelessSpigotType: "Spigot_RDTF",
      framelessGlassBottomOffset: 0,
      framelessToprailType: "25mm Square",
      framelessToprailOffsetFromGlassTop: 0,
      framelessToprailHeight: 21,
    },
  },
  {
    id: "default-frameless2",
    label: "Default frameless 2",
    description: "Frameless low-wall starter for RD-D11 / RD-D13",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    design: "RD-D11",
    anchorage: "Spigot_SF",
    toprail: "25mm Square",
    infill: "12mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,
    tags: {
      designs: ["RD-D11","RD-D13"],
      anchorages: [],
      toprails: [],
      infills: [],
      family: "frameless",
    },
    foundation: {
      floor: lowWallFramelessFloor,
      edgeTypeDefaults: framelessEdgeTypeDefaults,
      fflHeight: 500,
      fflY: 0,
    },
    balcony: {
      ...baseBalcony,
      laserLevelY: 500,
      framelessSpigotType: "Spigot_SF",
      framelessGlassBottomOffset: 0,
      framelessToprailType: "25mm Square",
      framelessToprailOffsetFromGlassTop: 0,
      framelessToprailHeight: 21,
    },
  },
];

export type EditorTemplateCompatibility = {
  template: EditorSeedTemplate;
  compatible: boolean;
  reasons: string[];
};

function matchesTemplateTag<T>(allowed: T[], selected: T | null | undefined) {
  if (!selected) return true;
  if (allowed.length === 0) return true;
  return allowed.includes(selected);
}

export function getEditorTemplateCompatibility(
  template: EditorSeedTemplate,
  defaults: Pick<JobStageDefaults, "design_default" | "anchorage_default" | "toprail_default" | "infill_default">
): EditorTemplateCompatibility {
  const reasons: string[] = [];

  if (!matchesTemplateTag(template.tags.designs, defaults.design_default)) {
    reasons.push(`Design must be ${defaults.design_default}`);
  }

  if (!matchesTemplateTag(template.tags.anchorages, defaults.anchorage_default)) {
    reasons.push(`Anchorage must be ${defaults.anchorage_default}`);
  }

  // if (!matchesTemplateTag(template.tags.toprails, defaults.toprail_default)) {
  //   reasons.push(`Toprail must be ${defaults.toprail_default}`);
  // }

  if (!matchesTemplateTag(template.tags.infills, defaults.infill_default)) {
    reasons.push(`Infill must be ${defaults.infill_default}`);
  }

  return {
    template,
    compatible: reasons.length === 0,
    reasons,
  };
}

export function isEditorTemplateCompatible(
  template: EditorSeedTemplate,
  defaults: Pick<JobStageDefaults, "design_default" | "anchorage_default" | "toprail_default" | "infill_default">
) {
  return getEditorTemplateCompatibility(template, defaults).compatible;
}

export function getCompatibleEditorTemplates(
  defaults: Pick<JobStageDefaults, "design_default" | "anchorage_default" | "toprail_default" | "infill_default">
) {
  return editorSeedTemplates.filter((template) =>
    isEditorTemplateCompatible(template, defaults)
  );
}

export function getEditorTemplatesWithCompatibility(
  defaults: Pick<JobStageDefaults, "design_default" | "anchorage_default" | "toprail_default" | "infill_default">
) {
  return editorSeedTemplates.map((template) =>
    getEditorTemplateCompatibility(template, defaults)
  );
}