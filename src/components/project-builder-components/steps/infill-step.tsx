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
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Infill</span>
        <span className="text-xs text-muted-foreground">
          {requiresGlass
            ? "This design requires glass. Choose an appropriate glass thickness and type."
            : "This design does not require glass. Use the default infill option for now."}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full flex-1">
        {infillOptions.map((opt, index) => {
  const isSelected = currentInfill === opt.id;

  return (
    <motion.button
      key={opt.id}
      type="button"
      onClick={() => handleSelectInfill(opt.id)}
      className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col justify-between p-3 text-left ${
        isSelected
          ? "border-rail-light-blue shadow-sm"
          : "border-gray-200 hover:border-rail-light-blue"
      }`}
      initial={{ opacity: 0.0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div>
        <div className="font-semibold text-xs">{opt.label}</div>
      </div>

      <div className="mt-2 flex items-center justify-end">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px] ${
            isSelected
              ? "bg-rail-light-blue border-rail-light-blue text-white"
              : "border-gray-300 text-gray-400"
          }`}
        >
          {isSelected ? "✓" : ""}
        </span>
      </div>
    </motion.button>
  );
})}

      </div>

      {/* Warnings for glass-required designs */}
      {!currentInfill && (
        <p className="text-xs text-red-600">
          Please select an infill option to continue.
        </p>
      )}

      {clashing && !!currentInfill && (
        <p className="text-xs text-amber-600">
          The selected infill is not valid for design {design ?? "this design"}.
          Please choose one of the recommended options.
        </p>
      )}
    </div>
  );
}
