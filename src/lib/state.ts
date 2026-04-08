// /lib/state.ts
import { RootState, Floor } from "./types"
import type { WindLoad } from "./jobDesignRules"
import { generatePosts } from "./generation"
import { deriveSegments } from "./segments"
import type { DesignCode, AnchorageType, ToprailType, InfillType, ColourValue } from "./types"

const initialBalcony: RootState["balcony"] = {
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

  // Global balustrade constraint inputs
  maxPostSpacing: 1280,
  minBarrierHeight: 1020,
  maxBarrierHeight: 1200,
  maxPanelHeight: 1000,
  maxBottomGap: 100,

  framelessSpigotType: null,
  framelessGlassBottomOffset: 0,
  framelessToprailType: null,
  framelessToprailOffsetFromGlassTop: 0,
  framelessToprailHeight: 21,

  // Design parameters
  panelHeight: 950,

  // NEW: posts excluded from auto min-height/topY solving
  autoTopExcludePostIds: [],

  bayOverridesById: {},
}

const initialFloor: Floor = {
  id: "floor-1",
  vertices: [
    { x: -2000, z: -2000 },
    { x: 2000, z: -2000 },
    { x: 2000, z: 3000 },
    { x: -2000, z: 3000 },
  ],
  closed: true,
  // Per-edge metadata (index matches edge i: v[i] -> v[i+1], last wraps to v[0] when closed)
  edges: [
    { offset: 90, refType: "include" }, // edge 0: v0 -> v1
    { offset: 90, refType: "include" }, // edge 1: v1 -> v2
    { offset: 90, refType: "include" }, // edge 2: v2 -> v3
    { offset: 90, refType: "exclude" }, // edge 3: v3 -> v0
  ],
  
}

const initialFloorPosts: Floor = {
  id: "floor-1",
  vertices: [
    { x: -2000, z: -2000 },
    { x: 5000, z: -2000 },
    { x: 5000, z: 2000 },
    { x: -2000, z: 2000 },
    { x: -2000, z: 1500 },
    { x: -2000, z: -1500 },
  ],
  closed: true,
  // Per-edge metadata (index matches edge i: v[i] -> v[i+1], last wraps to v[0] when closed)
  edges: [
    { offset: 90, refType: "include" }, // edge 0: v0 -> v1
    { offset: 90, refType: "include" }, // edge 1: v1 -> v2
    { offset: 90, refType: "include" }, // edge 2: v2 -> v3
    { offset: 90, refType: "exclude", edgeType: "wall", thickness: 150, height: 1800 }, // edge 3: v3 -> v4
    { offset: 90, refType: "exclude" }, // edge 3: v4 -> v5
    { offset: 90, refType: "exclude", edgeType: "wall", thickness: 150, height: 1800  }, // edge 3: v5 -> v0
  ],
  
}

const initialFloorPostsLowWall: Floor = {
  id: "floor-1",
  vertices: [
    { x: -2000, z: -2000 },
    { x: 5000, z: -2000 },
    { x: 5000, z: 2000 },
    { x: -2000, z: 2000 },
    { x: -2000, z: 1500 },
    { x: -2000, z: -1500 },
  ],
  closed: true,
  // Per-edge metadata (index matches edge i: v[i] -> v[i+1], last wraps to v[0] when closed)
  edges: [
    { offset: 23, refType: "include", edgeType: "low_wall", thickness: 150, height: 500  }, // edge 0: v0 -> v1
    { offset: 23, refType: "include", edgeType: "low_wall", thickness: 150, height: 500  }, // edge 1: v1 -> v2
    { offset: 23, refType: "include", edgeType: "low_wall", thickness: 150, height: 500  }, // edge 2: v2 -> v3
    { offset: 90, refType: "exclude", edgeType: "wall", thickness: 150, height: 1800 }, // edge 3: v3 -> v4
    { offset: 90, refType: "exclude" }, // edge 3: v4 -> v5
    { offset: 90, refType: "exclude", edgeType: "wall", thickness: 150, height: 1800  }, // edge 3: v5 -> v0
  ],
  
}

const initialSegments = deriveSegments(initialBalcony as any)

const initialSegmentConstraintsById = Object.fromEntries(
  initialSegments.map((seg) => [
    seg.id,
    {
      maxPostSpacing: seg.maxPostSpacing,
      minBarrierHeight: seg.minBarrierHeight,
      maxBarrierHeight: seg.maxBarrierHeight,
      maxPanelHeight: seg.maxPanelHeight,
      maxBottomGap: seg.maxBottomGap,
      panelHeight: seg.panelHeight,
      boundaryStartBayRefMode: seg.boundaryStartBayRefMode,
      boundaryEndBayRefMode: seg.boundaryEndBayRefMode,
      cornerStartType: seg.cornerStartType ?? "symmetric",
      cornerEndType: seg.cornerEndType ?? "symmetric",
      cornerStartGap: seg.cornerStartGap ?? 10,
      cornerEndGap: seg.cornerEndGap ?? 10,
    },
  ])
)

const rawPosts = generatePosts(initialBalcony as any, initialBalcony.maxPostSpacing)

const initialDesign = "RD-D1" as const
const initialAnchorage = "BP" as const
const initialToprail = "Elite" as const
const initialInfill = "6.38mm Clear Laminate" as const
const initialColor = {
  hex: 0x8c5343,
  name: "TBD",
} as const
const initialWindLoad: WindLoad = {
  bldg_height: 30,
  wind_region: "A",
  terrain_category: 2,
}

export type EditorTemplate = {
  id: string
  label: string

  mode?: RootState["mode"]
  view?: RootState["view"]
  snapEnabled?: boolean
  constraintMode?: RootState["constraintMode"]
  gizmoTool?: RootState["gizmoTool"]
  hasDerivedBalustrade?: boolean

  design?: DesignCode
  anchorage?: AnchorageType
  toprail?: ToprailType
  infill?: InfillType
  color?: ColourValue
  windLoad?: WindLoad

  foundation?: RootState["foundation"]
  balcony?: Partial<RootState["balcony"]>
}

export const editorTemplates: EditorTemplate[] = [
  {
    id: "default-rectangular",
    label: "Default rectangular",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D1",
    anchorage: initialAnchorage,
    toprail: initialToprail,
    infill: initialInfill,
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: {
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
        // Per-edge metadata (index matches edge i: v[i] -> v[i+1], last wraps to v[0] when closed)
        edges: [
          { offset: 90, refType: "include" }, // edge 0: v0 -> v1
          { offset: 90, refType: "include" }, // edge 1: v1 -> v2
          { offset: 90, refType: "include" }, // edge 2: v2 -> v3
          { offset: 90, refType: "exclude", lockedLength:500, edgeType: "wall", thickness: 150, height: 1800 }, // edge 3: v3 -> v4
          { offset: 90, refType: "exclude" }, // edge 3: v4 -> v5
          { offset: 90, refType: "exclude" }, // edge 3: v4 -> v5
          { offset: 90, refType: "exclude" }, // edge 3: v4 -> v5
          { offset: 90, refType: "exclude" }, // edge 3: v4 -> v5
          { offset: 90, refType: "exclude", lockedLength:500, edgeType: "wall", thickness: 150, height: 1800  }, // edge 3: v5 -> v0
        ],
        corners:[
          {lockedAngle:90},
          {},
          {},
          {lockedAngle:90},
          {lockedAngle:180},
          {},
          {},
          {},
          {lockedAngle:180},
        ]
        
      },
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "default-rectangular2",
    label: "Default rectangular2",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",

    design: initialDesign,
    anchorage: "CD",
    toprail: initialToprail,
    infill: initialInfill,
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloor,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "default-frameless",
    label: "Default frameless",
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

    foundation: {
      floor: {
        id: "floor-1",
        vertices: [
          { x: -2000, z: -2000 },
          { x: 2000, z: -2000 },
          { x: 2000, z: 3000 },
          { x: -2000, z: 3000 },
        ],
        closed: true,
        // Per-edge metadata (index matches edge i: v[i] -> v[i+1], last wraps to v[0] when closed)
        edges: [
          { offset: 90, refType: "include" }, // edge 0: v0 -> v1
          { offset: 90, refType: "include" }, // edge 1: v1 -> v2
          { offset: 90, refType: "include" }, // edge 2: v2 -> v3
          { offset: 10, refType: "exclude" }, // edge 3: v3 -> v0
        ],
        
      },
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 10, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      framelessSpigotType: "Spigot_RDTF",
      framelessGlassBottomOffset: 0,
      framelessToprailType: "25mm Square",
      framelessToprailOffsetFromGlassTop: 0,
      framelessToprailHeight: 21,
    },
  },

  {
    id: "default-frameless2",
    label: "Default frameless2",
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

    foundation: {
      floor: {
        id: "floor-1",
        vertices: [
          { x: -2000, z: -2000 },
          { x: 2000, z: -2000 },
          { x: 2000, z: 3000 },
          { x: -2000, z: 3000 },
        ],
        closed: true,
        // Per-edge metadata (index matches edge i: v[i] -> v[i+1], last wraps to v[0] when closed)
        edges: [
          { offset: 40, refType: "include", edgeType: "low_wall", thickness: 150, height: 500 }, // edge 0: v0 -> v1
          { offset: 40, refType: "include", edgeType: "low_wall", thickness: 150, height: 500 }, // edge 1: v1 -> v2
          { offset: 40, refType: "include", edgeType: "low_wall", thickness: 150, height: 500 }, // edge 2: v2 -> v3
          { offset: 0, refType: "exclude" }, // edge 3: v3 -> v0
        ],
        
      },
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 10, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 40, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      laserLevelY: 500,
      framelessSpigotType: "Spigot_SF",
      framelessGlassBottomOffset: 0,
      framelessToprailType: "25mm Square",
      framelessToprailOffsetFromGlassTop: 0,
      framelessToprailHeight: 21,
    },
  },


  
  {
    id: "RD-D1-BP",
    label: "RD-D1-BP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D1",
    anchorage: "BP",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D1-DP",
    label: "RD-D1-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D1",
    anchorage: "DP",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D1-CD",
    label: "RD-D1-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D1",
    anchorage: "CD",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D1-SF",
    label: "RD-D1-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D1",
    anchorage: "SF",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D2-BP",
    label: "RD-D2-BP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D2",
    anchorage: "BP",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D2-DP",
    label: "RD-D2-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D2",
    anchorage: "DP",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D2-CD",
    label: "RD-D2-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D2",
    anchorage: "CD",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D2-SF",
    label: "RD-D2-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D2",
    anchorage: "SF",
    toprail: "Elite",
    infill: "6.38mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D3-BP",
    label: "RD-D3-BP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3-DP",
    label: "RD-D3-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3-CD",
    label: "RD-D3-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3-SF",
    label: "RD-D3-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D3-BP =",
    label: "RD-D3-BP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3-DP =",
    label: "RD-D3-DP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3-CD =",
    label: "RD-D3-CD =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3-SF =",
    label: "RD-D3-SF =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D3SLATS-BP",
    label: "RD-D3SLATS-BP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3SLATS-DP",
    label: "RD-D3SLATS-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3SLATS-CD",
    label: "RD-D3SLATS-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3SLATS-SF",
    label: "RD-D3SLATS-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D3SLATS-BP =",
    label: "RD-D3SLATS-BP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3SLATS-DP =",
    label: "RD-D3SLATS-DP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3SLATS-CD =",
    label: "RD-D3SLATS-CD =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D3SLATS-SF =",
    label: "RD-D3SLATS-SF =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D3SLATS",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D4-BP",
    label: "RD-D4-BP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4-DP",
    label: "RD-D4-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4-CD",
    label: "RD-D4-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4-SF",
    label: "RD-D4-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Balusters Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D4-BP =",
    label: "RD-D4-BP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4-DP =",
    label: "RD-D4-DP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4-CD =",
    label: "RD-D4-CD =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4-SF =",
    label: "RD-D4-SF =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Balusters Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D4SLATS-BP",
    label: "RD-D4SLATS-BP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4SLATS-DP",
    label: "RD-D4SLATS-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4SLATS-CD",
    label: "RD-D4SLATS-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4SLATS-SF",
    label: "RD-D4SLATS-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Slats Default Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D4SLATS-BP =",
    label: "RD-D4SLATS-BP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4SLATS-DP =",
    label: "RD-D4SLATS-DP =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4SLATS-CD =",
    label: "RD-D4SLATS-CD =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D4SLATS-SF =",
    label: "RD-D4SLATS-SF =",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D4SLATS",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Slats Equally Spaced",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D5-BP 9mm",
    label: "RD-D5-BP 9mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Slats 9mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D5-DP 9mm",
    label: "RD-D5-DP 9mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Slats 9mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D5-CD 9mm",
    label: "RD-D5-CD 9mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Slats 9mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D5-SF 9mm",
    label: "RD-D5-SF 9mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Slats 9mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D5-BP 5mm",
    label: "RD-D5-BP 5mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "BP",
    toprail: "Elite",
    infill: "Slats 5mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D5-DP 5mm",
    label: "RD-D5-DP 5mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "DP",
    toprail: "Elite",
    infill: "Slats 5mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D5-CD 5mm",
    label: "RD-D5-CD 5mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "CD",
    toprail: "Elite",
    infill: "Slats 5mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D5-SF 5mm",
    label: "RD-D5-SF 5mm",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D5",
    anchorage: "SF",
    toprail: "Elite",
    infill: "Slats 5mm Spacers",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D6-DP",
    label: "RD-D6-DP",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D6",
    anchorage: "DP",
    toprail: "Slenderline",
    infill: "10mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D6-CD",
    label: "RD-D6-CD",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D6",
    anchorage: "CD",
    toprail: "Slenderline",
    infill: "10mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D6-SF",
    label: "RD-D6-SF",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D6",
    anchorage: "SF",
    toprail: "Slenderline",
    infill: "10mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D7-BP-Elite",
    label: "RD-D7-BP-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "BP",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-DP-Elite",
    label: "RD-D7-DP-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "DP",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-CD-Elite",
    label: "RD-D7-CD-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "CD",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-SF-Elite",
    label: "RD-D7-SF-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "SF",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D7-BP-Oval",
    label: "RD-D7-BP-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "BP",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-DP-Oval",
    label: "RD-D7-DP-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "DP",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-CD-Oval",
    label: "RD-D7-CD-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "CD",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-SF-Oval",
    label: "RD-D7-SF-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "SF",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D7-BP-Round",
    label: "RD-D7-BP-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "BP",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-DP-Round",
    label: "RD-D7-DP-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "DP",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-CD-Round",
    label: "RD-D7-CD-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "CD",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D7-SF-Round",
    label: "RD-D7-SF-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D7",
    anchorage: "SF",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D8-BP-Elite",
    label: "RD-D8-BP-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "BP",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-DP-Elite",
    label: "RD-D8-DP-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "DP",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-CD-Elite",
    label: "RD-D8-CD-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "CD",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-SF-Elite",
    label: "RD-D8-SF-Elite",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "SF",
    toprail: "Elite",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D8-BP-Oval",
    label: "RD-D8-BP-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "BP",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-DP-Oval",
    label: "RD-D8-DP-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "DP",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-CD-Oval",
    label: "RD-D8-CD-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "CD",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-SF-Oval",
    label: "RD-D8-SF-Oval",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "SF",
    toprail: "Oval",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
  {
    id: "RD-D8-BP-Round",
    label: "RD-D8-BP-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "BP",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-DP-Round",
    label: "RD-D8-DP-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "DP",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-CD-Round",
    label: "RD-D8-CD-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "CD",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPosts,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 0,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
    },
  },
  {
    id: "RD-D8-SF-Round",
    label: "RD-D8-SF-Round",
    mode: "substrate",
    view: "2d",
    snapEnabled: true,
    constraintMode: "even",
    gizmoTool: "translate",
    // hasDerivedBalustrade: true,

    design: "RD-D8",
    anchorage: "SF",
    toprail: "Round",
    infill: "9.52mm Clear Laminate",
    color: initialColor,
    windLoad: initialWindLoad,

    foundation: {
      floor: initialFloorPostsLowWall,
      edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
      },
      fflHeight: 500,
      fflY: initialBalcony.laserLevelY - 0,
    },

    balcony: {
      ...initialBalcony,
      panelHeight:520,
      laserLevelY:500,
    },
  },
]

export const initialState: RootState = {
  mode: "substrate",
  editorContext: "sandbox",
  view: "2d",
  snapEnabled: true,
  constraintMode: "even",
  gizmoTool: "translate",

  design: initialDesign,
  anchorage: initialAnchorage,
  toprail: initialToprail,
  infill: initialInfill,
  color: initialColor,
  windLoad: initialWindLoad,

  foundation: {
  floor: initialFloor,
  edgeTypeDefaults: {
        floor: { offset: 90, thickness: null, height: null },
        wall: { offset: 90, thickness: 150, height: 1800 },
        hob: { offset: -75, thickness: 150, height: 150 },
        low_wall: { offset: 23, thickness: 150, height: 400 },
  },
  fflHeight: 0,
  fflY: initialBalcony.laserLevelY - 0,
},
  postsTool: null,
  selectedFloorVertexIndex: null,
  balcony: {
    ...initialBalcony,
    segmentConstraintsById: initialSegmentConstraintsById,
  },
  posts: rawPosts,
  selectedPostIds: [],
  dragBehavior: "single",
  laserHeightListEditMode: false,
  hasDerivedBalustrade: false,

  debug: {
    showMitrePlanes: false,
  },
}

