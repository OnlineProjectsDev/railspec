// /lib/queries/getShopDrawingRevisionSyncStatus.ts
"use server";

import type { ShopDrawingSheetData } from "@/app/(rs)/shopdrawings-editor/types";
import { deriveStageShopDrawingData } from "@/app/(rs)/shopdrawings-editor/deriveStageShopDrawingData";
import { getShopDrawingRevisionWithSheets } from "@/lib/queries/getShopDrawingRevision";
import { hashShopDrawingSnapshot } from "@/lib/shopdrawings/hashShopDrawingSnapshot";

type Input = {
  jobId: number;
  jobNumber: number;
  jobStageId: number;
  stageNo: number;
  clientName: string;
  siteAddressLine: string;
  cityLine: string;
  revisionCode?: string;
};

export async function getShopDrawingRevisionSyncStatus(input: Input) {
  const revisionData = await getShopDrawingRevisionWithSheets({
    jobStageId: input.jobStageId,
    revisionCode: input.revisionCode,
  });

  if (!revisionData.revision) {
    return {
      hasRevision: false,
      isDirty: false,
      revisionCode: null as string | null,
      savedHash: null as string | null,
      freshHash: null as string | null,
      savedCount: 0,
      freshCount: 0,
    };
  }

  const savedSheets: ShopDrawingSheetData[] = revisionData.sheets
    .map((sheetRow) => sheetRow.sourceSnapshot as ShopDrawingSheetData | null)
    .filter(Boolean) as ShopDrawingSheetData[];

  const freshSheets = await deriveStageShopDrawingData({
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    stageNo: input.stageNo,
    clientName: input.clientName,
    siteAddressLine: input.siteAddressLine,
    cityLine: input.cityLine,
  });

  const savedHash = hashShopDrawingSnapshot(savedSheets);
  const freshHash = hashShopDrawingSnapshot(freshSheets);

  return {
    hasRevision: true,
    isDirty: savedHash !== freshHash,
    revisionCode: revisionData.revision.revisionCode,
    savedHash,
    freshHash,
    savedCount: savedSheets.length,
    freshCount: freshSheets.length,
  };
}