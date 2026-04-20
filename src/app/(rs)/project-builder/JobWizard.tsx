// /app/(rs)/project-builder/JobWizard.tsx
"use client"

import { useAction } from "next-safe-action/hooks";
import { saveJobAction } from "@/app/actions/savejobActions";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { DisplayServerActionResponse } from "@/components/DisplayServerActionResponse";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/project-builder-components/header";
import { HeaderSkeleton, SidebarSkeleton, PreviewSkeleton } from "@/components/project-builder-components/loading-skeleton";
import WelcomeScreen from "@/components/project-builder-components/welcome-screen";
import { useForm, Resolver, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { insertJobSchema, selectJobSchemaType, type insertJobSchemaType} from "@/zod-schemas/jobs";

import { NumberInputWithLabel } from "@/components/inputs/NumberWithLabel";
import { InputWithLabel } from "@/components/inputs/InputWithLabel";

import MainProjectDetailsStep from "@/components/project-builder-components/steps/main-project-details-step";
import { selectCustomerSchemaType } from "@/zod-schemas/customer";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DesignStep from "@/components/project-builder-components/steps/design-step";
import InfillStep from "@/components/project-builder-components/steps/infill-step";
import { designNeedsGlass, getAnchorageOptionsForDesign, getGlassOptionsForDesign, getInfillOptionsForDesign, getToprailOptionsForDesign } from "@/lib/jobDesignRules";
import AnchorageStep from "@/components/project-builder-components/steps/anchorage-step";
import ToprailStep from "@/components/project-builder-components/steps/toprail-step";
import DesignConstraintsStep from "@/components/project-builder-components/steps/DesignConstraintsStep";
import ColourStep, { PowdercoatColour } from "@/components/project-builder-components/steps/colour-step";
import OverviewStep from "@/components/project-builder-components/steps/overview-step";
import ContinueToJobDialog from "@/components/ContinueToJobDialog";
import ConfirmJobNavigationDialog from "@/components/ConfirmJobNavigationDialog";
import { DropAnalyser } from "./previewAnalyser"
import { getMaxPostCentresSpacingMm } from "@/lib/jobDesignRules"
import { useBuilderNavStore } from "@/lib/builderNavStore";



type SidebarHeaderProps = {
  currentStep: number;
  steps: { id: number; name: string; key: string }[];
  canProceed: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
};


const STEPS = [
    { id: 1, name: "Project Details", key: "projectDetails"},
    { id: 2, name: "Design", key: "design"},
    { id: 3, name: "Infill", key: "infill"},
    { id: 4, name: "Anchorage", key: "anchorage"},
    { id: 5, name: "Toprail", key: "toprail"},
    { id: 6, name: "Constraints", key: "constraints"},
    { id: 7, name: "Colour", key: "colour" },
    { id: 8, name: "Overview", key: "overview" },

]

type JobWizardProps = {
  isRailsafeEmployee: boolean;
  customers: selectCustomerSchemaType[];
  currentCustomer: selectCustomerSchemaType | null;
  colours: PowdercoatColour[];
  initialJobNumber?: number;
  job?: selectJobSchemaType | null;
};

function SidebarHeader({
  currentStep,
  steps,
  canProceed,
  onNextStep,
  onPrevStep,
}: SidebarHeaderProps) {
  const step = steps.find((s) => s.id === currentStep);
  const title = step?.name ?? "Step";

  const isFirst = currentStep <= 1;
  const isLast = currentStep >= steps.length;

  return (
    <motion.div
      className="px-4 py-3.5 border-b flex items-center justify-between"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Step {currentStep} of {steps.length}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Prev */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              suppressHydrationWarning 
              onClick={onPrevStep}
              disabled={isFirst}
              className={`w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all duration-200 ${
                isFirst ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <ChevronLeft size={12} />
            </button>
          </TooltipTrigger>
          {!isFirst && (
            <TooltipContent>
              <p>Previous step</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Next */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              suppressHydrationWarning 
              onClick={onNextStep}
              disabled={!canProceed || isLast}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                !isLast && canProceed
                  ? "bg-rail-light-blue hover:bg-[#2a2a2a] text-white cursor-pointer"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              <ChevronRight size={12} />
            </button>
          </TooltipTrigger>
          {!isLast && (
            <TooltipContent>
              <p>Next step</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </motion.div>
  );
}

type FormValues = z.infer<typeof insertJobSchema>;

function ColourStepFormWrapper({
  colours,
  isLoading = false,
}: {
  colours: PowdercoatColour[];
  isLoading?: boolean;
}) {
  const form = useFormContext<FormValues>();
  const selectedId = (form.watch("powdercoatColourId") as number | null) ?? null;

  const handleSelect = (id: number) => {
    form.setValue("powdercoatColourId", id, { shouldDirty: true });
  };

  return (
    <ColourStep
      colours={colours}
      selectedColorId={selectedId}
      onSelect={handleSelect}
      isLoading={isLoading}
    />
  );
}





export default function JobWizard({
  isRailsafeEmployee,
  customers,
  currentCustomer,
  colours,
  initialJobNumber = 1,
  job,
}: JobWizardProps)  {

        const [builderState, setBuilderState] = useState<'welcome' | 'transitioning' | 'loading' | 'builder'>('builder');
        const [currentStep, setCurrentStep] = useState(1);
        const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
        const router = useRouter();
        const [continueDialogOpen, setContinueDialogOpen] = useState(false);
        const [continueHref, setContinueHref] = useState<string | null>(null);
        const [stayHereHref, setStayHereHref] = useState<string | null>(null);
        const [navDialogOpen, setNavDialogOpen] = useState(false);
        const [navHref, setNavHref] = useState<string | null>(null);
        const [availableColours, setAvailableColours] = useState<PowdercoatColour[]>(colours);
    
        useEffect(() => {
            document.title = "Project Setup | RailSpec"
        }, [])
    
        const [selectedData, setSelectedData] = useState<insertJobSchemaType>({
            id: '(New)',
            job_number: initialJobNumber,
            stage: 1,
            customerId: currentCustomer?.id ?? 1,
            address1: "",
            address2: "",
            city: "",
            zip: "",
            project_status: 0,
            measurer: "",
            height_default: 1020,
            max_height_default: 1200,
            max_post_spacing: 1280,
            design_default: "RD-D1",
            anchorage_default: "BP",
            toprail_default: "Elite",
            infill_default: "6.38mm Clear Laminate",
            wind_load: { bldg_height: 30, wind_region: "A", terrain_category: 2 },
            notes: "",
        })

    const [jobNumberClash, setJobNumberClash] = useState<{
        exists: boolean;
        jobId?: number;
        job_number?: number;
        stage?: number;
    } | null>(null);
        

    const handleStartBuilder = (projectName: string) => {
    setSelectedData({
      ...selectedData,
      // projectName: projectName
    });
    
      // Show transitioning state for 2000ms (for the animation in welcome screen)
      setBuilderState('transitioning');
      
      setTimeout(() => {
        // Then switch to loading state
        setBuilderState('loading');
        
        // After 1.5 seconds, switch to fully loaded builder
        setTimeout(() => {
          setBuilderState('builder');
        }, 1500);
      }, 2000);
    };

    const handleNextStep = () => {
        if (!canProceedFromStep(currentStep)) return;

        setCurrentStep((prev) =>
            prev < STEPS.length ? prev + 1 : prev
        );
    };


    const handlePrevStep = () => {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
      }
    };

    const handleStepClick = (targetStepId: number) => {
        if (targetStepId === currentStep) return;

        // Always allow going backwards
        if (targetStepId < currentStep) {
            setCurrentStep(targetStepId);
            return;
        }

        // To go forwards, ensure *all previous steps* are valid
        for (let s = 1; s <= targetStepId - 1; s++) {
            if (!canProceedFromStep(s)) {
            // Block jump if any earlier step is invalid
            return;
            }
        }

        setCurrentStep(targetStepId);
    };


    const emptyValues: insertJobSchemaType = {
        id: '(New)',
        job_number: initialJobNumber,
        stage: 1,
        customerId: currentCustomer?.id ?? 1,
        address1: "",
        address2: "",
        city: "",
        zip: "",
        project_status: 0,
        measurer: "",
        height_default: 1020,
        max_height_default: 1200,
        max_post_spacing: 1280,
        design_default: "RD-D1",
        anchorage_default: "BP",
        toprail_default: "Elite",
        infill_default: "6.38mm Clear Laminate",
        wind_load: { bldg_height: 30, wind_region: "A", terrain_category: 2 },
        notes: "",
    }
        
    const defaultValues: insertJobSchemaType = job
  ? {
      id: job.id, // 👈 numeric id for EDIT
      job_number: job.job_number,
      stage: job.stage ?? 1,
      customerId: job.customerId,
      address1: job.address1 ?? "",
      address2: job.address2 ?? "",
      city: job.city ?? "",
      zip: job.zip ?? "0000",
      project_status: job.project_status ?? 0,
      measurer: job.measurer ?? "",
      height_default: job.height_default ?? 1020,
      max_height_default: job.max_height_default ?? 1200,
      max_post_spacing: job.max_post_spacing ?? 1280,
      design_default: job.design_default ?? "RD-D1",
      anchorage_default: job.anchorage_default ?? "BP",
      toprail_default: job.toprail_default ?? "Elite",
      infill_default: job.infill_default ?? "6.38mm Clear Laminate",
      wind_load:
        job.wind_load ?? {
          bldg_height: 30,
          wind_region: "A",
          terrain_category: 2,
        },
      notes: job.notes ?? "",
      powdercoatColourId: job.powdercoatColourId ?? null,
    }
  : emptyValues;



    

    const form = useForm<FormValues>({
        mode: 'onBlur',
        resolver: zodResolver(insertJobSchema) as Resolver<FormValues>,
        defaultValues
    });

    const { isDirty } = form.formState;

    const {
        execute: executeSave,
        result: saveResult,
        isPending: isSaving,
        reset: resetSaveAction,
        } = useAction(saveJobAction, {
        onSuccess({ data, input }) {
            if (data?.message) {
            toast.success(data.message);
            } else {
            toast.success("Job saved");
            }

            if (input.job_number && input.stage) {
              setContinueHref(`/editor/${input.job_number}/${input.stage}`);
              setStayHereHref(`/project-builder/${input.job_number}`);
              setContinueDialogOpen(true);
            }
        },
        onError() {
            toast.error("Save failed");
        },
    });


    const values = form.watch(); // used for step validation
    const watchedJobNumber = values.job_number;
    const watchedStage = values.stage;
    const watchedId = values.id;

    // Sync back-to-job link into the nav store for the top Header
    const { setBackToJob, clearBackToJob } = useBuilderNavStore();
    useEffect(() => {
        if (job?.job_number && job?.stage) {
            setBackToJob(`/editor/${job.job_number}/${job.stage}`, job.job_number);
        }
        return () => { clearBackToJob(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.job_number, job?.stage]);

    // Re-fetch colours whenever the relevant design selections change
    useEffect(() => {
        const params = new URLSearchParams();
        if (values.design_default)    params.set("design",    values.design_default);
        if (values.infill_default)    params.set("infill",    values.infill_default);
        if (values.toprail_default)   params.set("toprail",   values.toprail_default);
        if (values.anchorage_default) params.set("anchorage", values.anchorage_default);

        const controller = new AbortController();
        fetch(`/colours?${params.toString()}`, { signal: controller.signal })
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) setAvailableColours(data); })
            .catch(() => {});
        return () => controller.abort();
    }, [values.design_default, values.infill_default, values.toprail_default, values.anchorage_default]);

    useEffect(() => {
        // Only check for NEW jobs
        if (watchedId !== "(New)") {
            setJobNumberClash(null);
            return;
        }

        // Need both job_number and stage to check
        if (!watchedJobNumber || !watchedStage) {
            setJobNumberClash(null);
            return;
        }

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            try {
            const params = new URLSearchParams({
                job_number: String(watchedJobNumber),
                stage: String(watchedStage),
            });

            const res = await fetch(`/jobs/check-number?${params.toString()}`, {
                signal: controller.signal,
            });

            if (!res.ok) {
                // You can log but don't hard-fail the wizard
                console.warn("Job number check failed");
                setJobNumberClash(null);
                return;
            }

            const data = (await res.json()) as {
                exists: boolean;
                jobId?: number;
                job_number?: number;
                stage?: number;
            };

            if (data.exists) {
                setJobNumberClash(data);
            } else {
                setJobNumberClash(null);
            }
            } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Error checking job number:", err);
            }
            setJobNumberClash(null);
            }
        }, 400); // small debounce so it doesn’t fire on every keystroke

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [watchedId, watchedJobNumber, watchedStage]);

    const canProceedFromStep = (stepId: number): boolean => {
        const design = values.design_default ?? null;
        const requiresGlass = designNeedsGlass(design);

        switch (stepId) {
            case 1:
            return (
                !!values.job_number &&
                !!values.customerId &&
                !!values.address1 &&
                !!values.city &&
                !!values.zip &&
                !jobNumberClash
            );

            case 2:
            // (You could also validate against allowed design list later)
            return !!values.design_default;

            case 3: {
              const { clashing } = getInfillOptionsForDesign(
                design,
                values.infill_default ?? null
              );

              return !!values.infill_default && !clashing;
            }

            case 4: {
            const { clashing } = getAnchorageOptionsForDesign(
                design,
                values.anchorage_default ?? null
            );

            return !!values.anchorage_default && !clashing;
            }

            case 5: {
            const { clashing } = getToprailOptionsForDesign(
                design,
                values.toprail_default ?? null
            );

            return !!values.toprail_default && !clashing;
            }

            case 6: {
              if (
                values.height_default == null ||
                values.max_height_default == null ||
                values.max_post_spacing == null
              ) {
                return false;
              }

              if (values.max_height_default < values.height_default) {
                return false;
              }

              const rulesMax = getMaxPostCentresSpacingMm({
                design: values.design_default ?? null,
                wind: values.wind_load, // per your note, always present in wizard
                balustradeHeightMm: values.height_default +1,
              });

              const cap = Math.min(rulesMax ?? Infinity, 1280);

              return values.max_post_spacing <= cap;
            }

            case 7:
                // Colour is optional at the moment
                return true;
            case 8:
                // Overview is just a preview; reaching it already means earlier steps passed
                return true;

            default:
            return true;
        }
    };

    const canProceedCurrent = canProceedFromStep(currentStep);

    function handleGoToJob() {
      const values = form.getValues();

      if (!values.job_number || !values.stage) return;

      const href = `/editor/${values.job_number}/${values.stage}`;

      if (!isDirty) {
        router.push(href);
        return;
      }

      setNavHref(href);
      setNavDialogOpen(true);
    }

    function handleStayInBuilderAfterSave() {
      if (!stayHereHref) return;
      router.push(stayHereHref);
    }

  const canProceed = () => {
  const requiresGlass = designNeedsGlass(values.design_default);
  const design = values.design_default ?? null;

  switch (currentStep) {
    case 1:
      return (
        !!values.job_number &&
        !!values.customerId &&
        !!values.address1 &&
        !!values.city &&
        !!values.zip
      );

    case 2:
      // you could later also validate against getDesignOptionsForWindLoad(...)
      return !!values.design_default;

    case 3: {
      // In your current InfillStep, clashing only exists for glass-required designs
      if (!requiresGlass) {
        // non-glass designs: no rule-based clash yet, so always ok
        return true;
      }

      const { clashing } = getGlassOptionsForDesign(
        design,
        values.infill_default ?? null
      );

      return !!values.infill_default && !clashing;
    }

    case 4: {
      const { clashing } = getAnchorageOptionsForDesign(
        design,
        values.anchorage_default ?? null
      );

      return !!values.anchorage_default && !clashing;
    }

    case 5: {
      const { clashing } = getToprailOptionsForDesign(
        design,
        values.toprail_default ?? null
      );

      return !!values.toprail_default && !clashing;
    }

    default:
      return true;
  }
};

    const handleReset = () => {
    setCurrentStep(1);
    setSelectedData({
        id: '(New)',
        job_number: initialJobNumber,
        stage: 1,
        customerId: currentCustomer?.id ?? 1,
        address1: "",
        address2: "",
        city: "",
        zip: "",
        project_status: 0,
        measurer: "",
        height_default: 1020,
        max_height_default: 1200,
        max_post_spacing: 1280,
        design_default: "RD-D1",
        anchorage_default: "BP",
        toprail_default: "Elite",
        infill_default: "6.38mm Clear Laminate",
        wind_load: { bldg_height: 30, wind_region: "A", terrain_category: 2 },
        notes: "",
    });
    setBuilderState('welcome');
  };

    async function submitForm(data: FormValues) {
        // Same behaviour as JobForm: run server action
        console.log("Wizard submit:", data);
        executeSave(data);
    }

    const colourId = form.watch("powdercoatColourId");

    // Find the object from props.colours
    const selectedColour = colours.find(c => c.id === colourId) ?? null;
    // console.log(selectedColour)

    const previewMaxSpacing = values.max_post_spacing ?? 1000;
    const previewHeight = values.height_default ?? 1020;

    const previewFoundationArray = useMemo(() => [
      {id:1, type:'F', length: 2*previewMaxSpacing + 180, angle:180, offset:90, sections:1, height:0, x:0, z:-90, y:previewHeight},
      {id:2, type:'F', length: previewMaxSpacing + 180, angle:90, offset:90, sections:0, height:0, x:2*previewMaxSpacing + 180, z:-90, y:previewHeight},
      {id:3, type:'F', length:0, angle:180, offset:90, sections:0, height:0, x:2*previewMaxSpacing + 180, z:2*previewMaxSpacing + 90, y:previewHeight},
    ], [previewMaxSpacing, previewHeight]);

    const previewPostsArray = useMemo(() => [
      {id:1, post_id:1, type:'BP', length:previewMaxSpacing, angle:180, reversed:false, height:0, x:0, z:0, y_ref1:previewHeight, y_ref2:989, y_ref3:80},
      {id:2, post_id:2, type:'BP', length:previewMaxSpacing, angle:180, reversed:false, height:0, x:previewMaxSpacing, z:0, y_ref1:previewHeight, y_ref2:989, y_ref3:80},
      {id:3, post_id:3, type:'BP', length:previewMaxSpacing, angle:90, reversed:false, height:0, x:2*previewMaxSpacing, z:0, y_ref1:previewHeight, y_ref2:989, y_ref3:80},
      {id:4, post_id:4, type:'BP', length:0, angle:180, reversed:false, height:0, x:2*previewMaxSpacing, z:previewMaxSpacing, y_ref1:previewHeight, y_ref2:989, y_ref3:80},
    ], [previewMaxSpacing, previewHeight]);

  return (
              <div className={`flex-1 min-h-0 flex flex-col gap-4 min-w-0 ${builderState !== 'welcome' ? '' : ''}` }>
                {/* Header - shows skeleton when loading */}
                {builderState === 'welcome' || builderState === 'transitioning' ? null : builderState === 'loading' ? (
                  <HeaderSkeleton />
                ) : (
                  <Header 
                    steps={STEPS}
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    onReset={handleReset}
                    selectedData={selectedData}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                )}
    
                {/* Content area with sidebar and preview */}
                <div className="flex gap-4 flex-1 min-h-0 min-w-0">
                  {/* Welcome/Sidebar/Loading */}
                  {builderState === 'welcome' || builderState === 'transitioning' ? (
                    <div className="rounded-md flex flex-col w-full h-full">
                      <div className="h-full flex items-center justify-center">
                        <WelcomeScreen onStart={handleStartBuilder} isTransitioning={builderState === 'transitioning'} />
                      </div>
                    </div>
                  ) : builderState === 'loading' ? (
                    <SidebarSkeleton />
                  ) : (
                    <div className="bg-white rounded-md flex flex-col w-[26%] flex-shrink-0 min-h-0">
                        {/* Header stays fixed */}
                        <SidebarHeader
                        currentStep={currentStep}
                        steps={STEPS}
                        canProceed={canProceedCurrent}
                        onNextStep={handleNextStep}
                        onPrevStep={handlePrevStep}
                        />

                        <DisplayServerActionResponse result={saveResult} />
                        <ContinueToJobDialog
                          open={continueDialogOpen}
                          onOpenChange={setContinueDialogOpen}
                          href={continueHref}
                          onStayHere={handleStayInBuilderAfterSave}
                        />
                        <ConfirmJobNavigationDialog
                          open={navDialogOpen}
                          onOpenChange={setNavDialogOpen}
                          href={navHref}
                        />
                        {/* Step content area: single scroll container */}
                        <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(submitForm)}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex-1 min-h-0 px-4 pt-3 pb-4 flex flex-col"
                            >
                                {currentStep === 1 && (
                                <MainProjectDetailsStep
                                    isEditable={isRailsafeEmployee}
                                    isRailsafeEmployee={isRailsafeEmployee}
                                    customers={customers}
                                    currentCustomer={currentCustomer}
                                    jobNumberClash={jobNumberClash} 
                                />
                                )}

                                {currentStep === 2 && <DesignStep />}

                                {currentStep === 3 && <InfillStep />}

                                {currentStep === 4 && <AnchorageStep />}

                                {currentStep === 5 && <ToprailStep />}

                                {currentStep === 6 && <DesignConstraintsStep />}

                                {currentStep === 7 && (
                                <ColourStepFormWrapper colours={availableColours} />
                                )}

                                {currentStep === 8 && <OverviewStep customers={customers} colours={availableColours} />}


                            </motion.div>
                            </AnimatePresence>
                            </div>

                            {currentStep === 8 && (
                                <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
                                    <Button
                                    type="submit"
                                    disabled={isSaving}
                                    suppressHydrationWarning 
                                    className="w-full bg-rail-light-blue hover:bg-[#2a2a2a] text-white font-medium py-2.5 px-4 rounded-md transition-colors"
                                    >
                                    {isSaving ? (
                                    <>
                                        <LoaderCircle className="animate-spin" size={16} />
                                        Saving…
                                        </>
                                    ) : (
                                        "Submit Project"
                                    )}
                                    </Button>
                                </div>
                                )}

                        </form>
                        </Form>
                    </div>
                )}
    
                  {/* Preview - white card */}
                  {builderState === 'welcome' || builderState === 'transitioning' ? null : builderState === 'loading' ? (
                    <PreviewSkeleton />
                  ) : (
                    <div className="bg-white rounded-md flex-1 min-w-0">
                      <DropAnalyser balcony={{
                        jobId: 0,
                        jobStageId: 0,
                        drop: "",
                        balconyNo: "",
                        foundationArray: previewFoundationArray,
                        postsArray: previewPostsArray,
                        heightMm: values.height_default,
                        panelMm: (values.height_default ?? 1020) - (values.design_default === "RD-D5" ? 20 : 80),
                        max_spacing: values.max_post_spacing ?? 1280,
                        fflMm: values.anchorage_default === "SF" ? 200 : 0,
                        ffl_use: true,
                        design: values.design_default,
                        anchorage: values.anchorage_default === "SF" ? "SFI" : values.anchorage_default,
                        toprail: values.toprail_default,
                        infill: values.infill_default,
                        powdercoatcolour: {
                          id: selectedColour?.id ?? null,
                          hex: selectedColour?.hex ?? "#cccccc",
                          name: selectedColour?.name ?? null,
                          range: selectedColour?.range ?? null,
                        },
                        metadata: '',
                        notes: '',
                        version: 1,
                        isDeleted: false
                      }} />
                    </div>
                  )}
                </div>
              </div>

  );
}
