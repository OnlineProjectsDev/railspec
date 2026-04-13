import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getJob(id: number) {
    const job = await db.select()
        .from(jobs)
        .where(eq(jobs.id, id))

    return job[0] 
}