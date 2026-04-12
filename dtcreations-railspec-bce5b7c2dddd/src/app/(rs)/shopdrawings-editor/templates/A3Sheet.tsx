// /app/(rs)/shopdrawings-editor/templates/A3Sheet.tsx
import type { ShopDrawingSheetData } from "../types"
import A3TitleBlock from "./A3TitleBlock"
import A3PlanViewport from "./A3PlanViewport"
import A3PostTable from "./A3PostTable"
import A3PanelTable from "./A3PanelTable"
import A3Legend from "./A3Legend"
import A3ModelViewport from "./A3ModelViewport"

type Props = {
  sheet: ShopDrawingSheetData
  revisionCode: string
  zoom?: number
  onView3dChange?: (view: NonNullable<ShopDrawingSheetData["view3d"]>) => void
}

const WIDTH = 420
const HEIGHT = 297
const OFFSET = 10
const LINE_H = 5.08

function mm(value: number) {
  return `${value}mm`
}

export default function A3Sheet({ sheet, revisionCode, zoom = 1, onView3dChange }: Props) {
  const width = WIDTH
  const height = HEIGHT
  const offset = OFFSET
  const lineH = LINE_H
  const tabOffset = (width - 2 * offset) / 5

  const legendLeft = width - (2 * tabOffset) / 3
  const legendTop = offset
  const legendWidth = width - offset - legendLeft
  const legendHeight = offset * (7 * 0.6 + 1) - offset

  const titleTop = height - 5 * offset

  const postTableLeft = offset + 3
  const postTableTop = titleTop - 45
  const postTableWidth = offset + tabOffset - postTableLeft
  const postTableHeight = titleTop - postTableTop - 5

  const panelTableLeft = width - 2 * tabOffset + 2
  const panelTableTop = titleTop - 45
  const panelTableWidth = width - offset - panelTableLeft
  const panelTableHeight = titleTop - panelTableTop - 5

  const viewportGap = 6
  const viewportLeft = offset + 6
  const viewportTop = offset + 6
  const viewportRight = width - offset - 6
  const viewportBottom = titleTop - 6
  const viewportWidth = viewportRight - viewportLeft
  const viewportHeight = viewportBottom - viewportTop

  const planWidth = (viewportWidth - viewportGap) * (2 / 3)
  const modelWidth = viewportWidth - viewportGap - planWidth

  const planLeft = viewportLeft
  const planTop = viewportTop
  const planRight = planLeft + planWidth
  const planBottom = viewportBottom

  const modelLeft = planRight + viewportGap
  const modelTop = viewportTop
  const modelHeight = viewportHeight

  const indexFontSize = 3.81
  const strokeWidth = 0.35

  const rowLabels = [
    { label: "A", y: (4.5 * height) / 5 },
    { label: "B", y: (3.5 * height) / 5 },
    { label: "C", y: (2.5 * height) / 5 },
    { label: "D", y: (1.5 * height) / 5 },
    { label: "E", y: (0.5 * height) / 5 },
  ]

  const colLabels = Array.from({ length: 6 }, (_, idx) => {
    const i = idx + 1
    return {
      label: String(7 - i),
      x: (-0.5 + i) * (width / 6),
    }
  })

  const scaledWidth = width * zoom
  const scaledHeight = height * zoom

  return (
    <div
      className="relative"
      style={{
        width: mm(scaledWidth),
        height: mm(scaledHeight),
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left bg-white overflow-hidden"
        style={{
          width: mm(width),
          height: mm(height),
          transform: `scale(${zoom})`,
        }}
      >
      <div
        className="absolute bg-white"
        style={{
          left: mm(planLeft),
          top: mm(planTop),
          width: mm(planRight - planLeft),
          height: mm(planBottom - planTop),
        }}
      >
        <A3PlanViewport data={sheet.plan} render2d={sheet.render2d} view2d={sheet.view2d} />
      </div>

      <div
        className="absolute bg-white"
        style={{
          left: mm(modelLeft),
          top: mm(modelTop),
          width: mm(modelWidth),
          height: mm(modelHeight),
        }}
      >
        <A3ModelViewport
          sheet={sheet}
          view3d={sheet.view3d}
          onView3dChange={onView3dChange}
        />
      </div>

      <div
        className="absolute bg-white"
        style={{
          left: mm(legendLeft),
          top: mm(legendTop),
          width: mm(legendWidth),
          height: mm(legendHeight),
        }}
      >
        <A3Legend items={sheet.legend} />
      </div>

      {/* <div
        className="absolute bg-white"
        style={{
          left: mm(postTableLeft),
          top: mm(postTableTop),
          width: mm(postTableWidth),
          height: mm(postTableHeight),
        }}
      >
        <A3PostTable rows={sheet.posts} />
      </div>

      <div
        className="absolute bg-white"
        style={{
          left: mm(panelTableLeft),
          top: mm(panelTableTop),
          width: mm(panelTableWidth),
          height: mm(panelTableHeight),
        }}
      >
        <A3PanelTable rows={sheet.panels} />
      </div> */}

      <div
        className="absolute"
        style={{
          left: mm(offset),
          top: mm(titleTop),
          width: mm(width - 2 * offset),
          height: mm(height - offset - titleTop),
        }}
      >
        <A3TitleBlock
          meta={sheet.meta}
          legend={sheet.legend}
          sheetDetails={sheet.sheetDetails}
          revisionCode={revisionCode}
        />
      </div>

      <svg
        className="absolute inset-0 pointer-events-none"
        width={mm(width)}
        height={mm(height)}
        viewBox={`0 0 ${width} ${height}`}
      >
        <line x1={offset} y1={offset} x2={width - offset} y2={offset} stroke="black" strokeWidth={strokeWidth} />
        <line x1={offset} y1={offset} x2={offset} y2={height - offset} stroke="black" strokeWidth={strokeWidth} />
        <line x1={offset} y1={height - offset} x2={width - offset} y2={height - offset} stroke="black" strokeWidth={strokeWidth} />
        <line x1={width - offset} y1={offset} x2={width - offset} y2={height - offset} stroke="black" strokeWidth={strokeWidth} />

        <line x1={offset} y1={height - 5 * offset} x2={width - offset} y2={height - 5 * offset} stroke="black" strokeWidth={strokeWidth} />

        {Array.from({ length: 4 }, (_, idx) => {
          const i = idx + 1
          return (
            <g key={`border-y-${i}`}>
              <line
                x1={offset + i * tabOffset}
                y1={height - 5 * offset}
                x2={offset + i * tabOffset}
                y2={height - offset}
                stroke="black"
                strokeWidth={strokeWidth}
              />
              <line
                x1={0}
                y1={(i * height) / 5}
                x2={offset}
                y2={(i * height) / 5}
                stroke="black"
                strokeWidth={strokeWidth}
              />
              <line
                x1={width - offset}
                y1={(i * height) / 5}
                x2={width}
                y2={(i * height) / 5}
                stroke="black"
                strokeWidth={strokeWidth}
              />
            </g>
          )
        })}

        {Array.from({ length: 5 }, (_, idx) => {
          const i = idx + 1
          return (
            <g key={`border-x-${i}`}>
              <line
                x1={(i * width) / 6}
                y1={height - offset}
                x2={(i * width) / 6}
                y2={height}
                stroke="black"
                strokeWidth={strokeWidth}
              />
              <line
                x1={(i * width) / 6}
                y1={0}
                x2={(i * width) / 6}
                y2={offset}
                stroke="black"
                strokeWidth={strokeWidth}
              />
            </g>
          )
        })}

        <line
          x1={offset + 1.5 * tabOffset}
          y1={height - 5 * offset}
          x2={offset + 1.5 * tabOffset}
          y2={height - offset}
          stroke="black"
          strokeWidth={strokeWidth}
        />
        <line
          x1={offset + 4.0 * tabOffset}
          y1={height - 2.75 * offset}
          x2={offset + 5 * tabOffset}
          y2={height - 2.75 * offset}
          stroke="black"
          strokeWidth={strokeWidth}
        />
        <line
          x1={offset + 4.0 * tabOffset}
          y1={height - 1.75 * offset}
          x2={offset + 5 * tabOffset}
          y2={height - 1.75 * offset}
          stroke="black"
          strokeWidth={strokeWidth}
        />
        <line
          x1={offset + 4.66 * tabOffset}
          y1={height - 2.75 * offset}
          x2={offset + 4.66 * tabOffset}
          y2={height - offset}
          stroke="black"
          strokeWidth={strokeWidth}
        />
        <line
          x1={offset + 4.2 * tabOffset}
          y1={height - 1.75 * offset}
          x2={offset + 4.2 * tabOffset}
          y2={height - offset}
          stroke="black"
          strokeWidth={strokeWidth}
        />

        {rowLabels.map((item) => (
          <g key={`row-${item.label}`}>
            <text
              x={offset * 0.5}
              y={item.y}
              textAnchor="middle"
              fontSize={indexFontSize}
              fontFamily="Arial"
              fill="black"
            >
              {item.label}
            </text>
            <text
              x={width - offset * 0.5}
              y={item.y}
              textAnchor="middle"
              fontSize={indexFontSize}
              fontFamily="Arial"
              fill="black"
            >
              {item.label}
            </text>
          </g>
        ))}

        {colLabels.map((item) => (
          <g key={`col-${item.label}`}>
            <text
              x={item.x}
              y={(offset + lineH) * 0.5}
              textAnchor="middle"
              fontSize={indexFontSize}
              fontFamily="Arial"
              fill="black"
            >
              {item.label}
            </text>
            <text
              x={item.x}
              y={height - (offset - lineH) * 0.5}
              textAnchor="middle"
              fontSize={indexFontSize}
              fontFamily="Arial"
              fill="black"
            >
              {item.label}
            </text>
          </g>
        ))}

        <line
          x1={legendLeft}
          y1={offset}
          x2={legendLeft}
          y2={offset * (7 * 0.6 + 1)}
          stroke="black"
          strokeWidth={strokeWidth}
        />
        <line
          x1={width - tabOffset / 2}
          y1={offset * (1 * 0.6 + 1)}
          x2={width - tabOffset / 2}
          y2={offset * (7 * 0.6 + 1)}
          stroke="black"
          strokeWidth={strokeWidth}
        />
        {Array.from({ length: 7 }, (_, idx) => {
          const i = idx + 1
          return (
            <line
              key={`legend-line-${i}`}
              x1={legendLeft}
              y1={offset * (i * 0.6 + 1)}
              x2={width - offset}
              y2={offset * (i * 0.6 + 1)}
              stroke="black"
              strokeWidth={strokeWidth}
            />
          )
        })}
      </svg>
      </div>
    </div>
  )
}