// app/actions/reorderBalconiesForStageAction.ts
"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { balconies } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const reorderSchema = z.object({
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1),
});

export type ReorderBalconiesInput = z.infer<typeof reorderSchema>;

export const reorderBalconiesForStageAction = actionClient
  .metadata({ actionName: "reorderBalconiesForStageAction" })
  .schema(reorderSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: ReorderBalconiesInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();
    if (!isAuth) redirect("/login");

    const { jobId, jobStageId, orderedIds } = parsedInput;

    await db.transaction(async (tx) => {
      // Ensure all these IDs actually belong to this job+stage (and aren’t deleted)
      const rows = await tx
        .select({ id: balconies.id })
        .from(balconies)
        .where(
          and(
            eq(balconies.jobId, jobId),
            eq(balconies.jobStageId, jobStageId),
            eq(balconies.isDeleted, false)
          )
        );

      const validIds = new Set(rows.map((r) => r.id));
      const allValid = orderedIds.every((id) => validIds.has(id));
      if (!allValid) {
        throw new Error("Ordered balcony IDs do not match this stage.");
      }

      // Update sortOrder in the given sequence
      for (let index = 0; index < orderedIds.length; index++) {
        const id = orderedIds[index];
        await tx
          .update(balconies)
          .set({ sortOrder: index + 1 })
          .where(eq(balconies.id, id));
      }
    });

    return {
      success: true as const,
      message: "Balcony order updated.",
    };
  });
