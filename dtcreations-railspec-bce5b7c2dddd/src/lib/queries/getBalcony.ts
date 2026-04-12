// Filename: getBalcony.ts
import { db } from "@/db";
import { balconies, jobStages, balconyRevisions } from "@/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";

// If you have a Zod schema for balconies, e.g.:
//   export const selectBalconiesSchema = createSelectSchema(balconies)
// then uncomment this import and the parse() calls.
// import { selectBalconiesSchema } from "@/zod-schemas/balconies";

// If you later add a Zod schema for balcony_revisions, you can do:
// import { selectBalconyRevisionSchema } from "@/zod-schemas/balconyRevisions";

/**
 * Get a single balcony by its primary key ID.
 */
export async function getBalconyById(balconyId: number) {
  const rows = await db
    .select()
    .from(balconies)
    .where(
      and(eq(balconies.id, balconyId), eq(balconies.isDeleted, false))
    )
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  // If using Zod:
  // return selectBalconiesSchema.parse(row);
  return row;
}

/**
 * Get all balconies for a specific job + jobStageId.
 * (You already have jobStageId from job_stages.id)
 */
export async function getBalconiesForStage(jobId: number, jobStageId: number) {
  const rows = await db
    .select()
    .from(balconies)
    .where(
      and(
        eq(balconies.jobId, jobId),
        eq(balconies.jobStageId, jobStageId),
        eq(balconies.isDeleted, false)
      )
    )
    .orderBy(
      asc(balconies.sortOrder),      // 👈 required
      asc(balconies.balconyNo)       // fallback
    );

  return rows;
}

/**
 * Get all balconies for a given job across all stages.
 */
export async function getAllBalconiesForJob(jobId: number) {
  const rows = await db
    .select()
    .from(balconies)
    .where(and(eq(balconies.jobId, jobId), eq(balconies.isDeleted, false)))
    .orderBy(
      asc(balconies.jobStageId),
      asc(balconies.sortOrder),
      asc(balconies.balconyNo)
    );

  // If using Zod:
  // return selectBalconiesSchema.array().parse(rows);
  return rows;
}

/**
 * OPTIONAL helper:
 * Get balconies by (jobId, stageNo) instead of jobStageId.
 * This mirrors getJobStageByJobAndStage, but returns balconies.
 */
export async function getBalconiesForJobAndStageNo(
  jobId: number,
  stageNo: number
) {
  // First find the job_stages row to get its id
  const stageRows = await db
    .select({ id: jobStages.id })
    .from(jobStages)
    .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, stageNo)))
    .limit(1);

  const stage = stageRows[0];
  if (!stage) return [];

  const rows = await db
    .select()
    .from(balconies)
    .where(
      and(
        eq(balconies.jobId, jobId),
        eq(balconies.jobStageId, stage.id),
        eq(balconies.isDeleted, false)
      )
    )
    .orderBy(
        asc(balconies.sortOrder),           // primary persistent ordering
        asc(balconies.balconyNo)            // fallback for ties
    )

  // If using Zod:
  // return selectBalconiesSchema.array().parse(rows);
  return rows;
}

/** =========================
 *  Revisions helpers
 *  ========================= */

/**
 * Get the full revision history for a balcony, newest first.
 */
export async function getBalconyRevisions(balconyId: number) {
  const rows = await db
    .select()
    .from(balconyRevisions)
    .where(eq(balconyRevisions.balconyId, balconyId))
    .orderBy(
      desc(balconyRevisions.version),
      desc(balconyRevisions.changedAt)
    );

  // If using Zod:
  // return rows.map((row) => selectBalconyRevisionSchema.parse(row));
  return rows;
}

/**
 * Get a single revision entry by its primary key ID.
 */
export async function getBalconyRevisionById(revisionId: number) {
  const rows = await db
    .select()
    .from(balconyRevisions)
    .where(eq(balconyRevisions.id, revisionId))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  // If using Zod:
  // return selectBalconyRevisionSchema.parse(row);
  return row;
}

/**
 * Get the most recent revision for a balcony, if any.
 * (Useful for undo / quick “last change” info.)
 */
export async function getLatestBalconyRevision(balconyId: number) {
  const rows = await db
    .select()
    .from(balconyRevisions)
    .where(eq(balconyRevisions.balconyId, balconyId))
    .orderBy(
      desc(balconyRevisions.version),
      desc(balconyRevisions.changedAt)
    )
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  // If using Zod:
  // return selectBalconyRevisionSchema.parse(row);
  return row;
}
