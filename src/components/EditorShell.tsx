// /components/EditorShell.tsx
"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Canvas2D from "./Canvas2D"
import Canvas3D from "./Canvas3D"
import LeftPanel from "./LeftPanel"
import LaserHeightListCard from "./LaserHeightListCard"
import { RootState } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import styles from "./EditorShell.module.css"
import { InspectorTarget } from "./ConstraintInspector"

export default function EditorShell({
  state,
  dispatch,
  onSave,
  isSaving = false,
  saveDisabled = false,
  onReturnToProject,
  isDirty = false,
  toolbarTitle,
  stageSettingsHref,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
  onSave?: () => void
  isSaving?: boolean
  saveDisabled?: boolean
  onReturnToProject?: () => void
  isDirty?: boolean
  toolbarTitle?: string
  stageSettingsHref?: string
}) {
  const [hoveredTarget, setHoveredTarget] = useState<InspectorTarget>(null)
  const [selectedTarget, setSelectedTarget] = useState<InspectorTarget>(null)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)

  useEffect(() => {
    if (state.mode !== "balustrade" && state.laserHeightListEditMode) {
      dispatch({ type: "SET_LASER_HEIGHT_LIST_EDIT_MODE", value: false })
    }
  }, [state.mode, state.laserHeightListEditMode, dispatch])

  function handleReturnToProjectRequest() {
    if (!onReturnToProject) return

    if (isDirty) {
      setShowUnsavedConfirm(true)
      return
    }

    onReturnToProject()
  }

  useEffect(() => {
    if (selectedTarget?.kind === "balustrade-vertex") {
      const runs =
        state.balcony.balustradePaths?.length
          ? state.balcony.balustradePaths
          : [state.balcony.balustradePath]

      const run = runs[selectedTarget.runIndex]
      const vertexStillExists =
        !!run &&
        selectedTarget.vertexIndex > 0 &&
        selectedTarget.vertexIndex < run.length - 1

      if (!vertexStillExists) {
        setSelectedTarget(null)
      }
    }

    if (hoveredTarget?.kind === "balustrade-vertex") {
      const runs =
        state.balcony.balustradePaths?.length
          ? state.balcony.balustradePaths
          : [state.balcony.balustradePath]

      const run = runs[hoveredTarget.runIndex]
      const vertexStillExists =
        !!run &&
        hoveredTarget.vertexIndex > 0 &&
        hoveredTarget.vertexIndex < run.length - 1

      if (!vertexStillExists) {
        setHoveredTarget(null)
      }
    }
  }, [state.balcony.balustradePath, state.balcony.balustradePaths, selectedTarget, hoveredTarget])

  const PANEL_WIDTH = 360
  const PANEL_GAP = 8 // gap between panel edge and toolbar

  const toolbarLeft = leftPanelCollapsed
    ? "1rem"
    : `calc(1rem + ${PANEL_WIDTH}px + ${PANEL_GAP}px)`

  return (
    <div className={styles.shellRoot}>
      <div
        className={styles.canvasHost}
        style={{ "--toolbar-left": toolbarLeft } as React.CSSProperties}
      >
        {!leftPanelCollapsed ? (
          <div className={styles.leftPanelFloat}>
            <LeftPanel
              state={state}
              dispatch={dispatch}
              hoveredTarget={hoveredTarget}
              selectedTarget={selectedTarget}
              onReturnToProject={handleReturnToProjectRequest}
              isDirty={isDirty}
              stageSettingsHref={stageSettingsHref}
            />
          </div>
        ) : null}

        <button
          type="button"
          className={styles.btn}
          title={leftPanelCollapsed ? "Show panel" : "Hide panel"}
          onClick={() => setLeftPanelCollapsed((v) => !v)}
          style={{
            position: "absolute",
            top: "1rem",
            left: leftPanelCollapsed ? "1rem" : `calc(1rem + ${PANEL_WIDTH}px + ${PANEL_GAP}px)`,
            zIndex: 50,
            padding: "6px",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "left 180ms ease",
          }}
        >
          {leftPanelCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {state.view === "2d" ? (
          <Canvas2D
            state={state}
            dispatch={dispatch}
            onSave={onSave}
            isSaving={isSaving}
            saveDisabled={saveDisabled}
            hoveredTarget={hoveredTarget}
            selectedTarget={selectedTarget}
            onHoverTargetChange={setHoveredTarget}
            onSelectTargetChange={setSelectedTarget}
            toolbarTitle={toolbarTitle}
          />
        ) : (
          <Canvas3D
            state={state}
            dispatch={dispatch}
            onSave={onSave}
            isSaving={isSaving}
            saveDisabled={saveDisabled}
            hoveredTarget={hoveredTarget}
            selectedTarget={selectedTarget}
            onHoverTargetChange={setHoveredTarget}
            onSelectTargetChange={setSelectedTarget}
            toolbarTitle={toolbarTitle}
          />
        )}
      </div>

      {showUnsavedConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
            zIndex: 9999,
            pointerEvents: "auto",
          }}
          onClick={() => {
            setShowUnsavedConfirm(false)
          }}
        >
          <div
            style={{
              width: 360,
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #E5E7EB",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              padding: 14,
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Leave without saving?</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
              You have unsaved changes. Leaving now will discard anything not yet saved.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={styles.btn}
                style={{ flex: 1, padding: "10px 12px" }}
                onClick={() => {
                  setShowUnsavedConfirm(false)
                }}
              >
                Cancel
              </button>

              <button
                className={styles.btn}
                style={{ flex: 1, padding: "10px 12px", background: "#8DB2D1", color: "#fff" }}
                onClick={() => {
                  setShowUnsavedConfirm(false)
                  onReturnToProject?.()
                }}
              >
                Leave
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>
              Tip: click outside this dialog to cancel.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}