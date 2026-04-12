// /app/(rs)/shopdrawings-editor/[jobNumber]/[stageNumber]/ShopDrawingClient.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import A3Sheet from "../../templates/A3Sheet"
import type { ShopDrawingSheetData } from "../../types"

type Props = {
  sheets: ShopDrawingSheetData[]
  currentRevisionCode: string
  onSheetsChange?: React.Dispatch<React.SetStateAction<ShopDrawingSheetData[]>>
}

export default function ShopDrawingClient({ sheets, currentRevisionCode, onSheetsChange }: Props) {
  const [zoom, setZoom] = useState(0.7)

  const initialView3dBySheetId = useMemo(
    () =>
      Object.fromEntries(
        sheets.map((sheet) => [
          sheet.id,
          sheet.view3d,
        ])
      ) as Record<string, ShopDrawingSheetData["view3d"]>,
    [sheets]
  )

  const [view3dBySheetId, setView3dBySheetId] = useState<Record<string, ShopDrawingSheetData["view3d"]>>(initialView3dBySheetId)

  useEffect(() => {
    setView3dBySheetId(initialView3dBySheetId)
  }, [initialView3dBySheetId])

  if (!sheets.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No derived balconies found for this stage.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-4 z-20 flex items-center gap-3 rounded-md border bg-white p-3 shadow-sm">
        <span className="text-sm font-medium">Zoom</span>

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border"
          suppressHydrationWarning
          onClick={() => setZoom((current) => Math.max(0.25, Number((current - 0.1).toFixed(2))))}
        >
          -
        </button>

        <input
          type="range"
          min={0.25}
          max={4}
          step={0.05}
          value={zoom}
          suppressHydrationWarning
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-40"
        />

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border"
          suppressHydrationWarning
          onClick={() => setZoom((current) => Math.min(4, Number((current + 0.1).toFixed(2))))}
        >
          +
        </button>

        <span className="w-14 text-right text-sm">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {sheets.map((sheet, index) => (
          <div
            key={`${sheet.id}::${index}`}
            className="rounded-md border bg-muted/20 p-4 overflow-auto"
          >
            <div className="mb-3 text-sm font-medium">
              {sheet.meta.balconyLabel}
            </div>

            <A3Sheet
              sheet={{
                ...sheet,
                view3d: view3dBySheetId[sheet.id] ?? sheet.view3d,
              }}
              revisionCode={currentRevisionCode}
              zoom={zoom}
              onView3dChange={(view3d) => {
                setView3dBySheetId((current) => ({
                  ...current,
                  [sheet.id]: view3d,
                }))

                onSheetsChange?.((current) =>
                  current.map((currentSheet) =>
                    currentSheet.id === sheet.id
                      ? {
                          ...currentSheet,
                          view3d,
                        }
                      : currentSheet
                  )
                )
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}