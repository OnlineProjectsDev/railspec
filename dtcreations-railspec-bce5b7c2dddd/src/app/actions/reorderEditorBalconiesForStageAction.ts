// /app/actions/reorderEditorBalconiesForStageAction.ts
"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { editorBalconies } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const reorderEditorBalconiesSchema = z.object({
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1),
});

export type ReorderEditorBalconiesInput = z.infer<typeof reorderEditorBalconiesSchema>;

export const reorderEditorBalconiesForStageAction = actionClient
  .metadata({ actionName: "reorderEditorBalconiesForStageAction" })
  .schema(reorderEditorBalconiesSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: ReorderEditorBalconiesInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) redirect("/login");

    const { jobId, jobStageId, orderedIds } = parsedInput;

    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: editorBalconies.id })
        .from(editorBalconies)
        .where(
          and(
            eq(editorBalconies.jobId, jobId),
            eq(editorBalconies.jobStageId, jobStageId),
            eq(editorBalconies.isDeleted, false)
          )
        );

      const validIds = new Set(rows.map((r) => r.id));
      const allValid = orderedIds.every((id) => validIds.has(id));

      if (!allValid) {
        throw new Error("Ordered editor balcony IDs do not match this stage.");
      }

      for (let index = 0; index < orderedIds.length; index++) {
        const id = orderedIds[index];
        await tx
          .update(editorBalconies)
          .set({ sortOrder: index + 1 })
          .where(eq(editorBalconies.id, id));
      }
    });

    return {
      success: true as const,
      message: "Editor balcony order updated.",
    };
  });