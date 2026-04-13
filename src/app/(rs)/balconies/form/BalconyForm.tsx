// Filename: BalconyForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import Link from "next/link";

import { Form, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { InputWithLabel } from "@/components/inputs/InputWithLabel";
import { NumberInputWithLabel } from "@/components/inputs/NumberWithLabel";
import { SelectWithLabel } from "@/components/inputs/SelectWithLabel";
import { TextAreaWithLabel } from "@/components/inputs/TextAreaWithLabel";
import { CheckboxWithLabel } from "@/components/inputs/CheckboxWithLabel";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { DisplayServerActionResponse } from "@/components/DisplayServerActionResponse";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";

import { saveBalconyAction } from "@/app/actions/saveBalconyAction";

import { type selectCustomerSchemaType } from "@/zod-schemas/customer";
import { type selectJobSchemaType } from "@/zod-schemas/jobs";
import { type selectJobStagesSchemaType } from "@/zod-schemas/jobstages";
import {
  insertBalconySchema,
  type insertBalconySchemaType,
  type selectBalconySchemaType,
} from "@/zod-schemas/balconies";

import { getAnchorageOptionsForDesign, getInfillOptionsForDesign, getToprailOptionsForDesign } from "@/lib/jobDesignRules";

/** =========================
 *  Props
 *  ========================= */
type Props = {
  customer: selectCustomerSchemaType;
  job: selectJobSchemaType;
  jobStage: selectJobStagesSchemaType;
  balcony?: selectBalconySchemaType;
  existingBalconies: selectBalconySchemaType[]; // 👈 NEW
  isEditable?: boolean;
  isManager?: boolean | undefined;
  color?: { hex: number; name: string };
};

/** =========================
 *  Component
 *  ========================= */
export default function BalconyForm({
  customer,
  job,
  jobStage,
  balcony,
  existingBalconies,
  isEditable = true,
  color,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** -------------------------
   *  Default values
   *  ------------------------ */

  // Derive sensible defaults from job + jobStage defaults
  const designDefault =
    balcony?.design ??
    (jobStage?.defaults as any)?.design_default ??
    job?.design_default ??
    "RD-D1";

  const anchorageDefault =
    balcony?.anchorage ??
    (jobStage?.defaults as any)?.anchorage_default ??
    job?.anchorage_default ??
    "BP";

  const toprailDefault =
    balcony?.toprail ??
    (jobStage?.defaults as any)?.toprail_default ??
    job?.toprail_default ??
    "Elite";

  const infillDefault =
    balcony?.infill ??
    (jobStage?.defaults as any)?.infill_default ??
    job?.infill_default ??
    "6.38mm Clear Laminate";

  // For a brand new balcony, infer drop + balconyNo from the newest existing one
  const { drop: defaultDrop, balconyNo: defaultBalconyNo } = getDefaultDropAndBalconyNo(existingBalconies);

  const isNew = !balcony; // 👈 new balcony if no DB row

  // UI-only template selector; not part of Zod schema
  const [templateKey, setTemplateKey] = useState<"simple" | "empty">("simple");

  // Starter templates used only when creating a new balcony
  const simpleFoundationTemplate = [
    {
      id: 0,
      type: "F",
      length: 90,
      angle: 180,
      offset: 90,
      sections: 1,
      height: 0,
      x: 0,
      z: -90,
      y: 1020,
    },
    {
      id: 1,
      type: "F",
      length: 1000,
      angle: 180,
      offset: 90,
      sections: 1,
      height: 0,
      x: 0,
      z: -90,
      y: 1020,
    },
    {
      id: 2,
      type: "F",
      length: 0,
      angle: 180,
      offset: 90,
      sections: 0,
      height: 0,
      x: 1000,
      z: -90,
      y: 1020,
    },
  ];

  const simplePostsTemplate = [
    {
      id: 1,
      post_id: 1,
      type: "BP",
      length: 1000,
      angle: 180,
      reversed: false,
      height: 0,
      x: 0,
      z: 0,
      y_ref1: 1020,
      y_ref2: 989,
      y_ref3: 80,
    },
    {
      id: 2,
      post_id: 2,
      type: "BP",
      length: 0,
      angle: 180,
      reversed: false,
      height: 0,
      x: 1000,
      z: 0,
      y_ref1: 1020,
      y_ref2: 989,
      y_ref3: 80,
    },
  ];

  // console.log(color)

  const emptyValues: insertBalconySchemaType = {
    id: "(New)",
    jobId: job.id,
    jobStageId: jobStage.id,

    drop: defaultDrop,
    balconyNo: defaultBalconyNo,

    color: color ?? balcony?.color ?? { hex: 0xaaaaaa, name: "TBD" },
    foundationArray: simpleFoundationTemplate,
    postsArray: simplePostsTemplate,
    foundationArrayRaw: simpleFoundationTemplate,
    postsArrayRaw: simplePostsTemplate,

    heightMm: (jobStage?.defaults as any)?.height_default ?? job?.height_default ?? 1020,

    panelMm: 950,
    fflMm: 0,
    ffl_use: false,

    design: designDefault,
    anchorage: anchorageDefault,
    toprail: toprailDefault,
    infill: infillDefault,

    metadata: {},
    notes: "",

    version: 1,
    isDeleted: false,
  };

  const defaultValues: insertBalconySchemaType = balcony
    ? {
        // existing balcony
        id: balcony.id ?? "(New)",
        jobId: balcony.jobId,
        jobStageId: balcony.jobStageId,

        drop: balcony.drop,
        balconyNo: balcony.balconyNo,

        color: color ?? balcony.color ?? { hex: 0xaaaaaa, name: "TBD" },
        foundationArray: balcony.foundationArray ?? simpleFoundationTemplate,
        postsArray: balcony.postsArray ?? simplePostsTemplate,
        foundationArrayRaw: balcony.foundationArrayRaw ?? balcony.foundationArray ?? simpleFoundationTemplate,
        postsArrayRaw: balcony.postsArrayRaw ?? balcony.postsArray ?? simplePostsTemplate,

        heightMm: balcony.heightMm ?? (jobStage?.defaults as any)?.height_default ?? job?.height_default ?? 1020,
        panelMm: balcony.panelMm ?? 1020,
        fflMm: balcony.fflMm ?? 0,
        ffl_use: balcony.ffl_use ?? false,

        design: balcony.design ?? designDefault,
        anchorage: balcony.anchorage ?? anchorageDefault,
        toprail: balcony.toprail ?? toprailDefault,
        infill: balcony.infill ?? infillDefault,

        metadata: balcony.metadata ?? {},
        notes: balcony.notes ?? "",

        version: balcony.version ?? 1,
        isDeleted: balcony.isDeleted ?? false,
      }
    : emptyValues;

  type FormValues = z.infer<typeof insertBalconySchema>;

  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(insertBalconySchema) as Resolver<FormValues>,
    defaultValues,
  });

  // Keep form in sync if parent passes a different balcony (route change)
  useEffect(() => {
    if (!balcony) return;
    form.reset({
      id: balcony.id ?? "(New)",
      jobId: balcony.jobId,
      jobStageId: balcony.jobStageId,

      drop: balcony.drop,
      balconyNo: balcony.balconyNo,

      color: color ?? balcony.color ?? { hex: 0xaaaaaa, name: "TBD" },
      foundationArray: balcony.foundationArray ?? simpleFoundationTemplate,
      postsArray: balcony.postsArray ?? simplePostsTemplate,
      foundationArrayRaw: balcony.foundationArrayRaw ?? balcony.foundationArray ?? simpleFoundationTemplate,
      postsArrayRaw: balcony.postsArrayRaw ?? balcony.postsArray ?? simplePostsTemplate,

      heightMm: balcony.heightMm ?? 1020,
      panelMm: balcony.panelMm ?? 1020,
      fflMm: balcony.fflMm ?? 0,
      ffl_use: balcony.ffl_use ?? false,

      design: balcony.design ?? designDefault,
      anchorage: balcony.anchorage ?? anchorageDefault,
      toprail: balcony.toprail ?? toprailDefault,
      infill: balcony.infill ?? infillDefault,

      metadata: balcony.metadata ?? {},
      notes: balcony.notes ?? "",

      version: balcony.version ?? 1,
      isDeleted: balcony.isDeleted ?? false,
    });
  }, [balcony, color, form, designDefault, anchorageDefault, toprailDefault, infillDefault]);

  /** -------------------------
   *  Duplicate (drop + balconyNo) detection
   *  ------------------------ */

  const dropValue = form.watch("drop");
  const balconyNoValue = form.watch("balconyNo");
  const currentId = typeof balcony?.id === "number" ? balcony.id : undefined;

  const duplicateBalcony = !!existingBalconies.find((b) => b.drop === dropValue && b.balconyNo === balconyNoValue && b.id !== currentId);

  useEffect(() => {
    if (!dropValue || !balconyNoValue) {
      form.clearErrors("balconyNo");
      return;
    }

    if (duplicateBalcony) {
      form.setError("balconyNo", {
        type: "manual",
        message: `Balcony ${balconyNoValue} is already in use for drop ${dropValue} on this stage.`,
      });
    } else {
      form.clearErrors("balconyNo");
    }
  }, [dropValue, balconyNoValue, duplicateBalcony, form]);

  /** -------------------------
   *  Server action hook
   *  ------------------------ */
  const { execute: executeSave, result: saveResult, isPending: isSaving, reset: resetSaveAction } = useAction(saveBalconyAction, {
    onSuccess({ data }) {
      console.log(data);
      if (data?.message) {
        toast.success(data.message);
      } else {
        toast.success("Balcony saved");
      }

      // If a balconyId is returned (both create & update), update the URL
      // so reloads always land in "edit" mode for that balcony.
      if (data?.balconyId) {
        const current = new URLSearchParams(searchParams.toString());
        current.set("balconyId", String(data.balconyId));

        router.replace(`/balconies/form?${current.toString()}`, {
          scroll: false,
        });
      }
    },
    onError() {
      toast.error("Save failed");
    },
  });

  async function submitForm(data: insertBalconySchemaType) {
    console.log("Balcony submit", data);

    let finalData = data;

    if (isNew) {
      // Only enforce template when creating a new balcony
      if (templateKey === "simple") {
        finalData = {
          ...data,
          foundationArray: data.foundationArray && data.foundationArray.length > 0 ? data.foundationArray : simpleFoundationTemplate,
          postsArray: data.postsArray && data.postsArray.length > 0 ? data.postsArray : simplePostsTemplate,
          foundationArrayRaw: data.foundationArray && data.foundationArray.length > 0 ? data.foundationArray : simpleFoundationTemplate,
          postsArrayRaw: data.postsArray && data.postsArray.length > 0 ? data.postsArray : simplePostsTemplate,
        };
      } else if (templateKey === "empty") {
        finalData = {
          ...data,
          foundationArray: data.foundationArray ?? [],
          postsArray: data.postsArray ?? [],
          foundationArrayRaw: data.foundationArray ?? [],
          postsArrayRaw: data.postsArray ?? [],
        };
      }
    }

    executeSave(finalData);
  }

  // Register templateKey only for NEW balcony mode
  if (!balcony) {
    form.register("templateKey" as any);
  }

  // -------------------------
  // Infill options filtered by design rules
  // -------------------------
// -------------------------
// Options filtered by design rules (infill, anchorage, toprail)
// -------------------------
const currentDesign = form.watch("design");

const currentInfill = (form.watch("infill") as string | null | undefined) ?? "";
const { options: infillOptions } = getInfillOptionsForDesign(currentDesign, currentInfill);
const infillData =
  infillOptions.length > 0
    ? infillOptions.map((o) => ({ id: o.id, description: o.label }))
    : [{ id: "No infill options", description: "No infill options for this design" }];

// Anchorage (rules use "SF", form currently stores "SFI"/"SFO")
const currentAnchorageRaw = (form.watch("anchorage") as string | null | undefined) ?? "";
const currentAnchorageForRules = currentAnchorageRaw === "SFI" || currentAnchorageRaw === "SFO" ? "SF" : currentAnchorageRaw;

const { options: anchorageOptionsBase } = getAnchorageOptionsForDesign(currentDesign, currentAnchorageForRules);

const anchorageOptionsExpanded = anchorageOptionsBase.flatMap((o) => {
  if (o.id !== "SF") return [o];
  return [
    { ...o, id: "SFI", label: "Side fixed Inside (SFI)" },
    { ...o, id: "SFO", label: "Side fixed Outside (SFO)" },
  ];
});

const anchorageData =
  anchorageOptionsExpanded.length > 0
    ? anchorageOptionsExpanded.map((o) => ({ id: o.id, description: o.label }))
    : [{ id: "No anchorage options", description: "No anchorage options for this design" }];

// Toprail
const currentToprail = (form.watch("toprail") as string | null | undefined) ?? "";
const { options: toprailOptions } = getToprailOptionsForDesign(currentDesign, currentToprail);

const toprailData =
  toprailOptions.length > 0
    ? toprailOptions.map((o) => ({ id: o.id, description: o.label }))
    : [{ id: "No toprail options", description: "No toprail options for this design" }];


  /** =========================
   *  Render
   *  ========================= */
  return (
    <div className="flex flex-col gap-1 sm:px-8">
      <DisplayServerActionResponse result={saveResult} />

      <div>
        <h2 className="text-2xl font-bold">
          {balcony?.id && isEditable
            ? `Edit Balcony ${balcony.balconyNo} (Job #${job.job_number}, Stage ${jobStage.stage})`
            : balcony?.balconyNo
            ? `View Balcony ${balcony.balconyNo} (Job #${job.job_number}, Stage ${jobStage.stage})`
            : `New Balcony (Job #${job.job_number}, Stage ${jobStage.stage})`}
        </h2>
        {balcony?.id && (
          <Link
            href={`/drawingtool?jobId=${job.id}&stage=${jobStage.stage}&balconyId=${balcony.id}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
          >
            Open in drawing tool
          </Link>
        )}
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submitForm, (errors) => console.log("Balcony submit INVALID", errors))}
          className="flex flex-col md:flex-row gap-4 md:gap-8"
        >
          {/* ------- Left column: core balcony fields ------- */}
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <InputWithLabel<insertBalconySchemaType> fieldTitle="Drop" nameInSchema="drop" disabled={!isEditable} />

            <InputWithLabel<insertBalconySchemaType> fieldTitle="Balcony number" nameInSchema="balconyNo" disabled={!isEditable} />

            {duplicateBalcony && (
              <p className="text-xs text-red-600 mt-[-0.5rem] mb-1">
                This balcony number is already in use for Drop {dropValue} on this stage.
              </p>
            )}

            <NumberInputWithLabel<insertBalconySchemaType> fieldTitle="Balustrade height (mm)" nameInSchema="heightMm" min={900} max={1200} disabled={!isEditable} />

            <NumberInputWithLabel<insertBalconySchemaType> fieldTitle="Panel height (mm)" nameInSchema="panelMm" min={0} max={1200 - 16} disabled={!isEditable} />

            <NumberInputWithLabel<insertBalconySchemaType> fieldTitle="FFL offset (mm)" nameInSchema="fflMm" min={-2500} max={2500} disabled={!isEditable} />

            <CheckboxWithLabel<insertBalconySchemaType> fieldTitle="Use FFL offset" nameInSchema="ffl_use" message="Use this FFL as reference" disabled={!isEditable} />

            <SelectWithLabel<insertBalconySchemaType>
              fieldTitle="Design"
              nameInSchema="design"
              data={[
                { id: "RD-D1", description: "RD-D1" },
                { id: "RD-D2", description: "RD-D2" },
                { id: "RD-D3", description: "RD-D3" },
                { id: "RD-D3SLATS", description: "RD-D3SLATS" },
                { id: "RD-D4", description: "RD-D4" },
                { id: "RD-D4SLATS", description: "RD-D4SLATS" },
                { id: "RD-D5", description: "RD-D5" },
                { id: "RD-D6", description: "RD-D6" },
                { id: "RD-D7", description: "RD-D7" },
                { id: "RD-D8", description: "RD-D8" },
                { id: "RD-D9", description: "RD-D9" },
                { id: "RD-D10", description: "RD-D10" },
                { id: "RD-D11", description: "RD-D11" },
                { id: "RD-D12", description: "RD-D12" },
                { id: "RD-D13", description: "RD-D13" },
              ]}
            />

            <SelectWithLabel<insertBalconySchemaType> fieldTitle="Anchorage" nameInSchema="anchorage" data={anchorageData} />


            <SelectWithLabel<insertBalconySchemaType> fieldTitle="Toprail" nameInSchema="toprail" data={toprailData} />


            <SelectWithLabel<insertBalconySchemaType> fieldTitle="Infill" nameInSchema="infill" data={infillData} />

            <CheckboxWithLabel<insertBalconySchemaType> fieldTitle="Mark as deleted" nameInSchema="isDeleted" message="Soft delete balcony" disabled={!isEditable} />
          </div>

          {/* ------- Middle column: notes + actions ------- */}

          {/* ===========================

        {/* Template selection – only when creating a new balcony */}
          {isNew && (
            <div className="mt-1">
              <label className="text-xs font-medium mb-1 block">Starting layout template</label>
              <Select value={templateKey} onValueChange={(val) => setTemplateKey(val as "simple" | "empty")}>
                <FormControl>
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="simple">Simple Straight (2 foundations + 2 posts)</SelectItem>
                  <SelectItem value="empty">Empty arrays (advanced)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Only applied when this balcony is first created. Existing balconies keep their current layout.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <TextAreaWithLabel<insertBalconySchemaType> fieldTitle="Notes" nameInSchema="notes" className="h-64" disabled={!isEditable} />

            {isEditable ? (
              <div className="flex gap-2">
                <Button type="submit" className="w-2/4" variant="default" title="Save balcony" disabled={isSaving || duplicateBalcony}>
                  {isSaving ? (
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
                    form.reset(defaultValues);
                    resetSaveAction();
                  }}
                >
                  Reset
                </Button>
              </div>
            ) : null}
          </div>

          {/* ------- Right column: Job + stage context ------- */}
          <div className="mt-4 space-y-2">
            <h3 className="text-lg">Job Info</h3>
            <hr className="w-4/5" />

            <p>
              Client: {customer.company} – {customer.firstName} {customer.lastName}
            </p>
            <p>Job#: {job.job_number}</p>
            <p>Stage: {jobStage.stage}</p>
            <p>Address: {job.address1}</p>
            {job.address2 ? <p>{job.address2}</p> : null}
            <p>
              City: {job.city}, {job.zip}
            </p>

            <hr className="w-4/5" />

            <p>Job design default: {job.design_default}</p>
            <p>Job anchorage default: {job.anchorage_default}</p>
            <p>Job top rail default: {job.toprail_default}</p>
            <p>Job glass default: {job.infill_default}</p>

            <hr className="w-4/5" />

            {balcony && (
              <>
                <p>Balcony: {balcony.balconyNo}</p>
                <p>Drop: {balcony.drop}</p>
                <p>Height: {balcony.heightMm} mm</p>
                <p>Panel: {balcony.panelMm} mm</p>
              </>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

// Infer the "next" balcony number from the previous one
function getNextBalconyNo(prev: string): string {
  const trimmed = prev.trim();

  // Case 1: plain numeric, e.g. "1", "2", "3"
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    if (Number.isFinite(n)) return String(n + 1);
  }

  // Case 2: "Level 7", "Level 6" (descending)
  const levelMatch = /^Level\s+(\d+)$/i.exec(trimmed);
  if (levelMatch) {
    const current = Number.parseInt(levelMatch[1], 10);
    if (Number.isFinite(current)) {
      const next = current > 1 ? current - 1 : current;
      return `Level ${next}`;
    }
  }

  // Case 3: "Unit 201", "unit 202" (ascending)
  const unitMatch = /^(Unit)\s+(\d+)$/i.exec(trimmed);
  if (unitMatch) {
    const prefix = unitMatch[1];
    const current = Number.parseInt(unitMatch[2], 10);
    if (Number.isFinite(current)) {
      return `${prefix} ${current + 1}`;
    }
  }

  // Case 4: ANY prefix ending in <number><letter> (increment letters)
  //
  // Examples:
  // "1A"          → "1B"
  // "Unit 201A"   → "Unit 201B"
  // "House 7Z"    → "House 8A"
  // "Podium-10c" → "Podium-10d"
  const numLetterMatch = /^(.*?)(\d+)([A-Za-z])$/.exec(trimmed);
  if (numLetterMatch) {
    const prefix = numLetterMatch[1]; // includes spaces/hyphens/etc
    const numStr = numLetterMatch[2]; // numeric chunk
    const letter = numLetterMatch[3]; // A/B/c/etc

    const num = Number.parseInt(numStr, 10);
    if (!Number.isFinite(num)) return trimmed;

    const upper = letter.toUpperCase();
    const code = upper.charCodeAt(0);

    // A–Y → next letter
    if (code >= 65 && code < 90) {
      const nextLetter = String.fromCharCode(code + 1);
      const finalLetter = letter === upper ? nextLetter : nextLetter.toLowerCase();
      return `${prefix}${num}${finalLetter}`;
    }

    // Z → roll over: next number + A
    if (code === 90) {
      const nextNum = num + 1;
      const nextLetter = letter === upper ? "A" : "a";
      return `${prefix}${nextNum}${nextLetter}`;
    }
  }

  // Fallback: unknown pattern → repeat the same
  return trimmed;
}

// Determine the default drop & balconyNo for new entries
function getDefaultDropAndBalconyNo(existing: selectBalconySchemaType[]): { drop: string; balconyNo: string } {
  if (!existing.length) {
    // No balconies at all → standard starting convention
    return { drop: "A", balconyNo: "1" };
  }

  // Sort by created date — newest last
  const sorted = [...existing].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const last = sorted[sorted.length - 1];

  const drop = last.drop || "A";
  const balconyNo = getNextBalconyNo(last.balconyNo || "1");

  return { drop, balconyNo };
}
