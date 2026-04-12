'use client';

import * as React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NumberPromptDialogControlledProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: number;
  onConfirm: (value: number) => void; // only when Confirm is pressed
};

export function NumberPromptDialogControlled({
  open,
  onOpenChange,
  title = "Enter a number",
  description = "Please provide a value (minimum 1).",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  defaultValue = 1,
  onConfirm,
}: NumberPromptDialogControlledProps) {
  const [raw, setRaw] = React.useState<string>(String(defaultValue));
  const parsed = Number(raw);
  const isValid = Number.isFinite(parsed) && parsed >= 1;

  // reset value when dialog opens
  React.useEffect(() => {
    if (open) setRaw(String(defaultValue));
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(parsed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="times-input">Times</Label>
          <Input
            id="times-input"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!isValid}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
