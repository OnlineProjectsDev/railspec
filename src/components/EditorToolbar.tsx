// /components/EditorToolbar.tsx
"use client"

import { useState } from "react"
import { CheckCheck, Save } from "lucide-react"
import { RootState } from "@/lib/types"
import styles from "./EditorShell.module.css"

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.toolbarSegmented}>
      {options.map((opt) => {
        const active = opt.value === value
        const disabled = !!opt.disabled

        return (
          <button
            key={opt.value}
            className={styles.btn}
            disabled={disabled}
            style={{
              border: "none",
              borderRadius: 0,
              background: active ? "#111827" : "transparent",
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
  return (
    <button
      className={styles.btn}
      title={title}
      style={{
        background: active ? "#111827" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#111827",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export default function EditorToolbar({
  state,
  dispatch,
  onFit,
  onSave,
  isSaving = false,
  saveDisabled = false,
  children,
  title,
}: {
  state: RootState
  dispatch: React.Dispatch<any>
  onFit?: () => void
  onSave?: () => void
  isSaving?: boolean
  saveDisabled?: boolean
  children?: React.ReactNode
  title?: string
}) {
  const canShowGizmoTool =
    state.hasDerivedBalustrade && state.view === "3d" && state.mode === "balustrade"

  const [showDeriveConfirm, setShowDeriveConfirm] = useState(false)

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarSurface}>
        <div className={styles.toolbarGroup}>
          <div className={styles.toolbarGroupLabel}>
            {state.editorContext === "sandbox" ? "Workspace" : (title ?? "Workspace")}
          </div>

          {onFit ? (
            <button className={styles.btn} onClick={onFit}>
              Fit
            </button>
          ) : null}

          {onSave ? (
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
          ) : null}

          <Segmented
            value={state.mode}
            options={[
              { value: "substrate", label: "Substrate" },
              { value: "balustrade", label: "Balustrade", disabled: !state.hasDerivedBalustrade },
            ]}
            onChange={(v) => dispatch({ type: "SET_MODE", mode: v as any })}
          />

          <Segmented
            value={state.view}
            options={[
              { value: "2d", label: "2D" },
              { value: "3d", label: "3D" },
            ]}
            onChange={(v) => dispatch({ type: "SET_VIEW", view: v as any })}
          />

          <ToolPill
            label={state.snapEnabled ? "Snap ON" : "Snap OFF"}
            active={state.snapEnabled}
            onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          />

          {state.mode === "balustrade" ? (
            <ToolPill
              label="Laser heights"
              title="Toggle laser height editing — click anchorage points on the canvas to adjust their height"
              active={state.laserHeightListEditMode}
              onClick={() =>
                dispatch({
                  type: "SET_LASER_HEIGHT_LIST_EDIT_MODE",
                  value: !state.laserHeightListEditMode,
                })
              }
            />
          ) : null}
        </div>

        {state.mode === "substrate" ? (
          <>
            <div className={styles.toolbarDivider} />

            <div className={styles.toolbarGroup}>
              <div className={styles.toolbarGroupLabel}>Substrate actions</div>

              <ToolPill
                label={state.hasDerivedBalustrade ? "Rebuild Balustrade" : "Build Balustrade"}
                onClick={() => {
                  if (!state.hasDerivedBalustrade) {
                    dispatch({ type: "DERIVE_BALUSTRADE_FROM_FLOOR" })
                    return
                  }

                  setShowDeriveConfirm(true)
                }}
              />

              {/* <ToolPill
                label="Regenerate posts"
                onClick={() =>
                  dispatch({
                    type: "REGENERATE_POSTS",
                    spacing: state.balcony.maxPostSpacing ?? 1000,
                  })
                }
              /> */}
            </div>
          </>
        ) : null}

        {state.mode === "balustrade" ? (
          <>
            <div className={styles.toolbarDivider} />

            <div className={styles.toolbarGroup}>
              <div className={styles.toolbarGroupLabel}>Post tools</div>

              <ToolPill
                label="Add post"
                active={state.postsTool === "add_mid_post"}
                onClick={() =>
                  dispatch({
                    type: "SET_POSTS_TOOL",
                    tool: state.postsTool === "add_mid_post" ? null : "add_mid_post",
                  })
                }
              />

              <ToolPill
                label="Fill spacing"
                active={state.postsTool === "add_posts_to_spacing"}
                onClick={() =>
                  dispatch({
                    type: "SET_POSTS_TOOL",
                    tool: state.postsTool === "add_posts_to_spacing" ? null : "add_posts_to_spacing",
                  })
                }
              />

              <ToolPill
                label="Delete post"
                active={state.postsTool === "delete_post"}
                onClick={() =>
                  dispatch({
                    type: "SET_POSTS_TOOL",
                    tool: state.postsTool === "delete_post" ? null : "delete_post",
                  })
                }
              />

            </div>
          </>
        ) : null}

        {canShowGizmoTool ? (
          <>
            <div className={styles.toolbarDivider} />

            <div className={styles.toolbarGroup}>
              <div className={styles.toolbarGroupLabel}>3D gizmo</div>

              <Segmented
                value={state.gizmoTool}
                options={[
                  { value: "translate", label: "Move" },
                  { value: "rotate", label: "Rotate" },
                  { value: "extend", label: "Post" },
                  { value: "anchor", label: "Rail" },
                ]}
                onChange={(v) => dispatch({ type: "SET_GIZMO_TOOL", tool: v as any })}
              />
            </div>
          </>
        ) : null}
      </div>

      {children ? <div className={styles.toolbarRow}>{children}</div> : null}

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
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
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
                style={{ flex: 1, padding: "10px 12px", background: "#111827", color: "#fff" }}
                onClick={() => {
                  setShowDeriveConfirm(false)
                  dispatch({ type: "DERIVE_BALUSTRADE_FROM_FLOOR" })
                }}
              >
                Rebuild
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