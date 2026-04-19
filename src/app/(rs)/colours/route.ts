// /app/(rs)/colours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { getAvailableColours } from "@/lib/queries/getAvailableColours";

export async function GET(req: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) redirect("/login");

  const { searchParams } = req.nextUrl;
  const design    = searchParams.get("design")    ?? "RD-D1";
  const infill    = searchParams.get("infill")    ?? null;
  const toprail   = searchParams.get("toprail")   ?? null;
  const anchorage = searchParams.get("anchorage") ?? null;
  const env       = (searchParams.get("environment") ?? "exterior") as
    | "interior"
    | "exterior"
    | "marine";

  const colours = await getAvailableColours({ design, infill, toprail, anchorage, environment: env });
  return NextResponse.json(colours);
}
