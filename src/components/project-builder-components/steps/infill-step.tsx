// /components/project-builder-components/steps/infill-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import {
  designNeedsGlass,
  getGlassOptionsForDesign,
  getInfillOptionsForDesign,
} from "@/lib/jobDesignRules";

type FormValues = insertJobSchemaType;

export default function InfillStep() {
  const { watch, setValue } = useFormContext<FormValues>();

const design = watch("design_default");
const currentInfill =
  (watch("infill_default") as string | null | undefined) ?? "";

const requiresGlass = designNeedsGlass(design);

const { options: infillOptions, clashing } = getInfillOptionsForDesign(
  design,
  currentInfill
);

const handleSelectInfill = (id: string) => {
  setValue("infill_default", id, { shouldDirty: true });
};


  return (
    <div className="flex flex-col gap-3 w-full flex-1">
      <div className="flex flex-col gap-1">

        <span className="text-xs text-muted-foreground">
          {requiresGlass
            ? "This design requires glass. Choose an appropriate glass thickness and type."
            : "This design does not require glass. Use the default infill option for now."}
        </span>
      </div>

      <div className="flex flex-col gap-2 w-full flex-1 justify-center">
        {infillOptions.map((opt, index) => {
  const isSelected = currentInfill === opt.id;

  return (
    <motion.button
      key={opt.id}
      type="button"
      onClick={() => handleSelectInfill(opt.id)}
      className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-colors overflow-hidden flex items-center justify-between p-2.5 text-left ${
        isSelected && clashing
          ? "border-amber-400 bg-amber-50 shadow-sm"
          : isSelected
          ? "border-rail-light-blue shadow-sm"
          : "border-gray-200 hover:border-rail-light-blue"
      }`}
      initial={{ opacity: 0.0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div className="font-semibold text-[11px]">{opt.label}</div>

      <span
        className={`flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full border-2 text-[9px] ${
          isSelected && clashing
            ? "bg-amber-400 border-amber-400 text-white"
            : isSelected
            ? "bg-rail-light-blue border-rail-light-blue text-white"
            : "border-gray-300 text-gray-400"
        }`}
      >
        {isSelected ? "✓" : ""}
      </span>
    </motion.button>
  );
})}

      </div>

      {/* Warnings — pinned to bottom via mt-auto */}
      <div className="mt-auto flex flex-col gap-2">
        {!currentInfill && (
          <p className="text-xs text-red-600">
            Please select an infill option to continue.
          </p>
        )}

        {clashing && !!currentInfill && (
          <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2.5 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 text-sm leading-none">⚠</span>
            <p className="text-xs text-amber-800 font-medium">
              The selected infill is not valid for design <span className="font-bold">{design ?? "this design"}</span>. Please choose one of the options below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
