//components/FloorVertexSelectionCard.tsx
"use client"

import { RootState } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import { validateDeleteFloorVertex } from "@/lib/math"
import styles from "./EditorShell.module.css"
import NumericInput from "./NumericInput"

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function norm(x: number, y: number) {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

function dot(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by
}

function clamp01(n: number) {
  return clamp(n, -1, 1)
}

function angleDegBetween(ax: number, ay: number, bx: number, by: number) {
  const a = norm(ax, ay)
  const b = norm(bx, by)
  const d = clamp01(dot(a.x, a.y, b.x, b.y))
  return (Math.acos(d) * 180) / Math.PI
}

function signedAngleDegBetween(ax: number, ay: number, bx: number, by: number) {
  const a = norm(ax, ay)
  const b = norm(bx, by)
  const d = clamp01(dot(a.x, a.y, b.x, b.y))
  const c = a.x * b.y - a.y * b.x
  return -(Math.atan2(c, d) * 180) / Math.PI
}

function reclampSignedDeg180(a: number) {
  if (!Number.isFinite(a)) return a
  let v = a
  while (v <= -180) v += 360
  while (v > 180) v -= 360
  if (v === -180) v = 180
  return v
}

function normaliseDecimalDraft(raw: string): { ok: true; text: string; value: number } | { ok: false } {
  if (raw == null) return { ok: false }
  let s = String(raw).trim()
  if (!s) return { ok: false }

  s = s.replace(/,/g, ".")

  if (s === "+" || s === "-") s = `${s}0`

  if (s === ".") s = "0.0"
  if (s === "+.") s = "+0.0"
  if (s === "-.") s = "-0.0"

  if (s.startsWith(".")) s = `0${s}`
  if (s.startsWith("+.")) s = `+0${s.slice(1)}`
  if (s.startsWith("-.")) s = `-0${s.slice(1)}`

  if (s.endsWith(".")) s = `${s}0`

  const okForm = /^[-+]?\d+(\.\d+)?$/.test(s)
  if (!okForm) return { ok: false }

  const n = Number(s)
  if (!Number.isFinite(n)) return { ok: false }

  return { ok: true, text: s, value: n }
}

function validateDeleteFloorVertexLocal(
  floor: RootState["foundation"]["floor"],
  vertexIndex: number
) {
  return !!validateDeleteFloorVertex(
    floor.vertices,
    floor.closed,
    vertexIndex,
    floor.edges,
    floor.corners
  )
}

function getCornerData(
  floor: RootState["foundation"]["floor"],
  vertexIndex: number
) {
  const v = floor.vertices
  const n = v.length
  if (n < 3) return null
  if (vertexIndex < 0 || vertexIndex >= n) return null

  if (!floor.closed && (vertexIndex === 0 || vertexIndex === n - 1)) return null

  const prev = v[(vertexIndex - 1 + n) % n]
  const curr = v[vertexIndex]
  const next = v[(vertexIndex + 1) % n]

  const d1 = norm(prev.x - curr.x, prev.z - curr.z)
  const d2 = norm(next.x - curr.x, next.z - curr.z)

  const angleAbs = angleDegBetween(d1.x, d1.y, d2.x, d2.y)
  const angleSigned = signedAngleDegBetween(d1.x, d1.y, d2.x, d2.y)

  if (!Number.isFinite(angleAbs) || angleAbs < 0.5) return null

  return {
    prev,
    curr,
    next,
    d1,
    d2,
    angleAbs,
    angleSigned,
  }
}

function cornerSupportsOwnershipToggle(
  floor: RootState["foundation"]["floor"],
  vertexIndex: number
) {
  const n = floor.vertices.length
  if (n < 3) return false

  const edgeCount = floor.closed ? n : Math.max(0, n - 1)
  if (edgeCount <= 0) return false

  const leftEdgeIndex = floor.closed ? ((vertexIndex - 1 + edgeCount) % edgeCount) : vertexIndex - 1
  const rightEdgeIndex = vertexIndex

  if (leftEdgeIndex < 0 || leftEdgeIndex >= edgeCount) return false
  if (rightEdgeIndex < 0 || rightEdgeIndex >= edgeCount) return false

  const leftRefType = floor.edges?.[leftEdgeIndex]?.refType ?? "include"
  const rightRefType = floor.edges?.[rightEdgeIndex]?.refType ?? "include"

  return leftRefType === "include" && rightRefType === "include"
}

export default function FloorVertexSelectionCard({
  state,
  dispatch,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
}) {
  const floor = state.foundation.floor
  const vertexIndex = state.selectedFloorVertexIndex

  if (vertexIndex == null) return null
  if (!floor?.vertices?.length) return null
  if (vertexIndex < 0 || vertexIndex >= floor.vertices.length) return null

  const vertex = floor.vertices[vertexIndex]
  const corner = getCornerData(floor, vertexIndex)
  const canDelete = validateDeleteFloorVertexLocal(floor, vertexIndex)

  const lockedAngle =
    corner && typeof floor.corners?.[vertexIndex]?.lockedAngle === "number" && Number.isFinite(floor.corners?.[vertexIndex]?.lockedAngle)
      ? Number(floor.corners?.[vertexIndex]?.lockedAngle)
      : null

  const vertexLaserHeight =
    typeof floor.corners?.[vertexIndex]?.laserHeight === "number" && Number.isFinite(floor.corners?.[vertexIndex]?.laserHeight)
      ? Number(floor.corners?.[vertexIndex]?.laserHeight)
      : 0

  const cornerPostHost =
    (floor.corners?.[vertexIndex] as any)?.cornerPostHost === "right"
      ? "right"
      : "left"

  const showOwnershipToggle = corner ? cornerSupportsOwnershipToggle(floor, vertexIndex) : false

  const displayAngle =
    corner && lockedAngle != null
      ? String(lockedAngle)
      : corner
        ? String(Math.round(corner.angleSigned * 10) / 10)
        : ""

  return (
    <div className={styles.floatingCard} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className={styles.metaText} style={{ minWidth: 140 }}>
        Vertex {vertexIndex}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        X: {Math.round(vertex.x * 10) / 10}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        Z: {Math.round(vertex.z * 10) / 10}
      </div>

      <label className={styles.label}>Laser height</label>
      <NumericInput
        key={`floor-vertex-${vertexIndex}-laser-height`}
        className={styles.input}
        value={vertexLaserHeight}
        min={-100000}
        max={100000}
        step={1}
        updateMode="commit"
        onCommit={(next) => {
          if (!Number.isFinite(next)) return
          dispatch({
            type: "SET_FLOOR_VERTEX_LASER_HEIGHT",
            vertexIndex,
            laserHeight: next,
          })
        }}
      />

      {corner ? (
        <>
          <label className={styles.label}>Angle (deg)</label>
          <NumericInput
            key={`floor-vertex-${vertexIndex}-angle`}
            className={styles.input}
            value={Number(displayAngle)}
            min={-180}
            max={180}
            step={0.1}
            updateMode="commit"
            onCommit={(next) => {
              const normed = normaliseDecimalDraft(String(next))
              if (!normed.ok) return
              const value = reclampSignedDeg180(normed.value)
              dispatch({
                type: "SET_FLOOR_CORNER_ANGLE",
                cornerIndex: vertexIndex,
                angle: value,
              })
            }}
          />

          <button
            className={styles.btn}
            onClick={() => {
              const isLocked = typeof lockedAngle === "number" && Number.isFinite(lockedAngle)
              dispatch({
                type: "SET_FLOOR_CORNER_LOCKED_ANGLE",
                cornerIndex: vertexIndex,
                lockedAngle: isLocked ? null : Math.round(corner.angleSigned * 10) / 10,
              })
            }}
          >
            {lockedAngle != null ? "Unlock angle" : "Lock angle"}
          </button>
        </>
      ) : null}

      {showOwnershipToggle ? (
        <>
          <div className={styles.metaText} style={{ minWidth: 220, opacity: 0.8 }}>
            Corner post host
          </div>

          <button
            className={styles.btn}
            style={{
              background: cornerPostHost === "left" ? "#111827" : "#FFFFFF",
              color: cornerPostHost === "left" ? "#FFFFFF" : "#111827",
            }}
            onClick={() =>
              dispatch({
                type: "SET_FLOOR_CORNER_POST_HOST",
                cornerIndex: vertexIndex,
                value: "left",
              })
            }
          >
            Left edge (i)
          </button>

          <button
            className={styles.btn}
            style={{
              background: cornerPostHost === "right" ? "#111827" : "#FFFFFF",
              color: cornerPostHost === "right" ? "#FFFFFF" : "#111827",
            }}
            onClick={() =>
              dispatch({
                type: "SET_FLOOR_CORNER_POST_HOST",
                cornerIndex: vertexIndex,
                value: "right",
              })
            }
          >
            Right edge (i+1)
          </button>
        </>
      ) : null}

      <button
        className={styles.btn}
        disabled={!canDelete}
        onClick={() => {
          if (!canDelete) return
          dispatch({ type: "DELETE_FLOOR_VERTEX", index: vertexIndex })
          dispatch({ type: "SELECT_FLOOR_VERTEX", index: null })
        }}
      >
        Delete vertex
      </button>
    </div>
  )
}