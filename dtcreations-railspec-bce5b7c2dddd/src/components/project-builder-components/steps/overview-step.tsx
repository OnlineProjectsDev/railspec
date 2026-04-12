// Filename: overview-step.tsx
"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Ruler, Wind, Palette } from "lucide-react";

import { insertJobSchema } from "@/zod-schemas/jobs";
import { selectCustomerSchemaType } from "@/zod-schemas/customer";
import type { PowdercoatColour } from "@/components/project-builder-components/steps/colour-step";

type FormValues = z.infer<typeof insertJobSchema>;

interface OverviewStepProps {
  customers: selectCustomerSchemaType[];
  colours: PowdercoatColour[];
}

const ANCHORAGE_LABELS: Record<string, string> = {
  BP: "Baseplate",
  DP: "Deckplate",
  CD: "Core drilled",
  SF: "Side Fixed",
  SPIGOT: "Spigot",
};

export default function OverviewStep({ customers, colours }: OverviewStepProps) {
  const form = useFormContext<FormValues>();

  const rawValues = form.getValues();

  let data: FormValues;
  let hasSchemaError = false;
  try {
    data = insertJobSchema.parse(rawValues);
  } catch {
    hasSchemaError = true;
    data = rawValues;
  }

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const fullAddress = [
    data.address1,
    data.address2 || undefined,
    data.city,
    data.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const wind = data.wind_load ?? {
    bldg_height: 30,
    wind_region: "A",
    terrain_category: 2,
  };

  const jobLabel =
    typeof data.id === "number"
      ? `Existing job #${data.job_number} (ID ${data.id})`
      : `New job #${data.job_number}`;

  // 🔹 Customer label: "Company - F. Lastname"
  let customerDisplay = "Not set";
  if (data.customerId) {
    const cust = customers.find((c) => c.id === data.customerId);
    if (cust) {
      const initial = cust.firstName?.[0] ?? "";
      const namePart =
        initial && cust.lastName
          ? `${initial}. ${cust.lastName}`
          : `${cust.firstName ?? ""} ${cust.lastName ?? ""}`.trim();
      customerDisplay = namePart
        ? `${cust.company} - ${namePart}`
        : cust.company ?? `Customer #${data.customerId}`;
    } else {
      customerDisplay = `Customer #${data.customerId}`;
    }
  }

  // 🔹 Anchorage label: use human label where possible
  const rawAnchorage = data.anchorage_default ?? "";
  const anchorageDisplay = rawAnchorage
    ? ANCHORAGE_LABELS[rawAnchorage] ?? rawAnchorage
    : "Not selected";

  // 🔹 Colour label: "Range - Name - Finish"
  const colourId = (data as any).powdercoatColourId as number | null | undefined;
  const colourObj = colourId != null
    ? colours.find((c) => c.id === colourId)
    : undefined;

  const colourDisplay = colourObj
    ? `${colourObj.range} - ${colourObj.name}`
    : "Aluminium milled (default)";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-[#f5f5f5] rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-40 mb-3"></div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-1.5 border-b last:border-b-0"
            >
              <div className="h-3 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>

        <div className="bg-[#f5f5f5] rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-1.5 border-b last:border-b-0"
            >
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-3 bg-gray-200 rounded w-40"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="flex flex-col gap-4 pb-3">
          {hasSchemaError && (
            <div className="bg-red-50 border border-red-200 text-[11px] text-red-700 rounded-md px-3 py-2">
              Preview is using raw values because they don’t fully satisfy the
              schema yet. Fix errors on previous steps before submitting.
            </div>
          )}

          {/* Job summary */}
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <h3 className="text-xs font-semibold mb-2">Job summary</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Job</span>
                <span className="font-medium text-right">{jobLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stage</span>
                <span className="font-medium">
                  {data.stage != null ? data.stage : "—"}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium text-right max-w-[60%]">
                  {customerDisplay}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-500 flex items-center gap-1">
                  <MapPin size={11} />
                  Address
                </span>
                <span className="font-medium text-right max-w-[60%]">
                  {fullAddress || "Not set"}
                </span>
              </div>
              {/* <div className="flex justify-between">
                <span className="text-gray-500">Measurer</span>
                <span className="font-medium">
                  {data.measurer || "Unassigned"}
                </span>
              </div> */}
            </div>
          </div>

          {/* Design configuration */}
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <h3 className="text-xs font-semibold mb-2">Design configuration</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Design</span>
                <span className="font-medium">
                  {data.design_default || "Not selected"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Infill</span>
                <span className="font-medium">
                  {data.infill_default || "Not selected"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Anchorage</span>
                <span className="font-medium">{anchorageDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Toprail</span>
                <span className="font-medium">
                  {data.toprail_default || "Not selected"}
                </span>
              </div>
            </div>
          </div>

          {/* Constraints */}
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Ruler size={12} /> Design constraints
            </h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Min barrier height</span>
                <span className="font-medium">
                  {data.height_default != null
                    ? `${data.height_default} mm`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Max barrier height</span>
                <span className="font-medium">
                  {data.max_height_default != null
                    ? `${data.max_height_default} mm`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max post spacing</span>
                <span className="font-medium">
                  {data.max_post_spacing != null
                    ? `${data.max_post_spacing} mm`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Wind load */}
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Wind size={12} /> Wind load
            </h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Building height</span>
                <span className="font-medium">
                  {wind.bldg_height ? `<${wind.bldg_height} m` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Wind region</span>
                <span className="font-medium">{wind.wind_region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Terrain category</span>
                <span className="font-medium">
                  {wind.terrain_category ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Colour */}
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Palette size={12} /> Colour
            </h3>
            <p className="text-[11px]">
              <span className="text-gray-500 mr-2">Selected colour:</span>
              <span className="font-medium">{colourDisplay}</span>
            </p>
          </div>

          {/* Notes */}
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <h3 className="text-xs font-semibold mb-2">Notes</h3>
            <p className="text-[11px] whitespace-pre-wrap">
              {data.notes && data.notes.trim().length > 0
                ? data.notes
                : "No notes added."}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
