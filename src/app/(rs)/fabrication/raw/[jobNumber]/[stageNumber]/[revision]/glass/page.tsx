// /app/(rs)/fabrication/raw/[jobNumber]/[stageNumber]/[revision]/glass/page.tsx
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
import StageGlassOrderTable, { type StageGlassOrderRow } from "../../glass/StageGlassOrderTable"
import { resolveFabricationRevisionOrRedirect } from "../resolveFabricationRevision"
import { ScrollArea } from "@/components/ui/scroll-area"
import FabricationNavLinks from "@/app/(rs)/fabrication/FabricationNavLinks"

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string; revision: string }>
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
    if (a.partName !== b.partName) {
      return a.partName.localeCompare(b.partName, undefined, { numeric: true, sensitivity: "base" })
    }

    if (a.balconySortOrder !== b.balconySortOrder) {
      return a.balconySortOrder - b.balconySortOrder
    }

    if ((a.run_id ?? "") !== (b.run_id ?? "")) {
      return (a.run_id ?? "").localeCompare(b.run_id ?? "", undefined, { numeric: true, sensitivity: "base" })
    }

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

export default async function FabricationGlassOrderRevisionPage({ params }: PageProps) {
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
        `/fabrication/raw/${job.job_number}/${jobStage.stage}/${revisionCode}/glass`,
      liveHref: `/fabrication/raw/${job.job_number}/${jobStage.stage}/glass`,
    })

    const rawParts = await deriveStageFabricationRawParts({
      jobId: job.id,
      stageNo: stageNumParsed,
    })

    const rows = buildStageGlassOrderRows(rawParts)

    const totalPanels = rows.reduce((sum, row) => sum + row.qty, 0)
    const uniqueBalconies = new Set(rows.map((row) => row.balconyKey)).size

    const navLinks = [
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}`, label: "Raw Parts" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/cutting`, label: "Cutting" },
      { href: `/fabrication/raw/${job.job_number}/${jobStage.stage}/${resolvedRevision.revisionCode}/powdercoat`, label: "Powdercoat" },
      { href: `/editor/${job.job_number}/${jobStage.stage}?revision=${resolvedRevision.revisionCode}`, label: "Editor" },
      { href: `/project-builder/${job.job_number}`, label: "Project Builder" },
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
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Glass Order</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <FabricationNavLinks links={navLinks} />
          </div>
        </div>

        <div className="flex gap-3 flex-shrink-0">
          {[
            { label: "Balconies", value: uniqueBalconies },
            { label: "Grouped rows", value: rows.length },
            { label: "Total panels", value: totalPanels },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl px-4 py-3 flex flex-col gap-0.5 flex-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</span>
              <span className="text-xl font-bold text-gray-800">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-900">Glass Order Lines</span>
            <span className="text-[11px] text-gray-400">{rows.length} grouped rows</span>
          </div>
          <ScrollArea className="h-full">
            <StageGlassOrderTable rows={rows} />
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