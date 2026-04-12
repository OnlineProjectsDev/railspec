// /app/(rs)/jobs/check-number/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobNumberParam = searchParams.get("job_number");
  const stageParam = searchParams.get("stage");

  const job_number = jobNumberParam ? Number(jobNumberParam) : NaN;
  const stage = stageParam ? Number(stageParam) : NaN;

  if (!Number.isFinite(job_number) || !Number.isFinite(stage)) {
    return NextResponse.json(
      { exists: false, error: "Invalid job_number or stage" },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      id: jobs.id,
      job_number: jobs.job_number,
      stage: jobs.stage,
    })
    .from(jobs)
    .where(and(eq(jobs.job_number, job_number), eq(jobs.stage, stage)))
    .limit(1);

  const existing = rows[0];

  if (!existing) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    jobId: existing.id,
    job_number: existing.job_number,
    stage: existing.stage,
  });
}
