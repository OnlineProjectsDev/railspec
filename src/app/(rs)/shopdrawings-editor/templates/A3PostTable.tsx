// /app/(rs)/shopdrawings-editor/templates/A3PostTable.tsx
import type { ShopDrawingPostRow } from "../types"

type Props = {
  rows: ShopDrawingPostRow[]
}

const PAGE_WIDTH = 420
const OFFSET = 10
const TAB_OFFSET = (PAGE_WIDTH - 2 * OFFSET) / 5
const ROW_H = 5.08
const STROKE_W = 0.2
const FONT_SIZE = 2.54

function getTopHeader(rows: ShopDrawingPostRow[]) {
  return rows.some((row) => row.type === "WF") ? "Top to wall" : "Top to floor"
}

function getDetails(row: ShopDrawingPostRow) {
  return row.details?.trim() ? `${row.type} ${row.details}` : row.type
}

export default function A3PostTable({ rows }: Props) {
  const dataRowCount = rows.length
  const totalRows = dataRowCount + 2
  const tableWidth = TAB_OFFSET
  const tableHeight = totalRows * ROW_H

  const xPost = 1.5 * OFFSET
  const xDetails = 3 * OFFSET
  const xTop = 4.5 * OFFSET
  const xBottomGap = 6.5 * OFFSET

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
      <line
        x1={0.65 * TAB_OFFSET}
        y1={ROW_H}
        x2={0.65 * TAB_OFFSET}
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
        Laser level at 0mm,
      </text>

      {/* Header row */}
      <text
        x={xPost}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        Post#
      </text>
      <text
        x={xDetails}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        Details
      </text>
      <text
        x={xTop}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        {getTopHeader(rows)}
      </text>
      <text
        x={xBottomGap}
        y={yCenter(1)}
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        fontFamily="Arial"
        fill="black"
      >
        Bottom Gap
      </text>

      {/* Data rows */}
      {rows.map((row, index) => (
        <g key={`${row.postLabel}::${index}`}>
          <text
            x={xPost}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            {row.postLabel}
          </text>
          <text
            x={xDetails}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            {getDetails(row)}
          </text>
          <text
            x={xTop}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            {row.length}
          </text>
          <text
            x={xBottomGap}
            y={yCenter(index + 2)}
            dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="black"
          >
            —
          </text>
        </g>
      ))}
    </svg>
  )
}