// /app/actions/createEditorBalconyWithStateAction.ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  balconyEditorState,
  editorBalconies,
  jobStages,
} from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  buildInitialBalustradeState,
  buildInitialEditorConfigState,
  buildInitialFoundationState,
} from "@/lib/editor-persistence/initializeEditorState";
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults";
import type {
  EditorConfigState,
  JobStageDefaults,
} from "@/lib/editor-persistence/types";
import { getColourFromID } from "@/lib/queries/getAvailableColours";
import {
  editorSeedTemplates,
  getCompatibleEditorTemplates,
} from "@/lib/editor-persistence/editorTemplates";

const createEditorBalconyWithStateSchema = z.object({
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),
  drop: z.string().trim().min(1, "Drop is required"),
  balconyNo: z.string().trim().min(1, "Balcony number is required"),
  templateId: z.string().trim().min(1, "Template is required"),
  notes: z.string().nullable().optional(),
  geometryNotes: z.string().nullable().optional(),
});

export type CreateEditorBalconyWithStateInput = z.infer<
  typeof createEditorBalconyWithStateSchema
>;

function hexStringToNumber(hex?: string | null): number {
  if (!hex) return 0xaaaaaa;
  const clean = hex.trim().replace(/^#/, "");
  const n = /^[0-9A-Fa-f]{6}$/.test(clean) ? Number.parseInt(clean, 16) : NaN;
  return Number.isFinite(n) ? n : 0xaaaaaa;
}

async function resolveEditorColor(defaults: JobStageDefaults): Promise<EditorConfigState["color"]> {
  const colourId = defaults.powdercoatColourId ?? null;

  if (typeof colourId !== "number") {
    return {
      hex: 0xaaaaaa,
      name: "TBD",
    };
  }

  const colour = await getColourFromID(colourId);

  if (!colour) {
    return {
      hex: 0xaaaaaa,
      name: "TBD",
    };
  }

  return {
    hex: hexStringToNumber(colour.hex),
    name: colour.name,
  };
}

export const createEditorBalconyWithStateAction = actionClient
  .metadata({ actionName: "createEditorBalconyWithStateAction" })
  .schema(createEditorBalconyWithStateSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: CreateEditorBalconyWithStateInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) redirect("/login");

    const { jobId, jobStageId, drop, balconyNo, templateId, notes, geometryNotes } = parsedInput;

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

    const existing = await db
      .select({ id: editorBalconies.id })
      .from(editorBalconies)
      .where(
        and(
          eq(editorBalconies.jobId, jobId),
          eq(editorBalconies.jobStageId, jobStageId),
          eq(editorBalconies.drop, drop),
          eq(editorBalconies.balconyNo, balconyNo),
          eq(editorBalconies.isDeleted, false)
        )
      )
      .limit(1);

    if (existing[0]) {
      return {
        message: `Drop ${drop} Balcony ${balconyNo} already exists on this stage.`,
        fieldErrors: {
          drop: ["This Drop + Balcony number is already in use for this stage."],
          balconyNo: ["This Drop + Balcony number is already in use for this stage."],
        },
      } as const;
    }

    const defaults = (stage.defaults ?? DEFAULT_JOB_STAGE_DEFAULTS) as JobStageDefaults;
    const compatibleTemplates = getCompatibleEditorTemplates({
      design_default: defaults.design_default,
      anchorage_default: defaults.anchorage_default,
      toprail_default: defaults.toprail_default,
      infill_default: defaults.infill_default,
    });

    const template = compatibleTemplates.find((item) => item.id === templateId);

    if (!template) {
      return {
        message: `Template ${templateId} is not compatible with the current stage defaults.`,
        fieldErrors: {
          templateId: ["Selected template is not compatible with the current stage defaults."],
        },
      } as const;
    }

    const resolvedColor = await resolveEditorColor(defaults);

    const baseEditorConfig = buildInitialEditorConfigState(defaults);

    const editorConfig: EditorConfigState = {
      ...baseEditorConfig,
      design:
        defaults.design_default ??
        baseEditorConfig.design,
      anchorage:
        defaults.anchorage_default ??
        baseEditorConfig.anchorage,
      toprail:
        defaults.toprail_default ??
        baseEditorConfig.toprail,
      infill:
        defaults.infill_default ??
        baseEditorConfig.infill,
      color: resolvedColor,
      windLoad:
        defaults.wind_load ??
        baseEditorConfig.windLoad,
    };

    const baseFoundationState = buildInitialFoundationState(defaults);
    const baseBalustradeState = buildInitialBalustradeState(defaults);

    const foundationState = {
      ...baseFoundationState,
      ...((template.foundation ?? {}) as Partial<typeof baseFoundationState>),
    };

    const balustradeState = {
      ...baseBalustradeState,
      hasDerivedBalustrade: template.hasDerivedBalustrade ?? false,
      balcony: {
        ...baseBalustradeState.balcony,
        ...(template.balcony ?? {}),

        // always enforce stage/job defaults over template product defaults
        topY: baseBalustradeState.balcony.topY,
        minPostLength: baseBalustradeState.balcony.minPostLength,
        maxPostSpacing: baseBalustradeState.balcony.maxPostSpacing,
        minBarrierHeight: baseBalustradeState.balcony.minBarrierHeight,
        maxBarrierHeight: baseBalustradeState.balcony.maxBarrierHeight,
        maxPanelHeight: baseBalustradeState.balcony.maxPanelHeight,
        maxBottomGap: baseBalustradeState.balcony.maxBottomGap,
        panelHeight: baseBalustradeState.balcony.panelHeight,
      },
    };

    const created = await db.transaction(async (tx) => {
      const [{ maxSortOrder }] = await tx
        .select({
          maxSortOrder: sql<number>`COALESCE(MAX(${editorBalconies.sortOrder}), 0)`,
        })
        .from(editorBalconies)
        .where(
          and(
            eq(editorBalconies.jobId, jobId),
            eq(editorBalconies.jobStageId, jobStageId),
            eq(editorBalconies.isDeleted, false)
          )
        );

      const nextSortOrder = (maxSortOrder ?? 0) + 1;

      const insertedBalconies = await tx
        .insert(editorBalconies)
        .values({
          jobId,
          jobStageId,
          drop,
          balconyNo,
          sortOrder: nextSortOrder,
          notes: notes?.trim() || null,
          geometryNotes: geometryNotes?.trim() || null,
          version: 1,
          isDeleted: false,
        })
        .returning();

      const editorBalcony = insertedBalconies[0];

      if (!editorBalcony) {
        throw new Error("Failed to insert editor balcony.");
      }

      const insertedStates = await tx
        .insert(balconyEditorState)
        .values({
          editorBalconyId: editorBalcony.id,
          jobId,
          jobStageId,
          editorConfig,
          foundationState,
          balustradeState,
          version: 1,
        })
        .returning();

      const insertedState = insertedStates[0];

      if (!insertedState) {
        throw new Error("Failed to insert balcony editor state.");
      }

      return editorBalcony;
    });

    const verifyRows = await db
      .select({ id: editorBalconies.id })
      .from(editorBalconies)
      .where(eq(editorBalconies.id, created.id))
      .limit(1);

    if (!verifyRows[0]) {
      throw new Error(`Post-insert verification failed for editor balcony ${created.id}.`);
    }

    return {
      success: true as const,
      message: `Editor balcony ID #${created.id} created successfully.`,
      editorBalconyId: created.id,
      mode: "created" as const,
    };
  });