// app/actions/saveJobStageActions.ts
"use server";

import { flattenValidationErrors } from "next-safe-action";

import { db } from "@/db";
import { jobStages } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import {
  insertJobStagesSchema,
  type insertJobStagesSchemaType,
} from "@/zod-schemas/jobstages";
import type { JobStageDefaults } from "@/lib/editor-persistence/types";

// if you want to reuse the design↔glass logic later:
import { designNeedsGlass } from "@/lib/jobDesignRules";
import type { DesignCode, AnchorageType, ToprailType, InfillType } from "@/lib/types";

function normalizeJobStageDefaults(
  defaults: insertJobStagesSchemaType["defaults"]
): JobStageDefaults | undefined {
  if (!defaults) return undefined;

  return {
    design_default: defaults.design_default as DesignCode | undefined,
    anchorage_default: defaults.anchorage_default as AnchorageType | undefined,
    toprail_default: defaults.toprail_default as ToprailType | undefined,
    infill_default: defaults.infill_default as InfillType | undefined,
    powdercoatColourId: defaults.powdercoatColourId ?? null,

    wind_load: defaults.wind_load,

    constraints: {
      minBarrierHeight: defaults.constraints.minBarrierHeight,
      maxBarrierHeight: defaults.constraints.maxBarrierHeight,
      panelHeight: defaults.constraints.panelHeight,
      maxPanelHeight: defaults.constraints.maxPanelHeight,
      maxPostSpacing: defaults.constraints.maxPostSpacing,
      maxBottomGap: defaults.constraints.maxBottomGap,
      minPostLength: defaults.constraints.minPostLength,
      laserLevelY: defaults.constraints.laserLevelY,
      ...(defaults.constraints.topY !== undefined
        ? { topY: defaults.constraints.topY }
        : {}),
    },

    ...(defaults.template
      ? {
          template: {
            ...(defaults.template.preset !== undefined
              ? { preset: defaults.template.preset }
              : {}),
          },
        }
      : {}),
  };
}

export const saveJobStageAction = actionClient
  .metadata({ actionName: "saveJobStageAction" })
  .schema(insertJobStagesSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput: stage }: { parsedInput: insertJobStagesSchemaType }) => {
    const normalizedDefaults = normalizeJobStageDefaults(stage.defaults);

    const stageDesign = normalizedDefaults?.design_default;
    const stageGlass = normalizedDefaults?.infill_default;

    // SERVER-SIDE DOMAIN RULE (minimal, stage-only)
    if (designNeedsGlass(stageDesign) && !stageGlass) {
      return {
        success: false,
        message: "Glass default is required for this design.",
      };
    }

    await db
      .insert(jobStages)
      .values({
        jobId: stage.jobId,
        stage: stage.stage,
        status: stage.status,
        defaults: normalizedDefaults,
        notes: stage.notes,
      })
      .onConflictDoUpdate({
        target: [jobStages.jobId, jobStages.stage],
        set: {
          status: stage.status,
          defaults: normalizedDefaults,
          notes: stage.notes,
        },
      });

    return {
      success: true,
      message: `Stage ${stage.stage} for job ${stage.jobId} saved successfully.`,
    };
  });