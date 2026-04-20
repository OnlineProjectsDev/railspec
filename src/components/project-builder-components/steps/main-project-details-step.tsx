// /components/project-builder-components/steps/main-project-details-step.tsx
"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import type { selectCustomerSchemaType } from "@/zod-schemas/customer";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Wind } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = insertJobSchemaType;

type MainProjectDetailsStepProps = {
  isEditable: boolean;
  isRailsafeEmployee: boolean;
  customers: selectCustomerSchemaType[];
  currentCustomer: selectCustomerSchemaType | null;
  jobNumberClash?: {
    exists: boolean;
    jobId?: number;
    job_number?: number;
    stage?: number;
  } | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium text-gray-600">{children}</span>;
}

export default function MainProjectDetailsStep({
  isEditable,
  isRailsafeEmployee,
  customers,
  currentCustomer,
  jobNumberClash,
}: MainProjectDetailsStepProps) {
  const { setValue, watch, control } = useFormContext<FormValues>();
  const customerId = watch("customerId");

  useEffect(() => {
    if (!isRailsafeEmployee && currentCustomer) {
      if (customerId !== currentCustomer.id) {
        setValue("customerId", currentCustomer.id, { shouldDirty: true });
      }
    }
  }, [isRailsafeEmployee, currentCustomer, customerId, setValue]);

  const customerOptions = customers.map((c) => ({
    id: String(c.id),
    description: `${c.company} - ${c.firstName?.[0] ?? ""}. ${c.lastName}`.trim(),
  }));

  const wind = (watch("wind_load") ?? {
    bldg_height: 30,
    wind_region: "A" as const,
    terrain_category: 2,
  }) as FormValues["wind_load"];

  const updateWindLoad = (patch: Partial<FormValues["wind_load"]>) => {
    setValue("wind_load", { ...wind, ...patch }, { shouldDirty: true });
  };

  return (
    <ScrollArea className="flex-1 min-h-0 pr-2">
      <div className="flex flex-col gap-3 pt-2 pb-2">

      {/* Job number */}
      <FormField
        control={control}
        name="job_number"
        render={({ field }) => (
          <FormItem className="gap-1">
            <FormLabel className="text-[11px] font-medium text-gray-600">Job number</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={99999}
                disabled={!isEditable}
                suppressHydrationWarning
                className="h-9 text-xs w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </FormControl>
            <FormMessage className="text-[10px]" />
            {jobNumberClash?.exists && (
              <p className="text-[10px] text-red-600">
                Job #{jobNumberClash.job_number} - stage {jobNumberClash.stage} already exists
                {jobNumberClash.jobId ? `. Use the Edit Job wizard for job ID ${jobNumberClash.jobId}.` : `.`}
              </p>
            )}
          </FormItem>
        )}
      />

      {/* Customer */}
      {isRailsafeEmployee ? (
        <FormField
          control={control}
          name="customerId"
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormLabel className="text-[11px] font-medium text-gray-600">Customer</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customerOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <FieldLabel>Customer</FieldLabel>
          <input
            type="text"
            readOnly
            suppressHydrationWarning
            className="h-9 text-xs w-full border rounded-md px-2 bg-gray-50"
            value={currentCustomer ? `${currentCustomer.company} - ${currentCustomer.firstName} ${currentCustomer.lastName}` : "No customer linked"}
          />
        </div>
      )}

      {/* Address 1 */}
      <FormField control={control} name="address1" render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className="text-[11px] font-medium text-gray-600">Address 1</FormLabel>
          <FormControl><Input className="h-9 text-xs w-full" {...field} value={field.value ?? ""} /></FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )} />

      {/* Address 2 */}
      <FormField control={control} name="address2" render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className="text-[11px] font-medium text-gray-600">Address 2</FormLabel>
          <FormControl><Input className="h-9 text-xs w-full" {...field} value={field.value ?? ""} /></FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )} />

      {/* City + Postcode side by side */}
      <div className="flex gap-2">
        <FormField control={control} name="city" render={({ field }) => (
          <FormItem className="gap-1 flex-1">
            <FormLabel className="text-[11px] font-medium text-gray-600">City</FormLabel>
            <FormControl><Input className="h-9 text-xs w-full" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage className="text-[10px]" />
          </FormItem>
        )} />
        <FormField control={control} name="zip" render={({ field }) => (
          <FormItem className="gap-1 w-24">
            <FormLabel className="text-[11px] font-medium text-gray-600">Postcode</FormLabel>
            <FormControl><Input className="h-9 text-xs w-full" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage className="text-[10px]" />
          </FormItem>
        )} />
      </div>

      {/* Wind load */}
      <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <Wind className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Wind load</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={11} className="text-gray-400 cursor-pointer ml-0.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-[11px]">
              Wind load parameters are used to determine the required balustrade strength. Building height, wind region, and terrain category are defined in AS/NZS 1170.2.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="p-3">
        <div className="flex gap-2">
          {/* Building height */}
          <div className="flex flex-col gap-1 flex-1">
            <FieldLabel>Building height</FieldLabel>
            <Select value={String(wind.bldg_height ?? 30)} onValueChange={(v) => updateWindLoad({ bldg_height: Number(v) })}>
              <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30" className="text-xs">&lt; 30 m</SelectItem>
                <SelectItem value="50" className="text-xs">&lt; 50 m</SelectItem>
                <SelectItem value="75" className="text-xs">&lt; 75 m</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wind region */}
          <div className="flex flex-col gap-1 flex-1">
            <FieldLabel>Wind region</FieldLabel>
            <Select value={wind.wind_region ?? "A"} onValueChange={(v) => updateWindLoad({ wind_region: v as FormValues["wind_load"]["wind_region"] })}>
              <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A" className="text-xs">Region A</SelectItem>
                <SelectItem value="B" className="text-xs">Region B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Terrain category */}
          <div className="flex flex-col gap-1 w-16">
            <FieldLabel>Terrain</FieldLabel>
            <Select value={String(wind.terrain_category ?? 2)} onValueChange={(v) => updateWindLoad({ terrain_category: Number(v) })}>
              <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2" className="text-xs">2</SelectItem>
                <SelectItem value="3" className="text-xs">3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
      </div>

    </div>
    </ScrollArea>
  );
}
