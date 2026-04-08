// lib/fabrication/buildStageFabricationModel.ts
import { DropToPartslist } from "@/app/(rs)/shopdrawings/DropsToPartslist";

import {
  normalisePostsArray,
  normaliseFoundationArray,
  computeGeometryPosts,
} from "@/app/(rs)/shopdrawings/shopdrawingGeometry";

export type StageMeta = {
  jobNumber: string;
  stageNo: number;
  clientName: string;
  siteAddressLine: string;
  colourName: string;
  dateString: string;
};

export type StageFabricationModel = {
  meta: StageMeta;

  // document buckets
  cuttingRows: any[];
  powdercoat: { extrusions: any[]; components: any[] };
  glassRows: any[];
  componentsRows: any[];

  // optional (useful for debugging / later)
  balconyCount: number;
};

export function buildStageFabricationModel(args: {
  meta: StageMeta;
  balconies: Array<{
    id: number;
    drop: string;
    balconyNo: string;
    design?: string | null;
    toprail?: string | null;
    infill?: string | null;
    postsArray: unknown;
    foundationArray: unknown;
  }>;
  jobDefaults: {
    design_default?: string | null;
    toprail_default?: string | null;
    infill_default?: string | null;
  };
}): StageFabricationModel {
  const cuttingRows: any[] = [];
  const glassRows: any[] = [];
  const componentsRows: any[] = [];
  const powdercoat = { extrusions: [] as any[], components: [] as any[] };

  for (const b of args.balconies) {
    const design = b.design ?? args.jobDefaults.design_default ?? "RD-D1";
    const glassType = b.infill ?? args.jobDefaults.infill_default ?? "";

    // same pipeline as ShopDrawingSheet
    const postsRaw = normalisePostsArray(b.postsArray);
    const foundationRaw = normaliseFoundationArray(b.foundationArray);
    const postsDerived = computeGeometryPosts(postsRaw);

    const partslist = DropToPartslist([...postsDerived], design, glassType);

    // TODO: aggregate into the 4 doc buckets
    // - cuttingRows push from: partslist.toprail_partslist / midrail_partslist / etc.
    // - glassRows push from: partslist.glass_infill_partslist
    // - componentsRows push from: fixed_components_partslist + baseplate parts + misc
    // - powdercoat push: powdercoat colour + extrusions/components requiring coating
  }

  return {
    meta: args.meta,
    cuttingRows,
    powdercoat,
    glassRows,
    componentsRows,
    balconyCount: args.balconies.length,
  };
}
