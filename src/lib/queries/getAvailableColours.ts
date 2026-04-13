// Filename: getAvailableColours.ts
import { db } from "@/db";
import { powdercoatColours } from "@/db/schema";
import { and, or, eq, sql } from "drizzle-orm";

export async function getAvailableColours(opts: {
  design: string;
  infill: string | null;
  toprail: string | null;
  anchorage: string | null;
  environment: "interior" | "exterior" | "marine";
}) {
  const { design, infill, toprail, anchorage, environment } = opts;

  return await db
    .select()
    .from(powdercoatColours)
    .where(
      and(
        // ----------------------------
        // 1) Environment filtering
        // ----------------------------
        environment === "interior"
          ? eq(powdercoatColours.interiorOnly, true)
          : environment === "exterior"
          ? and(
              eq(powdercoatColours.exteriorRating, true),
              eq(powdercoatColours.marineRating, false)
            )
          : // marine environment
            eq(powdercoatColours.marineRating, true),

        // ----------------------------
        // 2) Allowed designs
        // allowed_designs IS NULL OR design ∈ allowed_designs
        // ----------------------------
        or(
          sql`${powdercoatColours.allowedDesigns} IS NULL`,
          sql`${design} = ANY(${powdercoatColours.allowedDesigns})`
        ),

        // ----------------------------
        // 3) Allowed infill types
        // ----------------------------
        or(
          sql`${powdercoatColours.allowedInfillTypes} IS NULL`,
          infill === null
            ? sql`TRUE`
            : sql`${infill} = ANY(${powdercoatColours.allowedInfillTypes})`
        ),

        // ----------------------------
        // 4) Allowed toprails
        // ----------------------------
        or(
          sql`${powdercoatColours.allowedToprails} IS NULL`,
          toprail === null
            ? sql`TRUE`
            : sql`${toprail} = ANY(${powdercoatColours.allowedToprails})`
        ),

        // ----------------------------
        // 5) Allowed anchorages
        // ----------------------------
        or(
          sql`${powdercoatColours.allowedAnchorages} IS NULL`,
          anchorage === null
            ? sql`TRUE`
            : sql`${anchorage} = ANY(${powdercoatColours.allowedAnchorages})`
        )
      )
    )
    .orderBy(powdercoatColours.name);
}

export async function getColourFromID(colourId: number) {
   const rows = await db
     .select()
     .from(powdercoatColours)
     .where(
       eq(powdercoatColours.id, colourId)
     )
     .limit(1);
 
   const row = rows[0];
   if (!row) return undefined;
   return row;
 }