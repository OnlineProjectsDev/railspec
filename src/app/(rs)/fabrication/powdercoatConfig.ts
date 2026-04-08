// /app/(rs)/fabrication/powdercoatConfig.ts
import type { ExtrusionCatalog } from "@/lib/fabrication/extrusionCutting"

export const POWDERCOAT_EXTRUSION_CATALOG: ExtrusionCatalog = {
  defaults: {
    endTrimEach: 20,
    kerf: 10,
    spareBarEvery: 30,
  },
  specs: [
    { name: "Elite Toprail", stockLength: 5600, aliases: ["End Cap Elite", "Wall Cap Elite"] },
    { name: "Slenderline Toprail", stockLength: 5600, aliases: ["End Cap Slenderline"] },
    { name: "Visage Toprail", stockLength: 5600 },
    { name: "Oval Toprail", stockLength: 5600, aliases: ["End Cap Oval"] },
    { name: "Round Toprail", stockLength: 5600, aliases: ["End Cap Round"] },

    { name: "Glazing Rail", stockLength: 5600, aliases: ["Glazing Rail Top"] },
    { name: "U-Rail", stockLength: 5600, aliases: ["U-Rail Top"] },
    { name: "Baluster Rail", stockLength: 5600 },

    { name: "19x18 Baluster", stockLength: 5600 },
    { name: "65x16 Slat", stockLength: 5600, aliases: ["65x16 Slat Horizontal"] },
    { name: "Slat Side Frame", stockLength: 5600 },

    { name: "PST-001", stockLength: 5300 },
    { name: "PST-002", stockLength: 5300 },
  ],
}

const POWDERCOAT_COMPONENT_NAMES = new Set([
  "BP",
  "DP",
  "CD",
  "End Cap Elite",
  "End Cap Slenderline",
  "End Cap Oval",
  "End Cap Round",
  "Wall Cap Elite",
])

const NON_POWDERCOAT_PART_NAMES = new Set([
  "25mm Round Toprail",
  "38mm Round Toprail",
  "42mm Round Toprail",
  "25mm Square Toprail",
  "SF Anchor",
  "PST-002 Glass Cushion",
  "4mm Spline",
  "Post-002 Rubber",
  "Spigot_RDTF",
  "Spigot_SQTF",
  "Spigot_RDCD",
  "Spigot_SQCD",
  "Spigot_HDTF",
  "Spigot_HDCD",
  "Spigot_SF",
])

export function isPowdercoatExtrusionPartName(partName: string | null | undefined) {
  const name = typeof partName === "string" ? partName.trim() : ""
  if (!name) return false
  if (NON_POWDERCOAT_PART_NAMES.has(name)) return false
  return POWDERCOAT_EXTRUSION_CATALOG.specs.some((spec) => {
    if (spec.name === name) return true
    return (spec.aliases ?? []).includes(name)
  })
}

export function isPowdercoatComponentPartName(partName: string | null | undefined) {
  const name = typeof partName === "string" ? partName.trim() : ""
  if (!name) return false
  return POWDERCOAT_COMPONENT_NAMES.has(name)
}