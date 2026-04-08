// /app/actions/refreshShopDrawingRevisionAction.ts
"use server";

import { flattenValidationErrors } from "next-safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";

import { actionClient } from "@/lib/safe-action";
import { deriveStageShopDrawingData } from "@/app/(rs)/shopdrawings-editor/deriveStageShopDrawingData";
import { deriveStageFabricationRawParts } from "@/app/(rs)/fabrication/deriveStageFabricationRawParts";
import { getShopDrawingRevisionWithSheets } from "@/lib/queries/getShopDrawingRevision";
import { saveShopDrawingRevision } from "@/lib/queries/saveShopDrawingRevision";
import { getNextRevisionCode } from "@/lib/shopdrawings/getNextRevisionCode";

const schema = z.object({
  jobId: z.number().int().positive(),
  jobNumber: z.number().int().positive(),
  jobStageId: z.number().int().positive(),
  stageNo: z.number().int().positive(),
  currentRevisionCode: z.string().min(1),
  mode: z.enum(["overwrite", "increment"]),
  clientName: z.string(),
  siteAddressLine: z.string(),
  cityLine: z.string(),
});

export const refreshShopDrawingRevisionAction = actionClient
  .metadata({ actionName: "refreshShopDrawingRevisionAction" })
  .schema(schema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }) => {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    const current = await getShopDrawingRevisionWithSheets({
      jobStageId: parsedInput.jobStageId,
      revisionCode: parsedInput.currentRevisionCode,
    });

    if (!current.revision) {
      return {
        success: false,
        message: `Revision ${parsedInput.currentRevisionCode} was not found.`,
      };
    }

    const targetRevisionCode =
      parsedInput.mode === "increment"
        ? getNextRevisionCode(parsedInput.currentRevisionCode)
        : parsedInput.currentRevisionCode;

    const freshSheets = await deriveStageShopDrawingData({
      jobId: parsedInput.jobId,
      jobNumber: parsedInput.jobNumber,
      stageNo: parsedInput.stageNo,
      clientName: parsedInput.clientName,
      siteAddressLine: parsedInput.siteAddressLine,
      cityLine: parsedInput.cityLine,
    });

    const freshFabrication = await deriveStageFabricationRawParts({
      jobId: parsedInput.jobId,
      stageNo: parsedInput.stageNo,
    });

    const existingByEditorBalconyId = new Map(
      current.sheets
        .filter((sheetRow) => typeof sheetRow.editorBalconyId === "number")
        .map((sheetRow) => [sheetRow.editorBalconyId as number, sheetRow])
    );

    const saved = await saveShopDrawingRevision({
      jobId: parsedInput.jobId,
      jobStageId: parsedInput.jobStageId,
      revisionCode: targetRevisionCode,
      notes: current.revision.notes ?? null,
      createdBy: user?.email ?? null,
      fabricationSnapshot: freshFabrication as unknown as Record<string, unknown>,
      sheets: freshSheets.map((sheet, index) => {
        const sheetKey = `drop-${sheet.meta.drop}-balcony-${sheet.meta.balconyNo}`;
        const existing = existingByEditorBalconyId.get(sheet.balconyId);

        return {
          editorBalconyId: sheet.balconyId,
          sheetKey,
          sheetType: existing?.sheetType ?? "balcony",
          sheetOrder: index,
          sheetDetails:
            (existing?.sheetDetails as Record<string, unknown> | null) ?? {},
          sheetEdits:
            (existing?.sheetEdits as Record<string, unknown> | null) ?? {},
          sourceSnapshot: sheet as unknown as Record<string, unknown>,
        };
      }),
    });

    return {
      success: true,
      revisionCode: saved.revision.revisionCode,
      message:
        parsedInput.mode === "increment"
          ? `Refreshed drawings into revision ${saved.revision.revisionCode}.`
          : `Refreshed drawings for revision ${saved.revision.revisionCode}.`,
    };
  });