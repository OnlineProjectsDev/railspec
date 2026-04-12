// /components/project-builder-components/steps/DesignConstraintStep.tsx
"use client";

import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";

import { NumberInputWithLabel } from "@/components/inputs/NumberWithLabel";
import { TextAreaWithLabel } from "@/components/inputs/TextAreaWithLabel";

import { getMaxPostCentresSpacingMm } from "@/lib/jobDesignRules";

type FormValues = insertJobSchemaType;

export default function DesignConstraintsStep() {
  const { watch } = useFormContext<FormValues>();

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
    <div className="flex flex-col gap-4 max-w-sm">
      <NumberInputWithLabel<FormValues>
        fieldTitle="Minimum Barrier Height (mm)"
        nameInSchema="height_default"
        min={1020}
        max={1800}
      />

      <NumberInputWithLabel<FormValues>
        fieldTitle="Maximum Barrier Height (mm)"
        nameInSchema="max_height_default"
        min={1050}
        max={1800}
      />

      {/* Hard invalid: max < min */}
      {maxBelowMin && (
        <p className="text-xs text-red-600">
          Maximum barrier height cannot be less than the minimum barrier height.
        </p>
      )}

      {/* Informational: band clamp */}
      {heightClamped && (
        <p className="text-xs text-amber-600">
          Note: spacing limits are tabulated up to {clampLimit}mm max height. Your value
          will be treated as {clampLimit}mm for spacing calculations.
        </p>
      )}

      <NumberInputWithLabel<FormValues>
        fieldTitle="Maximum Post Spacing (mm)"
        nameInSchema="max_post_spacing"
        min={500}
        max={cap}
      />

      {/* Hard invalid: spacing exceeds cap */}
      {spacingInvalid && (
        <p className="text-xs text-red-600">
          The selected post spacing exceeds the allowed maximum for the current
          design/wind settings. Maximum allowed is {cap}mm.
        </p>
      )}

      <TextAreaWithLabel<FormValues>
        fieldTitle="Design Notes"
        nameInSchema="notes"
        className="h-40"
      />
    </div>
  );
}
