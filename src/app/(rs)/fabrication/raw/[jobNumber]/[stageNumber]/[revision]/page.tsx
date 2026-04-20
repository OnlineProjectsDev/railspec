// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/[revision]/page.tsx
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
import StageFabricationPartsTable from "../StageFabricationPartsTable"
import { getFabricationRevisionSyncStatus } from "@/lib/queries/getFabricationRevisionSyncStatus"
import { ScrollArea } from "@/components/ui/scroll-area"
import { resolveFabricationRevisionOrRedirect } from "./resolveFabricationRevision"
import FabricationNavLinks from "@/app/(rs)/fabrication/FabricationNavLinks"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string; revision: string }>
}

export const metadata = {
  title: "Fabrication Parts",
}

export default async function FabricationStageRevisionPage({ params }: PageProps) {
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
        `/fabrication/raw/${job.job_number}/${jobStage.stage}/${revisionCode}`,
      liveHref: `/fabrication/raw/${job.job_number}/${jobStage.stage}`,
    })

    const fabricationSync = await getFabricationRevisionSyncStatus({
      jobId: job.id,
      jobStageId: jobStage.id,
      stageNo: stageNumParsed,
      revisionCode: resolvedRevision.revisionCode,
    })

    const parts = await deriveStageFabricationRawParts({
      jobId: job.id,
      stageNo: stageNumParsed,
    })

    const extrusionCount = parts.filter((part) => part.kind === "extrusion").length
    const glassCount = parts.filter((part) => part.kind === "glass").length
    const componentCount = parts.filter((part) => part.kind === "component").length

    const uniqueBalconies = new Set(parts.map((part) => part.balconyKey)).size

    const syncLabel = !fabricationSync.hasRevision
      ? "No revision"
      : fabricationSync.isDirty
        ? "Unsynced"
        : "Up to date"

    const syncColor = !fabricationSync.hasRevision
      ? "bg-gray-100 text-gray-500"
      : fabricationSync.isDirty
        ? "bg-amber-50 text-amber-700"
        : "bg-green-50 text-green-700"

    const stats = [
      { label: "Balconies", value: uniqueBalconies },
      { label: "Extrusions", value: extrusionCount },
      { label: "Glass", value: glassCount },
      { label: "Components", value: componentCount },
      { label: "Total parts", value: parts.length },
    ]

    const navLinks = [
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/components`, label: "Components" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/glass`, label: "Glass" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/cutting`, label: "Cutting" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/powdercoat`, label: "Powdercoat" },
      { href: `/editor/${job.job_number}/${jobStage.stage}?revision=${resolvedRevision.revisionCode}`, label: "Editor" },
      { href: `/project-builder/${job.job_number}`, label: "Project Builder" },
    ]

    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Header */}
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
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Fabrication Parts</span>
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${syncColor}`}>
              {syncLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <FabricationNavLinks links={navLinks} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 flex-shrink-0">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl px-4 py-3 flex flex-col gap-0.5 flex-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</span>
              <span className="text-xl font-bold text-gray-800">{stat.value}</span>
            </div>
          ))}
          <div className="bg-white rounded-xl px-4 py-3 flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Saved / Fresh</span>
            <span className="text-xl font-bold text-gray-800">{fabricationSync.savedCount} / {fabricationSync.freshCount}</span>
          </div>
        </div>

        {/* Parts table */}
        <div className="bg-white rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-900">Raw Parts</span>
            <span className="text-[11px] text-gray-400">{parts.length} rows</span>
          </div>
          <ScrollArea className="h-full">
            <StageFabricationPartsTable parts={parts} />
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