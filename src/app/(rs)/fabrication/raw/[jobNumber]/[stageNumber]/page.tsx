// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/page.tsx
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
import { deriveStageFabricationRawParts } from "../../../deriveStageFabricationRawParts"
import StageFabricationPartsTable from "./StageFabricationPartsTable"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string }>
}

export const metadata = {
  title: "Fabrication Parts",
}

export default async function FabricationStagePage({ params }: PageProps) {
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

    const parts = await deriveStageFabricationRawParts({
      jobId: job.id,
      stageNo: stageNumParsed,
    })

    const extrusionCount = parts.filter((part) => part.kind === "extrusion").length
    const glassCount = parts.filter((part) => part.kind === "glass").length
    const componentCount = parts.filter((part) => part.kind === "component").length

    const uniqueBalconies = new Set(parts.map((part) => part.balconyKey)).size

    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
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
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Job #{job.job_number} — Stage {jobStage.stage} Fabrication Parts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Raw, unmerged fabrication parts for all non-deleted balconies on this stage where derived balustrade is enabled.
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
            <h2 className="text-lg font-semibold mb-3">Raw Part Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Balconies</div>
                <div className="text-xl font-semibold">{uniqueBalconies}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Extrusions</div>
                <div className="text-xl font-semibold">{extrusionCount}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Glass</div>
                <div className="text-xl font-semibold">{glassCount}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Components</div>
                <div className="text-xl font-semibold">{componentCount}</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Components are still intentionally left unimplemented in this pass.
            </div>
          </div>
        </div>

        <div className="rounded-md border p-4 bg-white">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold">Raw Parts</h2>
            <div className="text-sm text-muted-foreground">
              {parts.length} rows
            </div>
          </div>

          <StageFabricationPartsTable parts={parts} />
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