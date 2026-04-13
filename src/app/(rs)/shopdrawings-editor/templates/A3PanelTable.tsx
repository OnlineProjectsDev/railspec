// /app/(rs)/shopdrawings-editor/templates/A3PanelTable.tsx
import type { ShopDrawingPanelRow } from "../types"

type Props = {
  rows: ShopDrawingPanelRow[]
}

const PAGE_WIDTH = 420
const OFFSET = 10
const TAB_OFFSET = (PAGE_WIDTH - 2 * OFFSET) / 5
const ROW_H = 5.08
const STROKE_W = 0.2
const FONT_SIZE = 2.54

function getDescription(row: ShopDrawingPanelRow) {
  return `${row.width} x ${row.height}${row.details ? ` ${row.details}` : ""}`.trim()
}

export default function A3PanelTable({ rows }: Props) {
  const dataRowCount = rows.length
  const totalRows = dataRowCount + 2
  const tableWidth = TAB_OFFSET
  const tableHeight = totalRows * ROW_H

  const xPanel = 1.5 * OFFSET
  const xQty = 3 * OFFSET
  const xDesc = 4.5 * OFFSET

  const yCenter = (rowIndexFromTop: number) => rowIndexFromTop * ROW_H + ROW_H / 2

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${tableWidth} ${tableHeight}`}
      preserveAspectRatio="xMinYMin meet"
    >
      {/* Outer border */}
      <line x1={0} y1={0} x2={tableWidth} y2={0} stroke="black" strokeWidth={STROKE_W} />
      <line x1={0} y1={0} x2={0} y2={tableHeight} stroke="black" strokeWidth={STROKE_W} />
      <line x1={tableWidth} y1={0} x2={tableWidth} y2={tableHeight} stroke="black" strokeWidth={STROKE_W} />
      <line x1={0} y1={tableHeight} x2={tableWidth} y2={tableHeight} stroke="black" strokeWidth={STROKE_W} />

      {/* Horizontal row lines */}
      {Array.from({ length: totalRows - 1 }, (_, index) => (
        <line
          key={`h-${index}`}
          x1={0}
          y1={(index + 1) * ROW_H}
          x2={tableWidth}
          y2={(index + 1) * ROW_H}
          stroke="black"
          strokeWidth={STROKE_W}
        />
      ))}

      {/* Vertical divider lines begin below the title row */}
      <line
        x1={0.2 * TAB_OFFSET}
        y1={ROW_H}
        x2={0.2 * TAB_OFFSET}
        y2={tableHeight}
        stroke="black"
        strokeWidth={STROKE_W}
      />
      <line
        x1={0.4 * TAB_OFFSET}
        y1={ROW_H}
        x2={0.4 * TAB_OFFSET}
        y2={tableHeight}
        stroke="black"
        strokeWidth={STROKE_W}
      />

      {/* Title row */}
      <text
        x={0.5 * TAB_OFFSET}
        y={yCenter(0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fontWeight="bold"
        fill="black"
      >
        Panel details
      </text>

      {/* Header row */}
      <text
        x={xPanel}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        Panel #
      </text>
      <text
        x={xQty}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        Quantity
      </text>
      <text
        x={xDesc}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        Description
      </text>

      {/* Data rows */}
      {rows.map((row, index) => (
        <g key={`${row.panelLabel}::${index}`}>
          <text
            x={xPanel}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            {row.panelLabel}
          </text>
          <text
            x={xQty}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            1
          </text>
          <text
            x={xDesc}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            {getDescription(row)}
          </text>
        </g>
      ))}
    </svg>
  )
}