// /components/project-builder-components/steps/toprail-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import { getToprailOptionsForDesign } from "@/lib/jobDesignRules";
import Image from "next/image";

type FormValues = insertJobSchemaType;

export default function ToprailStep() {
  const { watch, setValue } = useFormContext<FormValues>();

  const design = watch("design_default");
  const currentToprail =
    (watch("toprail_default") as string | null | undefined) ?? "";

  const { options: toprailOptions, clashing } =
    getToprailOptionsForDesign(design, currentToprail);

  const handleSelectToprail = (id: string) => {
    setValue("toprail_default", id, { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Toprail</span>
        <span className="text-xs text-muted-foreground">
          Choose the toprail profile compatible with the selected design.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full flex-1">
        {toprailOptions.map((opt, index) => {
          const isSelected = currentToprail === opt.id;

          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => handleSelectToprail(opt.id)}
              className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col justify-between p-3 text-left ${
                isSelected
                  ? "border-rail-light-blue shadow-sm"
                  : "border-gray-200 hover:border-rail-light-blue"
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              {/* Image (if present) */}
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

              {/* Text labels */}
              <div>
                <div className="font-semibold text-xs">{opt.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Code: {opt.id}
                </div>
              </div>

              {/* Tick indicator */}
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

      {clashing && !!currentToprail && (
        <p className="text-xs text-amber-600">
  The selected toprail &quot;{currentToprail}&quot; is not allowed for design{" "}
  {design ?? "this design"}. Please choose one of the recommended options.
</p>
      )}
    </div>
  );
}
