// src/app/(rs)/project-builder/[jobNumber]/page.tsx
import { notFound } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import JobWizard from "../JobWizard";
import { getAllActiveCustomers, getCurrentCustomer } from "@/lib/queries/getCustomer";
import { getAvailableColours } from "@/lib/queries/getAvailableColours";

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

import type { selectCustomerSchemaType } from "@/zod-schemas/customer";
import type { selectJobSchemaType } from "@/zod-schemas/jobs";
import type { PowdercoatColour } from "@/components/project-builder-components/steps/colour-step";

type PageProps = {
  params: Promise<{ jobNumber: string }>;
};

export default async function ProjectBuilderEditPage({ params }: PageProps) {
  // 1) In Next 16, params is a Promise
  const { jobNumber } = await params;

  console.log("🧪 [project-builder/[jobNumber]] resolved params:", { jobNumber });

  const jobNumParsed = Number(jobNumber);
  if (!Number.isFinite(jobNumParsed)) {
    console.log("🧪 invalid jobNumber, calling notFound");
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

  // 4) Load customers / currentCustomer (same as new-project page)
  let customers: selectCustomerSchemaType[] = [];
  let currentCustomer: selectCustomerSchemaType | null = null;

  if (isRailsafeEmployee) {
    customers = await getAllActiveCustomers();
  } else if (user?.email) {
    currentCustomer = await getCurrentCustomer(user.email);
  }

  // 5) Access control: Railsafe can see all; non-employee must own the job
  if (!isRailsafeEmployee) {
    if (!currentCustomer || currentCustomer.id !== job.customerId) {
      console.log("🧪 access denied for job", job.id);
      notFound();
    }
  }

  // 6) Colours based on THIS job’s defaults
  const colours: PowdercoatColour[] = await getAvailableColours({
    design: job.design_default ?? "RD-D1",
    infill: job.infill_default ?? "6.38mm Clear Laminate",
    toprail: job.toprail_default ?? "Elite",
    anchorage: job.anchorage_default ?? "BP",
    environment: "exterior",
  });

  // 7) Pass job into JobWizard so it can prefill
  return (
    <JobWizard
      isRailsafeEmployee={isRailsafeEmployee}
      customers={customers}
      currentCustomer={currentCustomer}
      colours={colours}
      job={job as selectJobSchemaType}
    />
  );
}
