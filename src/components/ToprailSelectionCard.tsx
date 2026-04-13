// /components/ToprailSelectionCard.tsx
"use client"

import { useMemo } from "react"
import { RootState, ToprailTerminationType } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import { buildToprailPieces } from "@/lib/toprail"
import { designIsFrameless } from "@/lib/jobDesignRules"
import styles from "./EditorShell.module.css"
import NumericInput from "./NumericInput"

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function getToprailEndExtensionLimits(
  isFramelessDesignActive: boolean,
  postWidth: number
) {
  const framelessGap = 10

  return {
    min: isFramelessDesignActive ? -framelessGap : postWidth / 2,
    max: 200,
  }
}

function getToprailTerminationTypeForRunEnd(params: {
  balcony: RootState["balcony"]
  runIndex: number
  end: "start" | "end"
}): ToprailTerminationType {
  const byRun = params.balcony.toprailTerminationTypesByRun?.[params.runIndex]
  const legacy = params.balcony.toprailTerminationTypes

  return byRun?.[params.end] ?? legacy?.[params.end] ?? "EC"
}

function getToprailEndExtensionForRunEnd(params: {
  balcony: RootState["balcony"]
  runIndex: number
  end: "start" | "end"
  min: number
  max: number
}) {
  const rawDefault =
    params.balcony.runBoundarySourceOffsetsByRun?.[params.runIndex]?.[params.end]

  const derivedDefault = Number.isFinite(rawDefault)
    ? Math.abs(Number(rawDefault))
    : params.min

  const ext =
    params.balcony.endExtensionsByRun?.[params.runIndex] ??
    params.balcony.endExtensions

  const raw = params.end === "start" ? ext?.start : ext?.end

  return typeof raw === "number" && Number.isFinite(raw)
    ? clamp(raw, params.min, params.max)
    : clamp(derivedDefault, params.min, params.max)
}

export default function ToprailSelectionCard({
  state,
  dispatch,
  runIndex,
  pieceIndex,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
  runIndex: number
  pieceIndex: number
}) {
  const isFramelessDesignActive = designIsFrameless(state.design)

  const runs =
    state.balcony.balustradePaths?.length
      ? state.balcony.balustradePaths
      : [state.balcony.balustradePath]

  const runPath = runs[runIndex]
  if (!runPath || runPath.length < 2) return null

  const runBalcony = {
    ...state.balcony,
    id: runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`,
    balustradePath: runPath,
  }

  const profile = useMemo(() => {
    if (isFramelessDesignActive) {
      return {
        width: 40,
        height: Number.isFinite(state.balcony.framelessToprailHeight)
          ? Number(state.balcony.framelessToprailHeight)
          : 21,
      }
    }

    switch (state.toprail) {
      case "Elite":
        return { width: 55, height: 31 }
      case "Slenderline":
        return { width: 68, height: 31 }
      case "Visage":
        return { width: 98, height: 29 }
      case "Oval":
        return { width: 80, height: 31 }
      case "Round":
        return { width: 60, height: 43 }
      case "25mm Square":
        return { width: 25, height: 21 }
      case "25mm Round":
        return { width: 25, height: 21 }
      case "38mm Round":
        return { width: 38, height: 36 }
      case "38mm Handrail":
        return { width: 38, height: 36 }
      case "42mm Round":
        return { width: 42, height: 31 }
      case "None":
        return { width: 0, height: 0 }
      default:
        return { width: 55, height: 31 }
    }
  }, [isFramelessDesignActive, state.toprail, state.balcony.framelessToprailHeight])

  const { min: endExtMin, max: endExtMax } = getToprailEndExtensionLimits(
    isFramelessDesignActive,
    45
  )

  const runEndExt =
    state.balcony.endExtensionsByRun?.[runIndex] ??
    state.balcony.endExtensions

  const pieces = buildToprailPieces({
    balcony: runBalcony as any,
    posts: state.posts,
    profile,
    rules: {
      stockLen: 5500,
      postWidth: 45,
      endExtMin,
      endExtMax,
      joinOffset: 45 / 2,
    },
    design: state.design,
    state,
    endExtensions: runEndExt,
  })

  const piece = pieces[pieceIndex]
  if (!piece) return null

  const hasStartTermination = pieceIndex === 0
  const hasEndTermination = pieceIndex === pieces.length - 1

  if (!hasStartTermination && !hasEndTermination) return null

  const startTerminationType = getToprailTerminationTypeForRunEnd({
    balcony: state.balcony,
    runIndex,
    end: "start",
  })

  const endTerminationType = getToprailTerminationTypeForRunEnd({
    balcony: state.balcony,
    runIndex,
    end: "end",
  })

  const startExtension = getToprailEndExtensionForRunEnd({
    balcony: state.balcony,
    runIndex,
    end: "start",
    min: endExtMin,
    max: endExtMax,
  })

  const endExtension = getToprailEndExtensionForRunEnd({
    balcony: state.balcony,
    runIndex,
    end: "end",
    min: endExtMin,
    max: endExtMax,
  })

  return (
    <div className={styles.floatingCard} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className={styles.metaText} style={{ minWidth: 180 }}>
        Toprail — Run {runIndex}, Piece {pieceIndex + 1}
      </div>

      <div className={styles.metaText} style={{ minWidth: 180, opacity: 0.8 }}>
        Length: {Math.round(piece.length * 10) / 10}
      </div>

      {hasStartTermination ? (
        <>
          <div className={styles.metaText} style={{ minWidth: 160, opacity: 0.8 }}>
            Start termination
          </div>

          <label className={styles.label}>Start overhang</label>
          <NumericInput
            key={`toprail-run-${runIndex}-piece-${pieceIndex}-start-overhang`}
            className={styles.input}
            value={startExtension}
            min={endExtMin}
            max={endExtMax}
            step={1}
            updateMode="commit"
            onCommit={(value) => {
              dispatch({
                type: "UPDATE_TOPRAIL_END_EXTENSION",
                runIndex,
                end: "start",
                value: clamp(value, endExtMin, endExtMax),
              })
            }}
          />

          <label className={styles.label}>Start type</label>
          <select
            suppressHydrationWarning
            className={styles.input}
            value={startTerminationType}
            onChange={(e) => {
              dispatch({
                type: "SET_TOPRAIL_TERMINATION_TYPE",
                runIndex,
                end: "start",
                value: e.target.value as ToprailTerminationType,
              })
            }}
          >
            <option value="EC">EC</option>
            <option value="WC">WC</option>
          </select>
        </>
      ) : null}

      {hasEndTermination ? (
        <>
          <div className={styles.metaText} style={{ minWidth: 160, opacity: 0.8 }}>
            End termination
          </div>

          <label className={styles.label}>End overhang</label>
          <NumericInput
            key={`toprail-run-${runIndex}-piece-${pieceIndex}-end-overhang`}
            className={styles.input}
            value={endExtension}
            min={endExtMin}
            max={endExtMax}
            step={1}
            updateMode="commit"
            onCommit={(value) => {
              dispatch({
                type: "UPDATE_TOPRAIL_END_EXTENSION",
                runIndex,
                end: "end",
                value: clamp(value, endExtMin, endExtMax),
              })
            }}
          />

          <label className={styles.label}>End type</label>
          <select
            suppressHydrationWarning
            className={styles.input}
            value={endTerminationType}
            onChange={(e) => {
              dispatch({
                type: "SET_TOPRAIL_TERMINATION_TYPE",
                runIndex,
                end: "end",
                value: e.target.value as ToprailTerminationType,
              })
            }}
          >
            <option value="EC">EC</option>
            <option value="WC">WC</option>
          </select>
        </>
      ) : null}

      <button
        className={styles.btn}
        onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
      >
        Clear
      </button>
    </div>
  )
}