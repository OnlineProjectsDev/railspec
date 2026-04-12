// /app/actions/revertEditorBalconyToRevisionAction.ts
"use server";

import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

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

const revertEditorRevisionSchema = z.object({
  revisionId: z.number().int().positive(),
});

export const revertEditorBalconyToRevisionAction = actionClient
  .metadata({ actionName: "revertEditorBalconyToRevisionAction" })
  .schema(revertEditorRevisionSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }) => {
    const { revisionId } = parsedInput;

    const { isAuthenticated, getUser } = getKindeServerSession();
    const [isAuth, user] = await Promise.all([isAuthenticated(), getUser()]);

    if (!isAuth) redirect("/login");

    const result = await db.transaction(async (tx) => {
      const revRows = await tx
        .select()
        .from(balconyEditorRevisions)
        .where(eq(balconyEditorRevisions.id, revisionId))
        .limit(1);

      const rev = revRows[0];
      if (!rev) {
        throw new Error(`Editor balcony revision ID ${revisionId} not found.`);
      }

      const currentRows = await tx
        .select()
        .from(balconyEditorState)
        .where(eq(balconyEditorState.editorBalconyId, rev.editorBalconyId))
        .limit(1);

      const current = currentRows[0];
      if (!current) {
        throw new Error(
          `Editor state for editor balcony ${rev.editorBalconyId} not found.`
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

      const [updated] = await tx
        .update(balconyEditorState)
        .set({
          editorConfig: rev.editorConfig as EditorConfigState,
          foundationState: rev.foundationState as FoundationPersistedState,
          balustradeState: rev.balustradeState as BalustradePersistedState,
          version: newVersion,
        })
        .where(eq(balconyEditorState.id, current.id))
        .returning({
          editorBalconyId: balconyEditorState.editorBalconyId,
          version: balconyEditorState.version,
        });

      await tx
        .update(editorBalconies)
        .set({
          version: newVersion,
        })
        .where(eq(editorBalconies.id, current.editorBalconyId));

      return updated;
    });

    return {
      message: "Editor balcony reverted to the selected revision.",
      editorBalconyId: result.editorBalconyId,
      mode: "reverted" as const,
      version: result.version,
    };
  });