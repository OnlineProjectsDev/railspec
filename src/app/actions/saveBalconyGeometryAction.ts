// Filename: app/actions/saveBalconyGeometryAction.ts
"use server";

/**
 * This action ONLY updates:
 *   - foundationArray
 *   - postsArray
 *
 * It follows the same revision protocol as saveBalconyAction:
 *   - Snapshot BEFORE update into balcony_revisions
 *   - Increment version on balconies
 */

import { and, eq, asc } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { balconies, balconyRevisions } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import { z } from "zod";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import type {
  FoundationType,
  PostsType,
} from "@/app/(rs)/drawingtool/canvas/DropAnalyser";

/** =========================
 *  Zod schema for geometry
 *  ========================= */

const NON_COUNT_TYPES = new Set(["S", "NP", "EC", "WC", "G"]);

const foundationElementSchema: z.ZodType<FoundationType> = z.object({
  id: z.number().int(),
  type: z.string(),
  length: z.number(),
  angle: z.number(),
  offset: z.number(),
  sections: z.number().int(),
  height: z.number(),
  x: z.number(),
  z: z.number(),
  y: z.number(),
});

const postElementSchema: z.ZodType<PostsType> = z.object({
  id: z.number().int(),
  post_id: z.number().int(),
  type: z.string(),
  length: z.number(),
  angle: z.number(),
  reversed: z.boolean(),
  height: z.number(),
  x: z.number(),
  z: z.number(),
  y_ref1: z.number(),
  y_ref2: z.number(),
  y_ref3: z.number(),
});

const geometrySchema = z.object({
  balconyId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  jobStageId: z.number().int().positive(),

  // ✅ add these
  panelMm: z.number().nullable().optional(),
  fflMm: z.number().nullable().optional(),
  ffl_use: z.boolean().nullable().optional(),
  heightMm: z.number().nullable().optional(),

  foundationArray: z.array(foundationElementSchema),
  postsArray: z.array(postElementSchema),
  foundationArrayRaw: z.array(foundationElementSchema),
  postsArrayRaw: z.array(postElementSchema),
});

export type SaveBalconyGeometryInput = z.infer<typeof geometrySchema>;

/** =========================
 *  Action
 *  ========================= */

export const saveBalconyGeometryAction = actionClient
  .metadata({ actionName: "saveBalconyGeometryAction" })
  .schema(geometrySchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }: { parsedInput: SaveBalconyGeometryInput }) => {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const [isAuth, user] = await Promise.all([
      isAuthenticated(),
      getUser(),
    ]);

    if (!isAuth) redirect("/login");

    const { balconyId, jobId, jobStageId, foundationArray, postsArray, foundationArrayRaw, postsArrayRaw } =
      parsedInput;

    const updated = await db.transaction(async (tx) => {
      // 1) Load current balcony row, verifying jobId + jobStageId
      const existingRows = await tx
        .select()
        .from(balconies)
        .where(
          and(
            eq(balconies.id, balconyId),
            eq(balconies.jobId, jobId),
            eq(balconies.jobStageId, jobStageId),
            eq(balconies.isDeleted, false)
          )
        )
        .limit(1);

      const current = existingRows[0];

      if (!current) {
        throw new Error(
          `Balcony ID ${balconyId} not found for job ${jobId}, stage ${jobStageId}.`
        );
      }

      // 2) Insert revision snapshot (BEFORE update) — same structure as saveBalconyAction
      await tx.insert(balconyRevisions).values({
        balconyId: current.id,
        jobId: current.jobId,
        jobStageId: current.jobStageId,
        version: current.version,
        data: {
          drop: current.drop,
          balconyNo: current.balconyNo,
          color: current.color,
          foundationArray: current.foundationArray,
          postsArray: current.postsArray,
          foundationArrayRaw: current.foundationArrayRaw,
          postsArrayRaw: current.postsArrayRaw,
          heightMm: current.heightMm,
          panelMm: current.panelMm,
          fflMm: current.fflMm,
          ffl_use: current.ffl_use,
          design: current.design,
          anchorage: current.anchorage,
          toprail: current.toprail,
          infill: current.infill,
          metadata: current.metadata,
          notes: current.notes,
          version: current.version,
          isDeleted: current.isDeleted,
        },
        changedBy: user?.email ?? null,
        // changedAt uses DB defaultNow()
      });

      // 3) Compute new version for the balcony that was edited
      const newVersion = (current.version ?? 1) + 1;

      // 4) Load all balconies in this stage in *sequence order*
      const stageBalconies = await tx
        .select()
        .from(balconies)
        .where(
          and(
            eq(balconies.jobId, jobId),
            eq(balconies.jobStageId, jobStageId),
            eq(balconies.isDeleted, false)
          )
        )
        .orderBy(asc(balconies.sortOrder), asc(balconies.balconyNo));

        // 5) Walk in order and compute the cumulative renumbering
let runningPostId = 1;

for (const b of stageBalconies) {
  const isEditedBalcony = b.id === balconyId;

  // ---- pick sources (edited balcony uses parsedInput, others use DB row)
  const sourcePostsDerived: PostsType[] = isEditedBalcony
    ? (postsArray ?? [])
    : ((b.postsArray as PostsType[]) ?? []);

  const sourcePostsRaw: PostsType[] = isEditedBalcony
    ? (postsArrayRaw ?? [])
    : ((b.postsArrayRaw as PostsType[]) ?? []);

  const sourceFoundationDerived = isEditedBalcony
    ? (foundationArray ?? [])
    : (b.foundationArray ?? []);

  const sourceFoundationRaw = isEditedBalcony
    ? (foundationArrayRaw ?? [])
    : (b.foundationArrayRaw ?? []);

  // ---- renumber RAW first (canonical), then DERIVED using same start
  const {
    posts: renumberedPostsRaw,
    nextPostId,
  } = renumberPostsArray(sourcePostsRaw, runningPostId);

  const { posts: renumberedPostsDerived } = renumberPostsArray(
    sourcePostsDerived,
    runningPostId
  );

  // ---- detect changes (derived + raw, and foundation derived + raw for edited)
  const derivedPostsChanged = !jsonEqual(renumberedPostsDerived, b.postsArray);
  const rawPostsChanged = !jsonEqual(renumberedPostsRaw, b.postsArrayRaw);

  const foundationDerivedChanged =
    isEditedBalcony && !jsonEqual(sourceFoundationDerived, b.foundationArray);

  const foundationRawChanged =
    isEditedBalcony && !jsonEqual(sourceFoundationRaw, b.foundationArrayRaw);

  const anythingChanged =
    derivedPostsChanged ||
    rawPostsChanged ||
    foundationDerivedChanged ||
    foundationRawChanged;

  // If nothing changes, just advance the counter and continue
  if (!anythingChanged) {
    runningPostId = nextPostId;
    continue;
  }

  // If this balcony is NOT the edited one, but its numbering changed,
  // snapshot + bump version too (otherwise DB changes silently).
  // NOTE: only need to do this when we are going to UPDATE it.
  const nonEditedNeedsUpdate = !isEditedBalcony && (derivedPostsChanged || rawPostsChanged);

  if (nonEditedNeedsUpdate) {
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

        foundationArrayRaw: b.foundationArrayRaw,
        postsArrayRaw: b.postsArrayRaw,

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
  }

  const nextVersion = isEditedBalcony ? newVersion : (b.version ?? 1) + 1;

  await tx
    .update(balconies)
    .set({
      // derived
      foundationArray: isEditedBalcony ? sourceFoundationDerived : b.foundationArray,
      postsArray: renumberedPostsDerived,

      // raw
      foundationArrayRaw: isEditedBalcony ? sourceFoundationRaw : b.foundationArrayRaw,
      postsArrayRaw: renumberedPostsRaw,

      version: nextVersion,

      ...(isEditedBalcony && parsedInput.heightMm !== undefined
        ? { heightMm: parsedInput.heightMm }
        : {}),
      ...(isEditedBalcony && parsedInput.panelMm !== undefined
        ? { panelMm: parsedInput.panelMm }
        : {}),
      ...(isEditedBalcony && parsedInput.fflMm !== undefined
        ? { fflMm: parsedInput.fflMm }
        : {}),
      ...(isEditedBalcony && parsedInput.ffl_use !== undefined
        ? { ffl_use: parsedInput.ffl_use }
        : {}),
    })
    .where(eq(balconies.id, b.id));

  // advance based on RAW (canonical)
  runningPostId = nextPostId;
}

      return { updatedId: balconyId };
    });

    return {
      success: true as const,
      message: `Balcony geometry updated (ID #${updated.updatedId}).`,
      balconyId: updated.updatedId,
    };
  });

function isCountedPost(p: { type: string }) {
  return !NON_COUNT_TYPES.has(p.type);
}

function renumberPostsArray(
  posts: PostsType[],
  startPostId: number
): { posts: PostsType[]; nextPostId: number } {
  let next = startPostId;

  const renumbered = posts.map((p) => {
    if (!isCountedPost(p)) return { ...p, post_id: 0 };
    const out = { ...p, post_id: next };
    next += 1;
    return out;
  });

  return { posts: renumbered, nextPostId: next };
}

function jsonEqual(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}