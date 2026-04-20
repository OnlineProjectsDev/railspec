// /components/project-builder-components/steps/design-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import { getDesignOptionsForWindLoad } from "@/lib/jobDesignRules";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

type FormValues = insertJobSchemaType;

export default function DesignStep() {
  const { watch, setValue } = useFormContext<FormValues>();

  const wind = watch("wind_load") ?? null;
  const currentDesign = watch("design_default") ?? "";

  const designOptions = getDesignOptionsForWindLoad(wind);

  const handleSelectDesign = (designId: string) => {
    // always select (no toggle-off)
    setValue("design_default", designId, { shouldDirty: true });
  };

  return (
    <ScrollArea className="flex-1 min-h-0 pr-2">
      <div className="grid grid-cols-2 gap-2 w-full content-start pt-2">
      {designOptions.map((design, index) => {
        const isSelected = currentDesign === design.id;

        return (
          <motion.button
            key={design.id}
            type="button"
            onClick={() => handleSelectDesign(design.id)}
            className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-colors overflow-hidden flex flex-col p-2 text-left ${
              isSelected
                ? "border-rail-light-blue shadow-sm"
                : "border-gray-200 hover:border-rail-light-blue"
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            {design.image && (
              <div className="relative w-full h-16 mb-1.5">
                <Image
                  src={design.image}
                  alt={design.label}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-[11px]">{design.label}</span>
              <span
                className={`flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full border-2 text-[9px] ${
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
    </ScrollArea>
  );
}
