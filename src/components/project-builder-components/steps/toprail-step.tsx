// /components/project-builder-components/steps/toprail-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import { getToprailOptionsForDesign } from "@/lib/jobDesignRules";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="flex flex-col gap-2 w-full flex-1 min-h-0">
      <ScrollArea className="flex-1 min-h-0 pr-1">
        <div className="grid grid-cols-2 gap-2 w-full content-start pb-2">
        {toprailOptions.map((opt, index) => {
          const isSelected = currentToprail === opt.id;

          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => handleSelectToprail(opt.id)}
              className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-colors overflow-hidden flex flex-col p-2 text-left ${
                isSelected && clashing
                  ? "border-amber-400 bg-amber-50 shadow-sm"
                  : isSelected
                  ? "border-rail-light-blue shadow-sm"
                  : "border-gray-200 hover:border-rail-light-blue"
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              {opt.image && (
                <div className="relative w-full h-16 mb-1.5">
                  <Image
                    src={opt.image}
                    alt={opt.label}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-[11px]">{opt.label}</span>
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px] ${
                    isSelected && clashing
                      ? "bg-amber-400 border-amber-400 text-white"
                      : isSelected
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
      </ScrollArea>

      {clashing && !!currentToprail && (
        <div className="mt-auto rounded-md bg-amber-50 border border-amber-300 px-3 py-2.5 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5 text-sm leading-none">⚠</span>
          <p className="text-xs text-amber-800 font-medium">
            The selected toprail is not valid for design <span className="font-bold">{design ?? "this design"}</span>. Please choose one of the options below.
          </p>
        </div>
      )}
    </div>
  );
}
