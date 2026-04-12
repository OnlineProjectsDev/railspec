// /lib/editor-persistence/loadOrInitializeBalconyEditorState.ts
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { balconyEditorState, editorBalconies, jobStages } from "@/db/schema"
import { getColourFromID } from "@/lib/queries/getAvailableColours"
import {
  buildInitialEditorConfigState,
  buildInitialFoundationState,
  buildInitialBalustradeState,
} from "@/lib/editor-persistence/initializeEditorState"
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults"
import type {
  BalconyEditorStateRecord,
  EditorConfigState,
  FoundationPersistedState,
  BalustradePersistedState,
  JobStageDefaults,
} from "@/lib/editor-persistence/types"

function hexStringToNumber(hex?: string | null): number {
  if (!hex) return 0xaaaaaa

  const clean = hex
    .trim()
    .replace(/^#/, "")
    .replace(/^0x/i, "")
    .replace(/^x/i, "")

  const n = /^[0-9A-Fa-f]{6}$/.test(clean) ? Number.parseInt(clean, 16) : NaN
  return Number.isFinite(n) ? n : 0xaaaaaa
}

async function resolveEditorColor(defaults: JobStageDefaults): Promise<EditorConfigState["color"]> {
  const colourId = defaults.powdercoatColourId ?? null

  if (typeof colourId !== "number") {
    return {
      hex: 0xaaaaaa,
      name: "TBD",
    }
  }

  const colour = await getColourFromID(colourId)

  if (!colour) {
    return {
      hex: 0xaaaaaa,
      name: "TBD",
    }
  }

  return {
    hex: hexStringToNumber(colour.hex),
    name: colour.name,
  }
}

export async function getBalconyEditorStateByEditorBalconyId(editorBalconyId: number) {
  const rows = await db
    .select()
    .from(balconyEditorState)
    .where(eq(balconyEditorState.editorBalconyId, editorBalconyId))
    .limit(1)

  return rows[0]
}

export async function loadOrInitializeBalconyEditorState(editorBalconyId: number): Promise<{
  balcony: typeof editorBalconies.$inferSelect
  editorStateRow: typeof balconyEditorState.$inferSelect
  persisted: BalconyEditorStateRecord
  initialized: boolean
}> {
  const balconyRows = await db
    .select()
    .from(editorBalconies)
    .where(
      and(
        eq(editorBalconies.id, editorBalconyId),
        eq(editorBalconies.isDeleted, false)
      )
    )
    .limit(1)

  const balcony = balconyRows[0]

  if (!balcony) {
    throw new Error(`Editor balcony ID ${editorBalconyId} not found.`)
  }

  const existing = await getBalconyEditorStateByEditorBalconyId(editorBalconyId)

  const stageRows = await db
    .select()
    .from(jobStages)
    .where(eq(jobStages.id, balcony.jobStageId))
    .limit(1)

  const stage = stageRows[0]

  if (!stage) {
    throw new Error(`Job stage ID ${balcony.jobStageId} not found for editor balcony ${editorBalconyId}.`)
  }

  const defaults = (stage.defaults ?? DEFAULT_JOB_STAGE_DEFAULTS) as JobStageDefaults
  const resolvedColor = await resolveEditorColor(defaults)

  if (existing) {
    const existingEditorConfig = existing.editorConfig as EditorConfigState

    const nextEditorConfig: EditorConfigState = {
      ...existingEditorConfig,
      color: resolvedColor,
    }

    if (
      existingEditorConfig.color?.hex !== resolvedColor.hex ||
      existingEditorConfig.color?.name !== resolvedColor.name
    ) {
      const [updated] = await db
        .update(balconyEditorState)
        .set({
          editorConfig: nextEditorConfig,
        })
        .where(eq(balconyEditorState.id, existing.id))
        .returning()

      return {
        balcony,
        editorStateRow: updated,
        persisted: {
          editorConfig: updated.editorConfig as EditorConfigState,
          foundationState: updated.foundationState as FoundationPersistedState,
          balustradeState: updated.balustradeState as BalustradePersistedState,
          version: updated.version,
        },
        initialized: false,
      }
    }

    return {
      balcony,
      editorStateRow: existing,
      persisted: {
        editorConfig: nextEditorConfig,
        foundationState: existing.foundationState as FoundationPersistedState,
        balustradeState: existing.balustradeState as BalustradePersistedState,
        version: existing.version,
      },
      initialized: false,
    }
  }

  const editorConfig = {
    ...buildInitialEditorConfigState(defaults),
    color: resolvedColor,
  }

  const foundationState = buildInitialFoundationState(defaults)
  const balustradeState = buildInitialBalustradeState(defaults)

  const [created] = await db
    .insert(balconyEditorState)
    .values({
      editorBalconyId: balcony.id,
      jobId: balcony.jobId,
      jobStageId: balcony.jobStageId,
      editorConfig,
      foundationState,
      balustradeState,
      version: 1,
    })
    .returning()

  return {
    balcony,
    editorStateRow: created,
    persisted: {
      editorConfig: created.editorConfig as EditorConfigState,
      foundationState: created.foundationState as FoundationPersistedState,
      balustradeState: created.balustradeState as BalustradePersistedState,
      version: created.version,
    },
    initialized: true,
  }
}