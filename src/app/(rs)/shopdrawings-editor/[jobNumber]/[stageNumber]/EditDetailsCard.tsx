// /app/(rs)/shopdrawings-editor/[jobNumber]/[stageNumber]/EditDetailsCard.tsx
"use client";

import { useMemo, useState } from "react";
import type { ShopDrawingSheetData } from "../../types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { ChevronDown, ChevronRight, Printer, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { refreshShopDrawingRevisionAction } from "@/app/actions/refreshShopDrawingRevisionAction";
import { saveShopDrawingRevisionDetailsAction } from "@/app/actions/saveShopDrawingRevisionDetailsAction";
import { getNextRevisionCode } from "@/lib/shopdrawings/getNextRevisionCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  jobId: number;
  jobNumber: number;
  jobStageId: number;
  stageNo: number;
  currentRevisionCode: string;
  clientName: string;
  siteAddressLine: string;
  cityLine: string;
  initialTitle1?: string;
  initialTitle2?: string;
  initialTitle3?: string;
  initialSheets: ShopDrawingSheetData[];
  sheets: ShopDrawingSheetData[];
};

export default function EditDetailsCard({
  jobId,
  jobNumber,
  jobStageId,
  stageNo,
  currentRevisionCode,
  clientName,
  siteAddressLine,
  cityLine,
  initialTitle1 = "",
  initialTitle2 = "",
  initialTitle3 = "",
  initialSheets,
  sheets,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);

  const [title1, setTitle1] = useState(initialTitle1);
  const [title2, setTitle2] = useState(initialTitle2);
  const [title3, setTitle3] = useState(initialTitle3);

  const nextRevisionCode = useMemo(
    () => getNextRevisionCode(currentRevisionCode),
    [currentRevisionCode]
  );

  function goToRevision(revisionCode: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("revision", revisionCode);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleOpenPrint() {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("revision", currentRevisionCode);

    window.open(`${pathname}/print?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  const initialSheetView3dByBalconyId = useMemo(
    () =>
      Object.fromEntries(
        initialSheets.map((sheet) => [String(sheet.balconyId), sheet.view3d ?? null])
      ),
    [initialSheets]
  );

  const currentSheetView3dByBalconyId = useMemo(
    () =>
      Object.fromEntries(
        sheets.map((sheet) => [String(sheet.balconyId), sheet.view3d ?? null])
      ),
    [sheets]
  );

  const isDirty =
    title1 !== initialTitle1 ||
    title2 !== initialTitle2 ||
    title3 !== initialTitle3 ||
    JSON.stringify(currentSheetView3dByBalconyId) !== JSON.stringify(initialSheetView3dByBalconyId);

  const { execute, isPending } = useAction(saveShopDrawingRevisionDetailsAction, {
    onSuccess({ data }) {
      if (!data?.success) {
        toast.error(data?.message ?? "Revision save failed.");
        return;
      }

      toast.success(data.message);
      setSaveDialogOpen(false);
      goToRevision(data.revisionCode ?? currentRevisionCode);
    },
    onError({ error }) {
      toast.error(error?.serverError ?? "Revision save failed.");
    },
  });

  function handleSave(mode: "overwrite" | "increment") {
    execute({
      jobId,
      jobStageId,
      currentRevisionCode,
      mode,
      title1,
      title2,
      title3,
      sheetView3dByBalconyId: currentSheetView3dByBalconyId,
    });
  }

  const { execute: executeRefresh, isPending: isRefreshing } = useAction(
    refreshShopDrawingRevisionAction,
    {
      onSuccess({ data }) {
        if (!data?.success) {
          toast.error(data?.message ?? "Drawing refresh failed.");
          return;
        }

        toast.success(data.message);
        setRefreshDialogOpen(false);
        goToRevision(data.revisionCode ?? currentRevisionCode);
      },
      onError({ error }) {
        toast.error(error?.serverError ?? "Drawing refresh failed.");
      },
    }
  );

  function handleRefresh(mode: "overwrite" | "increment") {
    executeRefresh({
      jobId,
      jobNumber,
      jobStageId,
      stageNo,
      currentRevisionCode,
      mode,
      clientName,
      siteAddressLine,
      cityLine,
    });
  }

  return (
    <>
      <div className="rounded-md border p-4 bg-white">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3"
          onClick={() => setOpen((value) => !value)}
        >
          <div className="text-left">
            <h2 className="text-lg font-semibold">Edit Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Titles saved to revision sheet details and applied to all active sheets in the current revision.
            </p>
          </div>

          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {open ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid gap-3">
              <div>
                <div className="text-sm font-medium mb-1">Title 1</div>
                <Input
                  value={title1}
                  onChange={(e) => setTitle1(e.target.value)}
                  placeholder="Title 1"
                  suppressHydrationWarning
                />
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Title 2</div>
                <Input
                  value={title2}
                  onChange={(e) => setTitle2(e.target.value)}
                  placeholder="Title 2"
                  suppressHydrationWarning
                />
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Title 3</div>
                <Input
                  value={title3}
                  onChange={(e) => setTitle3(e.target.value)}
                  placeholder="Title 3"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-xs text-muted-foreground">
                Current revision: {currentRevisionCode}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenPrint}
                  disabled={isPending || isRefreshing}
                >
                  <Printer className="h-4 w-4" />
                  Print Saved Revision
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRefreshDialogOpen(true)}
                  disabled={isPending || isRefreshing}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Drawings
                </Button>

                <Button
                  type="button"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={!isDirty || isPending || isRefreshing}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save revision details</AlertDialogTitle>
            <AlertDialogDescription>
              Choose whether to overwrite revision {currentRevisionCode} or create the next revision {nextRevisionCode}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isRefreshing}
                onClick={() => handleSave("overwrite")}
              >
                Overwrite Rev {currentRevisionCode}
              </Button>

              <AlertDialogAction
                disabled={isPending || isRefreshing}
                onClick={(e) => {
                  e.preventDefault();
                  handleSave("increment");
                }}
              >
                Save as Rev {nextRevisionCode}
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh drawing snapshots</AlertDialogTitle>
            <AlertDialogDescription>
              Rebuild the revision sheets from the latest balcony editor data. Existing sheet details and edits will be preserved.
              Choose whether to overwrite revision {currentRevisionCode} or create the next revision {nextRevisionCode}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel disabled={isPending || isRefreshing}>
              Cancel
            </AlertDialogCancel>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isRefreshing}
                onClick={() => handleRefresh("overwrite")}
              >
                Overwrite Rev {currentRevisionCode}
              </Button>

              <AlertDialogAction
                disabled={isPending || isRefreshing}
                onClick={(e) => {
                  e.preventDefault();
                  handleRefresh("increment");
                }}
              >
                Refresh as Rev {nextRevisionCode}
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}