// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/page.tsx
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { jobs } from "@/db/schema"
import { BackButton } from "@/components/BackButton"
import { ScrollArea } from "@/components/ui/scroll-area"
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

    const stats = [
      { label: "Balconies", value: uniqueBalconies },
      { label: "Extrusions", value: extrusionCount },
      { label: "Glass", value: glassCount },
      { label: "Components", value: componentCount },
      { label: "Total parts", value: parts.length },
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
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Fabrication Parts</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/editor/${job.job_number}/${jobStage.stage}`}
              className="flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              Editor
            </Link>
            <Link
              href={`/project-builder/${job.job_number}`}
              className="flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              Project Builder
            </Link>
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
