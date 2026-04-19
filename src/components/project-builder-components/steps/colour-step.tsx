// /components/project-builder-components/steps/colour-step.tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Search, Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColourSwatch } from "@/components/project-builder-components/CoulourSwatch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export type PowdercoatColour = {
  id: number;
  code: string;
  name: string;
  hex: string;
  range: string | null;
  finishType: string | null;
  costGroup: string;
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

// ---------------------------
// Colour family grouping
// ---------------------------
type FamilyKey = "whites" | "greys-light" | "greys-dark" | "blacks" | "browns" | "greens" | "blues" | "metallics" | "other";

const FAMILIES: { key: FamilyKey; label: string; pattern: RegExp }[] = [
  { key: "whites",      label: "Whites & Creams",    pattern: /white|cream|ivory|pearl\s*white|whisper|lexicon|natural\s*white|appliance|dover|shoji|talc|surfmist|birch|primrose/i },
  { key: "greys-light", label: "Light Greys",        pattern: /silver|lunar\s*grey|southerly|windspray|shale|grey\s*nurse|oyster|n42|ral\s*7032|light\s*grey|bluegum/i },
  { key: "greys-dark",  label: "Dark Greys",         pattern: /charcoal|monument|graphite|ironstone|basalt|dark\s*grey|notre\s*dame|olde\s*pewtr|anotec.*grey|grey\s*satin|berry\s*grey|stone\s*grey|gully|transformer|timberland|woodland|wollemi/i },
  { key: "blacks",      label: "Blacks",             pattern: /black|lunar\s*eclipse|night\s*sky/i },
  { key: "browns",      label: "Browns & Neutrals",  pattern: /bronze|jasper|dune|rivergum|terrain|paperbark|hammersley|cove|lama|sand|riversand|stone\s*beige|mangrove|evening\s*haze|classic\s*cream|pale\s*eucalypt|ral\s*70325|anotec.*bronze|mid\s*bronze/i },
  { key: "greens",      label: "Greens",             pattern: /green|eucalypt|wilderness|wollemi|pre.?school|cottage|new\s*life/i },
  { key: "blues",       label: "Blues & Teals",      pattern: /blue|ocean|wedgewood|navy|blueridge|deep\s*ocean/i },
  { key: "metallics",   label: "Metallics & Pearls", pattern: /kinetic|pearl\s*(?!white)|metallic|anodic|milled/i },
];

function detectFamily(colour: PowdercoatColour): FamilyKey {
  for (const family of FAMILIES) {
    if (family.pattern.test(colour.name)) return family.key;
  }
  return "other";
}

function groupColours(colours: PowdercoatColour[]): { key: FamilyKey; label: string; items: PowdercoatColour[] }[] {
  const map = new Map<FamilyKey, PowdercoatColour[]>();
  for (const c of colours) {
    const key = detectFamily(c);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }

  const orderedKeys: FamilyKey[] = ["whites", "greys-light", "greys-dark", "blacks", "browns", "greens", "blues", "metallics", "other"];
  return orderedKeys
    .filter((k) => map.has(k))
    .map((k) => ({
      key: k,
      label: FAMILIES.find((f) => f.key === k)?.label ?? "Other",
      items: map.get(k)!,
    }));
}

// ---------------------------
// Cost badge
// ---------------------------
function CostBadge({ costGroup }: { costGroup: string }) {
  const group = costGroup.toLowerCase();
  if (group === "premium") {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-semibold tracking-wide">
        PREM
      </span>
    );
  }
  if (group === "custom") {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-semibold tracking-wide flex items-center gap-0.5">
        <Sparkles className="w-2.5 h-2.5" />
        CUST
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-semibold tracking-wide">
      STD
    </span>
  );
}

export default function ColourStep({
  colours,
  selectedColorId,
  onSelect,
  isLoading = false,
}: ColourStepProps) {
  const [costFilter, setCostFilter] = useState<"all" | "standard" | "premium" | "custom">("all");
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return colours.filter((c) => {
      if (costFilter !== "all" && c.costGroup.toLowerCase() !== costFilter) return false;
      if (warrantyOnly && (!c.warrantyYears || c.warrantyYears <= 0)) return false;
      if (!q) return true;
      return [c.name, c.code, c.range ?? "", c.finishType ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [colours, costFilter, warrantyOnly, search]);

  const isSearching = search.trim().length > 0;
  const groups = useMemo(() => (isSearching ? null : groupColours(filtered)), [filtered, isSearching]);

  const [openGroups, setOpenGroups] = useState<Set<FamilyKey>>(() => new Set());

  const toggleGroup = (key: FamilyKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ---------------------------
  // Loading state
  // ---------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-3">
        <div className="h-9 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-2">
          {[80, 64, 80, 72].map((w, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded-full animate-pulse" style={{ width: w }} />
          ))}
        </div>
        <ScrollArea className="flex-1 min-h-0 pr-1">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                <div className="w-full h-28 bg-gray-200 animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-2.5">
      {/* Filters: type dropdown + warranty */}
      <div className="flex gap-2 flex-shrink-0">
        <Select value={costFilter} onValueChange={(v) => setCostFilter(v as typeof costFilter)}>
          <SelectTrigger className="flex-1 text-xs h-9">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setWarrantyOnly(!warrantyOnly)}
          className={cn(
            "text-xs px-3 py-2 rounded-lg border font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap h-9",
            warrantyOnly
              ? "bg-emerald-50 border-emerald-400 text-emerald-700"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <Shield className="w-3 h-3" />
          Warranty
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          suppressHydrationWarning
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search colours…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rail-light-blue focus:border-transparent h-9"
        />
      </div>

      {/* Colour grid */}
      <ScrollArea className="flex-1 min-h-0 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground text-center px-6 gap-2">
            <p className="font-medium text-gray-700">No colours found</p>
            <p>Try a different search or adjust the filters above.</p>
          </div>
        ) : isSearching || !groups ? (
          <ColourGrid colours={filtered} selectedColorId={selectedColorId} onSelect={onSelect} />
        ) : (
          <div className="space-y-1 pb-2">
            {groups.map((group) => {
              const isOpen = openGroups.has(group.key);
              return (
                <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {group.label}
                      <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">{group.items.length}</span>
                    </span>
                    <ChevronDown
                      className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="p-2">
                      <ColourGrid colours={group.items} selectedColorId={selectedColorId} onSelect={onSelect} />
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ---------------------------
// Grid of colour cards
// ---------------------------
function ColourGrid({
  colours,
  selectedColorId,
  onSelect,
}: {
  colours: PowdercoatColour[];
  selectedColorId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {colours.map((colour, index) => {
        const isSelected = selectedColorId === colour.id;
        return (
          <motion.button
            key={colour.id}
            type="button"
            onClick={() => onSelect(colour.id)}
            className={cn(
              "bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col text-left",
              isSelected
                ? "border-rail-light-blue shadow-sm"
                : "border-gray-200 hover:border-rail-light-blue"
            )}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(index * 0.015, 0.3) }}
          >
            {/* Swatch */}
            <div className="relative w-full h-28 flex-shrink-0">
              <ColourSwatch hex={colour.hex} imageUrl={colour.imageUrl} />
              <span className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] font-mono px-1.5 py-0.5 rounded leading-none">
                {colour.code}
              </span>
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                {colour.warrantyYears > 0 && (
                  <span className="bg-emerald-600/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    {colour.warrantyYears}yr
                  </span>
                )}
                <CostBadge costGroup={colour.costGroup} />
              </div>
            </div>

            {/* Info */}
            <div className="px-2.5 py-2 bg-white flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.0625rem] flex-1">
                {colour.name}
              </span>
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px] flex-shrink-0 ${
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
