// /app/actions/duplicateEditorBalconyWithStateAction.ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  balconyEditorState,
  editorBalconies,
} from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const duplicateEditorBalconyWithStateSchema = z.object({
  sourceEditorBalconyId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),
  drop: z.string().trim().min(1, "Drop is required"),
  balconyNo: z.string().trim().min(1, "Balcony number is required"),
});

export type DuplicateEditorBalconyWithStateInput = z.infer<
  typeof duplicateEditorBalconyWithStateSchema
>;

export const duplicateEditorBalconyWithStateAction = actionClient
  .metadata({ actionName: "duplicateEditorBalconyWithStateAction" })
  .schema(duplicateEditorBalconyWithStateSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: DuplicateEditorBalconyWithStateInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) redirect("/login");

    const {
      sourceEditorBalconyId,
      jobId,
      jobStageId,
      drop,
      balconyNo,
    } = parsedInput;

    const [sourceBalcony] = await db
      .select()
      .from(editorBalconies)
      .where(
        and(
          eq(editorBalconies.id, sourceEditorBalconyId),
          eq(editorBalconies.jobId, jobId),
          eq(editorBalconies.jobStageId, jobStageId),
          eq(editorBalconies.isDeleted, false)
        )
      )
      .limit(1);

    if (!sourceBalcony) {
      return {
        message: "Source editor balcony not found.",
      } as const;
    }

    const [sourceState] = await db
      .select()
      .from(balconyEditorState)
      .where(eq(balconyEditorState.editorBalconyId, sourceEditorBalconyId))
      .limit(1);

    if (!sourceState) {
      return {
        message: "Source editor balcony state not found.",
      } as const;
    }

    const existing = await db
      .select({ id: editorBalconies.id })
      .from(editorBalconies)
      .where(
        and(
          eq(editorBalconies.jobId, jobId),
          eq(editorBalconies.jobStageId, jobStageId),
          eq(editorBalconies.drop, drop),
          eq(editorBalconies.balconyNo, balconyNo),
          eq(editorBalconies.isDeleted, false)
        )
      )
      .limit(1);

    if (existing[0]) {
      return {
        message: `Drop ${drop} Balcony ${balconyNo} already exists on this stage.`,
        fieldErrors: {
          drop: ["This Drop + Balcony number is already in use for this stage."],
          balconyNo: ["This Drop + Balcony number is already in use for this stage."],
        },
      } as const;
    }

    const created = await db.transaction(async (tx) => {
      const [{ maxSortOrder }] = await tx
        .select({
          maxSortOrder: sql<number>`COALESCE(MAX(${editorBalconies.sortOrder}), 0)`,
        })
        .from(editorBalconies)
        .where(
          and(
            eq(editorBalconies.jobId, jobId),
            eq(editorBalconies.jobStageId, jobStageId),
            eq(editorBalconies.isDeleted, false)
          )
        );

      const nextSortOrder = (maxSortOrder ?? 0) + 1;

      const [editorBalcony] = await tx
        .insert(editorBalconies)
        .values({
          jobId,
          jobStageId,
          drop,
          balconyNo,
          sortOrder: nextSortOrder,
          notes: sourceBalcony.notes,
          geometryNotes: sourceBalcony.geometryNotes,
          version: 1,
          isDeleted: false,
        })
        .returning();

      await tx.insert(balconyEditorState).values({
        editorBalconyId: editorBalcony.id,
        jobId,
        jobStageId,
        editorConfig: sourceState.editorConfig,
        foundationState: sourceState.foundationState,
        balustradeState: sourceState.balustradeState,
        version: 1,
      });

      return editorBalcony;
    });

    return {
      success: true as const,
      message: `Editor balcony ID #${created.id} copied successfully.`,
      editorBalconyId: created.id,
      mode: "created" as const,
    };
  });