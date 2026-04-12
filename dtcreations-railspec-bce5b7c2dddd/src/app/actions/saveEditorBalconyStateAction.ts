// /app/actions/saveEditorBalconyStateAction.ts
"use server";

import { and, eq } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  balconyEditorRevisions,
  balconyEditorState,
  editorBalconies,
} from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import type {
  EditorConfigState,
  FoundationPersistedState,
  BalustradePersistedState,
} from "@/lib/editor-persistence/types";

const saveEditorBalconyStateSchema = z.object({
  editorBalconyId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),

  editorConfig: z.custom<EditorConfigState>(),
  foundationState: z.custom<FoundationPersistedState>(),
  balustradeState: z.custom<BalustradePersistedState>(),
});

export type SaveEditorBalconyStateInput = z.infer<typeof saveEditorBalconyStateSchema>;

export const saveEditorBalconyStateAction = actionClient
  .metadata({ actionName: "saveEditorBalconyStateAction" })
  .schema(saveEditorBalconyStateSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: SaveEditorBalconyStateInput }) => {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const [isAuth, user] = await Promise.all([isAuthenticated(), getUser()]);

    if (!isAuth) redirect("/login");

    const updated = await db.transaction(async (tx) => {
      const balconyRows = await tx
        .select()
        .from(editorBalconies)
        .where(
          and(
            eq(editorBalconies.id, parsedInput.editorBalconyId),
            eq(editorBalconies.jobId, parsedInput.jobId),
            eq(editorBalconies.jobStageId, parsedInput.jobStageId),
            eq(editorBalconies.isDeleted, false)
          )
        )
        .limit(1);

      const balcony = balconyRows[0];

      if (!balcony) {
        throw new Error(
          `Editor balcony ID ${parsedInput.editorBalconyId} not found for job ${parsedInput.jobId}, stage ${parsedInput.jobStageId}.`
        );
      }

      const stateRows = await tx
        .select()
        .from(balconyEditorState)
        .where(eq(balconyEditorState.editorBalconyId, parsedInput.editorBalconyId))
        .limit(1);

      const current = stateRows[0];

      if (!current) {
        throw new Error(
          `Editor state not found for editor balcony ${parsedInput.editorBalconyId}.`
        );
      }

      await tx.insert(balconyEditorRevisions).values({
        editorBalconyId: current.editorBalconyId,
        jobId: current.jobId,
        jobStageId: current.jobStageId,
        editorConfig: current.editorConfig as EditorConfigState,
        foundationState: current.foundationState as FoundationPersistedState,
        balustradeState: current.balustradeState as BalustradePersistedState,
        version: current.version,
        changedBy: user?.email ?? null,
      });

      const newVersion = (current.version ?? 1) + 1;

      const [updatedState] = await tx
        .update(balconyEditorState)
        .set({
          editorConfig: parsedInput.editorConfig,
          foundationState: parsedInput.foundationState,
          balustradeState: parsedInput.balustradeState,
          version: newVersion,
        })
        .where(eq(balconyEditorState.id, current.id))
        .returning();

      await tx
        .update(editorBalconies)
        .set({
          version: newVersion,
        })
        .where(eq(editorBalconies.id, parsedInput.editorBalconyId));

      return updatedState;
    });

    return {
      success: true as const,
      message: `Editor balcony state updated (ID #${updated.editorBalconyId}).`,
      editorBalconyId: updated.editorBalconyId,
      version: updated.version,
    };
  });