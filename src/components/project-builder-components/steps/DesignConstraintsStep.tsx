// /components/project-builder-components/steps/DesignConstraintStep.tsx
"use client";

import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { getMaxPostCentresSpacingMm } from "@/lib/jobDesignRules";

type FormValues = insertJobSchemaType;

export default function DesignConstraintsStep() {
  const form = useFormContext<FormValues>();
  const { watch, control } = form;

  const design = watch("design_default");
  const anchorage = watch("anchorage_default");
  const infill = watch("infill_default");
  const wind = watch("wind_load");

  const minH = watch("height_default");
  const maxH = watch("max_height_default");
  const maxSpacing = watch("max_post_spacing");

  const { cap, rulesMax } = useMemo(() => {
    const rm = getMaxPostCentresSpacingMm({
      design,
      wind,
      balustradeHeightMm:
        typeof minH === "number" && Number.isFinite(minH)
          ? minH + 1
          : maxH,
    });

    // cap to the minimum non-null value between rulesMax and 1280
    const c = Math.min(rm ?? Infinity, 1280);

    return { cap: c, rulesMax: rm };
  }, [design, wind, minH, maxH]);

  const hasHeights =
    typeof minH === "number" &&
    Number.isFinite(minH) &&
    typeof maxH === "number" &&
    Number.isFinite(maxH);

  const hasSpacing =
    typeof maxSpacing === "number" && Number.isFinite(maxSpacing);

  const maxBelowMin = hasHeights ? maxH < minH : false;

  const spacingInvalid = hasSpacing ? maxSpacing > cap : false;

  // Informational warning: current rules table clamps to 1200mm band (when rules are being applied)
  const clampLimit =
    (design === "RD-D5" && anchorage != "BP" && infill === "Slats 5mm Spacers") || design === "RD-D6" ? 1800 : 1200;

  const heightClamped =
    typeof maxH === "number" &&
    Number.isFinite(maxH) &&
    maxH > clampLimit &&
    rulesMax != null;

  return (
    <div className="flex flex-col gap-2.5 flex-1">

      <div className="flex flex-col gap-2 p-3 border rounded-md">
        <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Barrier heights</span>

        <FormField
          control={control}
          name="height_default"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] text-gray-600 mb-0.5" htmlFor="height_default">
                Minimum height (mm)
              </FormLabel>
              <FormControl>
                <Input
                  id="height_default"
                  type="number"
                  min={1020}
                  max={1800}
                  className="h-7 text-xs"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="max_height_default"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] text-gray-600 mb-0.5" htmlFor="max_height_default">
                Maximum height (mm)
              </FormLabel>
              <FormControl>
                <Input
                  id="max_height_default"
                  type="number"
                  min={1050}
                  max={1800}
                  className="h-7 text-xs"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        {maxBelowMin && (
          <div className="rounded-md bg-red-50 border border-red-300 px-2.5 py-2 flex items-start gap-2">
            <span className="text-red-500 mt-0.5 text-xs leading-none">⚠</span>
            <p className="text-[11px] text-red-800 font-medium">Maximum height cannot be less than minimum height.</p>
          </div>
        )}

        {heightClamped && (
          <div className="rounded-md bg-amber-50 border border-amber-300 px-2.5 py-2 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 text-xs leading-none">⚠</span>
            <p className="text-[11px] text-amber-800 font-medium">
              Spacing limits are tabulated up to {clampLimit}mm. Your value will be treated as {clampLimit}mm for spacing calculations.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3 border rounded-md">
        <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Post spacing</span>

        <FormField
          control={control}
          name="max_post_spacing"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] text-gray-600 mb-0.5" htmlFor="max_post_spacing">
                Maximum post spacing (mm)
              </FormLabel>
              <FormControl>
                <Input
                  id="max_post_spacing"
                  type="number"
                  min={500}
                  max={cap}
                  className="h-7 text-xs"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        {spacingInvalid && (
          <div className="rounded-md bg-red-50 border border-red-300 px-2.5 py-2 flex items-start gap-2">
            <span className="text-red-500 mt-0.5 text-xs leading-none">⚠</span>
            <p className="text-[11px] text-red-800 font-medium">
              Exceeds the allowed maximum for the current design/wind settings. Max allowed: <span className="font-bold">{cap}mm</span>.
            </p>
          </div>
        )}
      </div>

      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem className="flex flex-col flex-1">
            <FormLabel className="text-[11px] text-gray-600 mb-0.5" htmlFor="notes">
              Design notes
            </FormLabel>
            <FormControl>
              <Textarea
                id="notes"
                className="flex-1 resize-none text-xs min-h-0"
                {...field}
              />
            </FormControl>
            <FormMessage className="text-[10px]" />
          </FormItem>
        )}
      />

    </div>
  );
}
