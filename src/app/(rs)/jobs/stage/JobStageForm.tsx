// /app/(rs)/jobs/stage/JobStageForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";

import { z } from "zod";
import { Form, FormControl, FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { SelectWithLabel } from "@/components/inputs/SelectWithLabel";
import { TextAreaWithLabel } from "@/components/inputs/TextAreaWithLabel";

import { selectJobSchemaType } from "@/zod-schemas/jobs";
import {
  type selectJobStagesSchemaType,
  type insertJobStagesSchemaType,
  insertJobStagesSchema,
} from "@/zod-schemas/jobstages";
import { selectCustomerSchemaType } from "@/zod-schemas/customer";

import { useAction } from "next-safe-action/hooks";
import { saveJobStageAction } from "@/app/actions/saveJobStageActions";
import { toast } from "sonner";
import { ChevronLeft, LoaderCircle } from "lucide-react";
import { DisplayServerActionResponse } from "@/components/DisplayServerActionResponse";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { applyStageDefaultsToBalconiesAction } from "@/app/actions/applyStageDefaultsToBalconiesAction";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  designNeedsGlass,
  getInfillOptionsForDesign,
  getToprailOptionsForDesign,
  getAnchorageOptionsForDesign,
  getDesignOptionsForWindLoad,
} from "@/lib/jobDesignRules";
import type { JobStageDefaults } from "@/lib/editor-persistence/types";
import { DEFAULT_JOB_STAGE_DEFAULTS } from "@/lib/editor-persistence/defaults";
import { NumberInputWithLabel } from "@/components/inputs/NumberWithLabel";
import ContinueToJobDialog from "@/components/ContinueToJobDialog";
import ConfirmJobNavigationDialog from "@/components/ConfirmJobNavigationDialog";

type Props = {
  customer: selectCustomerSchemaType;
  job?: selectJobSchemaType;
  jobStage?: selectJobStagesSchemaType;
  techs?: {
    id: string;
    description: string;
  }[];
  isEditable?: boolean;
  isManager?: boolean | undefined;
  // 👇 New: number of balconies currently linked to this stage
  existingBalconiesCount?: number;
};

function buildStageDefaultsForForm(args: {
  job?: selectJobSchemaType;
  jobStage?: selectJobStagesSchemaType;
}): JobStageDefaults {
  const { job, jobStage } = args
  const stageDefaults = jobStage?.defaults

  return {
    design_default:
      (stageDefaults?.design_default as JobStageDefaults["design_default"]) ??
      (job?.design_default as JobStageDefaults["design_default"]) ??
      DEFAULT_JOB_STAGE_DEFAULTS.design_default,
    anchorage_default:
      (stageDefaults?.anchorage_default as JobStageDefaults["anchorage_default"]) ??
      (job?.anchorage_default as JobStageDefaults["anchorage_default"]) ??
      DEFAULT_JOB_STAGE_DEFAULTS.anchorage_default,
    toprail_default:
      (stageDefaults?.toprail_default as JobStageDefaults["toprail_default"]) ??
      (job?.toprail_default as JobStageDefaults["toprail_default"]) ??
      DEFAULT_JOB_STAGE_DEFAULTS.toprail_default,
    infill_default:
      (stageDefaults?.infill_default as JobStageDefaults["infill_default"]) ??
      (job?.infill_default as JobStageDefaults["infill_default"]) ??
      DEFAULT_JOB_STAGE_DEFAULTS.infill_default,
    powdercoatColourId:
      stageDefaults?.powdercoatColourId ??
      job?.powdercoatColourId ??
      DEFAULT_JOB_STAGE_DEFAULTS.powdercoatColourId ??
      null,
    wind_load:
      stageDefaults?.wind_load ??
      job?.wind_load ??
      DEFAULT_JOB_STAGE_DEFAULTS.wind_load,
    constraints: {
      minBarrierHeight:
        stageDefaults?.constraints?.minBarrierHeight ??
        job?.height_default ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.minBarrierHeight,
      maxBarrierHeight:
        stageDefaults?.constraints?.maxBarrierHeight ??
        job?.max_height_default ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxBarrierHeight,
      panelHeight:
        stageDefaults?.constraints?.panelHeight ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.panelHeight,
      maxPanelHeight:
        stageDefaults?.constraints?.maxPanelHeight ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxPanelHeight,
      maxPostSpacing:
        stageDefaults?.constraints?.maxPostSpacing ??
        job?.max_post_spacing ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxPostSpacing,
      maxBottomGap:
        stageDefaults?.constraints?.maxBottomGap ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.maxBottomGap,
      minPostLength:
        stageDefaults?.constraints?.minPostLength ??
        job?.height_default ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.minPostLength,
      laserLevelY:
        stageDefaults?.constraints?.laserLevelY ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.laserLevelY,
      topY:
        stageDefaults?.constraints?.topY ??
        job?.height_default ??
        DEFAULT_JOB_STAGE_DEFAULTS.constraints.topY,
    },
    template: {
      preset:
        stageDefaults?.template?.preset ??
        DEFAULT_JOB_STAGE_DEFAULTS.template?.preset,
    },
  };
}

export default function JobStageForm({
  customer,
  job,
  jobStage,
  techs,
  isEditable = true,
  isManager = false,
  existingBalconiesCount = 0,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasJobNumber = searchParams.has("jobId");
  const hasCustomerID = searchParams.has("customerId");

  // Track original defaults so we can detect changes
  const initialDefaultsRef = useRef(
    jobStage?.defaults ? JSON.stringify(jobStage.defaults) : "{}"
  );

  const defaultValues: insertJobStagesSchemaType = {
    jobId: jobStage?.jobId ?? job?.id ?? 1,
    stage: jobStage?.stage ?? 1,
    status: jobStage?.status ?? "draft",
    defaults: buildStageDefaultsForForm({ job, jobStage }),
    notes: jobStage?.notes ?? "",
  };

  type FormValues = z.infer<typeof insertJobStagesSchema>;

  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(insertJobStagesSchema) as Resolver<FormValues>,
    defaultValues,
  });

  const { isDirty } = form.formState;

  useEffect(() => {
    if (!jobStage) return;

    const nextDefaults = buildStageDefaultsForForm({ job, jobStage });

    form.reset({
      jobId: jobStage.jobId,
      stage: jobStage.stage,
      status: jobStage.status ?? "draft",
      defaults: nextDefaults,
      notes: jobStage.notes ?? "",
    });

    initialDefaultsRef.current = JSON.stringify(nextDefaults);
  }, [jobStage, job, form]);

  const {
    execute: executeSaveStage,
    result: saveStageResult,
    isPending: isSavingStage,
    reset: resetSaveStageAction,
  } = useAction(saveJobStageAction, {
    onSuccess({ data, input }) {
      if (data?.success) {
        toast.success(data.message);

        const nextJobNumber = job?.job_number;
        const nextStageNumber = input.stage;

        if (nextJobNumber && nextStageNumber) {
          setContinueHref(`/editor/${nextJobNumber}/${nextStageNumber}`);
          setContinueDialogOpen(true);
        }
      } else if (data?.message) {
        toast.error(data.message);
      }
    },
    onError() {
      toast.error("Saving stage failed");
    },
  });

  // For applying stage defaults to balconies
  const {
    execute: executeApplyStageDefaults,
    isPending: isApplyingStageDefaults,
  } = useAction(applyStageDefaultsToBalconiesAction, {
    onSuccess({ data }) {
      if (data?.message) {
        toast.success(data.message);
      } else {
        toast.success("Applied stage defaults to balconies.");
      }
    },
    onError() {
      toast.error("Failed to apply stage defaults to balconies.");
    },
  });

  function haveDefaultsChanged(currentDefaults: unknown) {
    const current = JSON.stringify(currentDefaults ?? {});
    return current !== initialDefaultsRef.current;
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStageData, setPendingStageData] =
    useState<insertJobStagesSchemaType | null>(null);
  const [continueDialogOpen, setContinueDialogOpen] = useState(false);
  const [continueHref, setContinueHref] = useState<string | null>(null);
  const [navDialogOpen, setNavDialogOpen] = useState(false);
  const [navHref, setNavHref] = useState<string | null>(null);

  function handleGoToJob() {
    const jobNumber = job?.job_number;
    const stageNumber = form.getValues("stage");

    if (!jobNumber || !stageNumber) return;

    const href = `/editor/${jobNumber}/${stageNumber}`;

    if (!isDirty) {
      router.push(href);
      return;
    }

    setNavHref(href);
    setNavDialogOpen(true);
  }

  async function submitForm(data: insertJobStagesSchemaType) {
    const currentDefaults = data.defaults ?? {};
    const defaultsChanged = haveDefaultsChanged(currentDefaults);
    const balconiesExist = existingBalconiesCount > 0;
    const isExistingStage = !!jobStage && !!job;

    // If this is an existing stage with balconies, and defaults changed,
    // we ask for confirmation before deciding whether to also update balconies.
    if (defaultsChanged && balconiesExist && isExistingStage) {
      setPendingStageData(data);
      setConfirmOpen(true);
      return;
    }

    // Normal save (e.g. no balconies or no change in defaults)
    executeSaveStage(data);
  }

  const defaults = form.watch("defaults") ?? buildStageDefaultsForForm({ job, jobStage });

  const effectiveDesign = defaults.design_default;
  const effectiveGlass = defaults.infill_default ?? job?.infill_default ?? "6.38mm Clear Laminate";
  const designRequiresGlass = designNeedsGlass(effectiveDesign);

  const updateDefaults = (
    patch: Partial<Omit<JobStageDefaults, "constraints" | "template">> & {
      constraints?: Partial<JobStageDefaults["constraints"]>
      template?: Partial<NonNullable<JobStageDefaults["template"]>>
    }
  ) => {
    const current = form.getValues("defaults") ?? buildStageDefaultsForForm({ job, jobStage });
    form.setValue(
      "defaults",
      {
        ...current,
        ...patch,
        constraints: {
          ...current.constraints,
          ...(patch.constraints ?? {}),
        },
        template: {
          ...current.template,
          ...(patch.template ?? {}),
        },
      },
      { shouldDirty: true }
    );
  };

  const { options: glassOptions, clashing: glassClashing } = getInfillOptionsForDesign(
    effectiveDesign,
    effectiveGlass
  );

  const { options: toprailOptions, clashing: toprailClashing } = getToprailOptionsForDesign(
    effectiveDesign,
    defaults.toprail_default ?? ""
  );

  const { options: anchorageOptions, clashing: anchorageClashing } = getAnchorageOptionsForDesign(
    effectiveDesign,
    defaults.anchorage_default ?? ""
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <DisplayServerActionResponse result={saveStageResult} />

      <ContinueToJobDialog
        open={continueDialogOpen}
        onOpenChange={setContinueDialogOpen}
        href={continueHref}
      />

      <ConfirmJobNavigationDialog
        open={navDialogOpen}
        onOpenChange={setNavDialogOpen}
        href={navHref}
      />

      {/* Confirmation dialog for applying defaults to balconies */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingStageData(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Apply updated stage defaults to balconies?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This stage already has balconies. You changed one or more stage
              defaults. <br />
              Do you want to apply these updated defaults to all balconies on
              this stage as well?
              <br />
              All changes to balconies will be revision-logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={async () => {
                if (!pendingStageData) return;
                executeSaveStage(pendingStageData);
                setPendingStageData(null);
              }}
            >
              Save stage only
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingStageData || !job || !jobStage) return;
                await executeSaveStage(pendingStageData);
                await executeApplyStageDefaults({
                  jobId: job.id,
                  jobStageId: jobStage.id,
                });
                setPendingStageData(null);
              }}
            >
              Save & apply to balconies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="bg-white rounded-md px-4 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 h-7 px-2.5 rounded-md text-[10px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {job ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rail-light-blue text-white text-[11px] font-bold tracking-wide flex-shrink-0">
              #{job.job_number}
            </span>
          ) : null}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">{customer.company}</span>
            {jobStage ? (
              <span className="text-[11px] text-gray-400 flex-shrink-0">· Stage {jobStage.stage}</span>
            ) : null}
          </div>
        </div>
        {isEditable ? (
          <div className="flex items-center gap-2">
            {job ? (
              <button
                type="button"
                onClick={handleGoToJob}
                className="flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Open in Editor
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                form.reset({
                  ...defaultValues,
                  defaults: buildStageDefaultsForForm({ job, jobStage }),
                });
                resetSaveStageAction();
              }}
              className="flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              form="stage-form"
              disabled={isSavingStage || isApplyingStageDefaults}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSavingStage || isApplyingStageDefaults ? (
                <><LoaderCircle className="animate-spin h-3 w-3" /> Saving…</>
              ) : "Save Stage"}
            </button>
          </div>
        ) : null}
      </div>

      <Form {...form}>
        <form
          id="stage-form"
          onSubmit={form.handleSubmit(submitForm)}
          className="flex gap-3 flex-1 min-h-0 overflow-hidden"
        >
          {/* Left column: Project details */}
          <div className="w-64 flex-shrink-0 flex flex-col">
            {job ? (
              <div className="bg-white rounded-xl p-4 flex flex-col gap-4 flex-1">
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
                  <span className="text-xs font-semibold text-gray-700">Job Defaults</span>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                    <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Design</span><span className="text-gray-700 font-medium">{job.design_default}</span></div>
                    <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Anchorage</span><span className="text-gray-700 font-medium">{job.anchorage_default}</span></div>
                    <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Toprail</span><span className="text-gray-700 font-medium">{job.toprail_default}</span></div>
                    <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Infill</span><span className="text-gray-700 font-medium">{job.infill_default}</span></div>
                    <div className="flex justify-between gap-2 text-[11px]"><span className="text-gray-400">Status</span><span className="text-gray-700 font-medium capitalize">{job.project_status}</span></div>
                  </div>
                </div>

                {job.notes ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">Notes</span>
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[11px] text-gray-600">{job.notes}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-4 flex flex-col gap-2 flex-1">
                <span className="text-xs font-semibold text-gray-700">Project</span>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="text-[11px] font-medium text-gray-800">{customer.company}</div>
                  <div className="text-[11px] text-gray-500">{customer.firstName} {customer.lastName}</div>
                </div>
              </div>
            )}
          </div>

          {/* Middle column: Railing defaults, wind load, constraints, template */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ScrollArea className="h-full">
            <div className="bg-white rounded-xl flex flex-col mr-2">
              <div className="p-4 flex flex-col gap-4">
              <span className="text-xs font-semibold text-gray-700">Railing Defaults</span>

              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Design</label>
                  <Select
                    value={defaults.design_default ?? "RD-D1"}
                    onValueChange={(v) => updateDefaults({ design_default: v as JobStageDefaults["design_default"] })}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-8 text-[11px]">
                        <SelectValue placeholder="Select design" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["RD-D1","RD-D2","RD-D3","RD-D3SLATS","RD-D4","RD-D4SLATS","RD-D5","RD-D6","RD-D7","RD-D8","RD-D9","RD-D10","RD-D11","RD-D12","RD-D13"].map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Infill</label>
                  <Select
                    value={defaults.infill_default ?? ""}
                    onValueChange={(v) => updateDefaults({ infill_default: v as JobStageDefaults["infill_default"] })}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-8 text-[11px]">
                        <SelectValue placeholder="Select infill" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {glassOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {designRequiresGlass && glassClashing && (
                    <span className="text-[10px] text-amber-600">
                      Infill &quot;{defaults.infill_default}&quot; is not valid for design {effectiveDesign}.
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Top rail</label>
                  <Select
                    value={defaults.toprail_default ?? ""}
                    onValueChange={(v) => updateDefaults({ toprail_default: v as JobStageDefaults["toprail_default"] })}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-8 text-[11px]">
                        <SelectValue placeholder="Select toprail" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {toprailOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {toprailClashing && (
                    <span className="text-[10px] text-amber-600">
                      Toprail &quot;{defaults.toprail_default}&quot; is not valid for design {effectiveDesign}.
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Anchorage</label>
                  <Select
                    value={defaults.anchorage_default ?? ""}
                    onValueChange={(v) => updateDefaults({ anchorage_default: v as JobStageDefaults["anchorage_default"] })}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-8 text-[11px]">
                        <SelectValue placeholder="Select anchorage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {anchorageOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {anchorageClashing && (
                    <span className="text-[10px] text-amber-600">
                      Anchorage &quot;{defaults.anchorage_default}&quot; is not valid for design {effectiveDesign}.
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 flex flex-col gap-3">
                <span className="text-xs font-semibold text-gray-700">Wind Load</span>

                <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Building height</label>
                    <Select
                      value={String(defaults.wind_load.bldg_height)}
                      onValueChange={(v) => updateDefaults({ wind_load: { ...defaults.wind_load, bldg_height: Number(v) } })}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-8 text-[11px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">&lt;30m</SelectItem>
                        <SelectItem value="50">&lt;50m</SelectItem>
                        <SelectItem value="75">&lt;75m</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Wind region</label>
                    <Select
                      value={defaults.wind_load.wind_region}
                      onValueChange={(v) => updateDefaults({ wind_load: { ...defaults.wind_load, wind_region: v as JobStageDefaults["wind_load"]["wind_region"] } })}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-8 text-[11px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">Region A</SelectItem>
                        <SelectItem value="B">Region B</SelectItem>
                        <SelectItem value="C">Region C</SelectItem>
                        <SelectItem value="D">Region D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Terrain cat.</label>
                    <Select
                      value={String(defaults.wind_load.terrain_category)}
                      onValueChange={(v) => updateDefaults({ wind_load: { ...defaults.wind_load, terrain_category: Number(v) } })}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-8 text-[11px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 flex flex-col gap-3">
                <span className="text-xs font-semibold text-gray-700">Constraints</span>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Min barrier height (mm)</label>
                    <input type="number" min={900} max={1800} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.minBarrierHeight)}
                      onChange={(e) => updateDefaults({ constraints: { minBarrierHeight: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Max barrier height (mm)</label>
                    <input type="number" min={900} max={1800} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.maxBarrierHeight)}
                      onChange={(e) => updateDefaults({ constraints: { maxBarrierHeight: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Panel height (mm)</label>
                    <input type="number" min={0} max={1800} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.panelHeight)}
                      onChange={(e) => updateDefaults({ constraints: { panelHeight: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Max panel height (mm)</label>
                    <input type="number" min={0} max={1800} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.maxPanelHeight)}
                      onChange={(e) => updateDefaults({ constraints: { maxPanelHeight: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Max post spacing (mm)</label>
                    <input type="number" min={0} max={2000} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.maxPostSpacing)}
                      onChange={(e) => updateDefaults({ constraints: { maxPostSpacing: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Max bottom gap (mm)</label>
                    <input type="number" min={0} max={1000} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.maxBottomGap)}
                      onChange={(e) => updateDefaults({ constraints: { maxBottomGap: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Min post length (mm)</label>
                    <input type="number" min={0} max={2000} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.minPostLength)}
                      onChange={(e) => updateDefaults({ constraints: { minPostLength: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-medium">Laser level Y (mm)</label>
                    <input type="number" min={-5000} max={5000} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.laserLevelY)}
                      onChange={(e) => updateDefaults({ constraints: { laserLevelY: Number(e.target.value) } })} />
                  </div>
                  <div className="flex flex-col gap-1 col-span-3">
                    <label className="text-[10px] text-gray-400 font-medium">Top Y (mm)</label>
                    <input type="number" min={-5000} max={5000} suppressHydrationWarning
                      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                      value={String(defaults.constraints.topY ?? defaults.constraints.minBarrierHeight)}
                      onChange={(e) => updateDefaults({ constraints: { topY: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 flex flex-col gap-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Template preset</label>
                <Select
                  value={defaults.template?.preset ?? "default-rectangular"}
                  onValueChange={(v) => updateDefaults({ template: { preset: v } })}
                >
                  <FormControl>
                    <SelectTrigger className="w-full h-8 text-[11px]">
                      <SelectValue placeholder="Select template preset" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="default-rectangular">Default rectangular</SelectItem>
                    <SelectItem value="default-rectangular2">Default rectangular2</SelectItem>
                    <SelectItem value="default-frameless">Default frameless</SelectItem>
                    <SelectItem value="default-frameless2">Default frameless2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>
            </div>
            </ScrollArea>
          </div>

          {/* Right column: Stage settings + notes */}
          <div className="w-64 flex-shrink-0 flex flex-col">
            <div className="bg-white rounded-xl p-4 flex flex-col gap-4 flex-1">
              <span className="text-xs font-semibold text-gray-700">Stage Settings</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Stage</label>
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <input
                      type="number"
                      disabled
                      suppressHydrationWarning
                      className="w-full rounded-md border bg-gray-50 px-2.5 py-1.5 text-[11px] text-gray-400 outline-none cursor-not-allowed"
                      value={field.value ?? ""}
                      onChange={() => {}}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Status</label>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full h-8 text-[11px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="started">Started</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Notes</label>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <textarea
                      disabled={!isEditable}
                      suppressHydrationWarning
                      className="flex-1 w-full rounded-md border bg-white px-2.5 py-2 text-[11px] text-gray-700 outline-none focus:ring-1 focus:ring-ring resize-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed min-h-32"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
