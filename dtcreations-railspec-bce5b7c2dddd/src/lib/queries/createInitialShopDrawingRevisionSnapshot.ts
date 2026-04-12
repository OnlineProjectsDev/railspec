// /lib/queries/createInitialShopDrawingRevisionSnapshot.ts
"use server";

import { deriveStageShopDrawingData } from "@/app/(rs)/shopdrawings-editor/deriveStageShopDrawingData";
import { deriveStageFabricationRawParts } from "@/app/(rs)/fabrication/deriveStageFabricationRawParts";
import { saveShopDrawingRevision } from "@/lib/queries/saveShopDrawingRevision";

type Input = {
  jobId: number;
  jobNumber: number;
  jobStageId: number;
  stageNo: number;
  clientName: string;
  siteAddressLine: string;
  cityLine: string;
  revisionCode?: string;
  createdBy?: string | null;
  fabricationSnapshot?: Record<string, unknown> | null;
};

export async function createInitialShopDrawingRevisionSnapshot(input: Input) {
  const revisionCode = input.revisionCode ?? "A";

  const sheets = await deriveStageShopDrawingData({
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    stageNo: input.stageNo,
    clientName: input.clientName,
    siteAddressLine: input.siteAddressLine,
    cityLine: input.cityLine,
  });

  const freshFabrication = await deriveStageFabricationRawParts({
    jobId: input.jobId,
    stageNo: input.stageNo,
  });

  return saveShopDrawingRevision({
    jobId: input.jobId,
    jobStageId: input.jobStageId,
    revisionCode,
    createdBy: input.createdBy ?? null,
    fabricationSnapshot:
      input.fabricationSnapshot ??
      (freshFabrication as unknown as Record<string, unknown>),
    sheets: sheets.map((sheet, index) => ({
      editorBalconyId: sheet.balconyId,
      sheetKey: `drop-${sheet.meta.drop}-balcony-${sheet.meta.balconyNo}`,
      sheetType: "balcony",
      sheetOrder: index,
      sheetDetails: {},
      sheetEdits: {},
      sourceSnapshot: sheet as unknown as Record<string, unknown>,
    })),
  });
}