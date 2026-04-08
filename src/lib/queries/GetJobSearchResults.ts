import { db } from "@/db";
import { jobs, customers, jobStages } from "@/db/schema";
import { eq, ilike, or, sql, asc } from "drizzle-orm";

export async function GetJobSearchResults(searchText: string) {
  const likeText = `%${searchText}%`;
  const nameLike = `%${searchText.toLowerCase().replace(" ", "%")}%`;

  const results = await db
    .select({
      id: jobs.id,                 // parent job id
      jobDate: sql<Date>`
        COALESCE(${jobStages.createdAt}, ${jobs.createdAt})
      `,
      job_number: jobs.job_number,
      stage: jobStages.stage,      // this specific stage number
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
    })
    .from(jobStages)
    .leftJoin(jobs, eq(jobStages.jobId, jobs.id))
    .leftJoin(customers, eq(jobs.customerId, customers.id))
    .where(
      or(
        // // job_number is integer → cast to text
        // sql`CAST(${jobs.job_number} AS text) ILIKE ${likeText}`,

        // // stage is integer → cast to text
        // sql`CAST(${jobStages.stage} AS text) ILIKE ${likeText}`,

        ilike(customers.email, likeText),
        ilike(customers.phone, likeText),
        ilike(jobs.address1, likeText),
        ilike(jobs.address2, likeText),
        ilike(jobs.city, likeText),
        ilike(jobs.zip, likeText),

        sql`lower(concat(${customers.firstName}, ' ', ${customers.lastName})) LIKE ${nameLike}`,
        sql`LOWER(CONCAT(CAST(${jobs.job_number} AS text), ' ', CAST(${jobStages.stage} AS text))) LIKE ${nameLike}`

      )
    )
    .orderBy(asc(jobStages.createdAt)); // sorted by stage creation time

  return results;
}

export type JobSearchResultsType = Awaited<ReturnType<typeof GetJobSearchResults>>;
