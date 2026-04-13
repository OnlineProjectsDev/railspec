// /app/(rs)/fabrication/deriveStageFabricationRawParts.ts
import { buildEditorUiHydrationState } from "@/lib/editor-persistence/buildUiHydrationState"
import { hydrateRootStateFromPersisted } from "@/lib/editor-persistence/initializeEditorState"
import { loadOrInitializeBalconyEditorState } from "@/lib/editor-persistence/loadOrInitializeBalconyEditorState"
import { getEditorBalconiesForJobAndStageNo } from "@/lib/queries/getEditorBalcony"
import type { FabricationPart } from "./deriveFabricationParts"
import { deriveRootStateFabricationParts } from "./deriveRootStateFabricationParts"

export type StageFabricationBalconyMeta = {
  editorBalconyId: number
  jobId: number
  jobStageId: number
  drop: string
  balconyNo: string
  balconySortOrder: number
  balconyLabel: string
  balconyKey: string
}

export type StageFabricationPartRow = FabricationPart &
  StageFabricationBalconyMeta & {
    run_id: string | null
  }

export async function deriveStageFabricationRawParts(params: {
  jobId: number
  stageNo: number
}) {
  const balconies = await getEditorBalconiesForJobAndStageNo(params.jobId, params.stageNo, {
    includeDeleted: false,
  })

  const rows: StageFabricationPartRow[] = []

  for (const balconyRow of balconies) {
    if (balconyRow.isDeleted) continue

    const loaded = await loadOrInitializeBalconyEditorState(balconyRow.id)
    const persisted = loaded.persisted

    if (!persisted.balustradeState.hasDerivedBalustrade) continue

    const state = hydrateRootStateFromPersisted({
      persisted,
      uiState: buildEditorUiHydrationState(),
    })

    const derived = deriveRootStateFabricationParts(state)

    const meta: StageFabricationBalconyMeta = {
      editorBalconyId: balconyRow.id,
      jobId: balconyRow.jobId,
      jobStageId: balconyRow.jobStageId,
      drop: balconyRow.drop,
      balconyNo: balconyRow.balconyNo,
      balconySortOrder: balconyRow.sortOrder,
      balconyLabel: `Drop ${balconyRow.drop} — Balcony ${balconyRow.balconyNo}`,
      balconyKey: `${balconyRow.drop}::${balconyRow.balconyNo}::${balconyRow.id}`,
    }

    for (const part of derived.extrusions) {
      rows.push({
        ...part,
        ...meta,
        run_id: part.sourceSegmentId ?? null,
      })
    }

    for (const part of derived.glass) {
      rows.push({
        ...part,
        ...meta,
        run_id: part.sourceSegmentId ?? null,
      })
    }

    for (const part of derived.components) {
      rows.push({
        ...part,
        ...meta,
        run_id: part.sourceSegmentId ?? null,
      })
    }
  }

  rows.sort((a, b) => {
    if (a.drop !== b.drop) return a.drop.localeCompare(b.drop, undefined, { numeric: true, sensitivity: "base" })
    if (a.balconyNo !== b.balconyNo) return a.balconyNo.localeCompare(b.balconyNo, undefined, { numeric: true, sensitivity: "base" })
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    if ("subtype" in a && "subtype" in b && a.subtype !== b.subtype) return a.subtype.localeCompare(b.subtype)
    if (a.partName !== b.partName) return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
    return a.sourceId.localeCompare(b.sourceId, undefined, { numeric: true, sensitivity: "base" })
  })

  return rows
}