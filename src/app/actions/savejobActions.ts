// /app/actions/saveJobActions.ts
"use server";

import { eq, sql } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { jobs, jobStages } from "@/db/schema"; // 👈 import jobStages
import type { JobStageDefaults } from "@/lib/editor-persistence/types";
import type { DesignCode, AnchorageType, ToprailType, InfillType } from "@/lib/types";
import { actionClient } from "@/lib/safe-action";
import {
  insertJobSchema,
  type insertJobSchemaType,
} from "@/zod-schemas/jobs";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// helper to build stage defaults from the job payload
function buildStageDefaultsFromJob(job: insertJobSchemaType): JobStageDefaults {
  const minBarrierHeight = job.height_default ?? 1020
  const maxBarrierHeight = job.max_height_default ?? 1200

  return {
    design_default: (job.design_default ?? "RD-D1") as DesignCode,
    anchorage_default: (job.anchorage_default ?? "BP") as AnchorageType,
    toprail_default: (job.toprail_default ?? "Elite") as ToprailType,
    infill_default: (job.infill_default ?? "6.38mm Clear Laminate") as InfillType,
    powdercoatColourId: job.powdercoatColourId ?? null,

    wind_load: job.wind_load ?? {
      bldg_height: 30,
      wind_region: "A",
      terrain_category: 2,
    },

    constraints: {
      minBarrierHeight,
      maxBarrierHeight,
      panelHeight: 950,
      maxPanelHeight: 1000,
      maxPostSpacing: job.max_post_spacing ?? 1280,
      maxBottomGap: 100,
      minPostLength: minBarrierHeight,
      laserLevelY: 0,
      topY: minBarrierHeight,
    },

    template: {
      preset: "default-rectangular",
    },
  };
}

export const saveJobAction = actionClient
  .metadata({ actionName: "saveJobAction" })
  .schema(insertJobSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput: job }: { parsedInput: insertJobSchemaType }) => {
    const { isAuthenticated } = getKindeServerSession();

    const isAuth = await isAuthenticated();

    if (!isAuth) redirect("/login");

    // New Job
    if (job.id === "(New)") {
      const result = await db.transaction(async (tx) => {
        // Atomically grab the next job number inside a transaction
        const [row] = await tx
          .select({ maxJobNumber: sql<number>`COALESCE(MAX(${jobs.job_number}), 0)` })
          .from(jobs)
          .for("update");
        const nextJobNumber = (row?.maxJobNumber ?? 0) + 1;

        const inserted = await tx
          .insert(jobs)
          .values({
            customerId: job.customerId,
            job_number: nextJobNumber,
            stage: job.stage,
            project_status: job.project_status,
            address1: job.address1,
            ...(job.address2?.trim() ? { address2: job.address2 } : {}),
            city: job.city,
            zip: job.zip,
            measurer: job.measurer,
            height_default: job.height_default,
            design_default: job.design_default,
            anchorage_default: job.anchorage_default,
            toprail_default: job.toprail_default,
            infill_default: job.infill_default,
            wind_load: job.wind_load,
            powdercoatColourId: job.powdercoatColourId ?? null,
            ...(job.notes?.trim() ? { notes: job.notes } : {}),
          })
          .returning({ insertedId: jobs.id, job_number: jobs.job_number });

        const newJobId = inserted[0].insertedId;

        await tx.insert(jobStages).values({
          jobId: newJobId,
          stage: job.stage ?? 1,
          defaults: buildStageDefaultsFromJob({ ...job, job_number: nextJobNumber }),
          status: "draft",
        });

        return inserted[0];
      });

      const newJobId = result.insertedId;

      return {
        message: `Job ID #${newJobId} created successfully`,
      };
    }

    // Updating Job
    const result = await db
      .update(jobs)
      .set({
        customerId: job.customerId,
        job_number: job.job_number,
        stage: job.stage,
        project_status: job.project_status,
        address1: job.address1,
        address2: job.address2?.trim() ?? null,
        city: job.city,
        zip: job.zip,
        measurer: job.measurer,
        height_default: job.height_default,
        design_default: job.design_default,
        anchorage_default: job.anchorage_default,
        toprail_default: job.toprail_default,
        infill_default: job.infill_default,
        wind_load: job.wind_load,
        powdercoatColourId: job.powdercoatColourId ?? null,
        notes: job.notes?.trim() ?? null,
      })
      .where(eq(jobs.id, job.id!))
      .returning({ updatedId: jobs.id });

    const updatedJobId = result[0].updatedId;

    // ✅ Ensure stage row exists AND keep its defaults in sync with the job
    await db
      .insert(jobStages)
      .values({
        jobId: updatedJobId,
        stage: job.stage ?? 1,
        defaults: buildStageDefaultsFromJob(job),
        status: "draft", // only used if this is a new stage row
      })
      .onConflictDoUpdate({
        target: [jobStages.jobId, jobStages.stage],
        set: {
          // we only update the defaults; status is left as-is
          defaults: buildStageDefaultsFromJob(job),
        },
      });

    return {
      message: `Job ID #${updatedJobId} updated successfully`,
    };
  });
