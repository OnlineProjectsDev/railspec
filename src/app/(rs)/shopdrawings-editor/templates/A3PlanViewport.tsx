// /app/(rs)/shopdrawings-editor/templates/A3PlanViewport.tsx
import type { ShopDrawingRender2DData, ShopDrawingSheetData } from "../types"

type Props = {
  data: ShopDrawingSheetData["plan"]
  render2d?: ShopDrawingRender2DData
  view2d?: ShopDrawingSheetData["view2d"]
}

function projectPoint(params: {
  x: number
  z: number
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  width: number
  height: number
  padding: number
}) {
  const spanX = Math.max(1, params.maxX - params.minX)
  const spanZ = Math.max(1, params.maxZ - params.minZ)

  const usableWidth = params.width - params.padding * 2
  const usableHeight = params.height - params.padding * 2

  const scale = Math.min(usableWidth / spanX, usableHeight / spanZ)

  const drawWidth = spanX * scale
  const drawHeight = spanZ * scale

  const offsetX = (params.width - drawWidth) / 2
  const offsetY = (params.height - drawHeight) / 2

  return {
    x: offsetX + (params.x - params.minX) * scale,
    y: offsetY + (params.z - params.minZ) * scale,
  }
}

function getRenderBounds(data: ShopDrawingSheetData["plan"], render2d?: ShopDrawingRender2DData) {
  if (render2d?.bounds) {
    return render2d.bounds
  }

  return {
    minX: data.minX,
    maxX: data.maxX,
    minZ: data.minZ,
    maxZ: data.maxZ,
  }
}

export default function A3PlanViewport({ data, render2d, view2d }: Props) {
  const width = 1000
  const height = 700
  const padding = view2d?.viewport?.padding ?? 120

  const bounds = getRenderBounds(data, render2d)

  const showBalustradePathReferenceLines =
    view2d?.overrides?.showBalustradePathReferenceLines ?? false

  const showSegmentLines =
    view2d?.overrides?.showSegmentLines ?? false

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">

      {render2d?.floor?.closed && render2d.floor.vertices.length ? (
        <polygon
          points={render2d.floor.vertices
            .map((vertex) => {
              const point = projectPoint({
                x: vertex.x,
                z: vertex.z,
                minX: bounds.minX,
                maxX: bounds.maxX,
                minZ: bounds.minZ,
                maxZ: bounds.maxZ,
                width,
                height,
                padding,
              })

              return `${point.x},${point.y}`
            })
            .join(" ")}
          fill="rgb(17 24 39 / 0.02)"
          stroke="rgb(17 24 39 / 0.18)"
          strokeWidth="1.5"
        />
      ) : null}

      {render2d?.floor && !render2d.floor.closed && render2d.floor.vertices.length ? (
        <polyline
          points={render2d.floor.vertices
            .map((vertex) => {
              const point = projectPoint({
                x: vertex.x,
                z: vertex.z,
                minX: bounds.minX,
                maxX: bounds.maxX,
                minZ: bounds.minZ,
                maxZ: bounds.maxZ,
                width,
                height,
                padding,
              })

              return `${point.x},${point.y}`
            })
            .join(" ")}
          fill="none"
          stroke="rgb(17 24 39 / 0.18)"
          strokeWidth="1.5"
        />
      ) : null}

      {showBalustradePathReferenceLines && render2d?.floor?.offsetEdges.map((edge) => {
        const start = projectPoint({
          x: edge.x1,
          z: edge.z1,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const end = projectPoint({
          x: edge.x2,
          z: edge.z2,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        return (
          <line
            key={edge.id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="rgb(17 24 39 / 0.30)"
            strokeWidth="1"
            strokeDasharray="8 6"
          />
        )
      })}

      {render2d?.floor?.thickEdges.map((edge) => {
        const start = projectPoint({
          x: edge.x1,
          z: edge.z1,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const end = projectPoint({
          x: edge.x2,
          z: edge.z2,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        return (
          <line
            key={edge.id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="rgb(17 24 39 / 0.22)"
            strokeWidth="3"
            strokeDasharray="14 10"
            strokeLinecap="round"
          />
        )
      })}

      {render2d?.baseplates.map((baseplate) => {
        const center = projectPoint({
          x: baseplate.center.x,
          z: baseplate.center.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const scaleX = (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX)
        const scaleZ = (height - padding * 2) / Math.max(1, bounds.maxZ - bounds.minZ)
        const scale = Math.min(scaleX, scaleZ)

        const drawWidth = baseplate.width * scale
        const drawDepth = baseplate.depth * scale

        return (
          <g key={baseplate.id} transform={`rotate(${baseplate.rotationY} ${center.x} ${center.y})`}>
            <rect
              x={center.x - drawDepth / 2}
              y={center.y - drawWidth / 2}
              width={drawDepth}
              height={drawWidth}
              fill="rgb(156 163 175 / 0.55)"
              stroke="rgb(75 85 99)"
              strokeWidth="1.25"
            />
          </g>
        )
      })}

      {render2d?.dressRings.map((dressRing) => {
        const center = projectPoint({
          x: dressRing.center.x,
          z: dressRing.center.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const scaleX = (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX)
        const scaleZ = (height - padding * 2) / Math.max(1, bounds.maxZ - bounds.minZ)
        const scale = Math.min(scaleX, scaleZ)

        const radius = (dressRing.diameter / 2) * scale

        return (
          <circle
            key={dressRing.id}
            cx={center.x}
            cy={center.y}
            r={radius}
            fill="rgb(156 163 175 / 0.55)"
            stroke="rgb(75 85 99)"
            strokeWidth="1.25"
          />
        )
      })}

      {(() => {
        const rails = render2d?.toprails ?? []

        const intersectLineWithPlane2D = (
          a: { x: number; z: number },
          b: { x: number; z: number },
          plane: { x: number; z: number; v_x: number; v_z: number } | null | undefined
        ) => {
          if (!plane) return a

          const abX = b.x - a.x
          const abZ = b.z - a.z
          const denom = plane.v_x * abX + plane.v_z * abZ

          if (Math.abs(denom) < 1e-9) return a

          const t =
            (plane.v_x * (plane.x - a.x) + plane.v_z * (plane.z - a.z)) / denom

          return {
            x: a.x + abX * t,
            z: a.z + abZ * t,
          }
        }

        const project2D = (point: { x: number; z: number }) =>
          projectPoint({
            x: point.x,
            z: point.z,
            minX: bounds.minX,
            maxX: bounds.maxX,
            minZ: bounds.minZ,
            maxZ: bounds.maxZ,
            width,
            height,
            padding,
          })

        const planeKey = (plane: { x: number; z: number; v_x: number; v_z: number }) => {
          const nx = plane.v_x
          const nz = plane.v_z
          const flip = nx < 0 || (Math.abs(nx) < 1e-9 && nz < 0) ? -1 : 1

          return [
            Math.round(plane.x * 1000) / 1000,
            Math.round(plane.z * 1000) / 1000,
            Math.round(nx * flip * 1000) / 1000,
            Math.round(nz * flip * 1000) / 1000,
          ].join("|")
        }

        const jointLines = new Map<string, { a: { x: number; z: number }; b: { x: number; z: number } }>()

        const railGroups = rails.map((rail) => {
          const dx = rail.end.x - rail.start.x
          const dz = rail.end.z - rail.start.z
          const len = Math.hypot(dx, dz)

          if (len < 1e-6) return null

          const dirX = dx / len
          const dirZ = dz / len
          const normalX = dirZ
          const normalZ = -dirX
          const halfW = rail.width / 2

          const rawOuterStart = {
            x: rail.start.x + normalX * halfW,
            z: rail.start.z + normalZ * halfW,
          }

          const rawOuterEnd = {
            x: rail.end.x + normalX * halfW,
            z: rail.end.z + normalZ * halfW,
          }

          const rawInnerEnd = {
            x: rail.end.x - normalX * halfW,
            z: rail.end.z - normalZ * halfW,
          }

          const rawInnerStart = {
            x: rail.start.x - normalX * halfW,
            z: rail.start.z - normalZ * halfW,
          }

          const p1 = intersectLineWithPlane2D(rawOuterStart, rawOuterEnd, rail.leftPlane)
          const p2 = intersectLineWithPlane2D(rawOuterEnd, rawOuterStart, rail.rightPlane)
          const p3 = intersectLineWithPlane2D(rawInnerEnd, rawInnerStart, rail.rightPlane)
          const p4 = intersectLineWithPlane2D(rawInnerStart, rawInnerEnd, rail.leftPlane)

          if (rail.leftPlane) {
            jointLines.set(planeKey(rail.leftPlane), {
              a: p1,
              b: p4,
            })
          }

          if (rail.rightPlane) {
            jointLines.set(planeKey(rail.rightPlane), {
              a: p2,
              b: p3,
            })
          }

          const pp1 = project2D(p1)
          const pp2 = project2D(p2)
          const pp3 = project2D(p3)
          const pp4 = project2D(p4)

          return (
            <g key={rail.id}>
              <line
                x1={pp1.x}
                y1={pp1.y}
                x2={pp2.x}
                y2={pp2.y}
                stroke="rgb(107 114 128)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <line
                x1={pp4.x}
                y1={pp4.y}
                x2={pp3.x}
                y2={pp3.y}
                stroke="rgb(107 114 128)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <line
                x1={pp1.x}
                y1={pp1.y}
                x2={pp4.x}
                y2={pp4.y}
                stroke="rgb(107 114 128)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <line
                x1={pp2.x}
                y1={pp2.y}
                x2={pp3.x}
                y2={pp3.y}
                stroke="rgb(107 114 128)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </g>
          )
        })

        const jointGroups = Array.from(jointLines.entries()).map(([key, line]) => {
          const a = project2D(line.a)
          const b = project2D(line.b)

          return (
            <line
              key={key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgb(107 114 128)"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          )
        })

        return (
          <>
            {railGroups}
            {jointGroups}
          </>
        )
      })()}

      {(render2d?.spigots ?? []).map((spigot) => {
        const center = projectPoint({
          x: spigot.center.x,
          z: spigot.center.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const scaleX = (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX)
        const scaleZ = (height - padding * 2) / Math.max(1, bounds.maxZ - bounds.minZ)
        const scale = Math.min(scaleX, scaleZ)

        return (
          <circle
            key={spigot.id}
            cx={center.x}
            cy={center.y}
            r={(spigot.width / 2) * scale}
            fill="rgb(229 231 235 / 0.8)"
            stroke="rgb(75 85 99)"
            strokeWidth="1.25"
          />
        )
      })}

      {render2d?.postBodies.map((postBody) => {
        const center = projectPoint({
          x: postBody.center.x,
          z: postBody.center.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const scaleX = (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX)
        const scaleZ = (height - padding * 2) / Math.max(1, bounds.maxZ - bounds.minZ)
        const scale = Math.min(scaleX, scaleZ)

        const drawWidth = postBody.width * scale
        const drawDepth = postBody.depth * scale

        return (
          <g key={postBody.id}>
            <g transform={`rotate(${postBody.rotationY} ${center.x} ${center.y})`}>
              <rect
                x={center.x - drawWidth / 2}
                y={center.y - drawDepth / 2}
                width={drawWidth}
                height={drawDepth}
                fill="rgb(31 41 55)"
                stroke="black"
                strokeWidth="1.5"
              />
            </g>

            <text x={center.x + 12} y={center.y - 10} fontSize="16" fill="black">
              {postBody.label}
            </text>
          </g>
        )
      })}

      {showSegmentLines && data.segments.map((segment) => {
        const start = projectPoint({
          x: segment.start.x,
          z: segment.start.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const end = projectPoint({
          x: segment.end.x,
          z: segment.end.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        return (
          <g key={segment.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="black"
              strokeWidth="2"
            />
          </g>
        )
      })}

      {render2d?.verticalInfills.map((infill) => {
        const center = projectPoint({
          x: infill.center.x,
          z: infill.center.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const scaleX = (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX)
        const scaleZ = (height - padding * 2) / Math.max(1, bounds.maxZ - bounds.minZ)
        const scale = Math.min(scaleX, scaleZ)

        const drawWidth = infill.width * scale
        const drawDepth = infill.depth * scale
        const drawRadius = 2.5 * scale

        return (
          <g key={infill.id} transform={`rotate(${infill.rotationY} ${center.x} ${center.y})`}>
            <rect
              x={center.x - drawWidth / 2}
              y={center.y - drawDepth / 2}
              width={drawWidth}
              height={drawDepth}
              rx={drawRadius}
              ry={drawRadius}
              fill="rgb(107 114 128)"
              stroke="rgb(75 85 99)"
              strokeWidth="1"
            />
          </g>
        )
      })}

      {render2d?.glassPanels.map((panel) => {
        const start =
          "start" in panel && panel.start && "end" in panel && panel.end
            ? panel.start
            : {
                x: panel.center.x - Math.cos(panel.rotationY * (Math.PI / 180)) * (panel.width / 2),
                z: panel.center.z - Math.sin(panel.rotationY * (Math.PI / 180)) * (panel.width / 2),
              }

        const end =
          "start" in panel && panel.start && "end" in panel && panel.end
            ? panel.end
            : {
                x: panel.center.x + Math.cos(panel.rotationY * (Math.PI / 180)) * (panel.width / 2),
                z: panel.center.z + Math.sin(panel.rotationY * (Math.PI / 180)) * (panel.width / 2),
              }

        const dx = end.x - start.x
        const dz = end.z - start.z
        const len = Math.hypot(dx, dz)

        if (len < 1e-6) return null

        const dirX = dx / len
        const dirZ = dz / len
        const normalX = dirZ
        const normalZ = -dirX

        const halfT = panel.thickness / 2

        const p1 = {
          x: start.x + normalX * halfT,
          z: start.z + normalZ * halfT,
        }

        const p2 = {
          x: end.x + normalX * halfT,
          z: end.z + normalZ * halfT,
        }

        const p3 = {
          x: end.x - normalX * halfT,
          z: end.z - normalZ * halfT,
        }

        const p4 = {
          x: start.x - normalX * halfT,
          z: start.z - normalZ * halfT,
        }

        const pp1 = projectPoint({
          x: p1.x,
          z: p1.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const pp2 = projectPoint({
          x: p2.x,
          z: p2.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const pp3 = projectPoint({
          x: p3.x,
          z: p3.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const pp4 = projectPoint({
          x: p4.x,
          z: p4.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        return (
          <polygon
            key={panel.id}
            points={`${pp1.x},${pp1.y} ${pp2.x},${pp2.y} ${pp3.x},${pp3.y} ${pp4.x},${pp4.y}`}
            fill="rgb(34 211 238 / 0.35)"
          />
        )
      })}

      {render2d?.dimensions.map((dimension) => {
        if (
          dimension.kind !== "segment" &&
          dimension.kind !== "bay" &&
          dimension.kind !== "angle"
        ) return null

        const worldDx = dimension.to.x - dimension.from.x
        const worldDz = dimension.to.z - dimension.from.z
        const worldLen = Math.hypot(worldDx, worldDz)

        if (worldLen < 1e-6) return null

        const dirX = worldDx / worldLen
        const dirZ = worldDz / worldLen

        const normalX = dirZ
        const normalZ = -dirX

        if (dimension.kind === "angle") {
          if (!dimension.vertex) return null

          const from = projectPoint({
            x: dimension.from.x,
            z: dimension.from.z,
            minX: bounds.minX,
            maxX: bounds.maxX,
            minZ: bounds.minZ,
            maxZ: bounds.maxZ,
            width,
            height,
            padding,
          })

          const to = projectPoint({
            x: dimension.to.x,
            z: dimension.to.z,
            minX: bounds.minX,
            maxX: bounds.maxX,
            minZ: bounds.minZ,
            maxZ: bounds.maxZ,
            width,
            height,
            padding,
          })

          const vertex = projectPoint({
            x: dimension.vertex.x,
            z: dimension.vertex.z,
            minX: bounds.minX,
            maxX: bounds.maxX,
            minZ: bounds.minZ,
            maxZ: bounds.maxZ,
            width,
            height,
            padding,
          })

          const fromDx = from.x - vertex.x
          const fromDy = from.y - vertex.y
          const toDx = to.x - vertex.x
          const toDy = to.y - vertex.y

          const fromLen = Math.hypot(fromDx, fromDy)
          const toLen = Math.hypot(toDx, toDy)

          if (fromLen < 1e-6 || toLen < 1e-6) return null

          const radius = Math.min(fromLen, toLen)

          let start = Math.atan2(fromDy, fromDx)
          let end = Math.atan2(toDy, toDx)
          let sweep = end - start

          while (sweep <= -Math.PI) sweep += Math.PI * 2
          while (sweep > Math.PI) sweep -= Math.PI * 2

          if (sweep < 0) {
            const temp = start
            start = end
            end = temp
            sweep = -sweep
          }

          const x1 = vertex.x + Math.cos(start) * radius
          const y1 = vertex.y + Math.sin(start) * radius
          const x2 = vertex.x + Math.cos(end) * radius
          const y2 = vertex.y + Math.sin(end) * radius

          const bisectorX = (fromDx / fromLen) + (toDx / toLen)
          const bisectorY = (fromDy / fromLen) + (toDy / toLen)
          const bisectorLen = Math.hypot(bisectorX, bisectorY)

          if (bisectorLen < 1e-6) return null

          const tx = vertex.x + (bisectorX / bisectorLen) * (radius + 26)
          const ty = vertex.y + (bisectorY / bisectorLen) * (radius + 26)

          return (
            <g key={dimension.id}>
              <path
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke="black"
                strokeWidth="1"
              />
              <text
                x={tx}
                y={ty}
                fontSize={13}
                fill="black"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {dimension.value}°
              </text>
            </g>
          )
        }

        const dimOffset = dimension.offset
        const witness = 160
        const tick = 60
        const textOffset = 70

        const fromOffsetWorld = {
          x: dimension.from.x + normalX * dimOffset,
          z: dimension.from.z + normalZ * dimOffset,
        }

        const toOffsetWorld = {
          x: dimension.to.x + normalX * dimOffset,
          z: dimension.to.z + normalZ * dimOffset,
        }

        const fromWitnessWorld = {
          x: dimension.from.x + normalX * (dimOffset - witness),
          z: dimension.from.z + normalZ * (dimOffset - witness),
        }

        const toWitnessWorld = {
          x: dimension.to.x + normalX * (dimOffset - witness),
          z: dimension.to.z + normalZ * (dimOffset - witness),
        }

        const tickDirX = -dirZ
        const tickDirZ = dirX

        const tickFromAWorld = {
          x: fromOffsetWorld.x - tickDirX * (tick / 2),
          z: fromOffsetWorld.z - tickDirZ * (tick / 2),
        }

        const tickFromBWorld = {
          x: fromOffsetWorld.x + tickDirX * (tick / 2),
          z: fromOffsetWorld.z + tickDirZ * (tick / 2),
        }

        const tickToAWorld = {
          x: toOffsetWorld.x - tickDirX * (tick / 2),
          z: toOffsetWorld.z - tickDirZ * (tick / 2),
        }

        const tickToBWorld = {
          x: toOffsetWorld.x + tickDirX * (tick / 2),
          z: toOffsetWorld.z + tickDirZ * (tick / 2),
        }

        const textWorld = {
          x: (fromOffsetWorld.x + toOffsetWorld.x) / 2 + normalX * textOffset,
          z: (fromOffsetWorld.z + toOffsetWorld.z) / 2 + normalZ * textOffset,
        }

        const from = projectPoint({
          x: dimension.from.x,
          z: dimension.from.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const to = projectPoint({
          x: dimension.to.x,
          z: dimension.to.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const fromOffset = projectPoint({
          x: fromOffsetWorld.x,
          z: fromOffsetWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const toOffset = projectPoint({
          x: toOffsetWorld.x,
          z: toOffsetWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const fromWitness = projectPoint({
          x: fromWitnessWorld.x,
          z: fromWitnessWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const toWitness = projectPoint({
          x: toWitnessWorld.x,
          z: toWitnessWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const tickFromA = projectPoint({
          x: tickFromAWorld.x,
          z: tickFromAWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const tickFromB = projectPoint({
          x: tickFromBWorld.x,
          z: tickFromBWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const tickToA = projectPoint({
          x: tickToAWorld.x,
          z: tickToAWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const tickToB = projectPoint({
          x: tickToBWorld.x,
          z: tickToBWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const textPoint = projectPoint({
          x: textWorld.x,
          z: textWorld.z,
          minX: bounds.minX,
          maxX: bounds.maxX,
          minZ: bounds.minZ,
          maxZ: bounds.maxZ,
          width,
          height,
          padding,
        })

        const angle = Math.atan2(dirZ, dirX) * (180 / Math.PI)
        const fontSize = dimension.kind === "segment" ? 14 : 12

        return (
          <g key={dimension.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={fromWitness.x}
              y2={fromWitness.y}
              stroke="black"
              strokeWidth="1"
            />
            <line
              x1={to.x}
              y1={to.y}
              x2={toWitness.x}
              y2={toWitness.y}
              stroke="black"
              strokeWidth="1"
            />
            <line
              x1={fromOffset.x}
              y1={fromOffset.y}
              x2={toOffset.x}
              y2={toOffset.y}
              stroke="black"
              strokeWidth="1"
            />
            <line
              x1={tickFromA.x}
              y1={tickFromA.y}
              x2={tickFromB.x}
              y2={tickFromB.y}
              stroke="black"
              strokeWidth="1"
            />
            <line
              x1={tickToA.x}
              y1={tickToA.y}
              x2={tickToB.x}
              y2={tickToB.y}
              stroke="black"
              strokeWidth="1"
            />
            <text
              x={textPoint.x}
              y={textPoint.y}
              fontSize={fontSize}
              fill="black"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${angle} ${textPoint.x} ${textPoint.y})`}
            >
              {dimension.value}
            </text>
          </g>
        )
      })}

    </svg>
  )
}
