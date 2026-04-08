// /app/actions/saveEditorBalconyAction.ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { editorBalconies } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const idField = z.union([z.number().int().positive(), z.literal("(New)")]);

const saveEditorBalconySchema = z.object({
  id: idField,
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),

  drop: z.string().trim().min(1, "Drop is required"),
  balconyNo: z.string().trim().min(1, "Balcony number is required"),

  sortOrder: z.number().int().positive().optional(),

  notes: z.string().nullable().optional(),
  geometryNotes: z.string().nullable().optional(),

  isDeleted: z.boolean().optional(),
});

export type SaveEditorBalconyInput = z.infer<typeof saveEditorBalconySchema>;

export const saveEditorBalconyAction = actionClient
  .metadata({ actionName: "saveEditorBalconyAction" })
  .schema(saveEditorBalconySchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: SaveEditorBalconyInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) redirect("/login");

    const editorBalcony = parsedInput;

    const existing = await db
      .select({
        id: editorBalconies.id,
      })
      .from(editorBalconies)
      .where(
        and(
          eq(editorBalconies.jobId, editorBalcony.jobId),
          eq(editorBalconies.jobStageId, editorBalcony.jobStageId),
          eq(editorBalconies.drop, editorBalcony.drop),
          eq(editorBalconies.balconyNo, editorBalcony.balconyNo),
          eq(editorBalconies.isDeleted, false)
        )
      );

    const conflictingRow = existing.find((row) =>
      editorBalcony.id === "(New)" ? true : row.id !== Number(editorBalcony.id)
    );

    if (editorBalcony.id === "(New)" && conflictingRow) {
      return {
        message: `Job ID ${editorBalcony.jobId} Stage ${editorBalcony.jobStageId} Drop ${editorBalcony.drop} Balcony ${editorBalcony.balconyNo} already exists.`,
        fieldErrors: {
          drop: ["This Drop + Balcony number is already in use for this stage."],
          balconyNo: ["This Drop + Balcony number is already in use for this stage."],
        },
      } as const;
    }

    if (
      editorBalcony.id !== "(New)" &&
      conflictingRow
    ) {
      return {
        message: `Job ID ${editorBalcony.jobId} Stage ${editorBalcony.jobStageId} Drop ${editorBalcony.drop} Balcony ${editorBalcony.balconyNo} already exists.`,
        fieldErrors: {
          drop: ["Another editor balcony already uses this Drop + Balcony number for this stage."],
          balconyNo: ["Another editor balcony already uses this Drop + Balcony number for this stage."],
        },
      } as const;
    }

    if (editorBalcony.id === "(New)") {
      const [{ maxSortOrder }] = await db
        .select({
          maxSortOrder: sql<number>`COALESCE(MAX(${editorBalconies.sortOrder}), 0)`,
        })
        .from(editorBalconies)
        .where(
          and(
            eq(editorBalconies.jobId, editorBalcony.jobId),
            eq(editorBalconies.jobStageId, editorBalcony.jobStageId),
            eq(editorBalconies.isDeleted, false)
          )
        );

      const nextSortOrder = (maxSortOrder ?? 0) + 1;

      const [result] = await db
        .insert(editorBalconies)
        .values({
          jobId: editorBalcony.jobId,
          jobStageId: editorBalcony.jobStageId,
          drop: editorBalcony.drop,
          balconyNo: editorBalcony.balconyNo,
          sortOrder: editorBalcony.sortOrder ?? nextSortOrder,
          notes: editorBalcony.notes?.trim() || null,
          geometryNotes: editorBalcony.geometryNotes?.trim() || null,
          version: 1,
          isDeleted: editorBalcony.isDeleted ?? false,
        })
        .returning({ insertedId: editorBalconies.id });

      return {
        message: `Editor balcony ID #${result.insertedId} created successfully`,
        editorBalconyId: result.insertedId,
        mode: "created" as const,
      };
    }

    const updated = await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(editorBalconies)
        .where(eq(editorBalconies.id, Number(editorBalcony.id)))
        .limit(1);

      const current = existingRows[0];

      if (!current) {
        throw new Error(`Editor balcony ID ${editorBalcony.id} not found for update.`);
      }

      const [result] = await tx
        .update(editorBalconies)
        .set({
          drop: editorBalcony.drop,
          balconyNo: editorBalcony.balconyNo,
          sortOrder: editorBalcony.sortOrder ?? current.sortOrder,
          notes: editorBalcony.notes?.trim() ?? null,
          geometryNotes: editorBalcony.geometryNotes?.trim() ?? null,
          version: (current.version ?? 1) + 1,
          isDeleted: editorBalcony.isDeleted ?? current.isDeleted ?? false,
        })
        .where(eq(editorBalconies.id, current.id))
        .returning({ updatedId: editorBalconies.id });

      return result;
    });

    return {
      message: `Editor balcony ID #${updated.updatedId} updated successfully`,
      editorBalconyId: updated.updatedId,
      mode: "updated" as const,
    };
  });