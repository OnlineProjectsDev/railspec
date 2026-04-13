// /components/project-builder-components/steps/design-step.tsx
"use client";

import { motion } from "motion/react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import { getDesignOptionsForWindLoad } from "@/lib/jobDesignRules";

import Image from "next/image";

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
    <div className="grid grid-cols-2 grid-rows-3 gap-4 w-full">
      {designOptions.map((design, index) => {
        const isSelected = currentDesign === design.id;

        return (
          <motion.button
            key={design.id}
            type="button"
            onClick={() => handleSelectDesign(design.id)}
            className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col min-h-0 p-3 text-left ${
              isSelected
                ? "border-rail-light-blue shadow-sm"
                : "border-gray-200 hover:border-rail-light-blue"
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            {/* 🔹 Optional design image */}
            {design.image && (
              <div className="relative w-full h-32 mb-2">
                <Image
                  src={design.image}
                  alt={design.label}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            )}

            <div className="flex-1 flex flex-col justify-center">
              <span className="font-semibold text-xs">{design.label}</span>
              {/* Placeholder for future description / tags */}
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
  );
}
