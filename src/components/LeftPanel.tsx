// /components/LeftPanel.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { RootState, BoundaryBayRefMode } from "@/lib/types"
import { Action } from "@/lib/reducer"
import styles from "./EditorShell.module.css"
import NumericInput from "./NumericInput"
import ConstraintInspector, { InspectorTarget } from "./ConstraintInspector"
import { editorTemplates } from "@/lib/state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  MousePointer2,
  Ruler,
  Settings2,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react"

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        border: "1px solid #E5E7EB",
        background: "#F9FAFB",
        color: "#111827",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  )
}

function SidebarIconButton({
  icon: Icon,
  label,
  onClick,
  highlighted,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  highlighted?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={styles.sidebarIconBtn}
          onClick={onClick}
          aria-label={label}
          style={highlighted ? { background: "#F3F4F6", color: "#374151" } : undefined}
        >
          <Icon size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function Section({
  id,
  title,
  description,
  children,
  icon: Icon,
}: {
  id?: string
  title: string
  description?: string
  children: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <div
      id={id}
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: 12,
        background: "#F9FAFB",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {Icon ? <Icon size={13} style={{ color: "#6B7280", flexShrink: 0 }} /> : null}
          <div style={{ fontWeight: 600, color: "#111827" }}>{title}</div>
        </div>
        {description ? <div style={{ fontSize: 11, color: "#6B7280" }}>{description}</div> : null}
      </div>
      {children}
    </div>
  )
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div
      style={{
        display: "flex",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        overflow: "hidden",
        background: "#F9FAFB",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={styles.btn}
            style={{
              flex: 1,
              padding: "8px 10px",
              fontSize: 12,
              borderRadius: 0,
              border: "none",
              cursor: "pointer",
              background: active ? "#8DB2D1" : "transparent",
              color: active ? "#FFFFFF" : "#111827",
              fontWeight: active ? 600 : 500,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  step,
  min,
  max,
  disabled,
}: {
  label: string
  value: number
  onChange?: (value: number) => void
  step?: number
  min?: number
  max?: number
  disabled?: boolean
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{label}</div>
      <NumericInput
        className={styles.input}
        style={{ width: "100%", background: disabled ? "#F3F4F6" : "#FFFFFF" }}
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step ?? 1}
        disabled={!!disabled}
        updateMode="change"
        onChange={(n) => {
            if (!onChange) return
            onChange(n)
        }}
      />
    </label>
  )
}

function TogglePill({
  label,
  on,
  onClick,
}: {
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={styles.btn}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid #E5E7EB",
      background: on ? "#8DB2D1" : "#FFFFFF",
        color: on ? "#FFFFFF" : "#111827",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {label}
      <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{on ? "ON" : "OFF"}</span>
    </button>
  )
}

function ToolButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={styles.btn}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        background: active ? "#8DB2D1" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#111827",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )
}

export default function LeftPanel({
  state,
  dispatch,
  hoveredTarget,
  selectedTarget,
  onReturnToProject,
  isDirty = false,
  stageSettingsHref,
  collapsed = false,
  onToggleCollapsed,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
  hoveredTarget: InspectorTarget
  selectedTarget: InspectorTarget
  onReturnToProject?: () => void
  isDirty?: boolean
  stageSettingsHref?: string
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const selectedCount = state.selectedPostIds.length
  const selectedPost =
    selectedCount === 1 ? state.posts.find((p) => p.id === state.selectedPostIds[0]) ?? null : null

  const selectedSegmentConstraints =
    selectedPost?.segmentId ? state.balcony.segmentConstraintsById?.[selectedPost.segmentId] ?? null : null

  const canShowGizmoTool =
    state.hasDerivedBalustrade && state.view === "3d" && state.mode === "balustrade"

  const excludedSet = new Set(state.balcony.autoTopExcludePostIds ?? [])
  const allSelectedExcluded =
    state.selectedPostIds.length > 0 && state.selectedPostIds.every((id) => excludedSet.has(id))

  const pendingScrollRef = useRef<string | null>(null)

  function handleIconClick(sectionId: string) {
    if (collapsed) {
      pendingScrollRef.current = sectionId
      onToggleCollapsed?.()
    }
  }

  useEffect(() => {
    if (!collapsed && pendingScrollRef.current) {
      const id = pendingScrollRef.current
      pendingScrollRef.current = null
      // Wait for width + opacity transitions (260ms) then smooth scroll
      const t = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 270)
      return () => clearTimeout(t)
    }
  }, [collapsed])

  return (
    <TooltipProvider>
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Icon strip — visible when collapsed */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, bottom: 0,
          width: 44,
          opacity: collapsed ? 1 : 0,
          pointerEvents: collapsed ? "auto" : "none",
          transition: "opacity 200ms ease",
          zIndex: 2,
        }}
      >
        <div className={styles.sidebarIconStrip}>
          <SidebarIconButton icon={ChevronLeft} label="Expand panel" highlighted onClick={() => onToggleCollapsed?.()} />
          <div className={styles.sidebarIconDivider} />
          {state.editorContext === "project" ? (
            <SidebarIconButton icon={ArrowLeft} label="Project" onClick={() => handleIconClick("sidebar-project")} />
          ) : null}
          {state.editorContext === "sandbox" ? (
            <SidebarIconButton icon={LayoutGrid} label="Templates" onClick={() => handleIconClick("sidebar-templates")} />
          ) : null}
          <SidebarIconButton icon={Ruler} label="Elevation settings" onClick={() => handleIconClick("sidebar-elevation")} />
          <SidebarIconButton icon={SlidersHorizontal} label="Post generation" onClick={() => handleIconClick("sidebar-post-generation")} />
          {state.mode === "balustrade" ? (
            <SidebarIconButton icon={Wrench} label="Tools" onClick={() => handleIconClick("sidebar-tools")} />
          ) : null}
          <SidebarIconButton icon={Eye} label="Inspector" onClick={() => handleIconClick("sidebar-inspector")} />
          {state.hasDerivedBalustrade ? (
            <SidebarIconButton icon={MousePointer2} label="Selection" onClick={() => handleIconClick("sidebar-selection")} />
          ) : null}
        </div>
      </div>

      {/* Full panel — visible when expanded */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, bottom: 0,
          width: 300,
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          transition: "opacity 200ms ease",
          zIndex: 1,
        }}
      >
      <aside
        style={{
          width: 300,
          height: "100%",
          background: "#ffffff",
          display: "flex",
          flexDirection: "row",
        }}
      >
      <div style={{ flex: 1, overflow: "hidden", height: "100%" }}>
      <ScrollArea className="h-full">
      <div style={{ padding: 14, paddingRight: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Balustrade Editor</div>
          <SidebarIconButton icon={ChevronRight} label="Collapse panel" highlighted onClick={() => onToggleCollapsed?.()} />
        </div>
      </div>

      {state.editorContext === "project" ? (
        <Section id="sidebar-project" title="Project" description="Return to the linked project stage overview." icon={ArrowLeft}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className={styles.btn}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
              }}
              onClick={() => onReturnToProject?.()}
            >
              ← Back to Project
            </button>

            <div style={{ fontSize: 11, color: "#6B7280" }}>
              {isDirty ? "Unsaved changes will require confirmation before leaving." : "No unsaved changes."}
            </div>

            {stageSettingsHref ? (
              <a
                href={stageSettingsHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid #E5E7EB",
                  background: "#F9FAFB",
                  color: "#111827",
                  textDecoration: "none",
                }}
              >
                Stage Settings
              </a>
            ) : null}
          </div>
        </Section>
      ) : null}

      {state.editorContext === "sandbox" ? (
        <Section id="sidebar-templates" title="Templates" description="Load a starting layout and defaults." icon={LayoutGrid}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {editorTemplates.map((template) => (
              <button
                key={template.id}
                className={styles.btn}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                }}
                onClick={() => dispatch({ type: "LOAD_TEMPLATE", templateId: template.id })}
              >
                {template.label}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      <Section id="sidebar-elevation" title="Elevation settings" description="Set heights and constraints used across the layout." icon={Ruler}>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Edit mode</div>
            <Segmented
              value={state.mode}
              options={[
                { value: "substrade", label: "Substrade" },
                { value: "balustrade", label: "Balustrade" },
              ]}
              onChange={(v) => dispatch({ type: "SET_MODE", mode: v as any })}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>View</div>
            <Segmented
              value={state.view}
              options={[
                { value: "2d", label: "2D" },
                { value: "3d", label: "3D" },
              ]}
              onChange={(v) => dispatch({ type: "SET_VIEW", view: v as any })}
            />
          </div> */}

          {/* <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Snapping</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                {state.snapEnabled ? "Snapping enabled" : "Snapping disabled"}
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
              className={styles.btn}
              style={{
                background: state.snapEnabled ? "#111827" : "#FFFFFF",
                color: state.snapEnabled ? "#FFFFFF" : "#111827",
              }}
            >
              {state.snapEnabled ? "On" : "Off"}
            </button>
          </div> */}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field
                label="Laser height"
                value={state.balcony.laserLevelY}
                onChange={(laserLevelY) => dispatch({ type: "UPDATE_BALCONY_LASER_LEVEL", laserLevelY })}
                step={1}
            />
            <Field
                label="Top height"
                value={state.balcony.topY}
                onChange={(topY) => dispatch({ type: "UPDATE_BALCONY_TOP_Y", topY })}
                step={1}
            />

            <Field
                label="Floor level (from laser)"
                value={state.foundation.fflHeight}
                onChange={(fflHeight) => dispatch({ type: "UPDATE_FOUNDATION_FFL_HEIGHT", fflHeight })}
                step={1}
            />

            <Field
              label="Min post length"
              value={state.balcony.minPostLength}
              onChange={(value) => dispatch({ type: "SET_MIN_POST_LENGTH", value })}
              step={1}
              min={1}
            />

            <div style={{ fontSize: 11, color: "#6B7280", gridColumn: "1 / -1" }}>
                Auto top is on — top height will not fall below what's required for the minimum post length.
            </div>
          </div>
        </div>
      </Section>

      <Section id="sidebar-post-generation" title="Post generation" description="Set these before building — they are applied each time the balustrade is built." icon={SlidersHorizontal}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field
            label="Max post spacing"
            value={state.balcony.maxPostSpacing ?? 1000}
            min={1}
            step={10}
            onChange={(value) => dispatch({ type: "SET_MAX_POST_SPACING", value })}
          />

          <Field
            label="Min barrier height"
            value={state.balcony.minBarrierHeight ?? state.balcony.minPostLength}
            min={1}
            step={1}
            onChange={(value) => dispatch({ type: "SET_MIN_BARRIER_HEIGHT", value })}
          />

           <Field
            label="Max barrier height"
            value={state.balcony.maxBarrierHeight ?? 1200}
            min={1}
            step={1}
            onChange={(value) => dispatch({ type: "SET_MAX_BARRIER_HEIGHT", value })}
          />

          <Field
            label="Max panel height"
            value={state.balcony.maxPanelHeight ?? 1000}
            min={1}
            step={10}
            onChange={(value) => dispatch({ type: "SET_MAX_PANEL_HEIGHT", value })}
          />

          <Field
            label="Max bottom gap"
            value={state.balcony.maxBottomGap ?? 100}
            min={0}
            step={1}
            onChange={(value) => dispatch({ type: "SET_MAX_BOTTOM_GAP", value })}
          />

          {/* <button
            className={styles.btn}
            style={{ padding: "10px 12px" }}
            onClick={() => dispatch({ type: "DERIVE_BALUSTRADE_FROM_FLOOR" })}
          >
            Derive balustrade from floor
          </button>

          <button
            className={styles.btn}
            style={{ padding: "10px 12px" }}
            onClick={() => dispatch({ type: "REGENERATE_POSTS", spacing: state.balcony.maxPostSpacing ?? 1000 })}
          >
            Regenerate posts
          </button> */}

        </div>
      </Section>

      {/* Debug section — hidden from production UI
      <Section title="Debug" description="Temporary visualisation helpers during development.">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <TogglePill
            label="Mitre planes"
            on={state.debug.showMitrePlanes}
            onClick={() => dispatch({ type: "TOGGLE_DEBUG_FLAG", key: "showMitrePlanes" })}
          />
          <div style={{ fontSize: 12, color: "#6B7280" }}>Shows 80×80 planes at non-180° corners (visual-only).</div>
        </div>
      </Section>
      */}

      <Section id="sidebar-tools" title="Tools" icon={Wrench}>
        {state.mode !== "balustrade" ? (
          <div style={{ fontSize: 11, color: "#6B7280" }}>
            Switch to Balustrade mode to access post tools and laser heights.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            <TogglePill
              label="Laser heights"
              on={state.laserHeightListEditMode}
              onClick={() => dispatch({ type: "SET_LASER_HEIGHT_LIST_EDIT_MODE", value: !state.laserHeightListEditMode })}
            />
            <div style={{ fontSize: 11, color: "#6B7280" }}>Click anchorage points on the canvas to adjust their height.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Post tools</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <TogglePill
                  label="Add post"
                  on={state.postsTool === "add_mid_post"}
                  onClick={() => dispatch({ type: "SET_POSTS_TOOL", tool: state.postsTool === "add_mid_post" ? null : "add_mid_post" })}
                />
                <TogglePill
                  label="Fill spacing"
                  on={state.postsTool === "add_posts_to_spacing"}
                  onClick={() => dispatch({ type: "SET_POSTS_TOOL", tool: state.postsTool === "add_posts_to_spacing" ? null : "add_posts_to_spacing" })}
                />
                <TogglePill
                  label="Delete post"
                  on={state.postsTool === "delete_post"}
                  onClick={() => dispatch({ type: "SET_POSTS_TOOL", tool: state.postsTool === "delete_post" ? null : "delete_post" })}
                />
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>Arm a tool then click on the canvas to apply it.</div>
            </div>

            {state.hasDerivedBalustrade && state.view === "3d" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>3D gizmo</div>
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
            ) : null}

          </div>
        )}
      </Section>

      <div id="sidebar-inspector">
      <ConstraintInspector
        state={state}
        hoveredTarget={hoveredTarget}
        selectedTarget={selectedTarget}
        title=""
      />
      </div>

      {/* {state.mode === "balustrade" ? (
        <Section title="Post behaviour" description="How dragging affects spacing on the current segment.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Spacing behaviour</div>
              <Segmented
                value={state.constraintMode}
                options={[
                  { value: "single", label: "Move one" },
                  { value: "even", label: "Evenly" },
                ]}
                onChange={(v) => dispatch({ type: "SET_CONSTRAINT_MODE", mode: v as any })}
              />
            </div>

            {canShowGizmoTool ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Gizmo tool</div>
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
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Post = adjust Top Y + post height (from laser). Rail = adjust open-end toprail extensions.
                </div>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null} */}

      {state.hasDerivedBalustrade ? (
        <Section
        id="sidebar-selection"
        title="Selection"
        icon={MousePointer2}
        description={
          selectedCount === 0
            ? "Nothing selected. Click a post in the canvas."
            : selectedCount === 1
            ? "Single selection."
            : "Multiple selection."
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip label={`Selected: ${selectedCount}`} />
            {selectedPost?.segmentId ? <Chip label={`Segment: ${selectedPost.segmentId}`} /> : null}
          </div>

          {selectedPost ? (
            <div key={selectedPost.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 10,
                  background: "#F9FAFB",
                  fontSize: 11,
                  color: "#111827",
                }}
              >
                <div style={{ fontWeight: 600 }}>{selectedPost.id}</div>
                <div style={{ color: "#6B7280" }}>45×45 square post (prototype)</div>
              </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field
                    key={`${selectedPost.id}-x`}
                    label="X"
                    value={selectedPost.position.x}
                    onChange={(x) => dispatch({ type: "UPDATE_POST_POSITION", id: selectedPost.id, x })}
                    step={1}
                />
                <Field
                    key={`${selectedPost.id}-z`}
                    label="Z"
                    value={selectedPost.position.z}
                    onChange={(z) => dispatch({ type: "UPDATE_POST_POSITION", id: selectedPost.id, z })}
                    step={1}
                />

                <Field
                    key={`${selectedPost.id}-height`}
                    label="Height (from laser)"
                    value={selectedPost.height}
                    onChange={(height) => dispatch({ type: "UPDATE_POST_HEIGHT_PARAM", id: selectedPost.id, height })}
                    step={1}
                    min={-100000}
                />

                <Field
                    key={`${selectedPost.id}-yBottom`}
                    label="Bottom Y (derived)"
                    value={selectedPost.position.yBottom}
                    disabled
                />
                <Field
                    key={`${selectedPost.id}-yTop`}
                    label="Top Y (derived)"
                    value={selectedPost.position.yTop}
                    disabled
                />
              <div />
            </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Field
                    key={`${selectedPost.id}-rotationY`}
                    label="Rotation Y (deg)"
                    value={selectedPost.rotationY}
                    onChange={(rotationY) => dispatch({ type: "UPDATE_POST_ROTATION", id: selectedPost.id, rotationY })}
                    step={0.1}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={styles.btn}
                    style={{ flex: 1, padding: "10px 12px" }}
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_POST_ROTATION",
                        id: selectedPost.id,
                        rotationY: selectedPost.rotationY - 2.5,
                      })
                    }
                  >
                    -2.5°
                  </button>
                  <button
                    className={styles.btn}
                    style={{ flex: 1, padding: "10px 12px" }}
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_POST_ROTATION",
                        id: selectedPost.id,
                        rotationY: selectedPost.rotationY + 2.5,
                      })
                    }
                  >
                    +2.5°
                  </button>
                </div>
              </div>

              {selectedSegmentConstraints ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 10,
                      padding: 10,
                      background: "#F9FAFB",
                      fontSize: 11,
                      color: "#111827",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Segment bay defaults</div>
                    <div style={{ color: "#6B7280" }}>
                      Editing the selected post’s segment defaults.
                    </div>
                  </div>

                    <Field
                        key={`${selectedPost.id}-${selectedPost.segmentId}-panelHeight`}
                        label="Panel / bay height"
                        value={selectedSegmentConstraints.panelHeight}
                        onChange={(value) =>
                            dispatch({
                            type: "SET_SEGMENT_PANEL_HEIGHT",
                            segmentId: selectedPost.segmentId,
                            value,
                            })
                        }
                        step={1}
                        min={1}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Start boundary bay ref mode</div>
                      <Select
                        key={`${selectedPost.id}-${selectedPost.segmentId}-boundaryStartBayRefMode`}
                        value={selectedSegmentConstraints.boundaryStartBayRefMode}
                        onValueChange={(v) =>
                          dispatch({
                            type: "SET_SEGMENT_BOUNDARY_START_BAY_REF_MODE",
                            segmentId: selectedPost.segmentId,
                            value: v as BoundaryBayRefMode,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="segment">Segment</SelectItem>
                          <SelectItem value="linked">Linked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>End boundary bay ref mode</div>
                      <Select
                        key={`${selectedPost.id}-${selectedPost.segmentId}-boundaryEndBayRefMode`}
                        value={selectedSegmentConstraints.boundaryEndBayRefMode}
                        onValueChange={(v) =>
                          dispatch({
                            type: "SET_SEGMENT_BOUNDARY_END_BAY_REF_MODE",
                            segmentId: selectedPost.segmentId,
                            value: v as BoundaryBayRefMode,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="segment">Segment</SelectItem>
                          <SelectItem value="linked">Linked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  <div style={{ fontSize: 11, color: "#6B7280" }}>
                    y_ref = segment topY - panel / bay height. Boundary mode affects first/last bay on this segment only.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {selectedCount > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <TogglePill
                label="Exclude from height calc"
                on={allSelectedExcluded}
                onClick={() =>
                  dispatch({
                    type: "TOGGLE_AUTO_TOP_EXCLUDE_POSTS",
                    ids: state.selectedPostIds,
                  })
                }
              />
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                Excluded posts don’t influence Auto Top’s minimum height. FFL still applies.
              </div>
            </div>
          ) : null}

          {selectedCount > 0 ? (
            <button
              className={styles.btn}
              style={{ padding: "10px 12px" }}
              onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
            >
              Clear selection
            </button>
          ) : null}
        </div>
        </Section>
      ) : null}

        {/* {state.mode === "balustrade" ? (
        <Section title="Tools" description="Baluster tools (armed actions).">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ToolButton
              label={state.postsTool === "add_mid_post" ? "Add post (armed)" : "Add post"}
              active={state.postsTool === "add_mid_post"}
              onClick={() =>
                dispatch({
                  type: "SET_POSTS_TOOL",
                  tool: state.postsTool === "add_mid_post" ? null : "add_mid_post",
                })
              }
            />

            <div style={{ fontSize: 12, color: "#6B7280" }}>
              When armed: hover to highlight a segment, click to place a post between the two neighbouring posts on that segment.
            </div>

            <ToolButton
                label={state.postsTool === "add_posts_to_spacing" ? "Add posts to spacing (armed)" : "Add posts to spacing"}
                active={state.postsTool === "add_posts_to_spacing"}
                onClick={() =>
                    dispatch({
                    type: "SET_POSTS_TOOL",
                    tool: state.postsTool === "add_posts_to_spacing" ? null : "add_posts_to_spacing",
                    })
                }
                />

                <div style={{ fontSize: 12, color: "#6B7280" }}>
                When armed: click a segment to insert the minimum number of equally spaced posts between the two neighbouring posts so
                every gap is ≤ Max post spacing (always inserts at least 1).
            </div>

            <ToolButton
              label={state.postsTool === "delete_post" ? "Delete post (armed)" : "Delete post"}
              active={state.postsTool === "delete_post"}
              onClick={() =>
                dispatch({
                  type: "SET_POSTS_TOOL",
                  tool: state.postsTool === "delete_post" ? null : "delete_post",
                })
              }
            />

            <div style={{ fontSize: 12, color: "#6B7280" }}>
              Delete tool: if a post is already selected, you’ll be asked to confirm immediately. Otherwise click a post to pick it. Click empty canvas to un-arm.
            </div>
          </div>
        </Section>
      ) : null} */}

      </div>
      </ScrollArea>
      </div>
    </aside>
    </div>
    </div>
    </TooltipProvider>
  )
}