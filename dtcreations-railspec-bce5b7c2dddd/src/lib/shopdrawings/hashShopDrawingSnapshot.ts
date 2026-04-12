// /lib/shopdrawings/hashShopDrawingSnapshot.ts
import { createHash } from "crypto";

import type { ShopDrawingSheetData } from "@/app/(rs)/shopdrawings-editor/types";
import { normalizeShopDrawingSnapshot } from "@/lib/shopdrawings/normalizeShopDrawingSnapshot";

export function hashShopDrawingSnapshot(sheets: ShopDrawingSheetData[]) {
  const normalized = normalizeShopDrawingSnapshot(sheets);
  const json = JSON.stringify(normalized);

  return createHash("sha256").update(json).digest("hex");
}