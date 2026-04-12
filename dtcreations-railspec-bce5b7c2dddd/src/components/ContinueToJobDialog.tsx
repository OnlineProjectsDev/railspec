// /components/ContinueToJobDialog.tsx
"use client";

import { useRouter } from "next/navigation";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  href: string | null;
  title?: string;
  description?: string;
  onStayHere?: () => void;
};

export default function ContinueToJobDialog({
  open,
  onOpenChange,
  href,
  title = "Continue to job?",
  description = "Your changes were saved successfully. Do you want to continue to the job stage page?",
  onStayHere,
}: Props) {
  const router = useRouter();

  function handleContinue() {
    if (!href) return;
    onOpenChange(false);
    router.push(href);
  }

  function handleStayHere() {
    onOpenChange(false);
    onStayHere?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStayHere}>Stay here</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue} disabled={!href}>
            Continue to job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}