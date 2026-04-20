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
import { ScrollArea } from "@/components/ui/scroll-area"
import { resolveFabricationRevisionOrRedirect } from "../resolveFabricationRevision"
import FabricationNavLinks from "@/app/(rs)/fabrication/FabricationNavLinks"

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

    const navLinks = [
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}`, label: "Raw Parts" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/glass`, label: "Glass" },
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
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Cutting Sheet</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <FabricationNavLinks links={navLinks} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 flex-shrink-0">
          {[
            { label: "Balconies", value: uniqueBalconies },
            { label: "Runs", value: uniqueRuns },
            { label: "Grouped rows", value: rows.length },
            { label: "Total pieces", value: totalPieces },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl px-4 py-3 flex flex-col gap-0.5 flex-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</span>
              <span className="text-xl font-bold text-gray-800">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Cutting sheet table */}
        <div className="bg-white rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-900">Cutting Sheet Lines</span>
            <span className="text-[11px] text-gray-400">{rows.length} grouped rows</span>
          </div>
          <ScrollArea className="h-full">
            <StageCuttingSheetTable rows={rows} />
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