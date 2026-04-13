// /components/project-builder-components/steps/main-project-details-step.tsx
"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { insertJobSchemaType } from "@/zod-schemas/jobs";
import type { selectCustomerSchemaType } from "@/zod-schemas/customer";

import { NumberInputWithLabel } from "@/components/inputs/NumberWithLabel";
import { InputWithLabel } from "@/components/inputs/InputWithLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectWithLabel } from "@/components/inputs/SelectWithLabel";
import { FormControl } from "@/components/ui/form";

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

export default function MainProjectDetailsStep({
  isEditable,
  isRailsafeEmployee,
  customers,
  currentCustomer,
  jobNumberClash,
}: MainProjectDetailsStepProps) {
  const { setValue, watch } = useFormContext<FormValues>();
  const customerId = watch("customerId");

  // If not Railsafe employee, force customerId to the logged-in customer's id
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

  // --- Wind load state from the form ---
  const wind = (watch("wind_load") ?? {
    bldg_height: 30,
    wind_region: "A" as const,
    terrain_category: 2,
  }) as FormValues["wind_load"];

  const bldgHeightVal = wind.bldg_height ?? 30;
  const windRegionVal = wind.wind_region ?? "A";
  const terrainCatVal = wind.terrain_category ?? 2;

  const updateWindLoad = (patch: Partial<FormValues["wind_load"]>) => {
    setValue(
      "wind_load",
      {
        ...wind,
        ...patch,
      },
      { shouldDirty: true }
    );
  };

  return (
    <div className="flex flex-col gap-3 max-w-sm">
      <div className="flex flex-col gap-1">
        <NumberInputWithLabel<FormValues>
            fieldTitle="Job number"
            nameInSchema="job_number"
            min={1}
            max={99999}
            disabled={!isEditable}
        />
        {jobNumberClash?.exists && (
            <p className="text-xs text-red-600 mt-1">
            Job #{jobNumberClash.job_number} – stage {jobNumberClash.stage} already exists
            {jobNumberClash.jobId
                ? `. Use the Edit Job wizard for job ID ${jobNumberClash.jobId}.`
                : `. Use the Edit Job wizard instead of creating a new job.`}
            </p>
        )}
      </div>

      {/* Customer selection logic */}
      {isRailsafeEmployee ? (
        <SelectWithLabel<FormValues>
          fieldTitle="Customer"
          nameInSchema="customerId"
          data={customerOptions}
        />
      ) : (
        <div className="flex flex-col gap-1 w-full max-w-sm">
          <label className="text-sm font-medium">Customer</label>
          <input
            type="text"
            readOnly
            suppressHydrationWarning
            className="w-full max-w-sm border rounded px-2 py-1 text-sm bg-gray-100"
            value={
              currentCustomer
                ? `${currentCustomer.company} - ${currentCustomer.firstName} ${currentCustomer.lastName}`
                : "No customer linked"
            }
          />
        </div>
      )}

      {/* Address etc. still editable for employees; you may want to restrict further for customers */}
      <InputWithLabel<FormValues>
        fieldTitle="Address 1"
        nameInSchema="address1"
      />

      <InputWithLabel<FormValues>
        fieldTitle="Address 2"
        nameInSchema="address2"
      />

      <InputWithLabel<FormValues>
        fieldTitle="City"
        nameInSchema="city"
      />

      <InputWithLabel<FormValues>
        fieldTitle="Postcode"
        nameInSchema="zip"
      />

       {/* 🔹 Wind Load selection block (3 "tables") */}
      <div className="mt-2 p-3 border rounded-md space-y-3">
        <h3 className="text-sm font-semibold">Wind load</h3>

        {/* 1) Building height */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">Building height</span>
          <Select
            value={String(bldgHeightVal)}
            onValueChange={(v) => updateWindLoad({ bldg_height: Number(v) })}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select building height" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="30">&lt; 30 m</SelectItem>
              <SelectItem value="50">&lt; 50 m</SelectItem>
              <SelectItem value="75">&lt; 75 m</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 2) Wind region */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">Wind region</span>
          <Select
            value={windRegionVal}
            onValueChange={(v) =>
              updateWindLoad({ wind_region: v as FormValues["wind_load"]["wind_region"] })
            }
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select wind region" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="A">Region A</SelectItem>
              <SelectItem value="B">Region B</SelectItem>
              {/* <SelectItem value="C">Region C</SelectItem>
              <SelectItem value="D">Region D</SelectItem> */}
            </SelectContent>
          </Select>
        </div>

        {/* 3) Terrain category */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">Terrain category</span>
          <Select
            value={String(terrainCatVal)}
            onValueChange={(v) =>
              updateWindLoad({ terrain_category: Number(v) })
            }
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select terrain category" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
