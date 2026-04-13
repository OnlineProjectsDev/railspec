// /lib/queries/getOpenJobs.ts
import { db } from "@/db";
import { jobs, customers, jobStages, balconies } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export async function GetOpenJobs() {
  const results = await db
    .select({
      id: sql<number>`
        COALESCE(${jobStages.id}, 0)
      `,

      // jobDate as a real Postgres timestamp (→ JS Date)
      jobDate: sql<Date>`
        COALESCE(${jobStages.createdAt}, ${jobs.createdAt})
      `,

      job_number: jobs.job_number,

      // job id as number, with fallback to 1 when no stage exists
      job_id: sql<number>`
        COALESCE(${jobStages.jobId}, 1)
      `,
      
      // stage as number, with fallback to 1 when no stage exists
      stage: sql<number>`
        COALESCE(${jobStages.stage}, 1)
      `,
      
      hasStage: sql<boolean>`
        ${jobStages.id} IS NOT NULL
      `,

      balconyCount: sql<number>`
        (
          SELECT COUNT(*)
          FROM ${balconies}
          WHERE
            ${balconies.jobId} = ${jobs.id}
            AND ${balconies.jobStageId} = ${jobStages.id}
            AND ${balconies.isDeleted} = false
        )
      `,
      
      company: customers.company,
      jobAddress: sql<string>`
        COALESCE(
          NULLIF(${jobs.address2}, '' ) || ', ' || ${jobs.address1},
          ${jobs.address1}
        )
      `,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      status: sql<string>`COALESCE(${jobStages.status}, 'draft')`,
      design: jobs.design_default,
    })
    .from(jobs)
    .leftJoin(jobStages, eq(jobStages.jobId, jobs.id))
    .leftJoin(customers, eq(jobs.customerId, customers.id))
    .where(eq(jobs.project_status, 0))
    .orderBy(
      asc(sql`COALESCE(${jobStages.createdAt}, ${jobs.createdAt})`)
    );

  return results;
}


export async function GetOpenJobsWithDetails() {
  const results = await db
    .select({
      id: sql<number>`
        COALESCE(${jobStages.id}, 0)
      `,

      // jobDate as a real Postgres timestamp (→ JS Date)
      jobDate: sql<Date>`
        COALESCE(${jobStages.createdAt}, ${jobs.createdAt})
      `,

      job_number: jobs.job_number,

      // job id as number, with fallback to 1 when no stage exists
      job_id: sql<number>`
        COALESCE(${jobStages.jobId}, 1)
      `,

      // stage as number, with fallback to 0 when no stage exists
      stage: sql<number>`
        COALESCE(${jobStages.stage}, 1)
      `,

      company: customers.company,
      jobAddress: sql<string>`
        COALESCE(
          NULLIF(${jobs.address2}, '' ) || ', ' || ${jobs.address1},
          ${jobs.address1}
        )
      `,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      status: sql<string>`COALESCE(${jobStages.status}, 'draft')`,
      design: jobs.design_default,
      anchorage: jobs.anchorage_default,
      toprail: jobs.toprail_default,
      height: jobs.height_default,
    })
    .from(jobs)
    .leftJoin(jobStages, eq(jobStages.jobId, jobs.id))
    .leftJoin(customers, eq(jobs.customerId, customers.id))
    .where(eq(jobs.project_status, 0))
    .orderBy(
      asc(sql`COALESCE(${jobStages.createdAt}, ${jobs.createdAt})`)
    );

  return results;
}
