// app/(rs)/fabrication/FabricationClient.tsx
"use client";

import React from "react";
import type { FabricationDocType } from "@/lib/fabrication/types";

// IMPORTANT: docs live in (print)
import { CuttingSheetDoc } from "@/app/(print)/fabrication/docs/CuttingSheetDoc";
import { PowdercoatOrderDoc } from "@/app/(print)/fabrication/docs/PowdercoatOrderDoc";
import { GlassOrderDoc } from "@/app/(print)/fabrication/docs/GlassOrderDoc";
import { ComponentsListDoc } from "@/app/(print)/fabrication/docs/ComponentsListDoc";

// Re-use the prop types expected by the docs/hook (source of truth is (print)/FabricationClient)
import type {
  FabricationBase,
  FabricationBalconyInput,
  FabricationJobDefaults,
} from "@/app/(print)/fabrication/FabricationClient";

export function FabricationClient(props: {
  docType: FabricationDocType;
  base: FabricationBase;
  balconies: FabricationBalconyInput[];
  jobDefaults: FabricationJobDefaults;
}) {
  const { docType, base, balconies, jobDefaults } = props;

  switch (docType) {
    case "cutting":
      return <CuttingSheetDoc base={base} balconies={balconies} jobDefaults={jobDefaults} />;
    case "powdercoat":
      return <PowdercoatOrderDoc base={base} balconies={balconies} jobDefaults={jobDefaults} />;
    case "glass":
      return <GlassOrderDoc base={base} balconies={balconies} jobDefaults={jobDefaults} />;
    case "components":
      return <ComponentsListDoc base={base} balconies={balconies} jobDefaults={jobDefaults} />;
    default:
      return null;
  }
}
