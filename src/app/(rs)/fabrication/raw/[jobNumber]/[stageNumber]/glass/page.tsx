// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/glass/page.tsx
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
import { deriveStageFabricationRawParts } from "../../../../deriveStageFabricationRawParts"
import StageGlassOrderTable, { type StageGlassOrderRow } from "./StageGlassOrderTable"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string }>
}

export const metadata = {
  title: "Glass Order",
}

function buildGlassGroupingKey(part: {
  balconyKey: string
  partName: string
  width?: number
  height?: number
  thickness?: number
  glassType?: string
  polish?: string
  topEdgeAngle?: number
  bottomEdgeAngle?: number
  leftEdgeAngle?: number
  rightEdgeAngle?: number
}) {
  return [
    part.balconyKey,
    part.partName,
    part.width ?? "",
    part.height ?? "",
    part.thickness ?? "",
    part.glassType ?? "",
    part.polish ?? "",
    part.topEdgeAngle ?? "",
    part.bottomEdgeAngle ?? "",
    part.leftEdgeAngle ?? "",
    part.rightEdgeAngle ?? "",
  ].join("::")
}

function buildStageGlassOrderRows(
  parts: Awaited<ReturnType<typeof deriveStageFabricationRawParts>>
): StageGlassOrderRow[] {
  const grouped = new Map<string, StageGlassOrderRow>()

  for (const part of parts) {
    if (part.kind !== "glass") continue

    const key = buildGlassGroupingKey(part)
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
      partName: part.partName,
      qty: 1,
      width: part.width,
      height: part.height,
      thickness: part.thickness,
      glassType: part.glassType,
      polish: part.polish,
      topEdgeAngle: part.topEdgeAngle,
      bottomEdgeAngle: part.bottomEdgeAngle,
      leftEdgeAngle: part.leftEdgeAngle,
      rightEdgeAngle: part.rightEdgeAngle,
    })
  }

  return [...grouped.values()].sort((a, b) => {
    // 1. Part (glass type / name)
    if (a.partName !== b.partName) {
      return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
    }

    // 2. Balcony (schema sort order)
    if (a.balconySortOrder !== b.balconySortOrder) {
      return a.balconySortOrder - b.balconySortOrder
    }

    // 3. Run
    if ((a.run_id ?? "") !== (b.run_id ?? "")) {
      return (a.run_id ?? "").localeCompare(b.run_id ?? "", undefined, { numeric: true, sensitivity: "base" })
    }

    // 4. Panel dimensions / fabrication identity
    if ((a.width ?? 0) !== (b.width ?? 0)) return (a.width ?? 0) - (b.width ?? 0)
    if ((a.height ?? 0) !== (b.height ?? 0)) return (a.height ?? 0) - (b.height ?? 0)
    if ((a.thickness ?? 0) !== (b.thickness ?? 0)) return (a.thickness ?? 0) - (b.thickness ?? 0)

    if ((a.topEdgeAngle ?? 0) !== (b.topEdgeAngle ?? 0)) return (a.topEdgeAngle ?? 0) - (b.topEdgeAngle ?? 0)
    if ((a.bottomEdgeAngle ?? 0) !== (b.bottomEdgeAngle ?? 0)) return (a.bottomEdgeAngle ?? 0) - (b.bottomEdgeAngle ?? 0)
    if ((a.leftEdgeAngle ?? 0) !== (b.leftEdgeAngle ?? 0)) return (a.leftEdgeAngle ?? 0) - (b.leftEdgeAngle ?? 0)
    if ((a.rightEdgeAngle ?? 0) !== (b.rightEdgeAngle ?? 0)) return (a.rightEdgeAngle ?? 0) - (b.rightEdgeAngle ?? 0)

    return 0
  })
}

export default async function FabricationGlassOrderPage({ params }: PageProps) {
  try {
    const { jobNumber, stageNumber } = await params

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

    const rawParts = await deriveStageFabricationRawParts({
      jobId: job.id,
      stageNo: stageNumParsed,
    })

    const rows = buildStageGlassOrderRows(rawParts)

    const totalPanels = rows.reduce((sum, row) => sum + row.qty, 0)
    const uniqueBalconies = new Set(rows.map((row) => row.balconyKey)).size

    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BackButton title="Back" variant="outline" />
          <Link
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Raw Parts
          </Link>
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
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Job #{job.job_number} — Stage {jobStage.stage} Glass Order
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Glass panels grouped per balcony by exact fabrication details, with quantity combined.
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
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-white">
            <h2 className="text-lg font-semibold mb-3">Glass Order Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Balconies</div>
                <div className="text-xl font-semibold">{uniqueBalconies}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Grouped Rows</div>
                <div className="text-xl font-semibold">{rows.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Total Panels</div>
                <div className="text-xl font-semibold">{totalPanels}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border p-4 bg-white">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold">Glass Order Lines</h2>
            <div className="text-sm text-muted-foreground">
              {rows.length} grouped rows
            </div>
          </div>

          <StageGlassOrderTable rows={rows} />
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