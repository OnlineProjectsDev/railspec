// /app/(rs)/shopdrawings-editor/templates/A3TitleBlock.tsx
import type {
  ShopDrawingLegendItem,
  ShopDrawingSheetDetails,
  ShopDrawingSheetMeta,
} from "../types"
import Image from "next/image"

type Props = {
  meta: ShopDrawingSheetMeta
  legend?: ShopDrawingLegendItem[]
  sheetDetails?: ShopDrawingSheetDetails
  revisionCode: string
}

const PAGE_WIDTH = 420
const PAGE_HEIGHT = 297
const OFFSET = 10
const TAB_OFFSET = (PAGE_WIDTH - 2 * OFFSET) / 5
const TITLE_TOP = PAGE_HEIGHT - 5 * OFFSET
const LINE_H = 5.08

function getLegendValue(items: ShopDrawingLegendItem[] | undefined, label: string) {
  return items?.find((item) => item.label === label)?.value ?? ""
}

function getTodayString() {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function localX(globalX: number) {
  return globalX - OFFSET
}

function localY(globalY: number) {
  return globalY - TITLE_TOP
}

export default function A3TitleBlock({ meta, legend, sheetDetails, revisionCode }: Props) {
  const design = getLegendValue(legend, "Design")
  const colour = getLegendValue(legend, "Colour")
  const infill = getLegendValue(legend, "Infill")

  const clientName = meta.clientName || "-"
  const siteAddressLine = meta.siteAddressLine || "-"
  const cityLine = meta.cityLine || "-"
  const orderNo = `${meta.jobNumber} Stage ${meta.stageNumber}`
  const section = `${meta.drop}-${meta.balconyNo}`
  const dateString = getTodayString()
  const dwgNo = `RS-${meta.jobNumber}-${meta.stageNumber}`.toUpperCase().replaceAll("_", "-")
  const sheetRef = `${meta.drop}-${meta.balconyNo}`
  const title1 = sheetDetails?.title1 ?? "Title 1"
  const title2 = sheetDetails?.title2 ?? "Title 2"
  const title3 = sheetDetails?.title3 ?? "Title 3"

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${PAGE_WIDTH - 2 * OFFSET} ${4 * OFFSET}`}
      preserveAspectRatio="none"
    >
      <text x={localX(OFFSET * 1.3 + TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET)} fontSize={2.54} fontFamily="Arial" fill="black">Railsafe Balustrading</text>
      <text x={localX(OFFSET * 1.3 + TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">2/12 Apollo St</text>
      <text x={localX(OFFSET * 1.3 + TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 2 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Warriewood NSW 2102</text>
      <text x={localX(OFFSET * 1.3 + TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 3 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Phone +61 2 9905 8773</text>
      <text x={localX(OFFSET * 1.3 + TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Email sales@railsafe.com.au</text>
      <text x={localX(OFFSET * 1.3 + TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Website www.railsafe.com.au</text>

      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET)} fontSize={2.286} fontFamily="Calibri" fill="black">Proprietry Confidential</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H)} fontSize={2.286} fontFamily="Calibri" fill="black">This drawing remains the sole</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 1 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">property of the Wallan Group Pty Ltd.</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 2 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">It must not be reproduced in part or in</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 3 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">whole without written consent from</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 4 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">the Directors. Wallan Group Pty Ltd</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 5 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">reserves the right to amend drawings </text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 6 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">in interests of continuous</text>
      <text x={localX(OFFSET * 1.3 + 1.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H + 7 * 2.54)} fontSize={2.286} fontFamily="Calibri" fill="black">improvement.</text>

      {/* Logo (exact placement from reference) */}
      <image
        href="/images/logos/Railsafe-Secondary-Balustrading-Black.png"
        x={localX(OFFSET * 1.5)}
        y={localY(PAGE_HEIGHT - 4 * OFFSET)}
        width={TAB_OFFSET * 1.1}
        height={OFFSET * 2.2}
        preserveAspectRatio="xMinYMid meet"
      />

      <text x={localX(OFFSET * 1.3 + 2 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET)} fontSize={2.54} fontFamily="Arial" fill="black">Client</text>
      <text x={localX(OFFSET * 3 + 2 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET)} fontSize={2.54} fontFamily="Arial" fill="black">{clientName}</text>

      <text x={localX(OFFSET * 1.3 + 2 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Address</text>
      <text x={localX(OFFSET * 3 + 2 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{siteAddressLine}</text>
      <text x={localX(OFFSET * 3 + 2 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 2 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{cityLine}</text>

      <text x={localX(OFFSET * 1.3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET)} fontSize={2.54} fontFamily="Arial" fill="black">Order#</text>
      <text x={localX(OFFSET * 3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET)} fontSize={2.54} fontFamily="Arial" fill="black">{orderNo}</text>

      <text x={localX(OFFSET * 1.3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Section</text>
      <text x={localX(OFFSET * 3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 1 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{section}</text>

      <text x={localX(OFFSET * 1.3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 2 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Design</text>
      <text x={localX(OFFSET * 3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 2 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{design}</text>

      <text x={localX(OFFSET * 1.3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 3 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Colour</text>
      <text x={localX(OFFSET * 3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 3 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{colour}</text>

      <text x={localX(OFFSET * 1.3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Infill</text>
      <text x={localX(OFFSET * 3 + 3 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{infill}</text>

      <text x={localX(OFFSET * 1.3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.4 * OFFSET)} fontSize={2.54} fontFamily="Arial" fill="black">Title</text>

      <text x={localX(OFFSET * 3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.4 * OFFSET + 0 * 6.35)} fontSize={3.81} fontFamily="Arial" fill="black">{title1}</text>
      <text x={localX(OFFSET * 3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.4 * OFFSET + 1 * 6.35)} fontSize={3.81} fontFamily="Arial" fill="black">{title2}</text>
      <text x={localX(OFFSET * 3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 2 * 6.35)} fontSize={3.81} fontFamily="Arial" fill="black">{title3}</text>

      <text x={localX(OFFSET * 1.3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4.75 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">DWG No</text>
      <text x={localX(OFFSET * 3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4.75 * LINE_H)} fontSize={3.175} fontFamily="Arial" fill="black">{dwgNo}</text>

      <text x={localX(OFFSET * 1.3 + 4.66 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4.75 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Rev</text>
      <text x={localX(OFFSET * 2.3 + 4.66 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 4.75 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{revisionCode}</text>

      <text x={localX(OFFSET * 3 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 6.5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Date</text>
      <text x={localX(OFFSET * 4 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 6.5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{dateString}</text>

      <text x={localX(OFFSET * 2.5 + 4.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 6.5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Sheet</text>
      <text x={localX(OFFSET * 3.5 + 4.5 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 6.5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">{sheetRef}</text>

      <text x={localX(OFFSET * 1.1 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 6.5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">Scale</text>
      <text x={localX(OFFSET * 1.8 + 4 * TAB_OFFSET)} y={localY(PAGE_HEIGHT - 4.5 * OFFSET + 6.5 * LINE_H)} fontSize={2.54} fontFamily="Arial" fill="black">1:20</text>
    </svg>
  )
}