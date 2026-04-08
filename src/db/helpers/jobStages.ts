// src/db/helpers/jobStages.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { jobs, jobStages } from "@/db/schema";
import type { JobStageDefaults } from "@/lib/editor-persistence/types";
import type { DesignCode, AnchorageType, ToprailType, InfillType } from "@/lib/types";
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults";

// Turn job-level defaults into a typed stage defaults blob
function buildDefaultsFromJob(jobRow: {
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

/**
 * Ensure a stage row exists for (jobId, stageNo).
 * - If it exists → return its id.
 * - If not → create it, using defaults from the job.
 */
export async function ensureJobStage(
  tx: typeof db,
  jobId: number,
  stageNo: number
): Promise<number> {
  // Already exists?
  const [existing] = await tx
    .select({ id: jobStages.id })
    .from(jobStages)
    .where(
        and(
            eq(jobStages.jobId, jobId),
            eq(jobStages.stage, stageNo)))
    .limit(1);

  if (existing) return existing.id;

  // Need the job to copy defaults
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

  if (!jobRow) throw new Error("Job not found when creating stage");

  const defaults = buildDefaultsFromJob(jobRow);

  const [created] = await tx
    .insert(jobStages)
    .values({
      jobId,
      stage: stageNo,
      defaults,
      status: "draft",
    })
    .returning({ id: jobStages.id });

  return created.id;
}
