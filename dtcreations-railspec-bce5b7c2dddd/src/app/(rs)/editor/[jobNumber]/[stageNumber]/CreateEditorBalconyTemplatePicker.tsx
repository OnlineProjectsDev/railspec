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
import BalconyPreview from "./BalconyPreview";

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

  if (!templates.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No templates are available.
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

      <div className="flex flex-col gap-3">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {templates.map((item) => {
          const template = item.template;
          const selected = template.id === selectedTemplateId;
          const disabled = !item.compatible;

          return (
            <button
              key={template.id}
              type="button"
              suppressHydrationWarning
              onClick={() => {
                if (disabled) return;
                setSelectedTemplateId(template.id);
              }}
              disabled={disabled}
              className={`w-64 shrink-0 rounded-md border px-3 py-3 text-left transition-colors ${
                disabled
                  ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-70"
                  : selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="w-full h-20 mb-2 rounded border bg-white overflow-hidden">
                <BalconyPreview
                  balconyId={0}
                  drop=""
                  balconyNo=""
                  substrateOutline={
                    template.foundation?.floor?.vertices?.length
                      ? template.foundation.floor.vertices.map((vertex) => ({ x: vertex.x, z: vertex.z }))
                      : null
                  }
                  substrateEdges={
                    template.foundation?.floor?.edges?.length
                      ? template.foundation.floor.edges.map((edge) => ({
                          edgeType: edge.edgeType,
                          thickness: edge.thickness ?? 0,
                          refType: edge.refType,
                        }))
                      : null
                  }
                  hasDerivedBalustrade={template.hasDerivedBalustrade ?? false}
                  isFramelessSystem={template.tags.family === "frameless"}
                  previewMode="svg"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{template.label}</div>
                <div className="text-[11px] uppercase tracking-wide">
                  {item.compatible ? "Compatible" : "Unavailable"}
                </div>
              </div>

              {template.description ? (
                <div className="text-xs text-muted-foreground mt-1">
                  {template.description}
                </div>
              ) : null}

              <div className="text-xs text-muted-foreground mt-2">
                {template.tags.family} • {template.tags.designs.join(", ")} • {template.tags.anchorages.join(", ")}
              </div>

              {!item.compatible && item.reasons.length > 0 ? (
                <div className="text-xs text-amber-600 mt-2">
                  {item.reasons.join(" • ")}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs text-muted-foreground">
          New balcony: Drop {nextDrop} — Balcony {nextBalconyNo}
          {selectedTemplate ? ` • Template: ${selectedTemplate.template.label}` : ""}
        </div>

        {isNamingNewBalcony ? (
          <div className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <input
                  className="w-24 rounded-md border px-3 py-2 text-sm"
                  value={draft.drop}
                  suppressHydrationWarning
                  onChange={(e) => {
                    setDraft((current) => ({ ...current, drop: e.target.value }));
                    setLocalFieldErrors((current) => ({ ...current, drop: undefined, balconyNo: undefined }));
                  }}
                />
                {localFieldErrors.drop ? (
                  <div className="text-xs text-red-600">
                    {localFieldErrors.drop}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <input
                  className="w-32 rounded-md border px-3 py-2 text-sm"
                  value={draft.balconyNo}
                  suppressHydrationWarning
                  onChange={(e) => {
                    setDraft((current) => ({ ...current, balconyNo: e.target.value }));
                    setLocalFieldErrors((current) => ({ ...current, drop: undefined, balconyNo: undefined }));
                  }}
                />
                {localFieldErrors.balconyNo ? (
                  <div className="text-xs text-red-600">
                    {localFieldErrors.balconyNo}
                  </div>
                ) : liveBalconyNoError ? (
                  <div className="text-xs text-red-600">
                    {liveBalconyNoError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Names must remain unique among non-deleted balconies on this stage.
            </div>

            <div className="flex items-center gap-2">
              <Button
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
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Creating
                  </>
                ) : (
                  <>
                    <Save />
                    Create From Template
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={cancelCreateFromTemplate}
                disabled={isPending}
                suppressHydrationWarning
              >
                <X />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={startCreateFromTemplate}
              disabled={isPending || !selectedTemplateId || !selectedTemplate?.compatible}
              suppressHydrationWarning
            >
              <Plus />
              Create From Template
            </Button>
          </div>
        )}
      </div>
      </div>
    </>
  );
}