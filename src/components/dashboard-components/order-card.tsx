// /components/dashboard-components/order-card.tsx
"use client";

import { Crop, FileText, LayoutTemplate, ListTree, Palette, PenTool, Ruler, MoreHorizontal, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactElement, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const onRevisionChange = (value: string) => {
    setSelectedRevisionOption(value);
  };

  const handleAction = (e: React.MouseEvent, href: string, newTab?: boolean) => {
    e.stopPropagation();
    if (newTab) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      router.push(href);
    }
  };

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg bg-[#f5f5f5] hover:bg-rail-light-blue/20 transition-colors cursor-pointer"
      onClick={() => router.push(getEditorHref())}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-10 h-10 bg-rail-light-blue/10 rounded-md flex-shrink-0">
          {getStatusIcon(order.status)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{order.jobAddress}</p>
          <span className="text-gray-300 text-xs">|</span>
          <p className="text-[11px] text-gray-500">{order.company} · {order.firstName} {order.lastName}</p>
          <span className="text-gray-300 text-xs">|</span>
          <p className="text-[10px] text-gray-400">{new Date(order.jobDate as any).toLocaleDateString("en-AU", { dateStyle: "medium" })}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Job + stage + design badges */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[10px] font-semibold tabular-nums cursor-default">
                #{order.job_number}
              </span>
            </TooltipTrigger>
            <TooltipContent>Job Number</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-2 py-0.5 rounded-md bg-rail-light-blue/10 text-rail-light-blue text-[10px] font-semibold cursor-default">
                Stage {order.stage}
              </span>
            </TooltipTrigger>
            <TooltipContent>Stage</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-medium cursor-default">
                {order.design}
              </span>
            </TooltipTrigger>
            <TooltipContent>Design Type</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">

          <Select
            value={selectedRevisionOption}
            onValueChange={onRevisionChange}
          >
            <SelectTrigger
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-[110px] text-[10px] border rounded-md bg-white"
              suppressHydrationWarning
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent onClick={(e) => e.stopPropagation()} className="w-48">
              {order.revisionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-[11px]">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 rounded-md bg-rail-light-blue hover:bg-rail-light-blue/80 text-white transition-colors flex items-center justify-center cursor-pointer"
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel className="text-[11px]">Design</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!hasStage}
              onSelect={(e) => { if (hasStage) router.push(getEditorHref()); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <PenTool size={13} />
              {hasEditorBalconies ? "Open Editor" : "Add Balcony"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasEditorBalconies}
              onSelect={() => { if (hasEditorBalconies) router.push(getShopDrawingsHref()); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <LayoutTemplate size={13} />
              Shop Drawings
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasEditorBalconies}
              onSelect={() => { if (hasEditorBalconies) window.open(getShopDrawingsPrintHref(), "_blank", "noopener,noreferrer"); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <FileText size={13} />
              Shop Drawings — Print / PDF
              <ExternalLink size={11} className="ml-auto text-gray-400" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px]">Fabrication</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!hasEditorBalconies}
              onSelect={() => { if (hasEditorBalconies) window.open(getFabricationHref("cutting"), "_blank", "noopener,noreferrer"); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <Ruler size={13} />
              Cutting Sheet
              <ExternalLink size={11} className="ml-auto text-gray-400" />
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasEditorBalconies}
              onSelect={() => { if (hasEditorBalconies) window.open(getFabricationHref("glass"), "_blank", "noopener,noreferrer"); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <Crop size={13} />
              Glass Order
              <ExternalLink size={11} className="ml-auto text-gray-400" />
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasEditorBalconies}
              onSelect={() => { if (hasEditorBalconies) window.open(getFabricationHref("powdercoat"), "_blank", "noopener,noreferrer"); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <Palette size={13} />
              Powdercoat Order
              <ExternalLink size={11} className="ml-auto text-gray-400" />
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasEditorBalconies}
              onSelect={() => { if (hasEditorBalconies) window.open(getFabricationHref("components"), "_blank", "noopener,noreferrer"); }}
              className="text-[11px] gap-2 cursor-pointer"
            >
              <ListTree size={13} />
              Components List
              <ExternalLink size={11} className="ml-auto text-gray-400" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
