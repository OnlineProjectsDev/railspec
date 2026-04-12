// Filename: app/(rs)/balconies/form/page.tsx

import { BackButton } from "@/components/BackButton";
import * as Sentry from "@sentry/nextjs";

import { getCustomer } from "@/lib/queries/getCustomer";
import { getJob } from "@/lib/queries/getJob";
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
import {
  getBalconiesForStage,
} from "@/lib/queries/getBalcony";

import BalconyHistory from "@/app/(rs)/balconies/form/BalconyHistory";

import { getColourFromID } from "@/lib/queries/getAvailableColours"

import BalconyForm from "@/app/(rs)/balconies/form/BalconyForm";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import {
  selectBalconySchema,
  type selectBalconySchemaType,
} from "@/zod-schemas/balconies";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { jobId, stage, balconyId } = await searchParams;

  if (!jobId) {
    return {
      title: "Missing Job ID",
    };
  }

  if (!balconyId) {
    return {
      title: `New Balcony for Job #${jobId}${
        stage ? ` (Stage ${stage})` : ""
      }`,
    };
  }

  return {
    title: `Edit Balcony #${balconyId} for Job #${jobId}${
      stage ? ` (Stage ${stage})` : ""
    }`,
  };
}

export default async function BalconyFormPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  try {
    const { jobId, stage, balconyId } = await searchParams;

    // Require job + stage to anchor the balcony
    if (!jobId || !stage) {
      return (
        <>
          <h2 className="tet-2xl mb-2">
            Job ID and Stage number are required to load balcony form.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    const jobIdNum = parseInt(jobId, 10);
    const stageNo = parseInt(stage, 10);

    if (Number.isNaN(jobIdNum) || Number.isNaN(stageNo)) {
      return (
        <>
          <h2 className="tet-2xl mb-2">
            Invalid Job ID or Stage number in URL.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    // Permissions, same pattern as JobStageFormPage
    const { getPermission, getUser } = getKindeServerSession();
    const [managerPermission] = await Promise.all([
      getPermission("manager"),
      getUser(),
    ]);

    const isManager = managerPermission?.isGranted;

    // ---- Load Job ----
    const job = await getJob(jobIdNum);

    if (!job) {
      return (
        <>
          <h2 className="tet-2xl mb-2">Job ID #{jobIdNum} not found.</h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    // ---- Load Customer ----
    const customer = await getCustomer(job.customerId);

    if (!customer) {
      return (
        <>
          <h2 className="tet-2xl mb-2">
            Customer ID #{job.customerId} not found.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    if (!customer.active) {
      return (
        <>
          <h2 className="tet-2xl mb-2">
            Customer ID #{customer.id} is not active.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    // ---- Load Job Stage ----
    const jobStage = await getJobStageByJobAndStage(job.id, stageNo);

    if (!jobStage) {
      return (
        <>
          <h2 className="tet-2xl mb-2">
            Stage {stageNo} for Job #{job.job_number} not found.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </>
      );
    }

    // ---- Load all balconies for this stage (for duplicate detection) ----
    const balconiesForStageRaw = await getBalconiesForStage(job.id, jobStage.id);

    const stagePowdercoatColourId =
  (jobStage?.defaults as any)?.powdercoatColourId ?? null;

  const stagePowdercoat =
    typeof stagePowdercoatColourId === "number"
      ? await getColourFromID(stagePowdercoatColourId)
      : undefined;

    // Shape raw rows -> selectBalconySchemaType[], fixing JSON fields
    const existingBalconies: selectBalconySchemaType[] =
      balconiesForStageRaw.map((row) =>
        selectBalconySchema.parse({
          ...row,
          color:
            row.color ??
            (stagePowdercoat
    ? {
        hex: hexStringToNumber(stagePowdercoat.hex),
        name: stagePowdercoat.name,
      }
    : { hex: 0xaaaaaa, name: "TBD" } as const),
          foundationArray: row.foundationArray ?? [],
          postsArray: row.postsArray ?? [],
          metadata: (row as any).metadata ?? {},
        })
      );

    // ---- Optional: current balcony (edit mode) ----
    let balcony: selectBalconySchemaType | undefined = undefined;

    if (balconyId) {
      const balconyIdNum = parseInt(balconyId, 10);

      if (Number.isNaN(balconyIdNum)) {
        return (
          <>
            <h2 className="tet-2xl mb-2">Invalid Balcony ID in URL.</h2>
            <BackButton title="Go Back" variant="default" />
          </>
        );
      }

      balcony = existingBalconies.find((b) => b.id === balconyIdNum);

      if (!balcony) {
        return (
          <>
            <h2 className="tet-2xl mb-2">
              Balcony ID #{balconyIdNum} not found for this stage.
            </h2>
            <BackButton title="Go Back" variant="default" />
          </>
        );
      }
    }

    // Manager can edit; non-manager view-only (tweak if you want tech-based check)
    const isEditable = !!isManager;

    return (
    <>
        <BalconyForm
        customer={customer}
        job={job}
        jobStage={jobStage}
        balcony={balcony}
        existingBalconies={existingBalconies}
        isEditable={isEditable}
        isManager={isManager}
        color={{
          hex: hexStringToNumber(stagePowdercoat?.hex),
          name: stagePowdercoat?.name ?? "TBD",
        }}
        />

        {balcony && (
        <BalconyHistory balconyId={balcony.id} />
        )}
    </>
    );
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e);
      throw e;
    }
  }
}

function hexStringToNumber(hex?: string | null): number {
  if (!hex) return 0xaaaaaa;
  const clean = hex.trim().replace(/^#/, "");
  const n = /^[0-9A-Fa-f]{6}$/.test(clean) ? Number.parseInt(clean, 16) : NaN;
  return Number.isFinite(n) ? n : 0xaaaaaa;
}