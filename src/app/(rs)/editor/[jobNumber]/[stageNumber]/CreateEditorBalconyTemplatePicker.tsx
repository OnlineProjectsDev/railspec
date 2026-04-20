// /app/(rs)/editor/[jobNumber]/[stageNumber]/CreateEditorBalconyTemplatePicker.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Info, LoaderCircle, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createEditorBalconyWithStateAction } from "@/app/actions/createEditorBalconyWithStateAction";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EditorTemplateCompatibility } from "@/lib/editor-persistence/editorTemplates";

type ExistingBalconyRow = {
  id: number;
  drop: string;
  balconyNo: string;
  isDeleted: boolean;
};

type EditDraft = {
  drop: string;
  balconyNo: string;
};

type LocalFieldErrors = {
  drop?: string;
  balconyNo?: string;
};

type Props = {
  jobId: number;
  jobStageId: number;
  nextDrop: string;
  nextBalconyNo: string;
  templates: EditorTemplateCompatibility[];
  balconies: ExistingBalconyRow[];
};

export default function CreateEditorBalconyTemplatePicker({
  jobId,
  jobStageId,
  nextDrop,
  nextBalconyNo,
  templates,
  balconies,
}: Props) {
  const router = useRouter();
  const compatibleTemplates = useMemo(
    () => templates.filter((item) => item.compatible),
    [templates]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    compatibleTemplates[0]?.template.id ?? ""
  );

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.template.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const [isNamingNewBalcony, setIsNamingNewBalcony] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({ drop: "", balconyNo: "" });
  const [localFieldErrors, setLocalFieldErrors] = useState<LocalFieldErrors>({});

  const activeDuplicateBalcony =
    isNamingNewBalcony && draft.drop.trim() && draft.balconyNo.trim()
      ? balconies.find(
          (item) =>
            !item.isDeleted &&
            item.drop.trim().toUpperCase() === draft.drop.trim().toUpperCase() &&
            item.balconyNo.trim().toLowerCase() === draft.balconyNo.trim().toLowerCase()
        )
      : undefined;

  const liveBalconyNoError = activeDuplicateBalcony
    ? `Balcony ${draft.balconyNo.trim()} is already in use for drop ${draft.drop.trim()} on this stage.`
    : undefined;

  const { execute, isPending } = useAction(createEditorBalconyWithStateAction, {
    onSuccess({ data }) {
      if (!data?.success || !data.editorBalconyId) {
        toast.error(data?.message ?? "Failed to create editor balcony.");
        return;
      }

      toast.success(data.message);
      setIsNamingNewBalcony(false);
      setDraft({ drop: "", balconyNo: "" });
      setLocalFieldErrors({});
      router.push(`/editor/balcony/${data.editorBalconyId}`);
      router.refresh();
    },
    onError() {
      toast.error("Failed to create editor balcony.");
    },
  });

  function startCreateFromTemplate() {
    if (!selectedTemplateId || !selectedTemplate?.compatible || isPending) return;

    setLocalFieldErrors({});
    setDraft({
      drop: nextDrop,
      balconyNo: nextBalconyNo,
    });
    setIsNamingNewBalcony(true);
  }

  function cancelCreateFromTemplate() {
    setIsNamingNewBalcony(false);
    setDraft({ drop: "", balconyNo: "" });
    setLocalFieldErrors({});
  }

  function confirmCreateFromTemplate() {
    const nextDraftDrop = draft.drop.trim();
    const nextDraftBalconyNo = draft.balconyNo.trim();

    const nextErrors: LocalFieldErrors = {};

    if (!nextDraftDrop) {
      nextErrors.drop = "Drop is required.";
    }

    if (!nextDraftBalconyNo) {
      nextErrors.balconyNo = "Balcony number is required.";
    }

    const duplicateBalcony =
      nextDraftDrop && nextDraftBalconyNo
        ? balconies.find(
            (item) =>
              !item.isDeleted &&
              item.drop.trim().toUpperCase() === nextDraftDrop.trim().toUpperCase() &&
              item.balconyNo.trim().toLowerCase() === nextDraftBalconyNo.trim().toLowerCase()
          )
        : undefined;

    if (duplicateBalcony) {
      nextErrors.balconyNo = `Balcony ${nextDraftBalconyNo} is already in use for drop ${nextDraftDrop} on this stage.`;
    }

    setLocalFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error(Object.values(nextErrors)[0] ?? "Please fix the balcony name.");
      return;
    }

    execute({
      jobId,
      jobStageId,
      drop: nextDraftDrop,
      balconyNo: nextDraftBalconyNo,
      templateId: selectedTemplateId,
      notes: null,
      geometryNotes: null,
    });
  }

  if (!compatibleTemplates.length) {
    return (
      <div className="text-[11px] text-muted-foreground">
        No compatible templates for this stage’s settings.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isPending ? (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-md border bg-white px-4 py-3 shadow-sm flex items-center gap-2">
            <LoaderCircle className="animate-spin" />
            <span className="text-sm font-medium">Creating balcony…</span>
          </div>
        </div>
      ) : null}

      <Dialog open={isNamingNewBalcony} onOpenChange={(open) => { if (!open) cancelCreateFromTemplate(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add balcony</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-gray-600">Drop</span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 cursor-default" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-52 text-xs">
                      A letter (A, B, C…) grouping balconies by physical level or location — e.g. Drop A = ground floor, Drop B = first floor.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <input
                className="w-full rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                value={draft.drop}
                autoFocus
                suppressHydrationWarning
                onChange={(e) => {
                  setDraft((current) => ({ ...current, drop: e.target.value }));
                  setLocalFieldErrors((current) => ({ ...current, drop: undefined, balconyNo: undefined }));
                }}
              />
              {localFieldErrors.drop ? (
                <div className="text-xs text-red-600">{localFieldErrors.drop}</div>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-gray-600">Balcony</span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 cursor-default" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-52 text-xs">
                      A number (1, 2, 3…) identifying the specific railing run within the drop — e.g. Drop A Balcony 1, Drop A Balcony 2.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <input
                className="w-full rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                value={draft.balconyNo}
                suppressHydrationWarning
                onChange={(e) => {
                  setDraft((current) => ({ ...current, balconyNo: e.target.value }));
                  setLocalFieldErrors((current) => ({ ...current, drop: undefined, balconyNo: undefined }));
                }}
              />
              {localFieldErrors.balconyNo ? (
                <div className="text-xs text-red-600">{localFieldErrors.balconyNo}</div>
              ) : liveBalconyNoError ? (
                <div className="text-xs text-red-600">{liveBalconyNoError}</div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={cancelCreateFromTemplate}
              disabled={isPending}
              suppressHydrationWarning
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmCreateFromTemplate}
              disabled={
                isPending ||
                !draft.drop.trim() ||
                !draft.balconyNo.trim() ||
                !!localFieldErrors.drop ||
                !!localFieldErrors.balconyNo ||
                !!liveBalconyNoError ||
                !selectedTemplateId ||
                !selectedTemplate?.compatible
              }
              suppressHydrationWarning
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="p-1 rounded-md bg-white/20">
                {isPending ? <LoaderCircle className="animate-spin h-3 w-3 text-white" /> : <Save className="h-3 w-3 text-white" />}
              </div>
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2.5 flex-1 min-h-0">
        {/* Template cards */}
        <ScrollArea className="flex-1 min-h-0">
        <div className="grid grid-cols-1 gap-2 w-full pr-1">
          {compatibleTemplates.map((item) => {
            const template = item.template;
            const isSelected = template.id === selectedTemplateId;
            return (
              <button
                key={template.id}
                type="button"
                suppressHydrationWarning
                onClick={() => setSelectedTemplateId(template.id)}
                className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-colors flex flex-col p-2.5 text-left ${
                  isSelected
                    ? "border-rail-light-blue shadow-sm"
                    : "border-gray-200 hover:border-rail-light-blue"
                }`}
              >
                <div className="font-semibold text-[12px] mb-1">{template.label}</div>
                <div className="text-[11px] text-gray-500 leading-snug flex-1 mb-2 min-h-[2.5rem]">
                  {template.description ?? "—"}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[10px] text-gray-400 leading-snug">
                    {template.tags.family}
                    {template.tags.designs.length ? ` · ${template.tags.designs.join(", ")}` : ""}
                    {template.tags.anchorages.length ? ` · ${template.tags.anchorages.join(", ")}` : ""}
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full border-2 text-[9px] ${
                      isSelected
                        ? "bg-rail-light-blue border-rail-light-blue text-white"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        </ScrollArea>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={startCreateFromTemplate}
            disabled={isPending || !selectedTemplateId || !selectedTemplate?.compatible}
            suppressHydrationWarning
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="p-1 rounded-md bg-white/20">
              <Plus className="h-3 w-3 text-white" />
            </div>
            <span className="flex-1 text-left">Add balcony</span>
          </button>
          <button
            type="button"
            onClick={startCreateFromTemplate}
            disabled={isPending || !selectedTemplateId || !selectedTemplate?.compatible}
            suppressHydrationWarning
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="p-1 rounded-md bg-gray-200">
              <Plus className="h-3 w-3 text-gray-500" />
            </div>
            <span className="flex-1 text-left">Create from template</span>
          </button>
        </div>
      </div>
    </div>
  );
}