// /app/(rs)/editor/[jobNumber]/[stageNumber]/EditorBalconyManager.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { ArrowDown, ArrowUp, Copy, LoaderCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveEditorBalconyAction } from "@/app/actions/saveEditorBalconyAction";
import { reorderEditorBalconiesForStageAction } from "@/app/actions/reorderEditorBalconiesForStageAction";
import { duplicateEditorBalconyWithStateAction } from "@/app/actions/duplicateEditorBalconyWithStateAction";

type EditorBalconyRow = {
  id: number;
  jobId: number;
  jobStageId: number;
  drop: string;
  balconyNo: string;
  sortOrder: number;
  notes: string | null;
  geometryNotes: string | null;
  version: number;
  isDeleted: boolean;
};

type Props = {
  jobId: number;
  jobStageId: number;
  balconies: EditorBalconyRow[];
  nextDrop: string;
  nextBalconyNo: string;
  includeDeleted?: boolean;
};

type EditDraft = {
  drop: string;
  balconyNo: string;
};

type SaveFieldErrors = {
  drop?: string[];
  balconyNo?: string[];
};

type LocalFieldErrors = {
  drop?: string;
  balconyNo?: string;
};

export default function EditorBalconyManager({
  jobId,
  jobStageId,
  balconies,
  nextDrop,
  nextBalconyNo,
  includeDeleted = false,
}: Props) {
  const router = useRouter();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ drop: "", balconyNo: "" });
  const [localFieldErrors, setLocalFieldErrors] = useState<LocalFieldErrors>({});
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [copyDraft, setCopyDraft] = useState<EditDraft>({ drop: "", balconyNo: "" });
  const [copyLocalFieldErrors, setCopyLocalFieldErrors] = useState<LocalFieldErrors>({});
  const [dropFilter, setDropFilter] = useState("");
  const [balconyFilter, setBalconyFilter] = useState("");

  const orderedBalconies = useMemo(
    () =>
      [...balconies].sort((a, b) => {
        if (a.isDeleted !== b.isDeleted) return a.isDeleted ? 1 : -1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.balconyNo.localeCompare(b.balconyNo, undefined, { numeric: true, sensitivity: "base" });
      }),
    [balconies]
  );

  const filteredBalconies = useMemo(() => {
    return orderedBalconies.filter((item) => {
      const dropMatch = item.drop
        .toLowerCase()
        .includes(dropFilter.trim().toLowerCase());

      const balconyMatch = item.balconyNo
        .toLowerCase()
        .includes(balconyFilter.trim().toLowerCase());

      return dropMatch && balconyMatch;
    });
  }, [orderedBalconies, dropFilter, balconyFilter]);

  const activeDuplicateBalcony = editingId == null
    ? undefined
    : balconies.find(
        (item) =>
          !item.isDeleted &&
          item.id !== editingId &&
          item.drop.trim().toUpperCase() === draft.drop.trim().toUpperCase() &&
          item.balconyNo.trim().toLowerCase() === draft.balconyNo.trim().toLowerCase()
      );

  const liveBalconyNoError =
    activeDuplicateBalcony && draft.drop.trim() && draft.balconyNo.trim()
      ? `Balcony ${draft.balconyNo.trim()} is already in use for drop ${draft.drop.trim()} on this stage.`
      : undefined;

  const activeCopyDuplicateBalcony = copyingId == null
    ? undefined
    : balconies.find(
        (item) =>
          !item.isDeleted &&
          item.drop.trim().toUpperCase() === copyDraft.drop.trim().toUpperCase() &&
          item.balconyNo.trim().toLowerCase() === copyDraft.balconyNo.trim().toLowerCase()
      );

  const liveCopyBalconyNoError =
    activeCopyDuplicateBalcony && copyDraft.drop.trim() && copyDraft.balconyNo.trim()
      ? `Balcony ${copyDraft.balconyNo.trim()} is already in use for drop ${copyDraft.drop.trim()} on this stage.`
      : undefined;

  const {
    execute: executeSave,
    result: saveResult,
    isPending: isSaving,
    reset: resetSaveAction,
  } = useAction(saveEditorBalconyAction, {
    onSuccess({ data }) {
      if (!data?.editorBalconyId) {
        toast.error(data?.message ?? "Editor balcony save failed.");
        return;
      }

      toast.success(data.message);
      setEditingId(null);
      resetSaveAction();
      router.refresh();
    },
    onError({ error }) {
      const validationErrors = error?.validationErrors;
      const firstValidationMessage =
        validationErrors
          ? Object.values(validationErrors).find(
              (messages): messages is string[] => Array.isArray(messages) && messages.length > 0
            )?.[0]
          : undefined;

      const message =
        error?.serverError ||
        firstValidationMessage ||
        "Editor balcony save failed.";

      toast.error(message);
    },
  });

  const {
    execute: executeReorder,
    isPending: isReordering,
  } = useAction(reorderEditorBalconiesForStageAction, {
    onSuccess({ data }) {
      if (!data?.success) {
        toast.error(data?.message ?? "Failed to reorder editor balconies.");
        return;
      }

      toast.success(data.message);
      router.refresh();
    },
    onError() {
      toast.error("Failed to reorder editor balconies.");
    },
  });

  const {
    execute: executeDuplicate,
    isPending: isDuplicating,
  } = useAction(duplicateEditorBalconyWithStateAction, {
    onSuccess({ data }) {
      if (!data?.success || !data.editorBalconyId) {
        toast.error(data?.message ?? "Failed to copy editor balcony.");
        return;
      }

      toast.success(data.message);
      setCopyingId(null);
      setCopyDraft({ drop: "", balconyNo: "" });
      setCopyLocalFieldErrors({});
      router.push(`/editor/balcony/${data.editorBalconyId}`);
      router.refresh();
    },
    onError() {
      toast.error("Failed to copy editor balcony.");
    },
  });

  function startEdit(balcony: EditorBalconyRow) {
    resetSaveAction();
    setLocalFieldErrors({});
    setEditingId(balcony.id);
    setDraft({
      drop: balcony.drop,
      balconyNo: balcony.balconyNo,
    });
  }

  function cancelEdit() {
    resetSaveAction();
    setLocalFieldErrors({});
    setEditingId(null);
    setDraft({ drop: "", balconyNo: "" });
  }

  function getDuplicateActiveBalcony(
    balcony: EditorBalconyRow,
    nextDrop: string,
    nextBalconyNo: string
  ) {
    return balconies.find(
      (item) =>
        !item.isDeleted &&
        item.id !== balcony.id &&
        item.drop.trim().toUpperCase() === nextDrop.trim().toUpperCase() &&
        item.balconyNo.trim().toLowerCase() === nextBalconyNo.trim().toLowerCase()
    );
  }

  function saveEdit(balcony: EditorBalconyRow) {
    const nextDrop = draft.drop.trim();
    const nextBalconyNo = draft.balconyNo.trim();

    const nextErrors: LocalFieldErrors = {};

    if (!nextDrop) {
      nextErrors.drop = "Drop is required.";
    }

    if (!nextBalconyNo) {
      nextErrors.balconyNo = "Balcony number is required.";
    }

    const duplicateBalcony =
      nextDrop && nextBalconyNo
        ? getDuplicateActiveBalcony(balcony, nextDrop, nextBalconyNo)
        : undefined;

    if (duplicateBalcony) {
      nextErrors.balconyNo = `Balcony ${nextBalconyNo} is already in use for drop ${nextDrop} on this stage.`;
    }

    setLocalFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error(Object.values(nextErrors)[0] ?? "Please fix the balcony name.");
      return;
    }

    executeSave({
      id: balcony.id,
      jobId: balcony.jobId,
      jobStageId: balcony.jobStageId,
      drop: nextDrop,
      balconyNo: nextBalconyNo,
      sortOrder: balcony.sortOrder,
      notes: balcony.notes,
      geometryNotes: balcony.geometryNotes,
      isDeleted: balcony.isDeleted,
    });
  }

  function deleteBalcony(balcony: EditorBalconyRow) {
    const confirmed = window.confirm(
      `Delete Drop ${balcony.drop} — Balcony ${balcony.balconyNo}?`
    );

    if (!confirmed) return;

    executeSave({
      id: balcony.id,
      jobId: balcony.jobId,
      jobStageId: balcony.jobStageId,
      drop: balcony.drop,
      balconyNo: balcony.balconyNo,
      sortOrder: balcony.sortOrder,
      notes: balcony.notes,
      geometryNotes: balcony.geometryNotes,
      isDeleted: true,
    });
  }

  function restoreBalcony(balcony: EditorBalconyRow) {
    executeSave({
      id: balcony.id,
      jobId: balcony.jobId,
      jobStageId: balcony.jobStageId,
      drop: balcony.drop,
      balconyNo: balcony.balconyNo,
      sortOrder: balcony.sortOrder,
      notes: balcony.notes,
      geometryNotes: balcony.geometryNotes,
      isDeleted: false,
    });
  }

  function moveBalcony(balconyId: number, direction: -1 | 1) {
    const currentIndex = orderedBalconies.findIndex((item) => item.id === balconyId);
    if (currentIndex === -1) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= orderedBalconies.length) return;

    const reordered = [...orderedBalconies];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    executeReorder({
      jobId,
      jobStageId,
      orderedIds: reordered.map((item) => item.id),
    });
  }

  function startCopyBalcony(balcony: EditorBalconyRow) {
    setCopyLocalFieldErrors({});
    setCopyingId(balcony.id);
    setCopyDraft({
      drop: nextDrop,
      balconyNo: nextBalconyNo,
    });
  }

  function cancelCopyBalcony() {
    setCopyingId(null);
    setCopyDraft({ drop: "", balconyNo: "" });
    setCopyLocalFieldErrors({});
  }

  function confirmCopyBalcony(balcony: EditorBalconyRow) {
    const nextCopyDrop = copyDraft.drop.trim();
    const nextCopyBalconyNo = copyDraft.balconyNo.trim();

    const nextErrors: LocalFieldErrors = {};

    if (!nextCopyDrop) {
      nextErrors.drop = "Drop is required.";
    }

    if (!nextCopyBalconyNo) {
      nextErrors.balconyNo = "Balcony number is required.";
    }

    const duplicateBalcony =
      nextCopyDrop && nextCopyBalconyNo
        ? balconies.find(
            (item) =>
              !item.isDeleted &&
              item.drop.trim().toUpperCase() === nextCopyDrop.trim().toUpperCase() &&
              item.balconyNo.trim().toLowerCase() === nextCopyBalconyNo.trim().toLowerCase()
          )
        : undefined;

    if (duplicateBalcony) {
      nextErrors.balconyNo = `Balcony ${nextCopyBalconyNo} is already in use for drop ${nextCopyDrop} on this stage.`;
    }

    setCopyLocalFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error(Object.values(nextErrors)[0] ?? "Please fix the balcony name.");
      return;
    }

    executeDuplicate({
      sourceEditorBalconyId: balcony.id,
      jobId: balcony.jobId,
      jobStageId: balcony.jobStageId,
      drop: nextCopyDrop,
      balconyNo: nextCopyBalconyNo,
    });
  }

  const saveFieldErrors: SaveFieldErrors | undefined =
    saveResult?.validationErrors &&
    typeof saveResult.validationErrors === "object" &&
    "fieldErrors" in saveResult.validationErrors
      ? (saveResult.validationErrors.fieldErrors as SaveFieldErrors | undefined)
      : undefined;

  if (!orderedBalconies.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {includeDeleted
          ? "No editor balconies found for this job/stage combination."
          : "No active editor balconies found yet for this job/stage combination."}
      </p>
    );
  }

  return (
    <>
      {isDuplicating ? (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-md border bg-white px-4 py-3 shadow-sm flex items-center gap-2">
            <LoaderCircle className="animate-spin" />
            <span className="text-sm font-medium">Opening copied balcony…</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          placeholder="Filter by drop"
          className="w-full sm:w-40 rounded-md border px-3 py-2 text-sm"
          value={dropFilter}
          suppressHydrationWarning
          onChange={(e) => setDropFilter(e.target.value)}
        />

        <input
          placeholder="Filter by balcony"
          className="w-full sm:w-48 rounded-md border px-3 py-2 text-sm"
          value={balconyFilter}
          suppressHydrationWarning
          onChange={(e) => setBalconyFilter(e.target.value)}
        />
      </div>

      {!filteredBalconies.length ? (
        <p className="text-sm text-muted-foreground">
          No balconies match your filters.
        </p>
      ) : null}

      {filteredBalconies.map((balcony, index) => {
        const isEditing = editingId === balcony.id;
        const isCopying = copyingId === balcony.id;

        return (
          <div
            key={balcony.id}
            className="rounded-md border p-3 flex flex-col gap-3"
          >
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-2 max-w-md">
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
                      ) : saveFieldErrors?.drop?.length ? (
                        <div className="text-xs text-red-600">
                          {saveFieldErrors.drop[0]}
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
                      ) : saveFieldErrors?.balconyNo?.length ? (
                        <div className="text-xs text-red-600">
                          {saveFieldErrors.balconyNo[0]}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Names must remain unique among non-deleted balconies on this stage.
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-semibold flex items-center gap-2">
                    <span>
                      Drop {balcony.drop} — Balcony {balcony.balconyNo}
                    </span>
                    {balcony.isDeleted ? (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                        Deleted
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    v{balcony.version} • #{balcony.sortOrder}
                  </div>
                  {balcony.notes ? (
                    <div className="text-sm mt-2">Notes: {balcony.notes}</div>
                  ) : null}
                  {balcony.geometryNotes ? (
                    <div className="text-sm mt-1">
                      Geometry Notes: {balcony.geometryNotes}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {isCopying ? (
              <div className="flex flex-col gap-2 max-w-md">
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1">
                    <input
                      className="w-24 rounded-md border px-3 py-2 text-sm"
                      value={copyDraft.drop}
                      suppressHydrationWarning
                      onChange={(e) => {
                        setCopyDraft((current) => ({ ...current, drop: e.target.value }));
                        setCopyLocalFieldErrors((current) => ({ ...current, drop: undefined, balconyNo: undefined }));
                      }}
                    />
                    {copyLocalFieldErrors.drop ? (
                      <div className="text-xs text-red-600">
                        {copyLocalFieldErrors.drop}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1">
                    <input
                      className="w-32 rounded-md border px-3 py-2 text-sm"
                      value={copyDraft.balconyNo}
                      suppressHydrationWarning
                      onChange={(e) => {
                        setCopyDraft((current) => ({ ...current, balconyNo: e.target.value }));
                        setCopyLocalFieldErrors((current) => ({ ...current, drop: undefined, balconyNo: undefined }));
                      }}
                    />
                    {copyLocalFieldErrors.balconyNo ? (
                      <div className="text-xs text-red-600">
                        {copyLocalFieldErrors.balconyNo}
                      </div>
                    ) : liveCopyBalconyNoError ? (
                      <div className="text-xs text-red-600">
                        {liveCopyBalconyNoError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Names must remain unique among non-deleted balconies on this stage.
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Move up"
                disabled={isSaving || isReordering || isDuplicating || balcony.isDeleted || index === 0}
                suppressHydrationWarning
                onClick={() => moveBalcony(balcony.id, -1)}
              >
                {isReordering ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Move down"
                disabled={isSaving || isReordering || isDuplicating || balcony.isDeleted || index === orderedBalconies.length - 1}
                suppressHydrationWarning
                onClick={() => moveBalcony(balcony.id, 1)}
              >
                {isReordering ? <LoaderCircle className="animate-spin" /> : <ArrowDown />}
              </Button>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Save name"
                    disabled={
                      isSaving ||
                      isReordering ||
                      !draft.drop.trim() ||
                      !draft.balconyNo.trim() ||
                      !!localFieldErrors.drop ||
                      !!localFieldErrors.balconyNo ||
                      !!liveBalconyNoError
                    }
                    suppressHydrationWarning
                    onClick={() => saveEdit(balcony)}
                  >
                    {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Cancel edit"
                    disabled={isSaving || isReordering || isDuplicating || isCopying}
                    suppressHydrationWarning
                    onClick={cancelEdit}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Edit name"
                  disabled={isSaving || isReordering || isDuplicating}
                  suppressHydrationWarning
                  onClick={() => startEdit(balcony)}
                >
                  <Pencil />
                </Button>
              )}

              {!balcony.isDeleted ? (
                <div className="flex items-center gap-2">
                  {isCopying ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Save copy name"
                        disabled={
                          isSaving ||
                          isReordering ||
                          isDuplicating ||
                          !copyDraft.drop.trim() ||
                          !copyDraft.balconyNo.trim() ||
                          !!copyLocalFieldErrors.drop ||
                          !!copyLocalFieldErrors.balconyNo ||
                          !!liveCopyBalconyNoError
                        }
                        suppressHydrationWarning
                        onClick={() => confirmCopyBalcony(balcony)}
                      >
                        {isDuplicating ? <LoaderCircle className="animate-spin" /> : <Save />}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Cancel copy"
                        disabled={isSaving || isReordering || isDuplicating || isCopying}
                        suppressHydrationWarning
                        onClick={cancelCopyBalcony}
                      >
                        <X />
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Copy existing balcony"
                      disabled={isSaving || isReordering || isDuplicating || editingId != null || copyingId != null}
                      suppressHydrationWarning
                      onClick={() => startCopyBalcony(balcony)}
                    >
                      <Copy />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Delete balcony"
                    disabled={isSaving || isReordering || isDuplicating || isCopying}
                    suppressHydrationWarning
                    onClick={() => deleteBalcony(balcony)}
                  >
                    {isSaving && !isEditing ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  title="Restore balcony"
                  disabled={isSaving || isReordering || isDuplicating}
                  suppressHydrationWarning
                  onClick={() => restoreBalcony(balcony)}
                >
                  {isSaving ? <LoaderCircle className="animate-spin" /> : "Restore"}
                </Button>
              )}

              {!balcony.isDeleted && !isCopying ? (
                <Link
                  href={`/editor/balcony/${balcony.id}`}
                  className="ml-auto inline-flex items-center justify-center px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  Open Editor
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}