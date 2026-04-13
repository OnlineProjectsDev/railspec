// /components/project-builder-components/steps/anchorage-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import { getAnchorageOptionsForDesign } from "@/lib/jobDesignRules";
import Image from "next/image";

type FormValues = insertJobSchemaType;

export default function AnchorageStep() {
  const { watch, setValue } = useFormContext<FormValues>();

  const design = watch("design_default");
  const currentAnchorage = watch("anchorage_default") ?? "";

  const { options: anchorageOptions, clashing } =
    getAnchorageOptionsForDesign(design, currentAnchorage);

  const handleSelectAnchorage = (id: string) => {
    setValue("anchorage_default", id, { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Anchorage</span>
        <span className="text-xs text-muted-foreground">
          Choose how the balustrade will be fixed to the structure.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {anchorageOptions.map((opt, index) => {
          const isSelected = currentAnchorage === opt.id;

          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => handleSelectAnchorage(opt.id)}
              className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col p-3 text-left ${
                isSelected
                  ? "border-rail-light-blue shadow-sm"
                  : "border-gray-200 hover:border-rail-light-blue"
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              {/* Image block */}
              {opt.image && (
                <div className="relative w-full aspect-square mb-2 overflow-hidden">
                  <Image
                    src={opt.image}
                    alt={opt.label}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
                  />
                </div>
              )}

              {/* Text block */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-xs">{opt.id}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {opt.label}
                  </div>
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
              </div>
            </motion.button>
          );
        })}
      </div>

      {clashing && (
        <p className="text-xs text-amber-600">
          The currently selected anchorage is not allowed for design{" "}
          {design ?? "this design"}. Please choose one of the highlighted options.
        </p>
      )}
    </div>
  );
}
