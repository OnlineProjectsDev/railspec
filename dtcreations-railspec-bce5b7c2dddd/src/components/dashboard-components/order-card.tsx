// /components/dashboard-components/order-card.tsx
"use client";

import { Crop, FileText, LayoutTemplate, ListTree, Palette, PenTool, Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, MouseEvent, ReactElement, useMemo, useState } from "react";

interface Order {
  id: number;
  jobDate: Date;
  jobAddress: string;
  job_number: number;
  job_id: number;
  stage: number;
  design:string;
  company: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  status: string;
  hasStage: boolean;
  editorBalconyCount: number;
  revisionOptions: {
    value: string;
    label: string;
  }[];
  selectedRevisionOption: string;
}

interface OrderCardProps {
  order: Order;
  getStatusIcon: (status: string) => ReactElement | null;
  getStatusBadge: (status: string) => string;
}

type ActionDef = {
  key: string;
  title: string;
  href: string;
  newTab?: boolean;
  Icon: typeof PenTool;
};

export function OrderCard({ order, getStatusIcon, getStatusBadge }: OrderCardProps) {
  const router = useRouter();

  const hasStage = Boolean(order.hasStage);
  const hasEditorBalconies = hasStage && Number(order.editorBalconyCount) > 0;
  const [selectedRevisionOption, setSelectedRevisionOption] = useState(order.selectedRevisionOption);

  const revisionSegment = useMemo(() => {
    return selectedRevisionOption !== "unsynced" ? `/${selectedRevisionOption}` : "";
  }, [selectedRevisionOption]);

  function getEditorHref() {
    return `/editor/${order.job_number}/${order.stage}`;
  }

  function getShopDrawingsHref() {
    return selectedRevisionOption !== "unsynced"
      ? `/shopdrawings-editor/${order.job_number}/${order.stage}?revision=${selectedRevisionOption}`
      : `/shopdrawings-editor/${order.job_number}/${order.stage}`;
  }

  function getShopDrawingsPrintHref() {
    return selectedRevisionOption !== "unsynced"
      ? `/shopdrawings-editor/${order.job_number}/${order.stage}/print?revision=${selectedRevisionOption}`
      : `/shopdrawings-editor/${order.job_number}/${order.stage}`;
  }

  function getFabricationHref(sheetOption: "components" | "glass" | "cutting" | "powdercoat") {
    return selectedRevisionOption !== "unsynced"
      ? `/fabrication/raw/${order.job_number}/${order.stage}${revisionSegment}/${sheetOption}`
      : `/fabrication/raw/${order.job_number}/${order.stage}/${sheetOption}`;
  }

  const actions: ActionDef[] = [
    {
      key: "editor",
      title: hasEditorBalconies ? "Open Editor" : "Add Balcony",
      href: getEditorHref(),
      Icon: PenTool,
    },
    { key: "shopdrawings", title: "Shop Drawings", href: getShopDrawingsHref(), Icon: LayoutTemplate },
    { key: "shopdrawings-print", title: "Shop Drawings – Print / PDF", href: getShopDrawingsPrintHref(), newTab: true, Icon: FileText },
    { key: "cuttingsheet", title: "Cuttingsheet", href: getFabricationHref("cutting"), newTab: true, Icon: Ruler },
    { key: "glass-order", title: "Glass Order", href: getFabricationHref("glass"), newTab: true, Icon: Crop },
    { key: "powdercoat-order", title: "Powdercoat Order", href: getFabricationHref("powdercoat"), newTab: true, Icon: Palette },
    { key: "components-list", title: "Components List", href: getFabricationHref("components"), newTab: true, Icon: ListTree },
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
    <div
      className="flex items-center justify-between p-3 rounded-lg bg-[#f5f5f5] hover:bg-rail-light-blue/20 transition-colors cursor-pointer"
      onClick={() => router.push(getEditorHref())}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-10 h-10 bg-rail-light-blue/10 rounded-md">
          {getStatusIcon(order.status)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{order.jobAddress}</p>
          <p className="text-[11px] text-gray-500">
            {order.company} - {order.firstName} {order.lastName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-900">{order.job_number + " - Stage " + order.stage + " : " + order.design}</p>
          <p className="text-[10px] text-gray-500">
            {new Date(order.jobDate as any).toLocaleDateString("en-AU", { dateStyle: "medium" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${getStatusBadge(order.status)}`}>
            {order.status}
          </span>

          <select
            value={selectedRevisionOption}
            onChange={onRevisionChange}
            onClick={(e) => e.stopPropagation()}
            className="h-8 rounded-md border bg-white px-2 text-[11px]"
            suppressHydrationWarning
          >
            {order.revisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions row (always visible; disabled when no linked data) */}
        <div className="flex items-center gap-1.5">
          {actions.map((a) => {
            const disabled =
            a.key === "editor"
              ? !hasStage
              : !hasEditorBalconies;
            const Icon = a.Icon;

            return (
              <button
                key={a.key}
                type="button"
                title={
                  disabled
                    ? `${a.title} (disabled)`
                    : a.title
                }
                onClick={(e) => onActionClick(e, a.href, a.newTab, disabled)}
                className={`h-8 w-8 rounded-md transition-colors flex items-center justify-center ${
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
  );
}
