// /app/(rs)/shopdrawings-editor/[jobNumber]/[stageNumber]/StageEditorClient.tsx
"use client"

import { useState } from "react"
import type { ShopDrawingSheetData } from "../../types"
import EditDetailsCard from "./EditDetailsCard"
import ShopDrawingClient from "./ShopDrawingClient"

type Props = {
  jobId: number
  jobNumber: number
  jobStageId: number
  stageNo: number
  currentRevisionCode: string
  clientName: string
  siteAddressLine: string
  cityLine: string
  initialTitle1?: string
  initialTitle2?: string
  initialTitle3?: string
  sheets: ShopDrawingSheetData[]
}

export default function StageEditorClient({
  jobId,
  jobNumber,
  jobStageId,
  stageNo,
  currentRevisionCode,
  clientName,
  siteAddressLine,
  cityLine,
  initialTitle1 = "",
  initialTitle2 = "",
  initialTitle3 = "",
  sheets,
}: Props) {
  const [workingSheets, setWorkingSheets] = useState(sheets)

  return (
    <div className="flex flex-col gap-4">
      <EditDetailsCard
        jobId={jobId}
        jobNumber={jobNumber}
        jobStageId={jobStageId}
        stageNo={stageNo}
        currentRevisionCode={currentRevisionCode}
        clientName={clientName}
        siteAddressLine={siteAddressLine}
        cityLine={cityLine}
        initialTitle1={initialTitle1}
        initialTitle2={initialTitle2}
        initialTitle3={initialTitle3}
        initialSheets={sheets}
        sheets={workingSheets}
      />

      <div className="rounded-md border p-4 bg-white">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold">Sheets</h2>
          <div className="text-sm text-muted-foreground">
            {workingSheets.length} sheets
          </div>
        </div>

        <ShopDrawingClient
          sheets={workingSheets}
          currentRevisionCode={currentRevisionCode}
          onSheetsChange={setWorkingSheets}
        />
      </div>
    </div>
  )
}