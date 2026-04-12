// Filename: revertBalconyToRevisionAction.ts
"use server";

import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { balconies, balconyRevisions } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const revertSchema = z.object({
  revisionId: z.number().int().positive(),
});

export const revertBalconyToRevisionAction = actionClient
  .metadata({ actionName: "revertBalconyToRevisionAction" })
  .schema(revertSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }) => {
    const { revisionId } = parsedInput;

    const { isAuthenticated, getUser } = getKindeServerSession();
    const [isAuth, user] = await Promise.all([isAuthenticated(), getUser()]);

    if (!isAuth) redirect("/login");

    const result = await db.transaction(async (tx) => {
      // 1) Load the chosen revision
      const revRows = await tx
        .select()
        .from(balconyRevisions)
        .where(eq(balconyRevisions.id, revisionId))
        .limit(1);

      const rev = revRows[0];
      if (!rev) {
        throw new Error(`Balcony revision ID ${revisionId} not found.`);
      }

      // 2) Load the current balcony row
      const balconyRows = await tx
        .select()
        .from(balconies)
        .where(eq(balconies.id, rev.balconyId))
        .limit(1);

      const current = balconyRows[0];
      if (!current) {
        throw new Error(
          `Balcony ID ${rev.balconyId} not found for revision ${revisionId}.`
        );
      }

      // 3) Snapshot the current state BEFORE revert (for redo / audit)
      await tx.insert(balconyRevisions).values({
        balconyId: current.id,
        jobId: current.jobId,
        jobStageId: current.jobStageId,
        version: current.version,
        data: {
          drop: current.drop,
          balconyNo: current.balconyNo,
          color: current.color,
          foundationArray: current.foundationArray,
          postsArray: current.postsArray,
          heightMm: current.heightMm,
          panelMm: current.panelMm,
          fflMm: current.fflMm,
          ffl_use: current.ffl_use,
          design: current.design,
          anchorage: current.anchorage,
          toprail: current.toprail,
          infill: current.infill,
          metadata: current.metadata,
          notes: current.notes,
          version: current.version,
          isDeleted: current.isDeleted,
        },
        changedBy: user?.email ?? null,
        // changedAt uses DB defaultNow()
      });

      // 4) Apply the revision snapshot back to the main balcony row
      const snapshot = (rev.data ?? {}) as any;
      const newVersion = (current.version ?? 1) + 1;

      const [updated] = await tx
        .update(balconies)
        .set({
          drop: snapshot.drop ?? current.drop,
          balconyNo: snapshot.balconyNo ?? current.balconyNo,

          color: snapshot.color ?? current.color,
          foundationArray:
            snapshot.foundationArray ?? current.foundationArray,
          postsArray: snapshot.postsArray ?? current.postsArray,

          heightMm:
            snapshot.heightMm ??
            current.heightMm ??
            1020,
          panelMm:
            snapshot.panelMm ??
            current.panelMm ??
            1020,
          fflMm: snapshot.fflMm ?? current.fflMm ?? 0,
          ffl_use:
            snapshot.ffl_use ??
            current.ffl_use ??
            false,

          design:
            snapshot.design ??
            current.design ??
            "RD-D1",
          anchorage:
            snapshot.anchorage ??
            current.anchorage ??
            "BP",
          toprail:
            snapshot.toprail ??
            current.toprail ??
            "Elite",
          infill:
            snapshot.infill ??
            current.infill ??
            "6.38mm Clear Laminated",

          metadata: snapshot.metadata ?? current.metadata ?? {},
          notes:
            (snapshot.notes ??
              current.notes ??
              null) as string | null,

          isDeleted:
            snapshot.isDeleted ??
            current.isDeleted ??
            false,

          version: newVersion,
        })
        .where(eq(balconies.id, current.id))
        .returning({ balconyId: balconies.id });

      return { balconyId: updated.balconyId };
    });

    return {
      message: "Balcony reverted to the selected revision.",
      balconyId: result.balconyId,
      mode: "reverted" as const,
    };
  });
