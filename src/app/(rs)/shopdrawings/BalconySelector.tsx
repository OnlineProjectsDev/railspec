// app/(rs)/shopdrawings/BalconySelector.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type BalconyOption = {
  id: number;
  label: string;
  href: string; // should include #balcony-<id>
  isActive?: boolean;
};

type Props = {
  options: BalconyOption[];
  jobId: number;
  jobStageId: number;
  stageNo: number;
};

export function BalconySelector({ options }: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<BalconyOption[]>(options);

  React.useEffect(() => {
    setItems(options);
  }, [options]);

  function scrollToBalcony(balconyId: number) {
    const el = document.getElementById(`balcony-${balconyId}`);
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <div className="border rounded-md p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-2">
            Balconies for this stage:
          </span>

          {items.map((opt) => (
            <button
              suppressHydrationWarning
              key={opt.id}
              type="button"
              className="text-xs px-0 py-0 rounded border bg-transparent"
            >
              <Link
                href={opt.href}
                scroll={false}
                className={`block px-2 py-1 rounded ${
                  opt.isActive
                    ? "bg-primary text-primary-foreground border border-primary"
                    : "bg-background text-foreground border hover:bg-muted"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToBalcony(opt.id);
                  router.replace(opt.href, { scroll: false }); // keep URL hash in sync
                }}
              >
                {opt.label}
              </Link>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
