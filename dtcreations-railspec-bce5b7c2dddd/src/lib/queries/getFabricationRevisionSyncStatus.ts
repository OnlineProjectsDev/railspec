// /lib/queries/getFabricationRevisionSyncStatus.ts
"use server"

import { deriveStageFabricationRawParts } from "@/app/(rs)/fabrication/deriveStageFabricationRawParts"
import { getShopDrawingRevisionWithSheets } from "@/lib/queries/getShopDrawingRevision"
import { hashFabricationSnapshot } from "@/lib/fabrication/hashFabricationSnapshot"

type Input = {
  jobId: number
  jobStageId: number
  stageNo: number
  revisionCode?: string
}

export async function getFabricationRevisionSyncStatus(input: Input) {
  const revisionData = await getShopDrawingRevisionWithSheets({
    jobStageId: input.jobStageId,
    revisionCode: input.revisionCode,
  })

  if (!revisionData.revision) {
    return {
      hasRevision: false,
      isDirty: false,
      revisionCode: null as string | null,
      savedHash: null as string | null,
      freshHash: null as string | null,
      savedCount: 0,
      freshCount: 0,
    }
  }

  const savedParts =
    (revisionData.revision.fabricationSnapshot as any[]) ?? []

  const freshParts = await deriveStageFabricationRawParts({
    jobId: input.jobId,
    stageNo: input.stageNo,
  })

  const savedHash = hashFabricationSnapshot(savedParts)
  const freshHash = hashFabricationSnapshot(freshParts)

  return {
    hasRevision: true,
    isDirty: savedHash !== freshHash,
    revisionCode: revisionData.revision.revisionCode,
    savedHash,
    freshHash,
    savedCount: savedParts.length,
    freshCount: freshParts.length,
  }
}