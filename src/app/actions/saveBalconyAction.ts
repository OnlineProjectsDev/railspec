/**
 * ============================================================
 *  REVISION SYSTEM PROTOCOL — IMPORTANT (READ BEFORE MODIFYING)
 * ============================================================
 *
 * 1. No revision entry on creation
 * --------------------------------
 * When a new balcony is created, we write only to the main
 * `balconies` table with version = 1. We do NOT insert a
 * corresponding row into `balcony_revisions`.
 *
 * Reason:
 *   - Version 1 represents the "initial state" and is stored
 *     only in the main table.
 *   - There is nothing to "revert" to yet, and nothing has
 *     been changed by the user.
 *
 * 2. Snapshot BEFORE every update
 * -------------------------------
 * When editing an existing balcony:
 *   - We first fetch the CURRENT balcony state (call this Sₙ).
 *   - We insert Sₙ into `balcony_revisions` with version = n.
 *   - This snapshot represents the “previous state” BEFORE
 *     applying the upcoming change.
 *
 *   Then:
 *   - We compute newVersion = n + 1.
 *   - We update the main `balconies` row to store the new state
 *     (Sₙ₊₁) with version = newVersion.
 *
 * Result:
 *   - The `balconies` table always holds the *current* state.
 *   - The `balcony_revisions` table always holds *past* states.
 *
 * 3. Why snapshot-before-update?
 * ------------------------------
 * This creates a clean audit trail and works perfectly for:
 *
 *   - Undo:
 *       restoring the MOST RECENT revision gives you the state
 *       right before the last change.
 *
 *   - Compare/diff:
 *       old state  = revision Sₙ
 *       new state  = main table Sₙ₊₁
 *
 *   - Timeline:
 *       revision entries form a chain of “what this looked like
 *       before each change”.
 *
 * We NEVER snapshot after update because the main table already
 * represents the “after” state.
 *
 * 4. Version numbers
 * ------------------
 * - Creation: version = 1
 * - Each update: version increments by +1
 *
 * Revisions always store the version number of the state they
 * represent (the PRE-UPDATE version).
 *
 * 5. Future cleanup
 * -----------------
 * If version numbers become large or revision history grows,
 * we can later archive or prune older revision entries safely,
 * because:
 *
 *   - The main table still holds the latest state.
 *   - Revisions only represent past states.
 *
 * ============================================================
 *  END REVISION SYSTEM PROTOCOL
 * ============================================================
 */


// Filename: saveBalconyAction.ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { flattenValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { balconies, balconyRevisions } from "@/db/schema";
import { actionClient } from "@/lib/safe-action";
import {
  insertBalconySchema,
  type insertBalconySchemaType,
} from "@/zod-schemas/balconies";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const saveBalconyAction = actionClient
  .metadata({ actionName: "saveBalconyAction" })
  .schema(insertBalconySchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(
    async ({
      parsedInput: balcony,
    }: {
      parsedInput: insertBalconySchemaType;
    }) => {
      const { isAuthenticated, getUser } = getKindeServerSession();
      const [isAuth, user] = await Promise.all([
        isAuthenticated(),
        getUser(),
      ]);

      if (!isAuth) redirect("/login");

      // ----------------------------
      // 1) Uniqueness check for (jobId, jobStageId, drop, balconyNo)
      // ----------------------------
      const existing = await db
        .select({
          id: balconies.id,
          jobId: balconies.jobId,
          jobStageId: balconies.jobStageId,
          drop: balconies.drop,
          balconyNo: balconies.balconyNo,
        })
        .from(balconies)
        .where(
          and(
            eq(balconies.jobId, balcony.jobId),
            eq(balconies.jobStageId, balcony.jobStageId),
            eq(balconies.drop, balcony.drop),
            eq(balconies.balconyNo, balcony.balconyNo),
            eq(balconies.isDeleted, false)
          )
        )
        .limit(1);

      const existingRow = existing[0];

      // New balcony: block if any matching row already exists
      if (balcony.id === "(New)" && existingRow) {
        return {
          message: `Job ID ${balcony.jobId} Stage ${balcony.jobStageId} Drop ${balcony.drop} Balcony ${balcony.balconyNo} already exists.`,
          fieldErrors: {
            drop: [
              "This Drop + Balcony number is already in use for this stage.",
            ],
            balconyNo: [
              "This Drop + Balcony number is already in use for this stage.",
            ],
          },
        } as const;
      }

      // Edit balcony: block if the match is a *different* row
      if (
        balcony.id !== "(New)" &&
        existingRow &&
        existingRow.id !== Number(balcony.id)
      ) {
        return {
          message: `Job ID ${balcony.jobId} Stage ${balcony.jobStageId} Drop ${balcony.drop} Balcony ${balcony.balconyNo} already exists.`,
          fieldErrors: {
            drop: [
              "Another balcony already uses this Drop + Balcony number for this stage.",
            ],
            balconyNo: [
              "Another balcony already uses this Drop + Balcony number for this stage.",
            ],
          },
        } as const;
      }

      // ----------------------------
        // 2) NEW BALCONY
        //    version = 1
        // ----------------------------
        if (balcony.id === "(New)") {
        // Compute next sortOrder for this job + stage
        const [{ maxSortOrder }] = await db
            .select({
            maxSortOrder: sql<number>`COALESCE(MAX(${balconies.sortOrder}), 0)`,
            })
            .from(balconies)
            .where(
            and(
                eq(balconies.jobId, balcony.jobId),
                eq(balconies.jobStageId, balcony.jobStageId),
                eq(balconies.isDeleted, false)
            )
            );

        const nextSortOrder = (maxSortOrder ?? 0) + 1;

        const [result] = await db
            .insert(balconies)
            .values({
            jobId: balcony.jobId,
            jobStageId: balcony.jobStageId,

            drop: balcony.drop,
            balconyNo: balcony.balconyNo,

            color: balcony.color,
            foundationArray: balcony.foundationArray,
            postsArray: balcony.postsArray,
            foundationArrayRaw: balcony.foundationArrayRaw,
            postsArrayRaw: balcony.postsArrayRaw,

            heightMm: balcony.heightMm ?? 1020,
            panelMm: balcony.panelMm ?? 1020,
            fflMm: balcony.fflMm ?? 0,
            ffl_use: balcony.ffl_use ?? false,

            design: balcony.design ?? "RD-D1",
            anchorage: balcony.anchorage ?? "BP",
            toprail: balcony.toprail ?? "Elite",
            infill: balcony.infill ?? "6.38mm Clear Laminated",

            metadata: balcony.metadata ?? {},
            notes: balcony.notes?.trim() || null,

            // Explicitly start at version 1 for new balconies
            version: 1,
            isDeleted: balcony.isDeleted ?? false,

            // NEW: persist list position
            sortOrder: nextSortOrder,
            })
            .returning({ insertedId: balconies.id });

        // NOTE: We are *not* inserting a revision on creation yet.
        // If later you want revision #1 to represent the creation state,
        // we can add an insert into balcony_revisions here.

        return {
            message: `Balcony ID #${result.insertedId} created successfully`,
            balconyId: result.insertedId,
            mode: "created" as const,
        };
        }

      // ----------------------------
      // 3) UPDATE EXISTING BALCONY
      //    - fetch current
      //    - insert revision snapshot
      //    - bump version by 1
      //    - update balcony
      // ----------------------------
      const updated = await db.transaction(async (tx) => {
        const existingRows = await tx
          .select()
          .from(balconies)
          .where(eq(balconies.id, balcony.id as number))
          .limit(1);

        const current = existingRows[0];

        if (!current) {
          throw new Error(`Balcony ID ${balcony.id} not found for update.`);
        }

        // 3a) Insert revision snapshot (BEFORE update)
        //     This captures the "old" state so you can later see what changed
        //     or revert to it.
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

        // 3b) Compute new version (monotonic increase)
        const newVersion = (current.version ?? 1) + 1;

        // 3c) Apply update to main balcony row
        const [updateResult] = await tx
          .update(balconies)
          .set({
            drop: balcony.drop,
            balconyNo: balcony.balconyNo,

            color: balcony.color,
            foundationArray: balcony.foundationArray,
            postsArray: balcony.postsArray,
            foundationArrayRaw: balcony.foundationArrayRaw,
            postsArrayRaw: balcony.postsArrayRaw,

            heightMm: balcony.heightMm ?? current.heightMm ?? 1020,
            panelMm: balcony.panelMm ?? current.panelMm ?? 1020,
            fflMm: balcony.fflMm ?? current.fflMm ?? 0,
            ffl_use: balcony.ffl_use ?? current.ffl_use ?? false,

            design: balcony.design ?? current.design ?? "RD-D1",
            anchorage: balcony.anchorage ?? current.anchorage ?? "BP",
            toprail: balcony.toprail ?? current.toprail ?? "Elite",
            infill: balcony.infill ?? current.infill ?? "6.38mm Clear Laminated",

            metadata: balcony.metadata ?? current.metadata ?? {},
            notes: balcony.notes?.trim() ?? current.notes,

            version: newVersion,
            isDeleted: balcony.isDeleted ?? current.isDeleted ?? false,
          })
          .where(eq(balconies.id, balcony.id as number))
          .returning({ updatedId: balconies.id });

        return updateResult;
      });

      // NOTE: In the future, if you want to "archive" very old revisions
      // into a backup table, that logic would live in a separate job/script
      // that reads from balcony_revisions and moves/deletes rows by version
      // or changedAt ranges.

      return {
        message: `Balcony ID #${updated.updatedId} updated successfully`,
        balconyId: updated.updatedId,
        mode: "updated" as const,
      };
    }
  );
