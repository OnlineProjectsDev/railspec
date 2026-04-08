// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/components/page.tsx
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
import { deriveStageComponentOrder } from "../../../../deriveStageComponentOrder"
import StageComponentOrderTable from "./StageComponentOrderTable"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string }>
}

export const metadata = {
  title: "Components Order",
}

export default async function FabricationComponentsPage({ params }: PageProps) {
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

    const rows = deriveStageComponentOrder(rawParts)
    const totalQty = rows.reduce((sum, row) => sum + row.qty, 0)

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
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}/glass`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Glass Order
          </Link>
          <Link
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}/cutting`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Cutting Sheet
          </Link>
          <Link
            href={`/fabrication/raw/${job.job_number}/${jobStage.stage}/powdercoat`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Powdercoat Order
          </Link>
          <Link
            href={`/editor/${job.job_number}/${jobStage.stage}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Open Editor Stage
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Job #{job.job_number} — Stage {jobStage.stage} Components Order
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Component quantities grouped by part and details. BP and DP are excluded from this sheet.
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
            <h2 className="text-lg font-semibold mb-3">Components Summary</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Grouped Rows</div>
                <div className="text-xl font-semibold">{rows.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Total Qty</div>
                <div className="text-xl font-semibold">{totalQty}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border p-4 bg-white">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold">Components</h2>
            <div className="text-sm text-muted-foreground">
              {rows.length} rows
            </div>
          </div>

          <StageComponentOrderTable rows={rows} />
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