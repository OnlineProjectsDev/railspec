// /app/(rs)/jobs/stage/page.tsx
import { getCustomer } from "@/lib/queries/getCustomer";
import { getJob } from "@/lib/queries/getJob";
import { BackButton } from "@/components/BackButton";
import * as Sentry from "@sentry/nextjs";
import JobStageForm from "@/app/(rs)/jobs/stage/JobStageForm";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { Users, init as kindeInit } from "@kinde/management-api-js";
import {
  getAllStagesForJob,
  getAllStagesForJobnoDefaults,
  getJobStageByJobAndStage,
} from "@/lib/queries/getJobStage";

// 👇 updated: use the actual file you showed
import { getBalconiesForStage } from "@/lib/queries/getBalcony";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { customerId, jobId, stage } = await searchParams;

  if (!customerId && !jobId)
    return {
      title: "Missing Job ID or Customer ID",
    };

  if (customerId)
    return {
      title: `New Job for Customer #${customerId}`,
    };

  if (jobId)
    return {
      title: `Edit Job #${jobId}`,
    };
}

export default async function JobStageFormPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  try {
    const { customerId, jobId, stage } = await searchParams;

    // -----------------------------
    // 1) Missing params → error
    // -----------------------------
    if (!customerId && !jobId) {
      return (
        <>
          <h2 className="tet-2xl mb-2">
            Customer ID or Job ID required to load form.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    const { getPermission, getUser } = getKindeServerSession();
    const [managerPermission, user] = await Promise.all([
      getPermission("manager"),
      getUser(),
    ]);

    const isManager = managerPermission?.isGranted;

    // -----------------------------
    // 2) New Job for a customer
    // -----------------------------
    if (customerId) {
      const customer = await getCustomer(parseInt(customerId));

      if (!customer) {
        return (
          <>
            <h2 className="tet-2xl mb-2">
              Customer ID #{customerId} not found.
            </h2>
            <BackButton title="Go Back" variant="default" />
          </>
        );
      }

      if (!customer.active) {
        return (
          <>
            <h2 className="tet-2xl mb-2">
              Customer ID #{customerId} is not active.
            </h2>
            <BackButton title="Go Back" variant="default" />
          </>
        );
      }

      // New job-stage form (no job yet)
      if (isManager) {
        kindeInit(); // Initializes the Kinde Management API
        const { users } = await Users.getUsers();

        const techs =
          users?.flatMap((user) => {
            const email = user.email?.toLowerCase();
            return email ? [{ id: email, description: email }] : [];
        }) ?? [];

        return (
          <JobStageForm
            customer={customer}
            techs={techs}
            isManager={isManager}
          />
        );
      } else {
        return <JobStageForm customer={customer} />;
      }
    }

    // -----------------------------
    // 3) Edit existing job + stage
    // -----------------------------
    if (jobId) {
      const job = await getJob(parseInt(jobId));

      if (!job) {
        return (
          <>
            <h2 className="tet-2xl mb-2">
              Job ID <div id={jobId}></div> not found.
            </h2>
            <BackButton title="Go Back" variant="default" />
          </>
        );
      }

      const customer = await getCustomer(job.customerId);

      const stageNo = stage ? parseInt(stage) : 1;
      const jobStage = await getJobStageByJobAndStage(job.id, stageNo);

      // 👇 NEW: compute how many balconies belong to this jobStage
      let existingBalconiesCount = 0;

      if (jobStage) {
        const balconiesForStage = await getBalconiesForStage(
          job.id,
          jobStage.id
        );
        existingBalconiesCount = balconiesForStage.length;
      }

      if (isManager) {
        kindeInit(); // Initializes the Kinde Management API
        const { users } = await Users.getUsers();

        const techs = users
          ? users.map((user) => ({
              id: user.email!,
              description: user.email!,
            }))
          : [];

        return (
          <JobStageForm
            customer={customer}
            job={job}
            jobStage={jobStage}
            techs={techs}
            isManager={isManager}
            existingBalconiesCount={existingBalconiesCount}
          />
        );
      } else {
        const isEditable = false; // or your future tech-based rule

        return (
          <JobStageForm
            customer={customer}
            job={job}
            jobStage={jobStage}
            isEditable={isEditable}
            existingBalconiesCount={existingBalconiesCount}
          />
        );
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e);
      throw e;
    }
  }
}
