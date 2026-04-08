// /components/LaserHeightListCard.tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import { RootState } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import styles from "./EditorShell.module.css"
import NumericInput from "./NumericInput"

type OrderedPostItem = {
  id: string
  label: number
  height: number
}

function deriveOrderedPosts(state: RootState): OrderedPostItem[] {
  const runs = state.balcony.balustradePaths?.length
    ? state.balcony.balustradePaths
    : [state.balcony.balustradePath]

  const segmentOrder = new Map<string, number>()
  let order = 0

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!Array.isArray(runPath) || runPath.length < 2) continue

    const prefix = runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`
    for (let segInRun = 0; segInRun < runPath.length - 1; segInRun++) {
      segmentOrder.set(`${prefix}-seg-${segInRun}`, order++)
    }
  }

  const getSegOrder = (segmentId: string) => {
    return segmentOrder.get(segmentId) ?? Number.MAX_SAFE_INTEGER
  }

  const getTOnSegment = (post: RootState["posts"][number]) => {
    const segId = post.segmentId
    const segOrder = getSegOrder(segId)

    const runsLocal = state.balcony.balustradePaths?.length
      ? state.balcony.balustradePaths
      : [state.balcony.balustradePath]

    let start = null as null | { x: number; z: number }
    let end = null as null | { x: number; z: number }

    for (let runIndex = 0; runIndex < runsLocal.length; runIndex++) {
      const runPath = runsLocal[runIndex]
      if (!Array.isArray(runPath) || runPath.length < 2) continue

      const prefix = runIndex === 0 ? state.balcony.id : `${state.balcony.id}-run-${runIndex}`
      for (let segInRun = 0; segInRun < runPath.length - 1; segInRun++) {
        const id = `${prefix}-seg-${segInRun}`
        if (id !== segId) continue
        start = runPath[segInRun]
        end = runPath[segInRun + 1]
        break
      }

      if (start && end) break
    }

    if (!start || !end) {
      return { segOrder, t: 0 }
    }

    const dx = end.x - start.x
    const dz = end.z - start.z
    const len = Math.hypot(dx, dz) || 1
    const ux = dx / len
    const uz = dz / len
    const t = (post.position.x - start.x) * ux + (post.position.z - start.z) * uz

    return { segOrder, t }
  }

  return [...state.posts]
    .sort((a, b) => {
      const pa = getTOnSegment(a)
      const pb = getTOnSegment(b)

      if (pa.segOrder !== pb.segOrder) return pa.segOrder - pb.segOrder
      if (Math.abs(pa.t - pb.t) > 1e-6) return pa.t - pb.t
      return a.id.localeCompare(b.id)
    })
    .map((post, index) => ({
      id: post.id,
      label: index + 1,
      height: post.height,
    }))
}

export default function LaserHeightListCard({
  state,
  dispatch,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
}) {
  const orderedPosts = useMemo(() => deriveOrderedPosts(state), [state])

  const activePostId =
    state.selectedPostIds.length === 1 ? state.selectedPostIds[0] : orderedPosts[0]?.id ?? null

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    const focusAndSelectInput = (postId: string) => {
    const el = inputRefs.current[postId]
    if (!el) return

    requestAnimationFrame(() => {
      el.focus()
      el.select()
      el.setSelectionRange(0, el.value.length)
    })
  }

  useEffect(() => {
    if (!state.laserHeightListEditMode) return
    if (!activePostId) return

    focusAndSelectInput(activePostId)
  }, [state.laserHeightListEditMode, activePostId])

  if (!state.laserHeightListEditMode) return null
  if (!orderedPosts.length) return null

  return (
    <div
      className={styles.floatingCard}
      style={{
        width: 320,
        maxHeight: 420,
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "90px minmax(0, 1fr)",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div className={styles.metaText} style={{ fontWeight: 700 }}>
        Post
      </div>
      <div className={styles.metaText} style={{ fontWeight: 700 }}>
        Laser height
      </div>

      {orderedPosts.map((item, index) => {
        const isActive = item.id === activePostId

        return (
          <div
            key={item.id}
            style={{
              display: "contents",
            }}
          >
            <div
              className={styles.metaText}
              style={{
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#111827" : "#4B5563",
              }}
            >
              Post {item.label}
            </div>

            <NumericInput
              inputRef={(el) => {
                inputRefs.current[item.id] = el
              }}
              className={styles.input}
              value={item.height}
              step={1}
              updateMode="commit"
              onFocus={() => {
                dispatch({ type: "SELECT_POST", id: item.id } as any)

                const el = inputRefs.current[item.id]
                if (!el) return

                requestAnimationFrame(() => {
                  el.select()
                  el.setSelectionRange(0, el.value.length)
                })
              }}
              onCommit={(height) => {
                dispatch({
                  type: "UPDATE_POST_HEIGHT_PARAM",
                  id: item.id,
                  height,
                } as any)
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return

                const nextIndex = index + 1
                const nextItem = orderedPosts[nextIndex] ?? null
                if (!nextItem) return

                dispatch({ type: "SELECT_POST", id: nextItem.id } as any)
                focusAndSelectInput(nextItem.id)
              }}
              style={{
                background: isActive ? "#EFF6FF" : "#FFFFFF",
                borderColor: isActive ? "#2563EB" : undefined,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}