// app/(rs)/drawingtool/BalconySelector.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { reorderBalconiesForStageAction } from "@/app/actions/reorderBalconiesForStageAction";
import { toast } from "sonner";

export type BalconyOption = {
  id: number;
  label: string;
  href: string;
  isActive: boolean;
};

type Props = {
  options: BalconyOption[];
  jobId: number;
  jobStageId: number;
  stageNo: number;
};

export function BalconySelector({
  options,
  jobId,
  jobStageId,
  stageNo,
}: Props) {
  const [items, setItems] = React.useState<BalconyOption[]>(options);
  const [draggingId, setDraggingId] = React.useState<number | null>(null);
  const itemsRef = React.useRef<BalconyOption[]>(options);

  const isDragging = draggingId !== null;

  // Keep local order in sync if parent options change (e.g. route change)
  React.useEffect(() => {
    setItems(options);
    itemsRef.current = options;
  }, [options]);

  // Always mirror latest items into the ref (for safe read in dragEnd)
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const { execute: executeReorder, isPending: isReordering } = useAction(
    reorderBalconiesForStageAction,
    {
      onSuccess({ data }) {
        if (data?.success) {
          toast.success(data.message ?? "Balcony order saved.");
        } else if (data?.message) {
          toast.error(data.message);
        }
      },
      onError() {
        toast.error("Failed to save balcony order.");
      },
    }
  );

  function handleDragStart(e: React.DragEvent<HTMLButtonElement>, id: number) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(
    e: React.DragEvent<HTMLButtonElement>,
    overId: number
  ) {
    e.preventDefault();
    if (draggingId === null || draggingId === overId) return;

    setItems((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === draggingId);
      const overIndex = prev.findIndex((item) => item.id === overId);
      if (currentIndex === -1 || overIndex === -1) return prev;

      const newItems = [...prev];
      const [moved] = newItems.splice(currentIndex, 1);
      newItems.splice(overIndex, 0, moved);
      return newItems;
    });
  }

  function handleDragEnd() {
    if (draggingId === null) return;
    setDraggingId(null);

    const currentItems = itemsRef.current;
    if (!currentItems || currentItems.length === 0) return;

    const orderedIds = currentItems.map((item) => item.id);

    executeReorder({
      jobId,
      jobStageId,
      orderedIds,
    });
  }

  return (
    <div className="border rounded-md p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium mr-2">
        Balconies for this stage:
      </span>

      {items.map((opt) => (
        <button
        suppressHydrationWarning
          key={opt.id}
          type="button"
          draggable
          onDragStart={(e) => handleDragStart(e, opt.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, opt.id)}
          className="text-xs px-0 py-0 rounded border bg-transparent"
          disabled={isReordering}
        >
          <Link
            href={opt.href}
            className={`block px-2 py-1 rounded ${
              opt.isActive
                ? "bg-primary text-primary-foreground border border-primary"
                : "bg-background text-foreground border hover:bg-muted"
            }`}
            onClick={(e) => {
              if (isDragging) {
                // don't navigate if this is part of a drag
                e.preventDefault();
              }
            }}
          >
            {opt.label}
          </Link>
        </button>
      ))}

      {/* ➕ New balcony (uses existing BalconyForm create logic) */}
      <Link
        href={`/balconies/form?jobId=${jobId}&stage=${stageNo}`}
        className="ml-2 text-xs px-2 py-1 rounded border border-dashed hover:bg-muted"
        title="Create a new balcony for this stage"
      >
        + New balcony
      </Link>
    </div>
  );
}
