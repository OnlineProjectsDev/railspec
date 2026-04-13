// Filename: applyStageDefaultsToBalconiesAction.ts
"use server";

import { and, eq } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";

import { db } from "@/db";
import { balconies, balconyRevisions, jobStages } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { z } from "zod";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const applyStageDefaultsToBalconiesAction = actionClient
  .metadata({ actionName: "applyStageDefaultsToBalconiesAction" })
  .schema(
    z.object({
      jobId: z.number().int().positive(),
      jobStageId: z.number().int().positive(),
      // optional: restrict which fields to apply; for now, we can omit or keep this simple
      // fields: z.array(z.enum(["heightMm", "design", "anchorage", "toprail", "infill"])).optional(),
    }),
    {
      handleValidationErrorsShape: async (ve) =>
        flattenValidationErrors(ve).fieldErrors,
    }
  )
  .action(async ({ parsedInput }) => {
    const { jobId, jobStageId } = parsedInput;

    const { isAuthenticated, getUser } = getKindeServerSession();
    const [isAuth, user] = await Promise.all([isAuthenticated(), getUser()]);

    if (!isAuth) {
      return {
        message: "You must be logged in to apply stage defaults.",
      } as const;
    }

    // 1) Load the jobStage to get its defaults
    const [stage] = await db
      .select()
      .from(jobStages)
      .where(and(eq(jobStages.id, jobStageId), eq(jobStages.jobId, jobId)))
      .limit(1);

    if (!stage) {
      return {
        message: `JobStage ${jobStageId} for Job ${jobId} not found.`,
      } as const;
    }

    const defaults = (stage.defaults ?? {}) as any;

    const designDefault =
      defaults.design_default ?? "RD-D1";
    const anchorageDefault =
      defaults.anchorage_default ?? "BP";
    const toprailDefault =
      defaults.toprail_default ?? "Elite";
    const infillDefault =
      defaults.glass_default ?? "6.38mm Clear Laminated";
    const heightDefault =
      defaults.height_default ?? 1020;
    // panel default can plug in here later if/when you add it

    // 2) Transaction: snapshot + update all balconies on this stage
    const result = await db.transaction(async (tx) => {
      const toUpdate = await tx
        .select()
        .from(balconies)
        .where(
          and(
            eq(balconies.jobId, jobId),
            eq(balconies.jobStageId, jobStageId),
            eq(balconies.isDeleted, false)
          )
        );

      if (!toUpdate.length) {
        return { updatedCount: 0 };
      }

      for (const b of toUpdate) {
        // 2a) write revision snapshot (pre-update)
        await tx.insert(balconyRevisions).values({
          balconyId: b.id,
          jobId: b.jobId,
          jobStageId: b.jobStageId,
          version: b.version,
          data: {
            drop: b.drop,
            balconyNo: b.balconyNo,
            color: b.color,
            foundationArray: b.foundationArray,
            postsArray: b.postsArray,
            heightMm: b.heightMm,
            panelMm: b.panelMm,
            fflMm: b.fflMm,
            ffl_use: b.ffl_use,
            design: b.design,
            anchorage: b.anchorage,
            toprail: b.toprail,
            infill: b.infill,
            metadata: b.metadata,
            notes: b.notes,
            version: b.version,
            isDeleted: b.isDeleted,
          },
          changedBy: user?.email ?? null,
        });

        const newVersion = (b.version ?? 1) + 1;

        // 2b) apply stage defaults to chosen fields
        await tx
          .update(balconies)
          .set({
            heightMm: heightDefault,
            design: designDefault,
            anchorage: anchorageDefault,
            toprail: toprailDefault,
            infill: infillDefault,
            version: newVersion,
          })
          .where(eq(balconies.id, b.id));
      }

      return { updatedCount: toUpdate.length };
    });

    if (result.updatedCount === 0) {
      return {
        message: "No balconies found on this stage.",
        updatedCount: 0,
      } as const;
    }

    return {
      message: `Applied stage defaults to ${result.updatedCount} balcony(ies).`,
      updatedCount: result.updatedCount,
    } as const;
  });
