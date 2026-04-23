// /components/EditorToolbar.tsx
"use client"

import { useState } from "react"
import { CheckCheck, Save } from "lucide-react"
import { RootState } from "@/lib/types"
import styles from "./EditorShell.module.css"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function WithTooltip({ tip, children }: { tip?: string; children: React.ReactNode }) {
  if (!tip) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children as React.ReactElement}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string; disabled?: boolean; title?: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.toolbarSegmented}>
      {options.map((opt) => {
        const active = opt.value === value
        const disabled = !!opt.disabled

        const btn = (
          <button
            key={opt.value}
            className={styles.btn}
            disabled={disabled}
            style={{
              border: "none",
              borderRadius: 0,
              background: active ? "#8DB2D1" : "transparent",
              color: disabled ? "#9CA3AF" : active ? "#FFFFFF" : "#111827",
              padding: "8px 10px",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
            onClick={() => {
              if (disabled) return
              onChange(opt.value)
            }}
          >
            {opt.label}
          </button>
        )

        return opt.title ? (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>{opt.title}</TooltipContent>
          </Tooltip>
        ) : btn
      })}
    </div>
  )
}

function ToolPill({
  label,
  active,
  onClick,
  title,
}: {
  label: string
  active?: boolean
  onClick: () => void
  title?: string
}) {
  const btn = (
    <button
      className={styles.btn}
      style={{
        background: active ? "#8DB2D1" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#111827",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )

  return (
    <WithTooltip tip={title}>
      {btn}
    </WithTooltip>
  )
}

export default function EditorToolbar({
  state,
  dispatch,
  onFit,
  onCenter,
  onSave,
  isSaving = false,
  saveDisabled = false,
  children,
  title,
  panelCollapsed,
  onReturnToProject,
  isDirty,
  stageSettingsHref,
}: {
  state: RootState
  dispatch: React.Dispatch<any>
  onFit?: () => void
  onCenter?: () => void
  onSave?: () => void
  isSaving?: boolean
  saveDisabled?: boolean
  children?: React.ReactNode
  title?: string
  panelCollapsed?: boolean
  onReturnToProject?: () => void
  isDirty?: boolean
  stageSettingsHref?: string
}) {
  const canShowGizmoTool =
    state.hasDerivedBalustrade && state.view === "3d" && state.mode === "balustrade"

  const [showDeriveConfirm, setShowDeriveConfirm] = useState(false)

  return (
    <TooltipProvider>
    <div className={styles.toolbar}>
      <div className={styles.toolbarSurface}>
        <div className={styles.toolbarGroup}>
          <div className={styles.toolbarGroupLabel}>
            {state.editorContext === "sandbox" ? "Workspace" : (title ?? "Workspace")}
          </div>

          <Segmented
            value={state.mode}
            options={[
              { value: "substrate", label: "Substrate", title: "Draw and edit the floor outline" },
              { value: "balustrade", label: "Balustrade", disabled: !state.hasDerivedBalustrade, title: state.hasDerivedBalustrade ? "Adjust posts, panels, and toprails" : "Build the balustrade first (Substrate → Build Balustrade)" },
            ]}
            onChange={(v) => dispatch({ type: "SET_MODE", mode: v as any })}
          />
        </div>

        {state.mode === "substrate" ? (
          <>
            <div className={styles.toolbarDivider} />

            <div className={styles.toolbarGroup}>
              <div className={styles.toolbarGroupLabel}>Substrate actions</div>

              <ToolPill
                label={state.hasDerivedBalustrade ? "Rebuild Balustrade" : "Build Balustrade"}
                title={state.hasDerivedBalustrade ? "Re-generate posts from the floor outline — all manual adjustments will be reset" : "Generate posts and rails from the current substrate outline"}
                onClick={() => {
                  if (!state.hasDerivedBalustrade) {
                    dispatch({ type: "DERIVE_BALUSTRADE_FROM_FLOOR" })
                    return
                  }

                  setShowDeriveConfirm(true)
                }}
              />
            </div>
          </>
        ) : null}

        {panelCollapsed && state.editorContext === "project" && (onReturnToProject || stageSettingsHref) ? (
          <>
            <div className={styles.toolbarDivider} />
            <div className={styles.toolbarGroup}>
              <div className={styles.toolbarGroupLabel}>Project</div>
              {onReturnToProject ? (
                <button className={styles.btn} onClick={onReturnToProject}>
                  ← Back{isDirty ? " *" : ""}
                </button>
              ) : null}
              {stageSettingsHref ? (
                <a
                  href={stageSettingsHref}
                  className={styles.btn}
                  style={{ textDecoration: "none" }}
                >
                  Stage Settings
                </a>
              ) : null}
            </div>
          </>
        ) : null}

        <div className={styles.toolbarSpacer} />

        <div className={styles.toolbarGroup}>
          <ToolPill
            label={state.snapEnabled ? "Snap ON" : "Snap OFF"}
            title="When on, vertices snap to the nearest grid point while drawing"
            active={state.snapEnabled}
            onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          />

          {onCenter ? (
            <WithTooltip tip="Pan to centre the content in the visible area">
              <button className={styles.btn} onClick={onCenter}>
                Centre
              </button>
            </WithTooltip>
          ) : null}

          {onFit ? (
            <WithTooltip tip="Pan and zoom to fit all content in view">
              <button className={styles.btn} onClick={onFit}>
                Fit
              </button>
            </WithTooltip>
          ) : null}

          {onSave ? (
            <WithTooltip tip={saveDisabled && !isSaving ? "All changes saved" : "Save your current changes"}>
              <button
                className={styles.btn}
                onClick={onSave}
                disabled={isSaving || saveDisabled}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: saveDisabled && !isSaving ? 0.55 : 1,
                  cursor: saveDisabled && !isSaving ? "not-allowed" : "pointer",
                  color: saveDisabled && !isSaving ? "#6B7280" : undefined,
                }}
              >
                {isSaving ? (
                  <>
                    <Save size={16} />
                    Saving...
                  </>
                ) : saveDisabled ? (
                  <>
                    <CheckCheck size={16} />
                    Saved
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            </WithTooltip>
          ) : null}
        </div>
      </div>

      {children ? <div className={styles.toolbarRow}>{children}</div> : null}
    </div>

      {showDeriveConfirm ? (
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
            setShowDeriveConfirm(false)
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
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Rebuild balustrade?</div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 12 }}>
              This will overwrite your current saved balustrade layout with a newly derived layout from the substrate.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={styles.btn}
                style={{ flex: 1, padding: "10px 12px" }}
                onClick={() => {
                  setShowDeriveConfirm(false)
                }}
              >
                Cancel
              </button>

              <button
                className={styles.btn}
                style={{ flex: 1, padding: "10px 12px", background: "#8DB2D1", color: "#fff" }}
                onClick={() => {
                  setShowDeriveConfirm(false)
                  dispatch({ type: "DERIVE_BALUSTRADE_FROM_FLOOR" })
                }}
              >
                Rebuild
              </button>
            </div>

            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 10 }}>
              Tip: click outside this dialog to cancel.
            </div>
          </div>
        </div>
      ) : null}
    </TooltipProvider>
  )
}