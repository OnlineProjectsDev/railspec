// /lib/queries/getEditorBalcony.ts
import { db } from "@/db";
import {
  editorBalconies,
  jobStages,
  balconyEditorState,
  balconyEditorRevisions,
} from "@/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";

import type {
  EditorConfigState,
  FoundationPersistedState,
  BalustradePersistedState,
} from "@/lib/editor-persistence/types";

/**
 * Get a single editor balcony by its primary key ID.
 */
export async function getEditorBalconyById(editorBalconyId: number) {
  const rows = await db
    .select()
    .from(editorBalconies)
    .where(
      and(
        eq(editorBalconies.id, editorBalconyId),
        eq(editorBalconies.isDeleted, false)
      )
    )
    .limit(1);

  return rows[0];
}

/**
 * Get all editor balconies for a specific job + jobStageId.
 */
export async function getEditorBalconiesForStage(
  jobId: number,
  jobStageId: number
) {
  const rows = await db
    .select()
    .from(editorBalconies)
    .where(
      and(
        eq(editorBalconies.jobId, jobId),
        eq(editorBalconies.jobStageId, jobStageId),
        eq(editorBalconies.isDeleted, false)
      )
    )
    .orderBy(
      asc(editorBalconies.sortOrder),
      asc(editorBalconies.balconyNo)
    );

  return rows;
}

/**
 * Get all editor balconies for a given job across all stages.
 */
export async function getAllEditorBalconiesForJob(jobId: number) {
  const rows = await db
    .select()
    .from(editorBalconies)
    .where(
      and(
        eq(editorBalconies.jobId, jobId),
        eq(editorBalconies.isDeleted, false)
      )
    )
    .orderBy(
      asc(editorBalconies.jobStageId),
      asc(editorBalconies.sortOrder),
      asc(editorBalconies.balconyNo)
    );

  return rows;
}

/**
 * Get editor balconies by (jobId, stageNo) instead of jobStageId.
 */
export async function getEditorBalconiesForJobAndStageNo(
  jobId: number,
  stageNo: number,
  options?: {
    includeDeleted?: boolean;
  }
) {
  const stageRows = await db
    .select({ id: jobStages.id })
    .from(jobStages)
    .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, stageNo)))
    .limit(1);

  const stage = stageRows[0];
  if (!stage) return [];

  const rows = await db
    .select()
    .from(editorBalconies)
    .where(
      and(
        eq(editorBalconies.jobId, jobId),
        eq(editorBalconies.jobStageId, stage.id),
        ...(options?.includeDeleted ? [] : [eq(editorBalconies.isDeleted, false)])
      )
    )
    .orderBy(
      asc(editorBalconies.sortOrder),
      asc(editorBalconies.balconyNo)
    );

  return rows;
}

/** =========================
 *  Editor state helpers
 *  ========================= */

export async function getEditorBalconyStateByEditorBalconyId(
  editorBalconyId: number
) {
  const rows = await db
    .select()
    .from(balconyEditorState)
    .where(eq(balconyEditorState.editorBalconyId, editorBalconyId))
    .limit(1);

  return rows[0];
}

export async function getEditorBalconyWithStateById(editorBalconyId: number) {
  const balcony = await getEditorBalconyById(editorBalconyId);
  if (!balcony) return undefined;

  const editorState = await getEditorBalconyStateByEditorBalconyId(editorBalconyId);

  return {
    balcony,
    editorState: editorState
      ? {
          ...editorState,
          editorConfig: editorState.editorConfig as EditorConfigState,
          foundationState: editorState.foundationState as FoundationPersistedState,
          balustradeState: editorState.balustradeState as BalustradePersistedState,
        }
      : undefined,
  };
}

/** =========================
 *  Editor revision helpers
 *  ========================= */

export async function getEditorBalconyRevisions(editorBalconyId: number) {
  const rows = await db
    .select()
    .from(balconyEditorRevisions)
    .where(eq(balconyEditorRevisions.editorBalconyId, editorBalconyId))
    .orderBy(
      desc(balconyEditorRevisions.version),
      desc(balconyEditorRevisions.changedAt)
    );

  return rows.map((row) => ({
    ...row,
    editorConfig: row.editorConfig as EditorConfigState,
    foundationState: row.foundationState as FoundationPersistedState,
    balustradeState: row.balustradeState as BalustradePersistedState,
  }));
}

export async function getEditorBalconyRevisionById(revisionId: number) {
  const rows = await db
    .select()
    .from(balconyEditorRevisions)
    .where(eq(balconyEditorRevisions.id, revisionId))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  return {
    ...row,
    editorConfig: row.editorConfig as EditorConfigState,
    foundationState: row.foundationState as FoundationPersistedState,
    balustradeState: row.balustradeState as BalustradePersistedState,
  };
}

export async function getLatestEditorBalconyRevision(editorBalconyId: number) {
  const rows = await db
    .select()
    .from(balconyEditorRevisions)
    .where(eq(balconyEditorRevisions.editorBalconyId, editorBalconyId))
    .orderBy(
      desc(balconyEditorRevisions.version),
      desc(balconyEditorRevisions.changedAt)
    )
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  return {
    ...row,
    editorConfig: row.editorConfig as EditorConfigState,
    foundationState: row.foundationState as FoundationPersistedState,
    balustradeState: row.balustradeState as BalustradePersistedState,
  };
}