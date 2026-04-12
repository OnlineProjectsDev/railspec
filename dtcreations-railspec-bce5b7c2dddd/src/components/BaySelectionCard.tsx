"use client"

import { RootState } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import { deriveBays, formatBayDisplayLabel, formatPostDisplayLabel } from "@/lib/balustrade/deriveBays"
import styles from "./EditorShell.module.css"
import NumericInput from "./NumericInput"

export default function BaySelectionCard({
  state,
  dispatch,
  bayId,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
  bayId: string
}) {
  const bays = deriveBays({
    balcony: state.balcony,
    posts: state.posts,
    design: state.design,
    toprailType: state.toprail
  })

  const bay = bays.find((b) => b.id === bayId) ?? null
  if (!bay) return null

  const segmentDefaults = state.balcony.segmentConstraintsById?.[bay.segmentId] ?? null
  if (!segmentDefaults) return null

  const bayOverride = state.balcony.bayOverridesById?.[bay.id] ?? null

  return (
    <div className={styles.floatingCard} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className={styles.metaText} style={{ minWidth: 220 }}>
        {bay.displayLabel ??
          formatBayDisplayLabel(
            bay.fromPostNumber ?? null,
            bay.toPostNumber ?? null
          )}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        Segment: {bay.segmentId}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        From: {bay.fromPostNumber != null ? formatPostDisplayLabel(bay.fromPostNumber) : "Boundary"}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        To: {bay.toPostNumber != null ? formatPostDisplayLabel(bay.toPostNumber) : "Boundary"}
      </div>

      <div className={styles.metaText} style={{ minWidth: 120, opacity: 0.8 }}>
        Run: {bay.runIndex}
      </div>

      <div className={styles.metaText} style={{ minWidth: 140, opacity: 0.8 }}>
        Length: {Math.round(bay.length * 10) / 10}
      </div>

      <label className={styles.label}>Panel height</label>
      <NumericInput
        key={`${bay.segmentId}-bay-panel-height`}
        className={styles.input}
        value={segmentDefaults.panelHeight}
        min={1}
        step={1}
        updateMode="commit"
        onCommit={(value) => {
          dispatch({
            type: "SET_SEGMENT_PANEL_HEIGHT",
            segmentId: bay.segmentId,
            value,
          })
        }}
      />

      <div className={styles.metaText} style={{ minWidth: 170, opacity: 0.8 }}>
        Y ref segment: {bay.yRefSegmentId}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        Bottom ref: {bay.bottomRefMode}
      </div>

      <div className={styles.metaText} style={{ minWidth: 220, opacity: 0.8 }}>
        Start boundary ref: {segmentDefaults.boundaryStartBayRefMode}
      </div>

      <div className={styles.metaText} style={{ minWidth: 220, opacity: 0.8 }}>
        End boundary ref: {segmentDefaults.boundaryEndBayRefMode}
      </div>

      <button
        className={styles.btn}
        onClick={() => dispatch({ type: "TOGGLE_BAY_SUPPRESSION", bayId: bay.id })}
      >
        {bay.suppressed ? "Unsuppress bay" : "Suppress bay"}
      </button>

      <button
        className={styles.btn}
        onClick={() =>
          dispatch({
            type: "SET_BAY_BOTTOM_REF_MODE",
            bayId: bay.id,
            value: bay.bottomRefMode === "linked" ? "segment" : "linked",
          })
        }
      >
        Set bottom ref: {bay.bottomRefMode === "linked" ? "segment" : "linked"}
      </button>
    </div>
  )
}