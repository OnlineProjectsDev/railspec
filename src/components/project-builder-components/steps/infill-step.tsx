// /components/project-builder-components/steps/infill-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import {
  designNeedsGlass,
  getInfillOptionsForDesign,
} from "@/lib/jobDesignRules";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type FormValues = insertJobSchemaType;

// Parse "6.38mm Clear Laminate" → { thickness: "6.38mm", type: "Clear Laminate" }
function parseGlassLabel(label: string): { thickness: string; type: string } | null {
  const match = label.match(/^(\d+(?:\.\d+)?mm)\s+(.+)$/);
  if (!match) return null;
  return { thickness: match[1], type: match[2] };
}

export default function InfillStep() {
  const { watch, setValue } = useFormContext<FormValues>();

  const design = watch("design_default");
  const currentInfill = (watch("infill_default") as string | null | undefined) ?? "";
  const requiresGlass = designNeedsGlass(design);
  const { options: infillOptions, clashing } = getInfillOptionsForDesign(design, currentInfill);

  const handleSelectInfill = (id: string) => {
    setValue("infill_default", id, { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-3 w-full flex-1 min-h-0">
      {/* Description */}
      <p className="text-xs text-muted-foreground flex-shrink-0">
        {requiresGlass
          ? "Choose a glass thickness and finish for this design."
          : "Choose an infill type for this design."}
      </p>

      {/* Options grid */}
      <ScrollArea className="flex-1 min-h-0 pr-1">
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {infillOptions.map((opt, index) => {
            const isSelected = currentInfill === opt.id;
            const isClashing = isSelected && clashing;
            const glass = parseGlassLabel(opt.label);

            return (
              <motion.button
                key={opt.id}
                type="button"
                onClick={() => handleSelectInfill(opt.id)}
                className={cn(
                  "bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 flex flex-col text-left p-3 gap-2",
                  isClashing
                    ? "border-amber-400 bg-amber-50 shadow-sm"
                    : isSelected
                    ? "border-rail-light-blue shadow-sm"
                    : "border-gray-200 hover:border-rail-light-blue"
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                {glass ? (
                  <>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-base font-bold text-gray-800 leading-none">{glass.thickness}</span>
                      <Layers className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                    <span className="text-[11px] text-gray-500 leading-tight">{glass.type}</span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-gray-800 leading-snug min-h-[2.0625rem] flex items-start">
                    {opt.label}
                  </span>
                )}

                <div className="flex justify-end">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px]",
                      isClashing
                        ? "bg-amber-400 border-amber-400 text-white"
                        : isSelected
                        ? "bg-rail-light-blue border-rail-light-blue text-white"
                        : "border-gray-300 text-gray-400"
                    )}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Warnings */}
      <div className="flex-shrink-0 flex flex-col gap-2">
        {!currentInfill && (
          <p className="text-xs text-red-600">Please select an infill option to continue.</p>
        )}
        {clashing && !!currentInfill && (
          <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2.5 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 text-sm leading-none">⚠</span>
            <p className="text-xs text-amber-800 font-medium">
              The selected infill is not valid for design <span className="font-bold">{design ?? "this design"}</span>. Please choose one of the highlighted options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
