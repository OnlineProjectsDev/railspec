"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataObj = {
  id: string;          // id is string for the UI
  description: string; // label
};

type Props<S> = {
  fieldTitle: string;
  nameInSchema: keyof S & string;
  data: DataObj[];
  className?: string;
};

export function SelectWithLabel<S>({
  fieldTitle,
  nameInSchema,
  data,
  className,
}: Props<S>) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={nameInSchema}
      render={({ field }) => {
        // Normalise value → string for the Select
        const stringValue =
          field.value === null || field.value === undefined
            ? ""
            : String(field.value);

        return (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium" htmlFor={nameInSchema}>
              {fieldTitle}
            </FormLabel>

            <Select
              onValueChange={(val) => {
                // If the current field value is a number, coerce the select value to number
                if (typeof field.value === "number") {
                  field.onChange(Number(val));
                } else {
                  field.onChange(val);
                }
              }}
              value={stringValue}
            >
              <FormControl>
                <SelectTrigger
                  id={nameInSchema}
                  className={`w-full ${className ?? ""}`}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
              </FormControl>

              <SelectContent>
                {data.map((item) => (
                  <SelectItem
                    key={`${nameInSchema}_${item.id}`}
                    value={item.id}
                  >
                    {item.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
