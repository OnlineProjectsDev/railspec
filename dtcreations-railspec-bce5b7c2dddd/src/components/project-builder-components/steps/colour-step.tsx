// /components/project-builder-components/steps/colour-step.tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils"; // or remove if you don't use it
import { ColourSwatch } from "@/components/project-builder-components/CoulourSwatch";


export type PowdercoatColour = {
  id: number;
  code: string;
  name: string;
  hex: string;
  range: string | null;
  finishType: string | null;
  costGroup: string;          // "standard" | "premium" | "custom" | etc.
  warrantyYears: number;
  isDefault: boolean;
  imageUrl: string | null;
};

interface ColourStepProps {
  colours: PowdercoatColour[];
  selectedColorId: number | null;
  onSelect: (colorId: number) => void;
  isLoading?: boolean;
}

export default function ColourStep({
  colours,
  selectedColorId,
  onSelect,
  isLoading = false,
}: ColourStepProps) {
  // ---------------------------
  // Local, user-chosen filters
  // ---------------------------
  const [costFilter, setCostFilter] = useState<"all" | "standard" | "premium" | "custom">("all");
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [search, setSearch] = useState("");

  const filteredColours = useMemo(() => {
    const q = search.trim().toLowerCase();

    return colours.filter((c) => {
      // cost group filter
      if (costFilter !== "all") {
        if (c.costGroup.toLowerCase() !== costFilter) return false;
      }

      // warranty filter
      if (warrantyOnly && (!c.warrantyYears || c.warrantyYears <= 0)) return false;

      // text search
      if (!q) return true;

      const haystack = [
        c.name,
        c.code,
        c.range ?? "",
        c.finishType ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [colours, costFilter, warrantyOnly, search]);

  const renderCostBadge = (costGroup: string) => {
    const group = costGroup.toLowerCase();
    if (group === "premium") {
      return (
        <span className="text-[10px] px-2 py-[2px] rounded-full bg-amber-100 text-amber-700">
          Premium
        </span>
      );
    }
    if (group === "custom") {
      return (
        <span className="text-[10px] px-2 py-[2px] rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Custom
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-[2px] rounded-full bg-emerald-100 text-emerald-700">
        Standard
      </span>
    );
  };

  // ---------------------------
  // Loading state
  // ---------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {/* Filters skeleton row */}
        <div className="flex flex-col gap-2 flex-shrink-0 mb-3">
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded flex-1 animate-pulse" />
          </div>
        </div>

        {/* Scrollable cards skeleton */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                className="bg-[#f5f5f5] border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
              >
                <div className="relative flex-1 w-full bg-gray-200 animate-pulse min-h-0" />
                <div className="p-3 flex-shrink-0 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded w-16 animate-pulse" />
                  <div className="flex justify-between items-center">
                    <div className="h-2 bg-gray-200 rounded w-20 animate-pulse" />
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-gray-100" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // No colours (after filter)
  // ---------------------------
  if (!filteredColours.length) {
    return (
      <div className="flex flex-col h-full">
        {/* Filters still visible */}
        <FiltersRow
          costFilter={costFilter}
          onCostFilterChange={setCostFilter}
          warrantyOnly={warrantyOnly}
          onWarrantyOnlyChange={setWarrantyOnly}
          search={search}
          onSearchChange={setSearch}
        />
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
          No colours match the current filters. Try clearing some filters or searching differently.
        </div>
      </div>
    );
  }

  // ---------------------------
  // Main layout: filters + scroll
  // ---------------------------
  return (
    <div className="flex flex-col h-full">
      {/* Top: user filters (fixed) */}
      <FiltersRow
        costFilter={costFilter}
        onCostFilterChange={setCostFilter}
        warrantyOnly={warrantyOnly}
        onWarrantyOnlyChange={setWarrantyOnly}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Bottom: scrollable colour grid */}
      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          {filteredColours.map((colour, index) => {
            const isSelected = selectedColorId === colour.id;

            return (
              <motion.button
                key={colour.id}
                type="button"
                onClick={() => onSelect(colour.id)}
                className={cn(
                  "bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col min-h-0 text-left",
                  isSelected
                    ? "border-rail-light-blue shadow-sm"
                    : "border-gray-200 hover:border-rail-light-blue"
                )}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
              >
               {/* Swatch / image area */}
                {/* Swatch / image area */}
                <div className="relative flex-1 w-full min-h-[72px]">
                  <ColourSwatch hex={colour.hex} imageUrl={colour.imageUrl} />
                </div>

                {/* Info area */}
                <div className="p-3 flex-shrink-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs line-clamp-1">
                        {colour.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {colour.code}
                      </span>
                      {/* {colour.hex && (
                        <span className="text-[10px] text-blue-600">
                          HEX: {colour.hex}
                        </span>
                      )} */}

                    </div>

                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                        isSelected
                          ? "bg-rail-light-blue border-rail-light-blue text-white"
                          : "border-gray-300 bg-white text-transparent"
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex flex-col">
                      {colour.range && (
                        <span
                          className="
                            text-[10px] text-muted-foreground
                            leading-tight
                            line-clamp-2
                            min-h-[24px]
                          "
                        >
                          {colour.range}
                        </span>
                      )}
                      {colour.finishType && (
                        <span className="text-[10px] text-muted-foreground">
                          {colour.finishType}
                        </span>
                      )}
                      {colour.warrantyYears > 0 && (
                        <span className="text-[10px] text-emerald-700">
                          {colour.warrantyYears}-year warranty
                        </span>
                      )}
                      {colour.isDefault && (
                        <span className="text-[10px] text-gray-600">
                          Default (Aluminium milled)
                        </span>
                      )}
                    </div>

                    {renderCostBadge(colour.costGroup)}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// Small filters row component
// ---------------------------
type FiltersRowProps = {
  costFilter: "all" | "standard" | "premium" | "custom";
  onCostFilterChange: (v: "all" | "standard" | "premium" | "custom") => void;
  warrantyOnly: boolean;
  onWarrantyOnlyChange: (v: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
};

function FiltersRow({
  costFilter,
  onCostFilterChange,
  warrantyOnly,
  onWarrantyOnlyChange,
  search,
  onSearchChange,
}: FiltersRowProps) {
  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <span className="text-[11px] font-medium text-muted-foreground">
        Filter colours
      </span>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Cost group chips */}
        <div className="inline-flex items-center gap-1 bg-[#f5f5f5] rounded-full px-2 py-1">
          {(["all", "standard", "premium", "custom"] as const).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => onCostFilterChange(group)}
              className={cn(
                "text-[10px] px-2 py-[2px] rounded-full transition-colors",
                costFilter === group
                  ? "bg-rail-light-blue text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              )}
            >
              {group === "all"
                ? "All"
                : group.charAt(0).toUpperCase() + group.slice(1)}
            </button>
          ))}
        </div>

        {/* Warranty toggle */}
        <button
          type="button"
          onClick={() => onWarrantyOnlyChange(!warrantyOnly)}
          className={cn(
            "text-[10px] px-2 py-[2px] rounded-full border transition-colors",
            warrantyOnly
              ? "bg-emerald-50 border-emerald-400 text-emerald-700"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          {warrantyOnly ? "Warranty only ✓" : "Warranty only"}
        </button>

        {/* Search */}
        <input
          type="text"
          suppressHydrationWarning
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name / code / range"
          className="flex-1 min-w-[120px] text-[11px] px-2 py-1 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-rail-light-blue"
        />
      </div>
    </div>
  );
}
