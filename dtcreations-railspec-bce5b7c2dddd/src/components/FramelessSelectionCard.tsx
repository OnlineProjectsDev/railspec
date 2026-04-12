// /components/FramelessSelectionCard.tsx
"use client"

import { RootState, FramelessCornerType } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import { deriveFrameless } from "@/lib/frameless/deriveFrameless"
import { getSegmentJoinAvailability } from "@/lib/frameless/segmentJoinAvailability"

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
      <input
        suppressHydrationWarning
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isFinite(next)) return
          onChange(next)
        }}
        style={{
          width: "100%",
          height: 36,
          border: "1px solid #D1D5DB",
          borderRadius: 8,
          padding: "0 10px",
          fontSize: 13,
          color: "#111827",
          background: "#FFFFFF",
        }}
      />
    </label>
  )
}

function SelectInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: FramelessCornerType
  onChange: (value: FramelessCornerType) => void
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
      <select
        suppressHydrationWarning
        value={value}
        onChange={(e) => onChange(e.target.value as FramelessCornerType)}
        style={{
          width: "100%",
          height: 36,
          border: "1px solid #D1D5DB",
          borderRadius: 8,
          padding: "0 10px",
          fontSize: 13,
          color: "#111827",
          background: "#FFFFFF",
        }}
      >
        <option value="symmetric">Symmetric</option>
        <option value="this_segment_dominant">This segment dominant</option>
        <option value="other_segment_dominant">Other segment dominant</option>
      </select>
    </label>
  )
}

export default function FramelessSelectionCard({
  state,
  dispatch,
  panelId,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
  panelId: string
}) {
  const frameless = deriveFrameless(state)

  const selectedPanel = frameless.panels.find((p) => p.id === panelId)
  if (!selectedPanel) return null

  const seg = state.balcony.segmentConstraintsById?.[selectedPanel.segmentId]
  if (!seg) return null

  const cornerStartType = seg.cornerStartType ?? "symmetric"
  const cornerEndType = seg.cornerEndType ?? "symmetric"
  const cornerStartGap = seg.cornerStartGap ?? 10
  const cornerEndGap = seg.cornerEndGap ?? 10

  const { hasStartJoin, hasEndJoin } = getSegmentJoinAvailability(
    state.balcony,
    selectedPanel.segmentId
  )

  return (
    <div
      style={{
        width: 320,
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        background: "#FFFFFF",
        boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Frameless corner settings</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>{selectedPanel.segmentId}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {hasStartJoin ? (
          <>
            <SelectInput
              label="Start corner type"
              value={cornerStartType}
              onChange={(value) => {
                dispatch({
                  type: "SET_FRAMELESS_CORNER_TYPE",
                  segmentId: selectedPanel.segmentId,
                  end: "start",
                  value,
                })
              }}
            />

            <NumberInput
              label="Start corner gap"
              value={cornerStartGap}
              min={0}
              step={1}
              onChange={(value) => {
                dispatch({
                  type: "SET_FRAMELESS_CORNER_GAP",
                  segmentId: selectedPanel.segmentId,
                  end: "start",
                  value,
                })
              }}
            />
          </>
        ) : (
          <div
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: "10px 12px",
              background: "#F9FAFB",
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Start boundary is open, so no start corner join settings apply.
          </div>
        )}

        {hasEndJoin ? (
          <>
            <SelectInput
              label="End corner type"
              value={cornerEndType}
              onChange={(value) => {
                dispatch({
                  type: "SET_FRAMELESS_CORNER_TYPE",
                  segmentId: selectedPanel.segmentId,
                  end: "end",
                  value,
                })
              }}
            />

            <NumberInput
              label="End corner gap"
              value={cornerEndGap}
              min={0}
              step={1}
              onChange={(value) => {
                dispatch({
                  type: "SET_FRAMELESS_CORNER_GAP",
                  segmentId: selectedPanel.segmentId,
                  end: "end",
                  value,
                })
              }}
            />
          </>
        ) : (
          <div
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: "10px 12px",
              background: "#F9FAFB",
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            End boundary is open, so no end corner join settings apply.
          </div>
        )}
      </div>
    </div>
  )
}