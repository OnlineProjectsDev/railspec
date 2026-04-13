
// /app/editor/page.tsx
"use client"

import { useReducer } from "react"
import { reducer } from "@/lib/reducer/reducer"
import { initialState } from "@/lib/state"
import EditorShell from "@/components/EditorShell"

export default function EditorPage() {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    editorContext: "sandbox",
  })

  return (
    <EditorShell
      state={state}
      dispatch={dispatch}
    />
  )
}