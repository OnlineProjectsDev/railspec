// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/[revision]/resolveFabricationRevision.ts
import { redirect } from "next/navigation";

import {
  getShopDrawingRevisionByCode,
  getShopDrawingRevisionsForStage,
} from "@/lib/queries/getShopDrawingRevision";

export async function resolveFabricationRevisionOrRedirect(params: {
  jobStageId: number;
  revision: string;
  latestHref: (revisionCode: string) => string;
  liveHref: string;
}) {
  const requestedRevision = params.revision.trim().toUpperCase();

  const revision = await getShopDrawingRevisionByCode({
    jobStageId: params.jobStageId,
    revisionCode: requestedRevision,
  });

  if (revision) {
    return revision;
  }

  const revisions = await getShopDrawingRevisionsForStage(params.jobStageId);
  const newest = revisions[0];

  if (!newest) {
    redirect(params.liveHref);
  }

  redirect(params.latestHref(newest.revisionCode));
}