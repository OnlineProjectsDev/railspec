// /lib/queries/getShopDrawingRevision.ts
"use server";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  shopDrawingRevisions,
  shopDrawingRevisionSheets,
} from "@/db/schema";

export async function getCurrentShopDrawingRevision(jobStageId: number) {
  const rows = await db
    .select()
    .from(shopDrawingRevisions)
    .where(
      and(
        eq(shopDrawingRevisions.jobStageId, jobStageId),
        eq(shopDrawingRevisions.isCurrent, true)
      )
    )
    .orderBy(desc(shopDrawingRevisions.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function getShopDrawingRevisionByCode(params: {
  jobStageId: number;
  revisionCode: string;
}) {
  const rows = await db
    .select()
    .from(shopDrawingRevisions)
    .where(
      and(
        eq(shopDrawingRevisions.jobStageId, params.jobStageId),
        eq(shopDrawingRevisions.revisionCode, params.revisionCode)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getShopDrawingRevisionSheets(revisionId: number) {
  return db
    .select()
    .from(shopDrawingRevisionSheets)
    .where(
      and(
        eq(shopDrawingRevisionSheets.revisionId, revisionId),
        eq(shopDrawingRevisionSheets.isDeleted, false)
      )
    )
    .orderBy(
      asc(shopDrawingRevisionSheets.sheetOrder),
      asc(shopDrawingRevisionSheets.id)
    );
}

export async function getShopDrawingRevisionWithSheets(params: {
  jobStageId: number;
  revisionCode?: string;
}) {
  const revision = params.revisionCode
    ? await getShopDrawingRevisionByCode({
        jobStageId: params.jobStageId,
        revisionCode: params.revisionCode,
      })
    : await getCurrentShopDrawingRevision(params.jobStageId);

  if (!revision) {
    return {
      revision: null,
      sheets: [],
    };
  }

  const sheets = await getShopDrawingRevisionSheets(revision.id);

  return {
    revision,
    sheets,
  };
}

export async function getShopDrawingRevisionsForStage(jobStageId: number) {
  return db
    .select()
    .from(shopDrawingRevisions)
    .where(eq(shopDrawingRevisions.jobStageId, jobStageId))
    .orderBy(
      desc(shopDrawingRevisions.isCurrent),
      desc(shopDrawingRevisions.createdAt),
      desc(shopDrawingRevisions.id)
    );
}