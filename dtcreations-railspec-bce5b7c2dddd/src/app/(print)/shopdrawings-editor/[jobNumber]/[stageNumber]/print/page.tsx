// /app/(print)/shopdrawings-editor/[jobNumber]/[stageNumber]/print/page.tsx
import * as Sentry from "@sentry/nextjs"
import { notFound } from "next/navigation"

import { PrintClient } from "@/app/(print)/shopdrawings/print/PrintClient"
import { db } from "@/db"
import { jobs } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage"
import { getShopDrawingRevisionWithSheets } from "@/lib/queries/getShopDrawingRevision"
import type { ShopDrawingSheetData, ShopDrawingSheetDetails } from "@/app/(rs)/shopdrawings-editor/types"
import A3Sheet from "@/app/(rs)/shopdrawings-editor/templates/A3Sheet"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string }>
  searchParams: Promise<{ revision?: string }>
}

export default async function ShopDrawingsRevisionPrintPage({ params, searchParams }: PageProps) {
  try {
    const { jobNumber, stageNumber } = await params
    const { revision } = await searchParams

    const jobNumParsed = Number(jobNumber)
    const stageNumParsed = Number(stageNumber)

    if (!Number.isFinite(jobNumParsed) || !Number.isFinite(stageNumParsed)) {
      notFound()
    }

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.job_number, jobNumParsed))

    if (!job) {
      notFound()
    }

    const jobStage = await getJobStageByJobAndStage(job.id, stageNumParsed)

    if (!jobStage) {
      notFound()
    }

    const revisionData = await getShopDrawingRevisionWithSheets({
      jobStageId: jobStage.id,
      revisionCode: revision,
    })

    if (!revisionData.revision) {
      return <div className="p-4">Revision not found.</div>
    }

    const sheets: ShopDrawingSheetData[] = revisionData.sheets
      .map((sheetRow) => {
        const snapshot = sheetRow.sourceSnapshot as ShopDrawingSheetData | null
        if (!snapshot) return null

        const sheetEdits = (sheetRow.sheetEdits ?? {}) as Record<string, unknown>
        const editedView3d =
          sheetEdits.view3d && typeof sheetEdits.view3d === "object"
            ? (sheetEdits.view3d as ShopDrawingSheetData["view3d"])
            : undefined

        return {
          ...snapshot,
          sheetDetails: (sheetRow.sheetDetails ?? {}) as ShopDrawingSheetDetails,
          view3d: editedView3d ?? snapshot.view3d,
        }
      })
      .filter(Boolean) as ShopDrawingSheetData[]

    if (!sheets.length) {
      return <div className="p-4">No sheets found for this revision.</div>
    }

    const currentRevisionCode = revisionData.revision.revisionCode

    return (
      <PrintClient fallbackTimeoutMs={1500}>
        <div className="print-root bg-white">
          <div className="shopdrawing-pages">
            {sheets.map((sheet, index) => (
              <div key={`${sheet.id}::${index}`} className="print-page">
                <div className="a3-sheet">
                  <A3Sheet
                    sheet={sheet}
                    revisionCode={currentRevisionCode}
                    zoom={1}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PrintClient>
    )
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e)
      throw e
    }
    throw e
  }
}