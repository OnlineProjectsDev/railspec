import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

/** One table row (your parts list row) */
export type PartRow = {
  partName: string;
  id: number;                // used when post_id is null
  post_id?: number | null;   // sorting prefers this if present
  drilling_info?: string | null;
  length?: number | null;
  lhc?: number | null;       // left hole count
  rhc?: number | null;       // right hole count
  lvc?: number | null;       // left vertical count
  rvc?: number | null;       // right vertical count
  quantity?: number | null;
};

export type DocumentDetails = {
  jobNumber: string;
  clientName: string;
  siteAddress?: string;
  createdBy?: string;
  createdAt?: Date;
};

export type TemplateConfig = {
  headerTitle: string;            // e.g. "Railsafe Balustrades – Parts List"
  headerSubtitle?: string;        // e.g. "Manufacture Sheet"
  footerLeft?: string;            // e.g. "Confidential"
  footerRight?: string;           // e.g. "Page {page} of {pages}"
  logoDataUrl?: string;           // base64 (PNG/JPG) optional
  pageSize?: "a4" | "letter";
  pageOrientation?: "portrait" | "landscape";
  margin?: number;                // content margin (mm)
};

// ---------- helpers ----------

const fmt = {
  str: (v: unknown) => (v == null ? "" : String(v)),
  num: (v: unknown) => (v == null || isNaN(Number(v)) ? "" : String(v)),
  date: (d?: Date) => (d ? d.toLocaleDateString() : ""),
};

const byStr = (x?: string | null, y?: string | null) => {
  const xs = (x ?? "").toLowerCase();
  const ys = (y ?? "").toLowerCase();
  if (xs < ys) return -1;
  if (xs > ys) return 1;
  return 0;
};

const byNum = (x: number, y: number) => (x < y ? -1 : x > y ? 1 : 0);

// undefined/null numbers sort last
const byOptNum = (x?: number | null, y?: number | null) => {
  const xn = x == null ? Number.POSITIVE_INFINITY : x;
  const yn = y == null ? Number.POSITIVE_INFINITY : y;
  return byNum(xn, yn);
};

/** Sort by:
 * 1) partName (case-insensitive)
 * 2) (post_id if present else id)
 * 3) drilling_info
 * 4) length, lhc, rhc, lvc, rvc, quantity (undefined last)
 */
export function partsComparator(a: PartRow, b: PartRow): number {
  // 1) partName
  {
    const r = byStr(a.partName, b.partName);
    if (r) return r;
  }
  // 2) (post_id ?? id)
  {
    const aSecond = (a.post_id ?? a.id) as number;
    const bSecond = (b.post_id ?? b.id) as number;
    const r = byNum(aSecond, bSecond);
    if (r) return r;
  }
  // 3) drilling_info
  {
    const r = byStr(a.drilling_info ?? "", b.drilling_info ?? "");
    if (r) return r;
  }
  // 4) numeric tail
  {
    const orderA = [a.length, a.lhc, a.rhc, a.lvc, a.rvc, a.quantity];
    const orderB = [b.length, b.lhc, b.rhc, b.lvc, b.rvc, b.quantity];
    for (let i = 0; i < orderA.length; i++) {
      const r = byOptNum(orderA[i], orderB[i]);
      if (r) return r;
    }
  }
  return 0;
}

// ---------- main generator ----------

export async function generatePartsPdf(
  details: DocumentDetails,
  parts: PartRow[],
  template: TemplateConfig
): Promise<jsPDF> {
  const {
    headerTitle,
    headerSubtitle,
    footerLeft,
    footerRight = "Page {page} of {pages}",
    logoDataUrl,
    pageSize = "a4",
    pageOrientation = "portrait",
    margin = 12,
  } = template;

  const doc = new jsPDF({ unit: "mm", format: pageSize, orientation: pageOrientation });

  // Precompute sorted data
  const sorted = [...parts].sort(partsComparator);

  // Layout constants
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const headerH = 22;
  const footerH = 12;

  // Header renderer (per page)
  const drawHeader = (data: { pageNumber: number }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    // Optional logo (left)
    const xLogo = margin;
    let x = margin;
    if (logoDataUrl) {
      const logoH = 12;
      const logoW = 12 * 1.2; // rough AR; adjust to your logo
      // Guess image type
      const isJpg = logoDataUrl.startsWith("data:image/jpeg") || logoDataUrl.startsWith("data:image/jpg");
      doc.addImage(logoDataUrl, isJpg ? "JPEG" : "PNG", xLogo, margin - 2, logoW, logoH, undefined, "FAST");
      x = xLogo + logoW + 4;
    }

    // Title + subtitle
    doc.text(headerTitle, x, margin + 2);
    doc.setFont("helvetica", "normal");
    if (headerSubtitle) {
      doc.setFontSize(10);
      doc.text(headerSubtitle, x, margin + 7);
    }

    // Right-aligned job metadata
    doc.setFontSize(9);
    const rightX = pageW - margin;
    const metaLines = [
      `Job #: ${fmt.str(details.jobNumber)}`,
      `Client: ${fmt.str(details.clientName)}`,
      details.siteAddress ? `Site: ${details.siteAddress}` : "",
      `By: ${fmt.str(details.createdBy)}`,
      `Date: ${fmt.date(details.createdAt)}`,
    ].filter(Boolean) as string[];

    metaLines.forEach((line, i) => {
      doc.text(line, rightX, margin + 2 + i * 4, { align: "right" });
    });

    // Divider
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(margin, margin + headerH - 6, pageW - margin, margin + headerH - 6);
  };

  // Footer renderer (per page)
  const drawFooter = (data: { pageNumber: number; pageCount: number }) => {
    const pageStr = (footerRight ?? "")
      .replace("{page}", String(data.pageNumber))
      .replace("{pages}", String(data.pageCount));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (footerLeft) {
      doc.text(footerLeft, margin, pageH - margin);
    }
    doc.text(pageStr, pageW - margin, pageH - margin, { align: "right" });
  };

  // Build table rows (match requested column order)
  const rows: RowInput[] = sorted.map((p) => [
    fmt.str(p.partName),
    fmt.num(p.post_id ?? p.id),
    fmt.str(p.drilling_info),
    fmt.num(p.length),
    fmt.num(p.lhc),
    fmt.num(p.rhc),
    fmt.num(p.lvc),
    fmt.num(p.rvc),
    fmt.num(p.quantity),
  ]);

  // Draw the table
  autoTable(doc, {
    head: [
      [
        "Part",
        "Post/ID",
        "Drilling",
        "Length",
        "LHC",
        "RHC",
        "LVC",
        "RVC",
        "Qty",
      ],
    ],
    body: rows,
    startY: margin + headerH,
    margin: { left: margin, right: margin, bottom: margin + footerH },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2, lineWidth: 0.1 },
    headStyles: { fillColor: [230, 230, 230], halign: "center" },
    columnStyles: {
      0: { cellWidth: 40 },                 // Part
      1: { halign: "right", cellWidth: 18 },// Post/ID
      2: { cellWidth: 35 },                 // Drilling
      3: { halign: "right", cellWidth: 18 },// Length
      4: { halign: "right", cellWidth: 12 },// LHC
      5: { halign: "right", cellWidth: 12 },// RHC
      6: { halign: "right", cellWidth: 12 },// LVC
      7: { halign: "right", cellWidth: 12 },// RVC
      8: { halign: "right", cellWidth: 12 },// Qty
    },
    didDrawPage: (hookData) => {
      drawHeader({ pageNumber: hookData.pageNumber });
      drawFooter({ pageNumber: hookData.pageNumber, pageCount: doc.getNumberOfPages() });
    },
  });

  return doc;
}
