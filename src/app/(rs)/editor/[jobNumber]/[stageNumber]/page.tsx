// /app/(rs)/editor/[jobNumber]/[stageNumber]/page.tsx
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";

import { getCustomer, getCurrentCustomer } from "@/lib/queries/getCustomer";
import { getJobStageByJobAndStage, getAllStagesForJobnoDefaults } from "@/lib/queries/getJobStage";
import { getEditorBalconiesForJobAndStageNo } from "@/lib/queries/getEditorBalcony";
import { createNextStageForJob } from "@/db/helpers/jobStageDefaults";
import CreateEditorBalconyTemplatePicker from "./CreateEditorBalconyTemplatePicker";
import EditorBalconyManager from "./EditorBalconyManager";
import EditorStageOrderLinks from "./EditorStageOrderLinks";
import { getEditorTemplatesWithCompatibility } from "@/lib/editor-persistence/editorTemplates";
import { JobStageDefaults } from "@/lib/editor-persistence/types";
import { getShopDrawingRevisionWithSheets, getShopDrawingRevisionsForStage } from "@/lib/queries/getShopDrawingRevision";
import { getShopDrawingRevisionSyncStatus } from "@/lib/queries/getShopDrawingRevisionSyncStatus";
import { getFabricationRevisionSyncStatus } from "@/lib/queries/getFabricationRevisionSyncStatus";
import { deriveStageFabricationRawParts } from "@/app/(rs)/fabrication/deriveStageFabricationRawParts";

type PageProps = {
  params: Promise<{ jobNumber: string; stageNumber: string }>;
  searchParams: Promise<{ showDeleted?: string }>;
};

import { getNextEditorBalconyNo } from "@/lib/editor-balcony-naming";

type EditorBalconyRow = Awaited<
  ReturnType<typeof getEditorBalconiesForJobAndStageNo>
>[number];

export const metadata = {
  title: "Editor Stage",
};

export default async function EditorStagePage({ params, searchParams }: PageProps) {
  try {
    const { jobNumber, stageNumber } = await params;
    const { showDeleted } = await searchParams;

    const jobNumParsed = Number(jobNumber);
    const stageNumParsed = Number(stageNumber);
    const includeDeleted = showDeleted === "1";

    if (!Number.isFinite(jobNumParsed) || !Number.isFinite(stageNumParsed)) {
      notFound();
    }

    const { getUser, getPermission } = getKindeServerSession();
    const user = await getUser();

    const admin = await getPermission("admin");
    const manager = await getPermission("manager");
    const employee = await getPermission("employee");

    const isRailsafeEmployee = !!(
      admin?.isGranted ||
      manager?.isGranted ||
      employee?.isGranted
    );

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.job_number, jobNumParsed));

    if (!job) {
      notFound();
    }

    if (!isRailsafeEmployee) {
      const currentCustomer = user?.email
        ? await getCurrentCustomer(user.email)
        : null;

      if (!currentCustomer || currentCustomer.id !== job.customerId) {
        notFound();
      }
    }

    const customer = await getCustomer(job.customerId);

    if (!customer) {
      notFound();
    }

    const existingStages = await getAllStagesForJobnoDefaults(job.id);
    const jobStage = await getJobStageByJobAndStage(job.id, stageNumParsed);

    async function createNextStageAction() {
      "use server";

      const { isAuthenticated } = getKindeServerSession();
      if (!(await isAuthenticated())) redirect("/login");

      const highestStage = existingStages.length
        ? Math.max(...existingStages.map((s) => s.stage))
        : 0;

      const nextStage = highestStage + 1;

      if (nextStage <= 1) {
        redirect(`/editor/${job.job_number}/1`);
      }

      const result = await createNextStageForJob(job.id, nextStage - 1);

      redirect(`/editor/${job.job_number}/${result.newStage}`);
    }

    if (!jobStage) {
      const highestStage = existingStages.length
        ? Math.max(...existingStages.map((s) => s.stage))
        : 0;
      const nextStage = highestStage + 1;

      return (
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BackButton title="Back" variant="outline" />
            <Link
              href={`/project-builder/${job.job_number}`}
              className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
            >
              Edit Project Builder
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              Job #{job.job_number} — Stage {stageNumParsed} not found
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Requested editor stage does not exist yet. Existing stages for this job are listed below.
            </p>
          </div>

          <div className="rounded-md border p-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Job Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium">Client</div>
                <div>{customer.company} — {customer.firstName} {customer.lastName}</div>
              </div>
              <div>
                <div className="font-medium">Address</div>
                <div>{job.address1}</div>
                {job.address2 ? <div>{job.address2}</div> : null}
                <div>{job.city} {job.zip}</div>
              </div>
              <div>
                <div className="font-medium">Job Defaults</div>
                <div>Design: {job.design_default}</div>
                <div>Anchorage: {job.anchorage_default}</div>
                <div>Toprail: {job.toprail_default}</div>
                <div>Infill: {job.infill_default}</div>
              </div>
              <div>
                <div className="font-medium">Constraints</div>
                <div>Height default: {job.height_default}</div>
                <div>Max height default: {job.max_height_default}</div>
                <div>Max post spacing: {job.max_post_spacing}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-white">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold">Existing Stages</h2>
              <form action={createNextStageAction}>
                <Button type="submit">
                  Add Stage {nextStage}
                </Button>
              </form>
            </div>

            {!existingStages.length ? (
              <p className="text-sm text-muted-foreground">
                No stages exist yet for this job.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {existingStages
                  .slice()
                  .sort((a, b) => a.stage - b.stage)
                  .map((stage) => (
                    <div
                      key={stage.id}
                      className="rounded-md border p-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-medium">
                          Stage {stage.stage}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Status: {stage.status ?? "draft"}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/jobs/stage?jobId=${job.id}&stage=${stage.stage}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
                        >
                          Stage Settings
                        </Link>
                        <Link
                          href={`/editor/${job.job_number}/${stage.stage}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
                        >
                          Open Stage
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    const editorBalconies = await getEditorBalconiesForJobAndStageNo(job.id, stageNumParsed, {
      includeDeleted,
    });

    const activeEditorBalconiesForNextName = editorBalconies.filter((balcony) => !balcony.isDeleted);
    const lastEditorBalcony = activeEditorBalconiesForNextName[activeEditorBalconiesForNextName.length - 1];
    const nextDrop = lastEditorBalcony ? lastEditorBalcony.drop : "A";
    const nextBalconyNo = lastEditorBalcony ? getNextEditorBalconyNo(lastEditorBalcony.balconyNo) : "1";

    const stageDefaults = jobStage.defaults as JobStageDefaults;

    const activeEditorBalconies = editorBalconies.filter((balcony) => !balcony.isDeleted);
    const deletedEditorBalconies = editorBalconies.filter((balcony) => balcony.isDeleted);

    const templates = getEditorTemplatesWithCompatibility({
      design_default: stageDefaults.design_default,
      anchorage_default: stageDefaults.anchorage_default,
      toprail_default: stageDefaults.toprail_default,
      infill_default: stageDefaults.infill_default,
    });

    const clientName = [customer.company, customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(" - ")
      .replace(" -  - ", " - ");

    const siteAddressLine = [job.address1, job.address2]
      .filter(Boolean)
      .join(", ");

    const cityLine = [job.city, job.zip]
      .filter(Boolean)
      .join(" ");

    const revisions = await getShopDrawingRevisionsForStage(jobStage.id);

    const currentRevisionCode =
      revisions.find((revision) => revision.isCurrent)?.revisionCode ??
      revisions[0]?.revisionCode ??
      null;

    const [shopSync, fabricationSync, fabricationParts, currentRevisionData] = await Promise.all([
      getShopDrawingRevisionSyncStatus({
        jobId: job.id,
        jobNumber: job.job_number,
        jobStageId: jobStage.id,
        stageNo: stageNumParsed,
        clientName,
        siteAddressLine,
        cityLine,
      }),
      getFabricationRevisionSyncStatus({
        jobId: job.id,
        jobStageId: jobStage.id,
        stageNo: jobStage.stage,
      }),
      deriveStageFabricationRawParts({
        jobId: job.id,
        stageNo: stageNumParsed,
      }),
      getShopDrawingRevisionWithSheets({
        jobStageId: jobStage.id,
        revisionCode: currentRevisionCode ?? undefined,
      }),
    ]);

    const hasFabricationParts = fabricationParts.length > 0;
    const hasShopDrawingSheets = currentRevisionData.sheets.length > 0;

    const hasUnsyncedState =
      !shopSync.hasRevision ||
      shopSync.isDirty ||
      !fabricationSync.hasRevision ||
      fabricationSync.isDirty;

    const revisionOptions = hasUnsyncedState
      ? [{ value: "unsynced", label: "Unsynced" }, ...revisions.map((revision) => ({
          value: revision.revisionCode,
          label: `Rev ${revision.revisionCode}`,
        }))]
      : revisions.map((revision) => ({
          value: revision.revisionCode,
          label: `Rev ${revision.revisionCode}`,
        }));

    const selectedRevisionOption = hasUnsyncedState
      ? "unsynced"
      : currentRevisionCode ?? "unsynced";

    return (
      <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-white rounded-md px-4 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
          <BackButton title="Back" variant="outline" className="h-8 text-[11px]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">
              #{job.job_number} · {customer.company}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Stage {jobStage.stage}
              {siteAddressLine ? ` · ${siteAddressLine}${cityLine ? `, ${cityLine}` : ""}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/project-builder/${job.job_number}`}
              className="inline-flex items-center px-3 h-8 text-[11px] rounded-md border hover:bg-gray-50 transition-colors"
            >
              Project Builder
            </Link>
            <Link
              href={`/jobs/stage?jobId=${job.id}&stage=${jobStage.stage}`}
              className="inline-flex items-center px-3 h-8 text-[11px] rounded-md border hover:bg-gray-50 transition-colors"
            >
              Stage Settings
            </Link>
            <form action={createNextStageAction}>
              <Button type="submit" className="h-8 text-[11px]">
                Add Stage {existingStages.length
                  ? Math.max(...existingStages.map((s) => s.stage)) + 1
                  : 1}
              </Button>
            </form>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left sidebar: stage outputs + project details */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            <EditorStageOrderLinks
              jobNumber={job.job_number}
              stageNumber={jobStage.stage}
              hasStage={true}
              editorBalconyCount={activeEditorBalconies.length}
              hasFabricationParts={hasFabricationParts}
              hasShopDrawingSheets={hasShopDrawingSheets}
              revisionOptions={revisionOptions}
              selectedRevisionOption={selectedRevisionOption}
            />

            {/* Project details */}
            <div className="bg-white rounded-xl p-4 flex flex-col gap-4 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-700">Project</span>

              <div className="flex flex-col gap-1.5">
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-gray-400 mb-0.5">Client</div>
                  <div className="text-[11px] font-medium text-gray-800">{customer.company}</div>
                  <div className="text-[11px] text-gray-500">{customer.firstName} {customer.lastName}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-gray-400 mb-0.5">Address</div>
                  <div className="text-[11px] font-medium text-gray-800">{job.address1}</div>
                  {job.address2 ? <div className="text-[11px] text-gray-500">{job.address2}</div> : null}
                  <div className="text-[11px] text-gray-500">{job.city} {job.zip}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Railing Defaults</span>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Design</span><span className="text-gray-700 font-medium">{job.design_default}</span></div>
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Anchorage</span><span className="text-gray-700 font-medium">{job.anchorage_default}</span></div>
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Toprail</span><span className="text-gray-700 font-medium">{job.toprail_default}</span></div>
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Infill</span><span className="text-gray-700 font-medium text-right">{job.infill_default}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Constraints</span>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Height</span><span className="text-gray-700 font-medium">{job.height_default}</span></div>
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Max height</span><span className="text-gray-700 font-medium">{job.max_height_default}</span></div>
                  <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Max post spacing</span><span className="text-gray-700 font-medium">{job.max_post_spacing}</span></div>
                </div>
              </div>

              {job.notes ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Notes</span>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[11px] text-gray-600">{job.notes}</div>
                </div>
              ) : null}
            </div>

            {/* Stage details */}
            <div className="bg-white rounded-xl p-4 flex flex-col gap-3 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-700">Stage {jobStage.stage}</span>
              <div className="flex flex-col gap-1.5">
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex justify-between items-center">
                  <span className="text-[11px] text-gray-400">Status</span>
                  <span className="text-[11px] font-medium text-gray-700 capitalize">{jobStage.status ?? "draft"}</span>
                </div>
                {jobStage.notes ? (
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="text-[10px] text-gray-400 mb-0.5">Notes</div>
                    <div className="text-[11px] text-gray-600">{jobStage.notes}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: balconies */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="bg-white rounded-md overflow-hidden">
              {/* Balcony header */}
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-gray-900">Editor Balconies</span>
                  <span className="text-[10px] text-gray-400">
                    {activeEditorBalconies.length} active
                    {deletedEditorBalconies.length ? ` • ${deletedEditorBalconies.length} deleted` : ""}
                  </span>
                </div>
                <Link
                  href={
                    includeDeleted
                      ? `/editor/${job.job_number}/${jobStage.stage}`
                      : `/editor/${job.job_number}/${jobStage.stage}?showDeleted=1`
                  }
                  className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {includeDeleted ? "Hide deleted" : "Show deleted"}
                </Link>
              </div>

              {/* Body: balcony list + template picker side-by-side */}
              <div className="flex min-h-0">
                {/* Balcony list */}
                <div className="flex-1 min-w-0">
                  <EditorBalconyManager
                    jobId={job.id}
                    jobStageId={jobStage.id}
                    balconies={editorBalconies as EditorBalconyRow[]}
                    nextDrop={nextDrop}
                    nextBalconyNo={nextBalconyNo}
                    includeDeleted={includeDeleted}
                  />
                </div>

                {/* Template picker — right panel */}
                <div className="w-56 flex-shrink-0 border-l flex flex-col">
                  <div className="px-4 py-3 border-b">
                    <span className="text-xs font-semibold text-gray-900">Add Balcony</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <CreateEditorBalconyTemplatePicker
                      jobId={job.id}
                      jobStageId={jobStage.id}
                      nextDrop={nextDrop}
                      nextBalconyNo={nextBalconyNo}
                      templates={templates}
                      balconies={activeEditorBalconies as EditorBalconyRow[]}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e);
      throw e;
    }
    throw e;
  }
}