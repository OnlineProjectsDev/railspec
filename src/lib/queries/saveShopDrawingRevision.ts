// /lib/queries/saveShopDrawingRevision.ts
"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  shopDrawingRevisions,
  shopDrawingRevisionSheets,
} from "@/db/schema";

type SaveShopDrawingRevisionInput = {
  jobId: number;
  jobStageId: number;
  revisionCode: string;
  notes?: string | null;
  createdBy?: string | null;
  fabricationSnapshot?: Record<string, unknown> | null;
  sheets: Array<{
    editorBalconyId?: number | null;
    sheetKey: string;
    sheetType?: string;
    sheetOrder: number;
    sheetDetails?: Record<string, unknown>;
    sheetEdits?: Record<string, unknown>;
    sourceSnapshot?: Record<string, unknown>;
  }>;
};

export async function saveShopDrawingRevision(
  input: SaveShopDrawingRevisionInput
) {
  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(shopDrawingRevisions)
      .where(
        and(
          eq(shopDrawingRevisions.jobStageId, input.jobStageId),
          eq(shopDrawingRevisions.revisionCode, input.revisionCode)
        )
      )
      .limit(1);

    const existing = existingRows[0] ?? null;

    let revisionId: number;

    if (existing) {
      const updatedRows = await tx
        .update(shopDrawingRevisions)
        .set({
          jobId: input.jobId,
          notes: input.notes ?? null,
          isCurrent: true,
          fabricationSnapshot: input.fabricationSnapshot ?? null,
          createdBy: input.createdBy ?? existing.createdBy ?? null,
          updatedAt: new Date(),
        })
        .where(eq(shopDrawingRevisions.id, existing.id))
        .returning({ id: shopDrawingRevisions.id });

      revisionId = updatedRows[0].id;
    } else {
      const insertedRows = await tx
        .insert(shopDrawingRevisions)
        .values({
          jobId: input.jobId,
          jobStageId: input.jobStageId,
          revisionCode: input.revisionCode,
          notes: input.notes ?? null,
          isCurrent: true,
          fabricationSnapshot: input.fabricationSnapshot ?? null,
          createdBy: input.createdBy ?? null,
        })
        .returning({ id: shopDrawingRevisions.id });

      revisionId = insertedRows[0].id;
    }

    await tx
      .update(shopDrawingRevisions)
      .set({
        isCurrent: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shopDrawingRevisions.jobStageId, input.jobStageId),
          eq(shopDrawingRevisions.isCurrent, true)
        )
      );

    await tx
      .update(shopDrawingRevisions)
      .set({
        isCurrent: true,
        updatedAt: new Date(),
      })
      .where(eq(shopDrawingRevisions.id, revisionId));

    await tx
      .update(shopDrawingRevisionSheets)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shopDrawingRevisionSheets.revisionId, revisionId),
          eq(shopDrawingRevisionSheets.isDeleted, false)
        )
      );

    if (input.sheets.length) {
      await tx.insert(shopDrawingRevisionSheets).values(
        input.sheets.map((sheet) => ({
          revisionId,
          jobId: input.jobId,
          jobStageId: input.jobStageId,
          editorBalconyId: sheet.editorBalconyId ?? null,
          sheetKey: sheet.sheetKey,
          sheetType: sheet.sheetType ?? "balcony",
          sheetOrder: sheet.sheetOrder,
          sheetDetails: sheet.sheetDetails ?? {},
          sheetEdits: sheet.sheetEdits ?? {},
          sourceSnapshot: sheet.sourceSnapshot ?? {},
          isDeleted: false,
        }))
      );
    }

    const savedSheets = await tx
      .select()
      .from(shopDrawingRevisionSheets)
      .where(
        and(
          eq(shopDrawingRevisionSheets.revisionId, revisionId),
          eq(shopDrawingRevisionSheets.isDeleted, false)
        )
      );

    const revisionRows = await tx
      .select()
      .from(shopDrawingRevisions)
      .where(eq(shopDrawingRevisions.id, revisionId))
      .limit(1);

    return {
      revision: revisionRows[0],
      sheets: savedSheets,
    };
  });
}