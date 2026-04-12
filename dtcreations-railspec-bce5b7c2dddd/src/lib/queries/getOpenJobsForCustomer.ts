// /lib/queries/getOpenJobsForCustomers.ts
import { db } from "@/db";
import { jobs, customers, jobStages, editorBalconies } from "@/db/schema";
import { eq, asc, sql, and } from "drizzle-orm";

export async function GetOpenJobsForCurrentCustomer(user_email: string) {

  if (!user_email) {
    return []; // or throw new Error("Missing customer email");
  }

  const results = await db
    .select({
      id: sql<number>`
        COALESCE(${jobStages.id}, 0)
      `,
      jobDate: sql<Date>`
        COALESCE(${jobStages.createdAt}, ${jobs.createdAt})
      `,
      job_number: jobs.job_number,

      // job id as number, with fallback to 1 when no stage exists
      job_id: sql<number>`
        COALESCE(${jobStages.jobId}, 1)
      `,
      
      stage: sql<number>`
        COALESCE(${jobStages.stage}, 1)
      `,

      hasStage: sql<boolean>`
        ${jobStages.id} IS NOT NULL
      `,

      editorBalconyCount: sql<number>`
        (
          SELECT COUNT(*)
          FROM ${editorBalconies}
          WHERE
            ${editorBalconies.jobId} = ${jobs.id}
            AND ${editorBalconies.jobStageId} = ${jobStages.id}
            AND ${editorBalconies.isDeleted} = false
        )
      `,

      company: customers.company,
      jobAddress: sql<string>`
        COALESCE(
          NULLIF(${jobs.address2}, '' ) || ', ' || ${jobs.address1},
          ${jobs.address1}
        )
      `,
      address1: jobs.address1,
      address2: jobs.address2,
      city: jobs.city,
      zip: jobs.zip,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      status: sql<string>`COALESCE(${jobStages.status}, 'draft')`,
      design: jobs.design_default,
    })
    .from(jobs)
    .leftJoin(jobStages, eq(jobStages.jobId, jobs.id))
    .leftJoin(customers, eq(jobs.customerId, customers.id))
    .where(
      and(
        eq(jobs.project_status, 0),
        eq(customers.email, user_email)   // <-- uses the argument
      )
    )
    .orderBy(
      asc(sql`COALESCE(${jobStages.createdAt}, ${jobs.createdAt})`)
    );

  return results;
}


export async function GetOpenJobsForCurrentCustomerWithDetails(user_email: string) {

  if (!user_email) {
    return []; // or throw new Error("Missing customer email");
  }

  const results = await db
    .select({
      id: sql<number>`
        COALESCE(${jobStages.id}, 0)
      `,
      jobDate: sql<Date>`
        COALESCE(${jobStages.createdAt}, ${jobs.createdAt})
      `,
      job_number: jobs.job_number,
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
    .where(
      and(
        eq(jobs.project_status, 0),
        eq(customers.email, user_email)   // <-- uses the argument
      )
    )
    .orderBy(
      asc(sql`COALESCE(${jobStages.createdAt}, ${jobs.createdAt})`)
    );

  return results;
}
