// /app/actions/saveShopDrawingRevisionDetailsAction.ts
"use server";

import { flattenValidationErrors } from "next-safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";

import { actionClient } from "@/lib/safe-action";
import { getShopDrawingRevisionWithSheets } from "@/lib/queries/getShopDrawingRevision";
import { saveShopDrawingRevision } from "@/lib/queries/saveShopDrawingRevision";
import { getNextRevisionCode } from "@/lib/shopdrawings/getNextRevisionCode";

const schema = z.object({
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),
  currentRevisionCode: z.string().min(1),
  mode: z.enum(["overwrite", "increment"]),
  title1: z.string().optional(),
  title2: z.string().optional(),
  title3: z.string().optional(),
  sheetView3dByBalconyId: z.record(z.string(), z.unknown()).optional(),
});

function applyTitleDetails(
  existing: Record<string, unknown> | null | undefined,
  titles: {
    title1?: string;
    title2?: string;
    title3?: string;
  }
) {
  const next: Record<string, unknown> = { ...(existing ?? {}) };

  const entries: Array<keyof typeof titles> = ["title1", "title2", "title3"];

  for (const key of entries) {
    const raw = titles[key];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
  }

  return next;
}

export const saveShopDrawingRevisionDetailsAction = actionClient
  .metadata({ actionName: "saveShopDrawingRevisionDetailsAction" })
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

    const saved = await saveShopDrawingRevision({
      jobId: parsedInput.jobId,
      jobStageId: parsedInput.jobStageId,
      revisionCode: targetRevisionCode,
      notes: current.revision.notes ?? null,
      createdBy: user?.email ?? null,
      fabricationSnapshot:
        (current.revision.fabricationSnapshot as Record<string, unknown> | null) ??
        null,
      sheets: current.sheets.map((sheetRow) => ({
        editorBalconyId: sheetRow.editorBalconyId ?? null,
        sheetKey: sheetRow.sheetKey,
        sheetType: sheetRow.sheetType ?? "balcony",
        sheetOrder: sheetRow.sheetOrder,
        sheetDetails: applyTitleDetails(
          (sheetRow.sheetDetails as Record<string, unknown> | null) ?? {},
          {
            title1: parsedInput.title1,
            title2: parsedInput.title2,
            title3: parsedInput.title3,
          }
        ),
        sheetEdits: {
          ...((sheetRow.sheetEdits as Record<string, unknown> | null) ?? {}),
          ...(() => {
            const balconyId =
              typeof sheetRow.editorBalconyId === "number"
                ? String(sheetRow.editorBalconyId)
                : null

            return balconyId && parsedInput.sheetView3dByBalconyId?.[balconyId]
              ? { view3d: parsedInput.sheetView3dByBalconyId[balconyId] }
              : {}
          })(),
        },
        sourceSnapshot:
          (sheetRow.sourceSnapshot as Record<string, unknown> | null) ?? {},
      })),
    });

    return {
      success: true,
      revisionCode: saved.revision.revisionCode,
      message:
        parsedInput.mode === "increment"
          ? `Saved details into revision ${saved.revision.revisionCode}.`
          : `Updated revision ${saved.revision.revisionCode}.`,
    };
  });