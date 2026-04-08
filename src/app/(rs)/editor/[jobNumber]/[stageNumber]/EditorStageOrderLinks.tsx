// /app/(rs)/editor/[jobNumber]/[stageNumber]/EditorStageOrderLinks.tsx
"use client";

import { Crop, FileText, LayoutTemplate, ListTree, Palette, PenTool, Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, MouseEvent, useMemo, useState } from "react";

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

  const onActionClick = (e: MouseEvent, href: string, newTab?: boolean, disabled?: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (newTab) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(href);
  };

  return (
    <div className="rounded-md border p-4 bg-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Order Links</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Open editor, shopdrawings, print/PDF, and fabrication outputs for this stage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRevisionOption}
            onChange={onRevisionChange}
            className="h-9 rounded-md border bg-white px-3 text-sm"
            suppressHydrationWarning
          >
            {revisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            {actions.map((action) => {
              const disabled =
                !hasEditorBalconies ||
                (action.requiresValidRevision === true && selectedRevisionOption === "unsynced") ||
                (action.key === "shopdrawings-print" && !hasShopDrawingSheets) ||
                ((action.key === "cuttingsheet" ||
                  action.key === "glass-order" ||
                  action.key === "powdercoat-order" ||
                  action.key === "components-list") &&
                  !hasFabricationParts);

              const Icon = action.Icon;

              return (
                <button
                  key={action.key}
                  type="button"
                  title={
                    disabled
                      ? action.requiresValidRevision === true && selectedRevisionOption === "unsynced"
                        ? `${action.title} (requires saved revision)`
                        : action.key === "shopdrawings-print" && !hasShopDrawingSheets
                          ? `${action.title} (no sheets)`
                          : (action.key === "cuttingsheet" ||
                              action.key === "glass-order" ||
                              action.key === "powdercoat-order" ||
                              action.key === "components-list") &&
                            !hasFabricationParts
                            ? `${action.title} (no fabrication parts)`
                            : `${action.title} (disabled)`
                      : action.title
                  }
                  onClick={(e) => onActionClick(e, action.href, action.newTab, disabled)}
                  className={`h-9 w-9 rounded-md transition-colors flex items-center justify-center ${
                    disabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#333]/30 hover:bg-[#333]/50 text-white cursor-pointer"
                  }`}
                  aria-disabled={disabled}
                  suppressHydrationWarning
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}