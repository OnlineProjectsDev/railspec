// /app/(rs)/jobs/stage/JobStageForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";

import { z } from "zod";
import { Form, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

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
import { LoaderCircle } from "lucide-react";
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
    <div className="flex flex-col gap-1 sm:px-8">
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
            {/* Save stage only, do NOT touch balconies */}
            <AlertDialogCancel
              onClick={async () => {
                if (!pendingStageData) return;
                executeSaveStage(pendingStageData);
                setPendingStageData(null);
              }}
            >
              Save stage only
            </AlertDialogCancel>

            {/* Save stage AND apply defaults to balconies */}
            <AlertDialogAction
              onClick={async () => {
                if (!pendingStageData || !job || !jobStage) return;

                // 1) Save the stage with its updated defaults
                await executeSaveStage(pendingStageData);

                // 2) Apply those defaults to all balconies on this stage
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

      <div>
        <h2 className="text-2xl font-bold">
          {job?.id && isEditable
            ? `Edit Job #${job.job_number}`
            : job?.job_number
            ? `View Job #${job.job_number}`
            : "New Job Form"}
        </h2>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submitForm)}
          className="flex flex-col md:flex-row gap-4 md:gap-8"
        >
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <p>
              {customer?.company}, {job?.job_number}, stage: {jobStage?.stage}
            </p>

            <div className="space-y-4 mt-4 p-3 border rounded-md">
              <h3 className="font-semibold">Stage Defaults</h3>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Design</label>
                <Select
                  value={defaults.design_default ?? "RD-D1"}
                  onValueChange={(v) => updateDefaults({ design_default: v as JobStageDefaults["design_default"] })}
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select design" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[
                      "RD-D1",
                      "RD-D2",
                      "RD-D3",
                      "RD-D3SLATS",
                      "RD-D4",
                      "RD-D4SLATS",
                      "RD-D5",
                      "RD-D6",
                      "RD-D7",
                      "RD-D8",
                      "RD-D9",
                      "RD-D10",
                      "RD-D11",
                      "RD-D12",
                      "RD-D13",
                    ].map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Infill</label>
                <Select
                  value={defaults.infill_default ?? ""}
                  onValueChange={(v) => updateDefaults({ infill_default: v as JobStageDefaults["infill_default"] })}
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select infill" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {glassOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {designRequiresGlass && glassClashing && (
                  <span className="text-xs text-amber-600">
                    Infill “{defaults.infill_default}” is not valid for design {effectiveDesign}.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Top rail</label>
                <Select
                  value={defaults.toprail_default ?? ""}
                  onValueChange={(v) => updateDefaults({ toprail_default: v as JobStageDefaults["toprail_default"] })}
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select toprail" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {toprailOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {toprailClashing && (
                  <span className="text-xs text-amber-600">
                    Toprail “{defaults.toprail_default}” is not valid for design {effectiveDesign}.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Anchorage</label>
                <Select
                  value={defaults.anchorage_default ?? ""}
                  onValueChange={(v) => updateDefaults({ anchorage_default: v as JobStageDefaults["anchorage_default"] })}
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select anchorage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {anchorageOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {anchorageClashing && (
                  <span className="text-xs text-amber-600">
                    Anchorage “{defaults.anchorage_default}” is not valid for design {effectiveDesign}.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Wind load</label>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Building height</span>
                  <Select
                    value={String(defaults.wind_load.bldg_height)}
                    onValueChange={(v) =>
                      updateDefaults({
                        wind_load: {
                          ...defaults.wind_load,
                          bldg_height: Number(v),
                        },
                      })
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Select building height" />
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
                  <span className="text-xs font-medium">Wind region</span>
                  <Select
                    value={defaults.wind_load.wind_region}
                    onValueChange={(v) =>
                      updateDefaults({
                        wind_load: {
                          ...defaults.wind_load,
                          wind_region: v as JobStageDefaults["wind_load"]["wind_region"],
                        },
                      })
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Select wind region" />
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
                  <span className="text-xs font-medium">Terrain category</span>
                  <Select
                    value={String(defaults.wind_load.terrain_category)}
                    onValueChange={(v) =>
                      updateDefaults({
                        wind_load: {
                          ...defaults.wind_load,
                          terrain_category: Number(v),
                        },
                      })
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Select terrain category" />
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

              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold">Constraint Defaults</h4>

                <label className="text-sm font-medium">Min barrier height (mm)</label>
                <input
                  type="number"
                  min={900}
                  max={1800}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.minBarrierHeight)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        minBarrierHeight: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Max barrier height (mm)</label>
                <input
                  type="number"
                  min={900}
                  max={1800}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.maxBarrierHeight)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        maxBarrierHeight: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Panel height (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={1800}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.panelHeight)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        panelHeight: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Max panel height (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={1800}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.maxPanelHeight)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        maxPanelHeight: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Max post spacing (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.maxPostSpacing)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        maxPostSpacing: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Max bottom gap (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.maxBottomGap)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        maxBottomGap: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Min post length (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.minPostLength)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        minPostLength: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Laser level Y (mm)</label>
                <input
                  type="number"
                  min={-5000}
                  max={5000}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.laserLevelY)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        laserLevelY: Number(e.target.value),
                      },
                    })
                  }
                />

                <label className="text-sm font-medium">Top Y (mm)</label>
                <input
                  type="number"
                  min={-5000}
                  max={5000}
                  className="input w-full max-w-xs"
                  value={String(defaults.constraints.topY ?? defaults.constraints.minBarrierHeight)}
                  suppressHydrationWarning
                  onChange={(e) =>
                    updateDefaults({
                      constraints: {
                        topY: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Template preset</label>
                <Select
                  value={defaults.template?.preset ?? "default-rectangular"}
                  onValueChange={(v) =>
                    updateDefaults({
                      template: {
                        preset: v,
                      },
                    })
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-xs">
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

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <NumberInputWithLabel<insertJobStagesSchemaType>
              fieldTitle="Stage"
              nameInSchema="stage"
              min={1}
              max={10}
              disabled={true}
            />

            <SelectWithLabel<insertJobStagesSchemaType>
              fieldTitle="Status"
              nameInSchema="status"
              data={[
                { id: "draft", description: "Draft" },
                { id: "started", description: "Started" },
                { id: "completed", description: "Completed" },
              ]}
            />

            <TextAreaWithLabel<insertJobStagesSchemaType>
              fieldTitle="Notes"
              nameInSchema="notes"
              className="h-96"
              disabled={!isEditable}
            />

            {isEditable ? (
              <div className="flex gap 2">
                <Button
                  type="submit"
                  className="w-2/4"
                  variant="default"
                  title="Save"
                  disabled={isSavingStage || isApplyingStageDefaults}
                >
                  {isSavingStage || isApplyingStageDefaults ? (
                    <>
                      <LoaderCircle className="animate-spin" /> Saving
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  title="Reset"
                  onClick={() => {
                    form.reset({
                      ...defaultValues,
                      defaults: buildStageDefaultsForForm({ job, jobStage }),
                    });
                    resetSaveStageAction();
                  }}
                >
                  Reset
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  title="To Job"
                  onClick={handleGoToJob}
                >
                  To Job
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-lg">Job Info</h3>
            <hr className="w-4/5" />
            <p>
              Client: {customer.company} - {customer.firstName}{" "}
              {customer.lastName}
            </p>
            <p>Address: {job?.address1}</p>
            {job?.address2 ? <p>{job?.address2}</p> : null}
            <p>
              City: {job?.city}, {job?.zip}
            </p>

            <hr className="w-4/5" />

            <p>Status: {job?.project_status}</p>
            <p>Design: {job?.design_default}</p>
            <p>Anchorage: {job?.anchorage_default}</p>
            <p>Top rail: {job?.toprail_default}</p>
            <p>Infill: {job?.infill_default}</p>
            <p>Wind load: {JSON.stringify(job?.wind_load)}</p>
            <p>Notes: {job?.notes}</p>
            <hr className="w-4/5" />
          </div>
        </form>
      </Form>
    </div>
  );
}
