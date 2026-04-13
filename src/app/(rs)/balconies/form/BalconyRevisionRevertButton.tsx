// Filename: app/(rs)/balconies/form/BalconyRevisionRevertButton.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { revertBalconyToRevisionAction } from "@/app/actions/revertBalconyToRevisionAction";

type Props = {
  revisionId: number;
  disabled?: boolean;
};

export function BalconyRevisionRevertButton({ revisionId, disabled }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { execute, isPending } = useAction(
    revertBalconyToRevisionAction,
    {
      onSuccess({ data }) {
        if (data?.message) {
          toast.success(data.message);
        } else {
          toast.success("Balcony reverted to selected revision.");
        }

        if (data?.balconyId) {
          const current = new URLSearchParams(searchParams.toString());
          current.set("balconyId", String(data.balconyId));

          router.replace(`/balconies/form?${current.toString()}`, {
            scroll: false,
          });
          router.refresh();
        }
      },
      onError() {
        toast.error("Failed to revert balcony.");
      },
    }
  );

  const handleClick = () => {
    if (disabled || isPending) return;

    const ok = window.confirm(
      "Revert the balcony to this revision? This will overwrite the current values."
    );
    if (!ok) return;

    execute({ revisionId });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || isPending}
      title={
        disabled
          ? "This revision matches the current state."
          : "Revert the balcony to this revision."
      }
    >
      {isPending ? (
        <>
          <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
          Reverting...
        </>
      ) : (
        "Revert"
      )}
    </Button>
  );
}
