// /lib/editor-persistence/defaults.ts
import type { JobStageDefaults } from "@/lib/editor-persistence/types"

export const DEFAULT_JOB_STAGE_DEFAULTS: JobStageDefaults = {
  design_default: "RD-D1",
  anchorage_default: "BP",
  toprail_default: "Elite",
  infill_default: "6.38mm Clear Laminate",
  powdercoatColourId: null,
  wind_load: {
    bldg_height: 30,
    wind_region: "A",
    terrain_category: 2,
  },
  constraints: {
    minBarrierHeight: 1020,
    maxBarrierHeight: 1050,
    panelHeight: 950,
    maxPanelHeight: 1000,
    maxPostSpacing: 1280,
    maxBottomGap: 100,
    minPostLength: 1020,
    laserLevelY: 0,
    topY: 1020,
  },
  template: {
    preset: "default-rectangular",
  },
}