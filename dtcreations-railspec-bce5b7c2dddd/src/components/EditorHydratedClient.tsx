// /components/EditorHydratedClient.tsx
"use client"

import { useMemo, useRef, useState, useReducer } from "react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { reducer } from "@/lib/reducer/reducer"
import EditorShell from "@/components/EditorShell"
import { saveEditorBalconyStateAction } from "@/app/actions/saveEditorBalconyStateAction"
import { buildPersistedSlicesFromRootState, serializePersistedSlices } from "@/lib/editor-persistence/buildPersistedSlicesFromRootState"
import type { RootState } from "@/lib/types"

export default function EditorHydratedClient({
  editorBalconyId,
  jobId,
  jobStageId,
  jobNumber,
  stageNumber,
  initialEditorState,
  initialVersion: _initialVersion,
  toolbarTitle,
}: {
  editorBalconyId: number
  jobId: number
  jobStageId: number
  jobNumber: number
  stageNumber: number
  initialEditorState: RootState
  initialVersion: number
  toolbarTitle?: string
}) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialEditorState)

  // console.log("EditorHydratedClient initialEditorState.color", initialEditorState.color)
  // console.log("EditorHydratedClient reducer state.color", state.color)

  const currentPersistedSlices = useMemo(() => {
    return buildPersistedSlicesFromRootState(state)
  }, [state])

  const [lastSavedSerialized, setLastSavedSerialized] = useState(() =>
    serializePersistedSlices(buildPersistedSlicesFromRootState(initialEditorState))
  )

  const lastSubmittedSerializedRef = useRef<string | null>(null)

  const isDirty = useMemo(() => {
    return serializePersistedSlices(currentPersistedSlices) !== lastSavedSerialized
  }, [currentPersistedSlices, lastSavedSerialized])

  const {
    execute: executeSave,
    isPending: isSaving,
  } = useAction(saveEditorBalconyStateAction, {
    onSuccess({ data }) {
      if (!data?.success) {
        toast.error(data?.message ?? "Editor save failed.")
        return
      }

      if (lastSubmittedSerializedRef.current) {
        setLastSavedSerialized(lastSubmittedSerializedRef.current)
      }

      toast.success(data.message)
    },
    onError({ error }) {
      toast.error(error?.serverError ?? "Editor save failed.")
    },
  })

  function handleSave() {
    const payload = {
      editorBalconyId,
      jobId,
      jobStageId,
      ...currentPersistedSlices,
    }

    lastSubmittedSerializedRef.current = serializePersistedSlices(currentPersistedSlices)
    executeSave(payload)
  }

  function handleReturnToProject() {
    router.push(`/editor/${jobNumber}/${stageNumber}`)
  }

  return (
    <EditorShell
      state={state}
      dispatch={dispatch}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!isDirty}
      onReturnToProject={handleReturnToProject}
      isDirty={isDirty}
      toolbarTitle={toolbarTitle}
    />
  )
}