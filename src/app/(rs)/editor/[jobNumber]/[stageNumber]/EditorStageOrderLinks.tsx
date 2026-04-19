// /app/(rs)/editor/[jobNumber]/[stageNumber]/EditorStageOrderLinks.tsx
"use client";

import { Crop, ExternalLink, FileText, LayoutTemplate, ListTree, Palette, PenTool, Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

type RevisionOption = {
  value: string;
  label: string;
};

type Props = {
  jobNumber: number;
  stageNumber: number;
  hasStage: boolean;
  editorBalconyCount: number;
  hasFabricationParts: boolean;
  hasShopDrawingSheets: boolean;
  revisionOptions: RevisionOption[];
  selectedRevisionOption: string;
};

type ActionDef = {
  key: string;
  title: string;
  href: string;
  newTab?: boolean;
  requiresValidRevision?: boolean;
  Icon: typeof PenTool;
};

export default function EditorStageOrderLinks({
  jobNumber,
  stageNumber,
  hasStage,
  editorBalconyCount,
  hasFabricationParts,
  hasShopDrawingSheets,
  revisionOptions,
  selectedRevisionOption: initialSelectedRevisionOption,
}: Props) {
  const router = useRouter();
  const [selectedRevisionOption, setSelectedRevisionOption] = useState(initialSelectedRevisionOption);

  const hasEditorBalconies = hasStage && Number(editorBalconyCount) > 0;

  const revisionSegment = useMemo(() => {
    return selectedRevisionOption !== "unsynced" ? `/${selectedRevisionOption}` : "";
  }, [selectedRevisionOption]);

  function getEditorHref() {
    return `/editor/${jobNumber}/${stageNumber}`;
  }

  function getShopDrawingsHref() {
    return selectedRevisionOption !== "unsynced"
      ? `/shopdrawings-editor/${jobNumber}/${stageNumber}?revision=${selectedRevisionOption}`
      : `/shopdrawings-editor/${jobNumber}/${stageNumber}`;
  }

  function getShopDrawingsPrintHref() {
    return selectedRevisionOption !== "unsynced"
      ? `/shopdrawings-editor/${jobNumber}/${stageNumber}/print?revision=${selectedRevisionOption}`
      : `/shopdrawings-editor/${jobNumber}/${stageNumber}`;
  }

  function getFabricationHref(sheetOption: "components" | "glass" | "cutting" | "powdercoat") {
    return selectedRevisionOption !== "unsynced"
      ? `/fabrication/raw/${jobNumber}/${stageNumber}${revisionSegment}/${sheetOption}`
      : `/fabrication/raw/${jobNumber}/${stageNumber}/${sheetOption}`;
  }

  const actions: ActionDef[] = [
    { key: "shopdrawings", title: "Shop Drawings", href: getShopDrawingsHref(), Icon: LayoutTemplate },
    { key: "shopdrawings-print", title: "Shop Drawings – Print / PDF", href: getShopDrawingsPrintHref(), newTab: true, requiresValidRevision: true, Icon: FileText },
    { key: "cuttingsheet", title: "Cuttingsheet", href: getFabricationHref("cutting"), newTab: true, requiresValidRevision: true, Icon: Ruler },
    { key: "glass-order", title: "Glass Order", href: getFabricationHref("glass"), newTab: true, requiresValidRevision: true, Icon: Crop },
    { key: "powdercoat-order", title: "Powdercoat Order", href: getFabricationHref("powdercoat"), newTab: true, requiresValidRevision: true, Icon: Palette },
    { key: "components-list", title: "Components List", href: getFabricationHref("components"), newTab: true, requiresValidRevision: true, Icon: ListTree },
  ];

  const onRevisionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    setSelectedRevisionOption(e.target.value);
  };

  function getDisabledReason(action: ActionDef): string | null {
    if (!hasEditorBalconies) return "No balconies added yet";
    if (action.requiresValidRevision && selectedRevisionOption === "unsynced") return "Requires a saved revision";
    if (action.key === "shopdrawings-print" && !hasShopDrawingSheets) return "No sheets in this revision";
    if (
      (action.key === "cuttingsheet" ||
        action.key === "glass-order" ||
        action.key === "powdercoat-order" ||
        action.key === "components-list") &&
      !hasFabricationParts
    )
      return "No fabrication parts";
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-4 flex flex-col gap-4">
      {/* Revision */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-700">Revision</span>
        <select
          value={selectedRevisionOption}
          onChange={onRevisionChange}
          className="w-full h-9 rounded-lg border bg-gray-50 px-3 text-xs text-gray-700 appearance-none"
          suppressHydrationWarning
        >
          {revisionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stage outputs */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-700">Stage Outputs</span>
        {actions.map((action, i) => {
          const disabledReason = getDisabledReason(action);
          const disabled = disabledReason !== null;
          const Icon = action.Icon;
          const isPrimary = i === 0 && !disabled;

          return (
            <button
              key={action.key}
              type="button"
              title={disabledReason ?? action.title}
              disabled={disabled}
              suppressHydrationWarning
              onClick={() => {
                if (disabled) return;
                if (action.newTab) {
                  window.open(action.href, "_blank", "noopener,noreferrer");
                } else {
                  router.push(action.href);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] text-left transition-colors ${
                disabled
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : isPrimary
                  ? "bg-rail-light-blue text-white hover:opacity-90 cursor-pointer"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 cursor-pointer"
              }`}
              aria-disabled={disabled}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{action.title}</span>
              {!disabled && action.newTab ? (
                <ExternalLink className={`w-3 h-3 flex-shrink-0 ${isPrimary ? "text-white/60" : "text-gray-400"}`} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}