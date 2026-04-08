// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/[revision]/cutting/page.tsx
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
import { deriveStageFabricationRawParts } from "../../../../../deriveStageFabricationRawParts"
import StageCuttingSheetTable, { type StageCuttingSheetRow } from "../../cutting/StageCuttingSheetTable"
import { resolveFabricationRevisionOrRedirect } from "../resolveFabricationRevision"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string; revision: string }>
}

export const metadata = {
  title: "Cutting Sheet",
}

function buildExtrusionGroupingKey(part: {
  balconyKey: string
  run_id: string | null
  partName: string
  subtype?: string
  length?: number
  height?: number
  planeCenterLength?: number
  hml?: number
  hmr?: number
  vml?: number
  vmr?: number
  drilling?: string
}) {
  return [
    part.balconyKey,
    part.run_id ?? "",
    part.partName,
    part.subtype ?? "",
    part.length ?? "",
    part.height ?? "",
    part.planeCenterLength ?? "",
    part.hml ?? "",
    part.hmr ?? "",
    part.vml ?? "",
    part.vmr ?? "",
    part.drilling ?? "",
  ].join("::")
}

function buildStageCuttingSheetRows(
  parts: Awaited<ReturnType<typeof deriveStageFabricationRawParts>>
): StageCuttingSheetRow[] {
  const grouped = new Map<string, StageCuttingSheetRow>()

  for (const part of parts) {
    if (part.kind !== "extrusion") continue

    const key = buildExtrusionGroupingKey({
      balconyKey: part.balconyKey,
      run_id: part.run_id,
      partName: part.partName,
      subtype: part.subtype,
      length: part.length,
      height: part.height,
      planeCenterLength: part.planeCenterLength,
      hml: part.hml,
      hmr: part.hmr,
      vml: part.vml,
      vmr: part.vmr,
      drilling: part.drilling,
    })

    const existing = grouped.get(key)

    if (existing) {
      existing.qty += 1
      continue
    }

    grouped.set(key, {
      editorBalconyId: part.editorBalconyId,
      jobId: part.jobId,
      jobStageId: part.jobStageId,
      drop: part.drop,
      balconyNo: part.balconyNo,
      balconySortOrder: part.balconySortOrder,
      balconyLabel: part.balconyLabel,
      balconyKey: part.balconyKey,
      run_id: part.run_id,

      sourceId: part.sourceId,
      sourceSegmentId: part.sourceSegmentId,
      sourcePostId: part.sourcePostId,
      sourceBayId: part.sourceBayId,

      kind: part.kind,
      subtype: part.subtype,
      partName: part.partName,
      qty: 1,

      sourceX: part.sourceX,
      sourceY: part.sourceY,
      sourceZ: part.sourceZ,

      drillingDirX: part.drillingDirX,
      drillingDirZ: part.drillingDirZ,

      planeCenterLength: part.planeCenterLength,
      length: part.length,
      height: part.height,

      hml: part.hml,
      hmr: part.hmr,
      vml: part.vml,
      vmr: part.vmr,

      drilling: part.drilling,
    })
  }

  const getPartSortOrder = (row: StageCuttingSheetRow) => {
    switch (row.subtype) {
      case "post":
        return 1
      case "toprail":
        return 2
      case "midrail":
        return 3
      case "vertical":
        return 4
      default:
        return 99
    }
  }

  return [...grouped.values()].sort((a, b) => {
    const partSortDiff = getPartSortOrder(a) - getPartSortOrder(b)
    if (partSortDiff !== 0) return partSortDiff

    if (a.partName !== b.partName) {
      return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
    }

    if (a.balconySortOrder !== b.balconySortOrder) {
      return a.balconySortOrder - b.balconySortOrder
    }

    if ((a.run_id ?? "") !== (b.run_id ?? "")) {
      return (a.run_id ?? "").localeCompare(b.run_id ?? "", undefined, { numeric: true, sensitivity: "base" })
    }

    if ((a.sourcePostId ?? 0) !== (b.sourcePostId ?? 0)) {
      return (a.sourcePostId ?? 0) - (b.sourcePostId ?? 0)
    }

    if ((a.sourceBayId ?? "") !== (b.sourceBayId ?? "")) {
      return (a.sourceBayId ?? "").localeCompare(b.sourceBayId ?? "", undefined, { numeric: true, sensitivity: "base" })
    }

    return a.sourceId.localeCompare(b.sourceId, undefined, { numeric: true, sensitivity: "base" })
  })
}

export default async function FabricationCuttingSheetRevisionPage({ params }: PageProps) {
  try {
    const { jobNumber, stageNumber, revision } = await params

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

    const resolvedRevision = await resolveFabricationRevisionOrRedirect({
      jobStageId: jobStage.id,
      revision,
      latestHref: (revisionCode) =>
        `/fabrication/raw/${job.job_number}/${jobStage.stage}/${revisionCode}/cutting`,
      liveHref: `/fabrication/raw/${job.job_number}/${jobStage.stage}/cutting`,
    })

    const rawParts = await deriveStageFabricationRawParts({
      jobId: job.id,
      stageNo: stageNumParsed,
    })

    const rows = buildStageCuttingSheetRows(rawParts)

    const totalPieces = rows.reduce((sum, row) => sum + row.qty, 0)
    const uniqueBalconies = new Set(rows.map((row) => row.balconyKey)).size
    const uniqueRuns = new Set(rows.map((row) => row.run_id).filter(Boolean)).size

    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BackButton title="Back" variant="outline" />
          <Link
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Raw Parts
          </Link>
          <Link
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/glass`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Glass Order
          </Link>
          <Link
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/powdercoat`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Powdercoat Order
          </Link>
          <Link
            href={`/editor/${job.job_number}/${jobStage.stage}?revision=${resolvedRevision.revisionCode}`}
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
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Job #{job.job_number} — Stage {jobStage.stage} — Rev {resolvedRevision.revisionCode} Cutting Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Extrusions grouped per balcony by exact fabrication details for the selected revision route.
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
                <div className="font-medium">Stages</div>
                <div>Current: {jobStage.stage}</div>
                <div>Total: {existingStages.length}</div>
                <div>Status: {jobStage.status ?? "draft"}</div>
                <div>Revision: {resolvedRevision.revisionCode}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-white">
            <h2 className="text-lg font-semibold mb-3">Cutting Sheet Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Balconies</div>
                <div className="text-xl font-semibold">{uniqueBalconies}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Runs</div>
                <div className="text-xl font-semibold">{uniqueRuns}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Grouped Rows</div>
                <div className="text-xl font-semibold">{rows.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Total Pieces</div>
                <div className="text-xl font-semibold">{totalPieces}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border p-4 bg-white">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold">Cutting Sheet Lines</h2>
            <div className="text-sm text-muted-foreground">
              {rows.length} grouped rows
            </div>
          </div>

          <StageCuttingSheetTable rows={rows} />
        </div>
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