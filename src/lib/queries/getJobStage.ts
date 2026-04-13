// Filename: getJobStage.ts
import { db } from "@/db";
import { jobs, customers, jobStages } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { selectJobStagesSchema } from "@/zod-schemas/jobstages";
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults";
import type { JobStageDefaults } from "@/lib/editor-persistence/types";


export async function getJobStageByJobAndStage(jobId: number, stageNo: number) {
  const stage = await db
    .select()
    .from(jobStages)
    .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, stageNo)))
    .limit(1);

  return stage[0]
    ? selectJobStagesSchema.parse({
        ...stage[0],
        defaults: normalizeJobStageDefaults(stage[0].defaults),
      })
    : undefined;
}

function normalizeJobStageDefaults(raw: unknown): JobStageDefaults {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const constraintsRaw =
    input.constraints && typeof input.constraints === "object"
      ? (input.constraints as Record<string, unknown>)
      : {};

  const minBarrierHeight =
    typeof constraintsRaw.minBarrierHeight === "number"
      ? constraintsRaw.minBarrierHeight
      : typeof input.height_default === "number"
      ? input.height_default
      : DEFAULT_JOB_STAGE_DEFAULTS.constraints.minBarrierHeight;

  const maxBarrierHeight =
    typeof constraintsRaw.maxBarrierHeight === "number"
      ? constraintsRaw.maxBarrierHeight
      : typeof input.max_height_default === "number"
      ? input.max_height_default
      : DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxBarrierHeight;

  const maxPostSpacing =
    typeof constraintsRaw.maxPostSpacing === "number"
      ? constraintsRaw.maxPostSpacing
      : typeof input.max_post_spacing === "number"
      ? input.max_post_spacing
      : DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxPostSpacing;

  const templateRaw =
    input.template && typeof input.template === "object"
      ? (input.template as Record<string, unknown>)
      : {};

  return {
    design_default:
      typeof input.design_default === "string"
        ? (input.design_default as JobStageDefaults["design_default"])
        : DEFAULT_JOB_STAGE_DEFAULTS.design_default,
    anchorage_default:
      typeof input.anchorage_default === "string"
        ? (input.anchorage_default as JobStageDefaults["anchorage_default"])
        : DEFAULT_JOB_STAGE_DEFAULTS.anchorage_default,
    toprail_default:
      typeof input.toprail_default === "string"
        ? (input.toprail_default as JobStageDefaults["toprail_default"])
        : DEFAULT_JOB_STAGE_DEFAULTS.toprail_default,
    infill_default:
      typeof input.infill_default === "string"
        ? (input.infill_default as JobStageDefaults["infill_default"])
        : typeof input.glass_default === "string"
        ? (input.glass_default as JobStageDefaults["infill_default"])
        : DEFAULT_JOB_STAGE_DEFAULTS.infill_default,
    powdercoatColourId:
      typeof input.powdercoatColourId === "number"
        ? input.powdercoatColourId
        : DEFAULT_JOB_STAGE_DEFAULTS.powdercoatColourId ?? null,
    wind_load:
      input.wind_load &&
      typeof input.wind_load === "object" &&
      typeof (input.wind_load as Record<string, unknown>).bldg_height === "number" &&
      typeof (input.wind_load as Record<string, unknown>).wind_region === "string" &&
      typeof (input.wind_load as Record<string, unknown>).terrain_category === "number"
        ? (input.wind_load as JobStageDefaults["wind_load"])
        : DEFAULT_JOB_STAGE_DEFAULTS.wind_load,
    constraints: {
      minBarrierHeight,
      maxBarrierHeight,
      panelHeight:
        typeof constraintsRaw.panelHeight === "number"
          ? constraintsRaw.panelHeight
          : DEFAULT_JOB_STAGE_DEFAULTS.constraints.panelHeight,
      maxPanelHeight:
        typeof constraintsRaw.maxPanelHeight === "number"
          ? constraintsRaw.maxPanelHeight
          : DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxPanelHeight,
      maxPostSpacing,
      maxBottomGap:
        typeof constraintsRaw.maxBottomGap === "number"
          ? constraintsRaw.maxBottomGap
          : DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxBottomGap,
      minPostLength:
        typeof constraintsRaw.minPostLength === "number"
          ? constraintsRaw.minPostLength
          : minBarrierHeight,
      laserLevelY:
        typeof constraintsRaw.laserLevelY === "number"
          ? constraintsRaw.laserLevelY
          : DEFAULT_JOB_STAGE_DEFAULTS.constraints.laserLevelY,
      topY:
        typeof constraintsRaw.topY === "number"
          ? constraintsRaw.topY
          : minBarrierHeight,
    },
    template: {
      preset:
        typeof templateRaw.preset === "string"
          ? templateRaw.preset
          : DEFAULT_JOB_STAGE_DEFAULTS.template?.preset,
    },
  };
}

export async function getJobStageByJobAndStageWithDetails(jobId: number, stageNo: number) {
  const stage = await db
    .select({
          id: sql<number>`
            COALESCE(${jobStages.id}, 0)
          `,
    
          // jobDate as a real Postgres timestamp (→ JS Date)
          jobDate: sql<Date>`
            COALESCE(${jobStages.createdAt}, ${jobs.createdAt})
          `,
    
          job_number: jobs.job_number,
    
          // stage as number, with fallback to 0 when no stage exists
          stage: sql<number>`
            COALESCE(${jobStages.stage}, 1)
          `,
    
          company: customers.company,
          jobAddress: sql<string>`
            COALESCE(
              NULLIF(${jobs.address2}, '' ) || ', ' || ${jobs.address1},
              ${jobs.address1}
            )
          `,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          status: sql<string>`COALESCE(${jobStages.status}, 'draft')`,
          design: jobs.design_default,
          infill: jobs.infill_default,
          anchorage: jobs.anchorage_default,
          toprail: jobs.toprail_default,
          height: jobs.height_default,
        })
    .from(jobs)
    .leftJoin(jobStages, eq(jobStages.jobId, jobs.id))
    .leftJoin(customers, eq(jobs.customerId, customers.id))
    .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, stageNo)))
    .limit(1);

  return stage[0] ;

  
}

export async function getAllStagesForJob(jobId: number) {
  return db
    .select()
    .from(jobStages)
    .where(eq(jobStages.jobId, jobId))
    .orderBy(jobStages.stage);
}

export async function getAllStagesForJobnoDefaults(jobId: number) {
  return db
    .select({
      id: jobStages.id,
      jobId: jobStages.jobId,
      stage: jobStages.stage,
      status: jobStages.status,
      notes: jobStages.notes,
      createdAt: jobStages.createdAt,
      updatedAt: jobStages.updatedAt,
    })
    .from(jobStages)
    .where(eq(jobStages.jobId, jobId))
    .orderBy(jobStages.stage);
}
