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
import { ScrollArea } from "@/components/ui/scroll-area";

import { getMaxPostCentresSpacingMm } from "@/lib/jobDesignRules";
import { Ruler, Grid2x2, FileText } from "lucide-react";

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
    const c = Math.min(rm ?? Infinity, 1280);
    return { cap: c, rulesMax: rm };
  }, [design, wind, minH, maxH]);

  const hasHeights =
    typeof minH === "number" && Number.isFinite(minH) &&
    typeof maxH === "number" && Number.isFinite(maxH);

  const hasSpacing = typeof maxSpacing === "number" && Number.isFinite(maxSpacing);
  const maxBelowMin = hasHeights ? maxH < minH : false;
  const spacingInvalid = hasSpacing ? maxSpacing > cap : false;

  const clampLimit =
    (design === "RD-D5" && anchorage != "BP" && infill === "Slats 5mm Spacers") || design === "RD-D6" ? 1800 : 1200;

  const heightClamped =
    typeof maxH === "number" && Number.isFinite(maxH) &&
    maxH > clampLimit && rulesMax != null;

  return (
    <ScrollArea className="flex-1 min-h-0 pr-1">
      <div className="flex flex-col gap-3 pb-2">

        {/* Barrier heights */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
            <Ruler className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Barrier heights</span>
          </div>
          <div className="p-3 flex flex-col gap-3">
            {/* Side-by-side min / max */}
            <div className="grid grid-cols-2 gap-2 items-end">
              <FormField
                control={control}
                name="height_default"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-gray-600" htmlFor="height_default">
                      Min height (mm)
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="height_default"
                        type="number"
                        min={1020}
                        max={1800}
                        placeholder="e.g. 1050"
                        className="h-9 text-xs"
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
                    <FormLabel className="text-xs text-gray-600" htmlFor="max_height_default">
                      Max height (mm)
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="max_height_default"
                        type="number"
                        min={1050}
                        max={1800}
                        placeholder="e.g. 1200"
                        className="h-9 text-xs"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {maxBelowMin && (
              <div className="rounded-md bg-red-50 border border-red-300 px-2.5 py-2 flex items-start gap-2">
                <span className="text-red-500 text-xs leading-none mt-0.5">⚠</span>
                <p className="text-[11px] text-red-800 font-medium">Maximum height cannot be less than minimum height.</p>
              </div>
            )}
            {heightClamped && (
              <div className="rounded-md bg-amber-50 border border-amber-300 px-2.5 py-2 flex items-start gap-2">
                <span className="text-amber-500 text-xs leading-none mt-0.5">⚠</span>
                <p className="text-[11px] text-amber-800 font-medium">
                  Spacing limits are tabulated up to {clampLimit}mm. Your value will be treated as {clampLimit}mm for spacing calculations.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Post spacing */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
            <Grid2x2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Post spacing</span>
            {Number.isFinite(cap) && (
              <span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Max allowed: {cap}mm
              </span>
            )}
          </div>
          <div className="p-3 flex flex-col gap-3">
            <FormField
              control={control}
              name="max_post_spacing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600" htmlFor="max_post_spacing">
                    Maximum post spacing (mm)
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="max_post_spacing"
                      type="number"
                      min={500}
                      max={cap}
                      placeholder={`e.g. ${Number.isFinite(cap) ? cap : 1280}`}
                      className="h-9 text-xs"
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
                <span className="text-red-500 text-xs leading-none mt-0.5">⚠</span>
                <p className="text-[11px] text-red-800 font-medium">
                  Exceeds the allowed maximum for the current design/wind settings. Max allowed: <span className="font-bold">{cap}mm</span>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Design notes */}
        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Design notes</span>
          </div>
          <div className="p-3">
            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      id="notes"
                      placeholder="Any special requirements, site conditions or customer requests…"
                      className="resize-none text-xs min-h-[96px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
