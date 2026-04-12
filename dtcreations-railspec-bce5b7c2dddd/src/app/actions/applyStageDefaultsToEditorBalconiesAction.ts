// /app/actions/applyStageDefaultsToEditorBalconiesAction.ts
"use server";

import { and, eq } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  balconyEditorRevisions,
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
  FoundationPersistedState,
  BalustradePersistedState,
  JobStageDefaults,
} from "@/lib/editor-persistence/types";
import { getColourFromID } from "@/lib/queries/getAvailableColours";

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

export const applyStageDefaultsToEditorBalconiesAction = actionClient
  .metadata({ actionName: "applyStageDefaultsToEditorBalconiesAction" })
  .schema(
    z.object({
      jobId: z.number().int().positive(),
      jobStageId: z.number().int().positive(),
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

    if (!isAuth) redirect("/login");

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

    const defaults = (stage.defaults ?? DEFAULT_JOB_STAGE_DEFAULTS) as JobStageDefaults;
    const resolvedColor = await resolveEditorColor(defaults);

    const defaultEditorConfig = {
      ...buildInitialEditorConfigState(defaults),
      color: resolvedColor,
    };

    const defaultFoundationState = buildInitialFoundationState(defaults);
    const defaultBalustradeState = buildInitialBalustradeState(defaults);

    const result = await db.transaction(async (tx) => {
      const balconyRows = await tx
        .select()
        .from(editorBalconies)
        .where(
          and(
            eq(editorBalconies.jobId, jobId),
            eq(editorBalconies.jobStageId, jobStageId),
            eq(editorBalconies.isDeleted, false)
          )
        );

      if (!balconyRows.length) {
        return { updatedCount: 0 };
      }

      let updatedCount = 0;

      for (const balcony of balconyRows) {
        const stateRows = await tx
          .select()
          .from(balconyEditorState)
          .where(eq(balconyEditorState.editorBalconyId, balcony.id))
          .limit(1);

        const current = stateRows[0];

        if (!current) {
          await tx.insert(balconyEditorState).values({
            editorBalconyId: balcony.id,
            jobId: balcony.jobId,
            jobStageId: balcony.jobStageId,
            editorConfig: defaultEditorConfig,
            foundationState: defaultFoundationState,
            balustradeState: defaultBalustradeState,
            version: balcony.version ?? 1,
          });

          updatedCount += 1;
          continue;
        }

        await tx.insert(balconyEditorRevisions).values({
          editorBalconyId: current.editorBalconyId,
          jobId: current.jobId,
          jobStageId: current.jobStageId,
          editorConfig: current.editorConfig as EditorConfigState,
          foundationState: current.foundationState as FoundationPersistedState,
          balustradeState: current.balustradeState as BalustradePersistedState,
          version: current.version,
          changedBy: user?.email ?? null,
        });

        const nextVersion = (current.version ?? 1) + 1;

        const currentEditorConfig = current.editorConfig as EditorConfigState;
        const currentFoundationState = current.foundationState as FoundationPersistedState;
        const currentBalustradeState = current.balustradeState as BalustradePersistedState;

        const nextEditorConfig: EditorConfigState = {
          ...currentEditorConfig,
          design: defaultEditorConfig.design,
          anchorage: defaultEditorConfig.anchorage,
          toprail: defaultEditorConfig.toprail,
          infill: defaultEditorConfig.infill,
          color: defaultEditorConfig.color,
          windLoad: defaultEditorConfig.windLoad,
        };

        const nextFoundationState: FoundationPersistedState = {
          ...currentFoundationState,
          ...defaultFoundationState,
        };

        const nextBalustradeState: BalustradePersistedState = {
          ...currentBalustradeState,
          ...defaultBalustradeState,
        };

        await tx
          .update(balconyEditorState)
          .set({
            editorConfig: nextEditorConfig,
            foundationState: nextFoundationState,
            balustradeState: nextBalustradeState,
            version: nextVersion,
          })
          .where(eq(balconyEditorState.id, current.id));

        await tx
          .update(editorBalconies)
          .set({
            version: nextVersion,
          })
          .where(eq(editorBalconies.id, balcony.id));

        updatedCount += 1;
      }

      return { updatedCount };
    });

    if (result.updatedCount === 0) {
      return {
        message: "No editor balconies found on this stage.",
        updatedCount: 0,
      } as const;
    }

    return {
      message: `Applied stage defaults to ${result.updatedCount} editor balcony(ies).`,
      updatedCount: result.updatedCount,
    } as const;
  });