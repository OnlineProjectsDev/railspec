// /app/(rs)/shopdrawings-editor/[jobNumber]/[stageNumber]/page.tsx
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { jobs } from "@/db/schema"
import { BackButton } from "@/components/BackButton"
import { getCustomer, getCurrentCustomer } from "@/lib/queries/getCustomer"
import { getJobStageByJobAndStage, getAllStagesForJobnoDefaults } from "@/lib/queries/getJobStage"
import { createInitialShopDrawingRevisionSnapshot } from "@/lib/queries/createInitialShopDrawingRevisionSnapshot"
import {
  getShopDrawingRevisionWithSheets,
  getShopDrawingRevisionsForStage,
} from "@/lib/queries/getShopDrawingRevision"
import { getShopDrawingRevisionSyncStatus } from "@/lib/queries/getShopDrawingRevisionSyncStatus"
import type { ShopDrawingSheetData, ShopDrawingSheetDetails } from "../../types"
import RevisionSelect from "./RevisionSelect"
import StageEditorClient from "./StageEditorClient"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string }>
  searchParams: Promise<{ revision?: string }>
}

export const metadata = {
  title: "Editor Shop Drawings",
}

export default async function ShopDrawingsEditorStagePage({ params, searchParams }: PageProps) {
  try {
    const { jobNumber, stageNumber } = await params
    const { revision } = await searchParams

    const jobNumParsed = Number(jobNumber)
    const stageNumParsed = Number(stageNumber)

    if (!Number.isFinite(jobNumParsed) || !Number.isFinite(stageNumParsed)) {
      notFound()
    }

    const { getUser, getPermission } = getKindeServerSession()
    const user = await getUser()

    const admin = await getPermission("admin")
    const manager = await getPermission("manager")
    const employee = await getPermission("employee")

    const isRailsafeEmployee = !!(
      admin?.isGranted ||
      manager?.isGranted ||
      employee?.isGranted
    )

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.job_number, jobNumParsed))

    if (!job) {
      notFound()
    }

    if (!isRailsafeEmployee) {
      const currentCustomer = user?.email
        ? await getCurrentCustomer(user.email)
        : null

      if (!currentCustomer || currentCustomer.id !== job.customerId) {
        notFound()
      }
    }

    const customer = await getCustomer(job.customerId)
    if (!customer) {
      notFound()
    }

    const existingStages = await getAllStagesForJobnoDefaults(job.id)
    const jobStage = await getJobStageByJobAndStage(job.id, stageNumParsed)

    if (!jobStage) {
      notFound()
    }

    const clientName = [customer.company, customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(" - ")
      .replace(" -  - ", " - ")

    const siteAddressLine = [job.address1, job.address2].filter(Boolean).join(", ")
    const cityLine = [job.city, job.zip].filter(Boolean).join(" ")

    let revisionData = await getShopDrawingRevisionWithSheets({
      jobStageId: jobStage.id,
      revisionCode: revision,
    })

    if (!revisionData.revision) {
      await createInitialShopDrawingRevisionSnapshot({
        jobId: job.id,
        jobNumber: job.job_number,
        jobStageId: jobStage.id,
        stageNo: stageNumParsed,
        clientName,
        siteAddressLine,
        cityLine,
        revisionCode: "A",
        createdBy: user?.email ?? null,
        fabricationSnapshot: null,
      })

      revisionData = await getShopDrawingRevisionWithSheets({
        jobStageId: jobStage.id,
        revisionCode: revision,
      })
    }

    const revisions = await getShopDrawingRevisionsForStage(jobStage.id)

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

    const currentRevisionCode = revisionData.revision?.revisionCode ?? "A"

    const syncStatus = await getShopDrawingRevisionSyncStatus({
      jobId: job.id,
      jobNumber: job.job_number,
      jobStageId: jobStage.id,
      stageNo: stageNumParsed,
      clientName,
      siteAddressLine,
      cityLine,
      revisionCode: currentRevisionCode,
    })

    const firstSheetDetails = (revisionData.sheets[0]?.sheetDetails ?? {}) as Record<string, unknown>

    const initialTitle1 =
      typeof firstSheetDetails.title1 === "string" ? firstSheetDetails.title1 : ""

    const initialTitle2 =
      typeof firstSheetDetails.title2 === "string" ? firstSheetDetails.title2 : ""

    const initialTitle3 =
      typeof firstSheetDetails.title3 === "string" ? firstSheetDetails.title3 : ""

    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <BackButton title="Back" variant="outline" />
          <Link
            href={`/editor/${job.job_number}/${jobStage.stage}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Open Editor Stage
          </Link>
          <Link
            href={`/project-builder/${job.job_number}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Open Project Builder
          </Link>

          <RevisionSelect
            action={`/shopdrawings-editor/${job.job_number}/${jobStage.stage}`}
            currentRevisionCode={currentRevisionCode}
            revisions={revisions}
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Job #{job.job_number} — Stage {jobStage.stage} Shop Drawings — Rev {currentRevisionCode}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Editor-based shopdrawing sheets for all non-deleted balconies on this stage with derived balustrade enabled.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-md border p-4 bg-white">
            <h2 className="text-lg font-semibold mb-3">Project Defaults</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium">Client</div>
                <div>{customer.company}</div>
                <div>{customer.firstName} {customer.lastName}</div>
                <div>{customer.email}</div>
              </div>

              <div>
                <div className="font-medium">Address</div>
                <div>{job.address1}</div>
                {job.address2 ? <div>{job.address2}</div> : null}
                <div>{job.city} {job.zip}</div>
              </div>

              <div>
                <div className="font-medium">Design Defaults</div>
                <div>Design: {job.design_default}</div>
                <div>Anchorage: {job.anchorage_default}</div>
                <div>Toprail: {job.toprail_default}</div>
                <div>Infill: {job.infill_default}</div>
              </div>

              <div>
                <div className="font-medium">Stage</div>
                <div>Current: {jobStage.stage}</div>
                <div>Total: {existingStages.length}</div>
                <div>Status: {jobStage.status ?? "draft"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-white">
            <h2 className="text-lg font-semibold mb-3">Sheet Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Sheets</div>
                <div className="text-xl font-semibold">{sheets.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Stage</div>
                <div className="text-xl font-semibold">{jobStage.stage}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Revision</div>
                <div className="text-xl font-semibold">{currentRevisionCode}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Sync</div>
                <div
                  className={`text-xl font-semibold ${
                    !syncStatus.hasRevision
                      ? "text-muted-foreground"
                      : syncStatus.isDirty
                        ? "text-amber-600"
                        : "text-green-600"
                  }`}
                >
                  {!syncStatus.hasRevision
                    ? "No revision"
                    : syncStatus.isDirty
                      ? "Unsynced"
                      : "Up to date"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <StageEditorClient
          jobId={job.id}
          jobNumber={job.job_number}
          jobStageId={jobStage.id}
          stageNo={stageNumParsed}
          currentRevisionCode={currentRevisionCode}
          clientName={clientName}
          siteAddressLine={siteAddressLine}
          cityLine={cityLine}
          initialTitle1={initialTitle1}
          initialTitle2={initialTitle2}
          initialTitle3={initialTitle3}
          sheets={sheets}
        />
      </div>
    )
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e)
      throw e
    }
    throw e
  }
}