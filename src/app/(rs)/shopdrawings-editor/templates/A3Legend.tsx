// /app/(rs)/shopdrawings-editor/templates/A3Legend.tsx
import type { ShopDrawingLegendItem } from "../types"

type Props = {
  items: ShopDrawingLegendItem[]
}

const PAGE_WIDTH = 420
const OFFSET = 10
const TAB_OFFSET = (PAGE_WIDTH - 2 * OFFSET) / 5

export default function A3Legend({ items }: Props) {
  void items

  const width = PAGE_WIDTH
  const offset = OFFSET
  const tabOffset = TAB_OFFSET

  const legendLeft = width - (2 * tabOffset) / 3
  const legendRight = width - offset
  const dividerX = width - tabOffset / 2

  const localX = (globalX: number) => globalX - legendLeft
  const localY = (globalY: number) => globalY - offset

  const legendWidth = legendRight - legendLeft
  const legendHeight = offset * (7 * 0.6 + 1) - offset

  const rowTop = (row: number) => offset * (row * 0.6 + 1)
  const rowBottom = (row: number) => offset * ((row + 1) * 0.6 + 1)
  const rowCenter = (row: number) => (rowTop(row) + rowBottom(row)) / 2

  const swatchX = localX(legendLeft + 0.2 * offset)
  const swatchW = tabOffset / 6 - 0.4 * offset
  const swatchH = 0.4 * offset
  const swatchY = (row: number) => localY(rowCenter(row) - swatchH / 2)

  const textX = localX(dividerX + 0.3 * offset)

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${legendWidth} ${legendHeight}`}
      preserveAspectRatio="none"
    >
      <text
        x={localX((legendLeft + legendRight) / 2)}
        y={localY(rowCenter(0))}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fontWeight="bold"
        fill="black"
      >
        Legend
      </text>

      <rect
        x={swatchX}
        y={swatchY(1)}
        width={swatchW}
        height={swatchH}
        fill="white"
        stroke="black"
        strokeWidth={0.2}
      />
      <rect
        x={swatchX}
        y={swatchY(2)}
        width={swatchW}
        height={swatchH}
        fill="grey"
      />
      <rect
        x={swatchX}
        y={swatchY(3)}
        width={swatchW}
        height={swatchH}
        fill="lightgrey"
      />
      <rect
        x={swatchX}
        y={swatchY(4)}
        width={swatchW}
        height={swatchH}
        fill="grey"
      />
      <rect
        x={swatchX}
        y={swatchY(5)}
        width={swatchW}
        height={swatchH}
        fill="blue"
      />
      <rect
        x={swatchX}
        y={swatchY(6)}
        width={swatchW}
        height={swatchH}
        fill="cyan"
      />

      <text
        x={textX}
        y={localY(rowCenter(1))}
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fill="black"
      >
        WF or SF Post
      </text>
      <text
        x={textX}
        y={localY(rowCenter(2))}
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fill="black"
      >
        Baluster/Slat
      </text>
      <text
        x={textX}
        y={localY(rowCenter(3))}
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fill="black"
      >
        Top rail section
      </text>
      <text
        x={textX}
        y={localY(rowCenter(4))}
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fill="black"
      >
        Baseplate/Dressring
      </text>
      <text
        x={textX}
        y={localY(rowCenter(5))}
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fill="black"
      >
        Panel Label
      </text>
      <text
        x={textX}
        y={localY(rowCenter(6))}
        dominantBaseline="middle"
        fontSize={2.54}
        fontFamily="Arial"
        fill="black"
      >
        Glass Panel
      </text>
    </svg>
  )
}