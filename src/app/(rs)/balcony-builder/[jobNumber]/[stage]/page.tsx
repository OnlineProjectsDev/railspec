import * as Sentry from "@sentry/nextjs";
import { notFound } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { getAllActiveCustomers, getCurrentCustomer } from "@/lib/queries/getCustomer";

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

import type { selectCustomerSchemaType } from "@/zod-schemas/customer";
import type { selectJobSchemaType } from "@/zod-schemas/jobs";
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
import { getBalconiesForStage } from "@/lib/queries/getBalcony";
import {
  BalconySelector,
  type BalconyOption,
} from "@/app/(rs)/drawingtool/BalconySelector";

type PageProps = {
  params: Promise<{ jobNumber: string; stage: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};


export const metadata = {
  title: "Balcony Builder Tool",
};

export default async function BalconyBuilderEditPage({ params, searchParams }: PageProps) {


    try {
        const { jobNumber, stage } = await params;
        const { balconyId, mode, view } = await searchParams;

        const jobNumParsed = Number(jobNumber);
        if (!Number.isFinite(jobNumParsed) || !Number.isInteger(jobNumParsed)) {
        console.log("🧪 invalid jobNumber, calling notFound");
        notFound();
        }

        const stageParsed = Number(stage);
        if (!Number.isFinite(stageParsed) || !Number.isInteger(stageParsed)) {
        console.log("🧪 invalid stage, calling notFound");
        notFound();
        }

        
        // 2) Auth
        const { getUser, getPermission } = getKindeServerSession();
        const user = await getUser();

        const admin = await getPermission("admin");
        const manager = await getPermission("manager");
        const employee = await getPermission("employee");

        const isRailsafeEmployee = !!(
        admin?.isGranted ||
        manager?.isGranted ||
        employee?.isGranted
        );

        // 3) Load the job by job_number
        const [job] = await db
            .select()
            .from(jobs)
            .where(eq(jobs.job_number, jobNumParsed));

        if (!job) {
            console.log("🧪 no job found for job_number", jobNumParsed);
            notFound();
        }

        const jobStage = await getJobStageByJobAndStage(job.id, stageParsed);

        if (!jobStage) {
            console.log("🧪 stage not found for job", { jobId: job.id, stage: stageParsed });
            notFound();
        }
        
          // 4) Load customers / currentCustomer (same as new-project page)
          let currentCustomer: selectCustomerSchemaType | null = null;
        
          if (user?.email) {
            currentCustomer = await getCurrentCustomer(user.email);
          }
        
          // 5) Access control: Railsafe can see all; non-employee must own the job
          if (!isRailsafeEmployee) {
            if (!currentCustomer || currentCustomer.id !== job.customerId) {
              console.log("🧪 access denied for job", job.id);
              notFound();
            }
          }


        const balconiesForStage = await getBalconiesForStage(job.id, jobStage.id);
        
        if (!balconiesForStage.length) {
            return (
                <div className="p-4">
                <h2 className="text-2xl mb-2">
                    No balconies found for Job #{job.job_number}, Stage{" "}
                    {jobStage.stage}.
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                    Create a balcony for this stage first, then open the drawing tool.
                </p>
                {/* <BackButton title="Go Back" variant="default" /> */}
                </div>
            );
        }

        // -----------------------------
        // 5) Decide which balcony is selected
        // -----------------------------
        let selectedBalcony =
        balconyId != null
            ? balconiesForStage.find((b) => b.id === Number(balconyId))
            : undefined;

        if (!selectedBalcony) {
            selectedBalcony = balconiesForStage[0];
        }

        const selectedBalconyId = selectedBalcony.id;

         // Build options for the selector (with href + isActive)
        const balconyOptions: BalconyOption[] = balconiesForStage.map((b) => ({
            id: b.id,
            label: `Drop ${b.drop} – Balcony ${b.balconyNo}`,
            href: `/balcony-builder/${jobNumParsed}/${stageParsed}?balconyId=${b.id}`,
            isActive: b.id === selectedBalconyId,
        }));


        return (
            <div>
                <p>My balcony builder page</p>
                <p>Job number: {jobNumParsed} stage: {stage}</p>
                <p>Accessable: {isRailsafeEmployee || currentCustomer?.id == job.customerId ? 'True' : 'False'}</p>

                <p>Design: {job.design_default}, {jobStage.defaults.design_default} {selectedBalcony ? `, ${selectedBalcony.design}` : '' } </p>
            </div>
        )

    } catch (e) {
        if (e instanceof Error) {
            Sentry.captureException(e);
            throw e;
        }
        throw e;
    }
}