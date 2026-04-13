// getNextJobNumber.ts
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function getNextJobNumber() {
  const [row] = await db
    .select({
      maxJobNumber: sql<number>`COALESCE(MAX(${jobs.job_number}), 0)`,
    })
    .from(jobs);

  return (row?.maxJobNumber ?? 0) + 1;
}