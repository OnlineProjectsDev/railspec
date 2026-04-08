// /components/ConfirmJobNavigationDialog.tsx
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
};

export default function ConfirmJobNavigationDialog({
  open,
  onOpenChange,
  href,
  title = "Leave this page?",
  description = "You have unsaved changes. Do you want to continue to the job page without saving?",
}: Props) {
  const router = useRouter();

  function handleContinue() {
    if (!href) return;
    onOpenChange(false);
    router.push(href);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Stay here</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue} disabled={!href}>
            Continue to job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}