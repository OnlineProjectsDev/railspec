// /components/PostSelectionCard.tsx
"use client"

import { useMemo } from "react"
import { RootState, Post } from "@/lib/types"
import { Action } from "@/lib/reducer/actions"
import { deriveSegments } from "@/lib/segments"
import { derivePostDisplayNumbers, formatPostDisplayLabel } from "@/lib/balustrade/deriveBays"
import { getAnchorageOptionsForDesign } from "@/lib/jobDesignRules"
import styles from "./EditorShell.module.css"
import NumericInput from "./NumericInput"

type RefCandidate = {
  id: string
  label: string
  kind: "post" | "anchor" | "virtual-anchor"
  t: number
  x: number
  z: number
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function norm2(x: number, y: number) {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

function dot2(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by
}

function pointEquals2(a: { x: number; z: number }, b: { x: number; z: number }, eps = 1e-6) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= eps
}

function deriveAllBalconySegments(balcony: RootState["balcony"]) {
  const runs = balcony.balustradePaths?.length ? balcony.balustradePaths : [balcony.balustradePath]
  const out: ReturnType<typeof deriveSegments> = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!Array.isArray(runPath) || runPath.length < 2) continue

    const runBalcony = {
      ...balcony,
      id: runIndex === 0 ? balcony.id : `${balcony.id}-run-${runIndex}`,
      balustradePath: runPath,
    } as any

    out.push(...deriveSegments(runBalcony))
  }

  return out
}

function buildRailEndVirtualPointsByRun(state: RootState) {
  const runs = state.balcony.balustradePaths?.length ? state.balcony.balustradePaths : [state.balcony.balustradePath]
  const endExtMin = 45 / 2
  const endExtMax = 200

  return runs.map((path, runIndex) => {
    if (!path || path.length < 2) {
      return {
        runIndex,
        start: null as null | { x: number; z: number },
        end: null as null | { x: number; z: number },
        startExt: 0,
        endExt: 0,
      }
    }

    const ext = state.balcony.endExtensionsByRun?.[runIndex] ?? state.balcony.endExtensions
    const startExt = clamp(ext?.start ?? endExtMin, endExtMin, endExtMax)
    const endExt = clamp(ext?.end ?? endExtMin, endExtMin, endExtMax)

    const v0 = path[0]
    const v1 = path[1]
    const dStart = norm2(v1.x - v0.x, v1.z - v0.z)

    const vn = path[path.length - 1]
    const vp = path[path.length - 2]
    const dEnd = norm2(vn.x - vp.x, vn.z - vp.z)

    return {
      runIndex,
      startExt,
      endExt,
      start: { x: v0.x - dStart.x * startExt, z: v0.z - dStart.y * startExt },
      end: { x: vn.x + dEnd.x * endExt, z: vn.z + dEnd.y * endExt },
    }
  })
}

function findJoinableVertexForPost(state: RootState, post: Post): { runIndex: number; vertexIndex: number } | null {
  const runs = state.balcony.balustradePaths?.length ? state.balcony.balustradePaths : [state.balcony.balustradePath]

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const runPath = runs[runIndex]
    if (!runPath || runPath.length < 3) continue

    for (let vertexIndex = 1; vertexIndex < runPath.length - 1; vertexIndex++) {
      const prev = runPath[vertexIndex - 1]
      const curr = runPath[vertexIndex]
      const next = runPath[vertexIndex + 1]
      if (!prev || !curr || !next) continue

      if (!pointEquals2({ x: post.position.x, z: post.position.z }, { x: curr.x, z: curr.z })) {
        continue
      }

      const inDir = norm2(prev.x - curr.x, prev.z - curr.z)
      const outDir = norm2(next.x - curr.x, next.z - curr.z)
      const straightDot = dot2(inDir.x, inDir.y, outDir.x, outDir.y)

      if (Math.abs(straightDot + 1) <= 1e-6) {
        return { runIndex, vertexIndex }
      }
    }
  }

  return null
}

export default function PostSelectionCard({
  state,
  dispatch,
}: {
  state: RootState
  dispatch: React.Dispatch<Action>
}) {
  const selectedCount = state.selectedPostIds.length
  const selectedPost =
    selectedCount === 1 ? state.posts.find((p) => p.id === state.selectedPostIds[0]) ?? null : null

  const excludedSet = useMemo(() => new Set(state.balcony.autoTopExcludePostIds ?? []), [state.balcony.autoTopExcludePostIds])

  const postNumbersById = useMemo(
    () =>
      derivePostDisplayNumbers({
        balcony: state.balcony,
        posts: state.posts,
      }),
    [state.balcony, state.posts]
  )

  const postPositioning = useMemo(() => {
    if (!selectedPost) return null

    const seg = deriveAllBalconySegments(state.balcony).find((s) => s.id === selectedPost.segmentId)
    if (!seg) return null

    const runMatch = seg.id.match(/-run-(\d+)-seg-(\d+)$/)
    const baseMatch = !runMatch ? seg.id.match(/-seg-(\d+)$/) : null

    const runIndex = runMatch ? Number(runMatch[1]) : 0
    const segInRun = runMatch ? Number(runMatch[2]) : baseMatch ? Number(baseMatch[1]) : 0

    const runs = state.balcony.balustradePaths?.length ? state.balcony.balustradePaths : [state.balcony.balustradePath]
    const runPath = runs[runIndex] ?? []
    const segCountInRun = Math.max(0, runPath.length - 1)

    const sx = seg.start.x
    const sz = seg.start.z
    const dir = norm2(seg.end.x - seg.start.x, seg.end.z - seg.start.z)
    const n = { x: dir.y, z: -dir.x }

    const selectedT = dot2(selectedPost.position.x - sx, selectedPost.position.z - sz, dir.x, dir.y)
    const selectedPerp = dot2(selectedPost.position.x - sx, selectedPost.position.z - sz, n.x, n.z)

    const virtuals = buildRailEndVirtualPointsByRun(state)
    const runVirtual = virtuals[runIndex]

    const candidates: RefCandidate[] = []

    if (segInRun === 0 && runVirtual?.start) {
      candidates.push({
        id: `__virt-start__r${runIndex}`,
        label: "Start anchor",
        kind: "virtual-anchor",
        t: -runVirtual.startExt,
        x: runVirtual.start.x,
        z: runVirtual.start.z,
      })
    } else {
      candidates.push({
        id: `${seg.id}::__start__`,
        label: "Segment start",
        kind: "anchor",
        t: 0,
        x: seg.start.x,
        z: seg.start.z,
      })
    }

    for (const post of state.posts) {
      if (post.segmentId !== seg.id) continue

      const postNumber = postNumbersById[post.id] ?? null

      candidates.push({
        id: post.id,
        label: formatPostDisplayLabel(postNumber),
        kind: "post",
        t: dot2(post.position.x - sx, post.position.z - sz, dir.x, dir.y),
        x: post.position.x,
        z: post.position.z,
      })
    }

    if (segInRun === segCountInRun - 1 && runVirtual?.end) {
      candidates.push({
        id: `__virt-end__r${runIndex}`,
        label: "End anchor",
        kind: "virtual-anchor",
        t: seg.length + runVirtual.endExt,
        x: runVirtual.end.x,
        z: runVirtual.end.z,
      })
    } else {
      candidates.push({
        id: `${seg.id}::__end__`,
        label: "Segment end",
        kind: "anchor",
        t: seg.length,
        x: seg.end.x,
        z: seg.end.z,
      })
    }

    candidates.sort((a, b) => {
      if (Math.abs(a.t - b.t) > 1e-6) return a.t - b.t
      return a.id.localeCompare(b.id)
    })

    const selectedIndex = candidates.findIndex((c) => c.id === selectedPost.id)
    if (selectedIndex === -1) return null

    const left = selectedIndex > 0 ? candidates[selectedIndex - 1] : null
    const right = selectedIndex < candidates.length - 1 ? candidates[selectedIndex + 1] : null

    if (!left || !right) return null

    const totalSpan = right.t - left.t
    if (!Number.isFinite(totalSpan) || totalSpan < 1e-6) return null

    return {
      seg,
      sx,
      sz,
      dir,
      n,
      selectedT,
      selectedPerp,
      left,
      right,
      leftDistance: selectedT - left.t,
      rightDistance: right.t - selectedT,
      totalSpan,
    }
  }, [selectedPost, state, postNumbersById])

  const selectedJoinableVertexRef = useMemo(() => {
    if (!selectedPost) return null
    return findJoinableVertexForPost(state, selectedPost)
  }, [selectedPost, state])

  const anchorageOptionsState = useMemo(() => {
    if (!selectedPost) return null

    const designOptionCurrentAnchorage =
      selectedPost.anchorage === "SFI" || selectedPost.anchorage === "SFO"
        ? "SF"
        : selectedPost.anchorage === "WF"
          ? state.anchorage === "SFI" || state.anchorage === "SFO" || state.anchorage === "WF"
            ? "SF"
            : state.anchorage
          : selectedPost.anchorage

    const base = getAnchorageOptionsForDesign(state.design, designOptionCurrentAnchorage)

    const options = base.options.filter((opt) => opt.id !== "WF" && opt.id !== "SFI" && opt.id !== "SFO")

    const hasSF = options.some((opt) => opt.id === "SF")

    options.push({
      id: "WF",
      label: "Wall Fixed",
    })

    const selectedValue =
      selectedPost.anchorage === "SFI" || selectedPost.anchorage === "SFO"
        ? "SF"
        : selectedPost.anchorage

    return {
      ...base,
      options,
      selectedValue,
      hasSF,
    }
  }, [state.design, state.anchorage, selectedPost])

  if (!selectedPost) return null

  const isExcluded = excludedSet.has(selectedPost.id)

  const canJoinSelectedPostAtVertex = !!selectedJoinableVertexRef

  const canSplitSelectedPost =
    !canJoinSelectedPostAtVertex &&
    !!postPositioning &&
    postPositioning.left.kind === "post" &&
    postPositioning.right.kind === "post" &&
    postPositioning.leftDistance > 1e-6 &&
    postPositioning.rightDistance > 1e-6

  const movePostAlongSegmentFromLeft = (nextLeftDistance: number) => {
    if (!postPositioning) return

    const clampedLeft = clamp(nextLeftDistance, 0, postPositioning.totalSpan)
    const newT = postPositioning.left.t + clampedLeft

    const x = postPositioning.sx + postPositioning.dir.x * newT + postPositioning.n.x * postPositioning.selectedPerp
    const z = postPositioning.sz + postPositioning.dir.y * newT + postPositioning.n.z * postPositioning.selectedPerp

    dispatch({ type: "UPDATE_POST_POSITION", id: selectedPost.id, x, z })
  }

  const movePostAlongSegmentFromRight = (nextRightDistance: number) => {
    if (!postPositioning) return

    const clampedRight = clamp(nextRightDistance, 0, postPositioning.totalSpan)
    const newT = postPositioning.right.t - clampedRight

    const x = postPositioning.sx + postPositioning.dir.x * newT + postPositioning.n.x * postPositioning.selectedPerp
    const z = postPositioning.sz + postPositioning.dir.y * newT + postPositioning.n.z * postPositioning.selectedPerp

    dispatch({ type: "UPDATE_POST_POSITION", id: selectedPost.id, x, z })
  }

  return (
    <div className={styles.floatingCard} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className={styles.metaText} style={{ minWidth: 120 }}>
        {formatPostDisplayLabel(postNumbersById[selectedPost.id] ?? null)}
      </div>

      {postPositioning ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className={styles.label}>Left ({postPositioning.left.label})</label>
            <NumericInput
              key={`${selectedPost.id}-toolbar-left-distance`}
              className={styles.input}
              value={Math.round(postPositioning.leftDistance * 10) / 10}
              min={0}
              max={Math.round(postPositioning.totalSpan * 10) / 10}
              step={1}
              updateMode="commit"
              onCommit={(value) => movePostAlongSegmentFromLeft(value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className={styles.label}>Right ({postPositioning.right.label})</label>
            <NumericInput
              key={`${selectedPost.id}-toolbar-right-distance`}
              className={styles.input}
              value={Math.round(postPositioning.rightDistance * 10) / 10}
              min={0}
              max={Math.round(postPositioning.totalSpan * 10) / 10}
              step={1}
              updateMode="commit"
              onCommit={(value) => movePostAlongSegmentFromRight(value)}
            />
          </div>
        </>
      ) : (
        <>
          <label className={styles.label}>X</label>
          <NumericInput
            key={`${selectedPost.id}-toolbar-x`}
            className={styles.input}
            value={selectedPost.position.x}
            step={1}
            updateMode="change"
            onChange={(x) => dispatch({ type: "UPDATE_POST_POSITION", id: selectedPost.id, x })}
          />

          <label className={styles.label}>Z</label>
          <NumericInput
            key={`${selectedPost.id}-toolbar-z`}
            className={styles.input}
            value={selectedPost.position.z}
            step={1}
            updateMode="change"
            onChange={(z) => dispatch({ type: "UPDATE_POST_POSITION", id: selectedPost.id, z })}
          />
        </>
      )}

      <label className={styles.label}>Height</label>
      <NumericInput
        key={`${selectedPost.id}-toolbar-height`}
        className={styles.input}
        value={selectedPost.height}
        step={1}
        min={-100000}
        updateMode="change"
        onChange={(height) => dispatch({ type: "UPDATE_POST_HEIGHT_PARAM", id: selectedPost.id, height })}
      />

      <label className={styles.label}>Rot Y</label>
      <NumericInput
        key={`${selectedPost.id}-toolbar-rot`}
        className={styles.input}
        value={selectedPost.rotationY}
        step={0.1}
        updateMode="change"
        onChange={(rotationY) => dispatch({ type: "UPDATE_POST_ROTATION", id: selectedPost.id, rotationY })}
      />

      {anchorageOptionsState ? (
        <>
          <label className={styles.label}>Anchorage</label>
          <select
            key={`${selectedPost.id}-toolbar-anchorage`}
            className={styles.input}
            value={anchorageOptionsState.selectedValue}
            onChange={(e) => {
              const nextValue = e.target.value

              dispatch({
                type: "SET_POST_ANCHORAGE",
                id: selectedPost.id,
                anchorage:
                  nextValue === "SF" && anchorageOptionsState.hasSF
                    ? selectedPost.anchorage === "SFO"
                      ? "SFO"
                      : "SFI"
                    : nextValue,
              })
            }}
          >
            {anchorageOptionsState.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            className={styles.btn}
            onClick={() =>
              dispatch({
                type: "RESET_POST_ANCHORAGE",
                id: selectedPost.id,
              })
            }
          >
            Reset anchorage
          </button>
        </>
      ) : null}

      <button
        className={styles.btn}
        onClick={() =>
          dispatch({
            type: "TOGGLE_AUTO_TOP_EXCLUDE_POSTS",
            ids: [selectedPost.id],
          })
        }
      >
        {isExcluded ? "Included in height calc" : "Exclude from height calc"}
      </button>

      <button
        className={styles.btn}
        disabled={!canJoinSelectedPostAtVertex && !canSplitSelectedPost}
        onClick={() => {
          if (canJoinSelectedPostAtVertex && selectedJoinableVertexRef) {
            dispatch({
              type: "JOIN_BALUSTRADE_AT_VERTEX",
              runIndex: selectedJoinableVertexRef.runIndex,
              vertexIndex: selectedJoinableVertexRef.vertexIndex,
            })
            return
          }

          if (!canSplitSelectedPost) return
          dispatch({ type: "SPLIT_BALUSTRADE_AT_POST", postId: selectedPost.id })
        }}
      >
        {canJoinSelectedPostAtVertex ? "Join balustrade at joint" : "Split balustrade at post"}
      </button>

      <button
        className={styles.btn}
        onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
      >
        Clear
      </button>
    </div>
  )
}