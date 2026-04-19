// /app/(rs)/editor/[jobNumber]/[stageNumber]/CreateEditorBalconyTemplatePicker.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { LoaderCircle, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createEditorBalconyWithStateAction } from "@/app/actions/createEditorBalconyWithStateAction";
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
    <>
      {isPending ? (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-md border bg-white px-4 py-3 shadow-sm flex items-center gap-2">
            <LoaderCircle className="animate-spin" />
            <span className="text-sm font-medium">Creating balcony…</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {/* Template cards */}
        <div className="grid grid-cols-1 gap-2 w-full">
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

        {/* Naming form or create button */}
        {isNamingNewBalcony ? (
          <div className="flex flex-wrap items-end gap-2 rounded-md border bg-gray-50 p-2.5">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Drop</div>
              <input
                className="w-20 rounded-md border bg-white px-2.5 py-1.5 text-sm"
                value={draft.drop}
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
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Balcony</div>
              <input
                className="w-28 rounded-md border bg-white px-2.5 py-1.5 text-sm"
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

            <Button
              type="button"
              size="sm"
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
            >
              {isPending ? <LoaderCircle className="animate-spin h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              Create
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelCreateFromTemplate}
              disabled={isPending}
              suppressHydrationWarning
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCreateFromTemplate}
            disabled={isPending || !selectedTemplateId || !selectedTemplate?.compatible}
            suppressHydrationWarning
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-2 text-[11px] font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            Create from template
          </button>
        )}
      </div>
    </>
  );
}