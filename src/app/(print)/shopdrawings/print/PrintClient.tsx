//src/app/(print)/shopdrawings/print/PrintClient.tsx
"use client";

import * as React from "react";

type PrintClientProps = {
  children: React.ReactNode;

  /**
   * Optional, but recommended:
   * When provided, print will wait until all these viewer ids have fired
   * `rs:modelviewer:loaded` with matching detail.viewer_id.
   */
  expectedViewerIds?: Array<string | number>;

  /**
   * Safety: if something never loads, print anyway after this many ms.
   * Set to 0 to disable fallback.
   */
  fallbackTimeoutMs?: number;
};

export function PrintClient({
  children,
  expectedViewerIds,
  fallbackTimeoutMs = 8000,
}: PrintClientProps) {
  const printedRef = React.useRef(false);

  React.useEffect(() => {
    if (printedRef.current) return;

    const expected = (expectedViewerIds ?? []).map(String);
    const needSet = new Set(expected);
    const gotSet = new Set<string>();

    const canPrintNow = () => {
      if (printedRef.current) return false;

      // If we know what we expect, wait for all of them.
      if (needSet.size > 0) {
        for (const id of needSet) {
          if (!gotSet.has(id)) return false;
        }
        return true;
      }

      // If no expected ids provided, require at least one "loaded" event.
      return gotSet.size > 0;
    };

    const doPrint = () => {
      if (printedRef.current) return;
      printedRef.current = true;

      // Make sure layout settles (especially canvas sizing) before opening dialog.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
    };

    const onLoaded = (e: Event) => {
      const ce = e as CustomEvent;
      const viewerIdRaw = ce?.detail?.viewer_id;
      const viewerId = viewerIdRaw == null ? "" : String(viewerIdRaw);

      // If you provided expected ids, ignore unknown ids.
      if (needSet.size > 0) {
        if (!needSet.has(viewerId)) return;
      }

      gotSet.add(viewerId);

      if (canPrintNow()) doPrint();
    };

    window.addEventListener("rs:modelviewer:loaded", onLoaded as EventListener);

    // Fallback in case something never reports loaded
    const t =
      fallbackTimeoutMs > 0
        ? window.setTimeout(() => {
            if (!printedRef.current) doPrint();
          }, fallbackTimeoutMs)
        : undefined;

    return () => {
      window.removeEventListener("rs:modelviewer:loaded", onLoaded as EventListener);
      if (t) window.clearTimeout(t);
    };
  }, [expectedViewerIds, fallbackTimeoutMs]);

  return (
    <>
      <style jsx global>{`
        @page {
          size: 420mm 297mm;
          margin: 0;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-root {
            margin: 0 !important;
            padding: 0 !important;
          }

          .shopdrawing-pages {
            display: block !important;
          }

          .print-page {
            width: 420mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-page + .print-page {
            break-before: page;
            page-break-before: always;
          }

          .a3-sheet {
            width: 420mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }

          .a3-content {
            width: 420mm !important;
            height: 297mm !important;
            transform: none !important;
            transform-origin: top left !important;
          }

          .a3-content > canvas {
            width: 420mm !important;
            height: 297mm !important;
          }

          canvas {
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            display: block !important;
          }
        }
      `}</style>

      {children}
    </>
  );
}
