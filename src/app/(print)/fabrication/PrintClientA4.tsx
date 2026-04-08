// /app/(print)/fabrication/PrintClientA4.tsx
"use client";

import * as React from "react";

export function PrintClientA4({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
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

          /* Keep generic pagination behaviour */
          .print-page {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-page + .print-page {
            break-before: page;
            page-break-before: always;
          }

          /*
            OPTIONAL: Only applies when you add this class on a page.
            Use it for Glass Order to prevent table overflow beyond page.
            A4 content box size = page size minus @page margins:
              width  = 210mm - 20mm = 190mm
              height = 297mm - 20mm = 277mm
          */
          .a4-fixed-page {
            width: 190mm !important;
            height: 277mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {children}
    </>
  );
}
