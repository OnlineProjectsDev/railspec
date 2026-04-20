// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/[revision]/components/page.tsx
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
import { deriveStageComponentOrder } from "../../../../../deriveStageComponentOrder"
import StageComponentOrderTable from "../../components/StageComponentOrderTable"
import { resolveFabricationRevisionOrRedirect } from "../resolveFabricationRevision"
import { ScrollArea } from "@/components/ui/scroll-area"
import FabricationNavLinks from "@/app/(rs)/fabrication/FabricationNavLinks"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string; revision: string }>
}

export const metadata = {
  title: "Components Order",
}

export default async function FabricationComponentsRevisionPage({ params }: PageProps) {
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
        `/fabrication/raw/${job.job_number}/${jobStage.stage}/${revisionCode}/components`,
      liveHref: `/fabrication/raw/${job.job_number}/${jobStage.stage}/components`,
    })

    const rawParts = await deriveStageFabricationRawParts({
      jobId: job.id,
      stageNo: stageNumParsed,
    })

    const rows = deriveStageComponentOrder(rawParts)
    const totalQty = rows.reduce((sum, row) => sum + row.qty, 0)

    const navLinks = [
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}`, label: "Raw Parts" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/glass`, label: "Glass" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/cutting`, label: "Cutting" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/powdercoat`, label: "Powdercoat" },
      { href: `/editor/${job.job_number}/${jobStage.stage}?revision=${resolvedRevision.revisionCode}`, label: "Editor" },
    ]

    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
          <BackButton title="Back" className="h-7 text-[10px] bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 border-0 shadow-none" />
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rail-light-blue text-white text-[11px] font-bold tracking-wide flex-shrink-0">
              #{job.job_number}
            </span>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{customer.company}</span>
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Stage {jobStage.stage}</span>
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Rev {resolvedRevision.revisionCode}</span>
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Components Order</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <FabricationNavLinks links={navLinks} />
          </div>
        </div>

        <div className="flex gap-3 flex-shrink-0">
          {[
            { label: "Grouped rows", value: rows.length },
            { label: "Total qty", value: totalQty },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl px-4 py-3 flex flex-col gap-0.5 flex-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</span>
              <span className="text-xl font-bold text-gray-800">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-900">Components</span>
            <span className="text-[11px] text-gray-400">{rows.length} rows</span>
          </div>
          <ScrollArea className="h-full">
            <StageComponentOrderTable rows={rows} />
          </ScrollArea>
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