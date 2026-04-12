// /lib/shopdrawings/normalizeShopDrawingSnapshot.ts
import type { ShopDrawingSheetData } from "@/app/(rs)/shopdrawings-editor/types";

type ComparableSheet = {
  id: string;
  balconyId: number;
  meta: ShopDrawingSheetData["meta"];
  plan: ShopDrawingSheetData["plan"];
  posts: ShopDrawingSheetData["posts"];
  panels: ShopDrawingSheetData["panels"];
  legend: ShopDrawingSheetData["legend"];
};

function sortObjectDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortObjectDeep(val)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function normalizeShopDrawingSnapshot(
  sheets: ShopDrawingSheetData[]
): ComparableSheet[] {
  return sheets
    .map((sheet) => ({
      id: sheet.id,
      balconyId: sheet.balconyId,
      meta: sheet.meta,
      plan: sheet.plan,
      posts: sheet.posts,
      panels: sheet.panels,
      legend: sheet.legend,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }))
    .map((sheet) => sortObjectDeep(sheet));
}