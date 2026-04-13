// src/db/helpers/jobStageDefaults.ts
import { jobs, jobStages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import type { JobStageDefaults } from "@/lib/editor-persistence/types";
import type { DesignCode, AnchorageType, ToprailType, InfillType } from "@/lib/types";
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults";

function buildDefaultsFromJobRow(jobRow: {
  height_default: number | null;
  max_height_default?: number | null;
  max_post_spacing?: number | null;
  design_default: string | null;
  anchorage_default: string | null;
  toprail_default: string | null;
  infill_default: string | null;
  powdercoatColourId?: number | null;
  wind_load: JobStageDefaults["wind_load"] | null;
}): JobStageDefaults {
  const minBarrierHeight =
    jobRow.height_default ??
    DEFAULT_JOB_STAGE_DEFAULTS.constraints.minBarrierHeight;

  const maxBarrierHeight =
    jobRow.max_height_default ??
    DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxBarrierHeight;

  return {
    design_default:
      (jobRow.design_default as DesignCode | null) ??
      DEFAULT_JOB_STAGE_DEFAULTS.design_default,
    anchorage_default:
      (jobRow.anchorage_default as AnchorageType | null) ??
      DEFAULT_JOB_STAGE_DEFAULTS.anchorage_default,
    toprail_default:
      (jobRow.toprail_default as ToprailType | null) ??
      DEFAULT_JOB_STAGE_DEFAULTS.toprail_default,
    infill_default:
      (jobRow.infill_default as InfillType | null) ??
      DEFAULT_JOB_STAGE_DEFAULTS.infill_default,
    powdercoatColourId:
      jobRow.powdercoatColourId ??
      DEFAULT_JOB_STAGE_DEFAULTS.powdercoatColourId ??
      null,
    wind_load:
      jobRow.wind_load ??
      DEFAULT_JOB_STAGE_DEFAULTS.wind_load,
    constraints: {
      minBarrierHeight,
      maxBarrierHeight,
      panelHeight: DEFAULT_JOB_STAGE_DEFAULTS.constraints.panelHeight,
      maxPanelHeight: DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxPanelHeight,
      maxPostSpacing:
        jobRow.max_post_spacing ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxPostSpacing,
      maxBottomGap: DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxBottomGap,
      minPostLength: minBarrierHeight,
      laserLevelY: DEFAULT_JOB_STAGE_DEFAULTS.constraints.laserLevelY,
      topY: minBarrierHeight,
    },
    template: {
      preset: DEFAULT_JOB_STAGE_DEFAULTS.template?.preset,
    },
  };
}

export async function createNextStageForJob(
  jobId: number,
  currentStage: number
) {
  const newStage = currentStage + 1;

  return db.transaction(async (tx) => {
    // 1) Load job (for fallback defaults)
    const [jobRow] = await tx
      .select({
        id: jobs.id,
        height_default: jobs.height_default,
        max_height_default: jobs.max_height_default,
        max_post_spacing: jobs.max_post_spacing,
        design_default: jobs.design_default,
        anchorage_default: jobs.anchorage_default,
        toprail_default: jobs.toprail_default,
        infill_default: jobs.infill_default,
        powdercoatColourId: jobs.powdercoatColourId,
        wind_load: jobs.wind_load,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!jobRow) throw new Error("Job not found");

    // 2) Ensure current stage exists (source of defaults)
    const [prevStage] = await tx
      .select({ id: jobStages.id, defaults: jobStages.defaults })
      .from(jobStages)
      .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, currentStage)))
      .limit(1);

    if (!prevStage) {
      throw new Error(`Stage ${currentStage} does not exist for this job`);
    }

    // 3) Ensure new stage does NOT already exist
    const [existingNew] = await tx
      .select({ id: jobStages.id })
      .from(jobStages)
      .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, newStage)))
      .limit(1);

    if (existingNew) {
      throw new Error(`Stage ${newStage} already exists for this job`);
    }

    // 4) Decide defaults for new stage
    const prevDefaults = prevStage.defaults as JobStageDefaults | null;

    const defaultsForNew =
      prevDefaults && Object.keys(prevDefaults).length > 0
        ? prevDefaults
        : buildDefaultsFromJobRow(jobRow);

    // 5) Insert new stage (no balconies)
    const [created] = await tx
      .insert(jobStages)
      .values({
        jobId,
        stage: newStage,
        defaults: defaultsForNew,
        status: "draft",
      })
      .returning({ id: jobStages.id });

    return {
      jobId,
      fromStage: currentStage,
      newStage,
      newStageId: created.id,
    };
  });
}
