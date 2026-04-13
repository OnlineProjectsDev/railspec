//src/app/(print)/fabrication/cuttingsheet/page.tsx
import * as Sentry from "@sentry/nextjs";
import { PrintClientA4 } from "@/app/(print)/fabrication/PrintClientA4";
import { getJob } from "@/lib/queries/getJob";
import { getCustomer } from "@/lib/queries/getCustomer";
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
import { getBalconiesForStage } from "@/lib/queries/getBalcony";
import { getColourFromID } from "@/lib/queries/getAvailableColours";
import { CuttingSheetDoc } from "@/app/(print)/fabrication/docs/CuttingSheetDoc";

type SearchParams = { jobId?: string; stage?: string };

export default async function CuttingsheetPrintPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  try {
    const { jobId, stage } = await searchParams;
    if (!jobId || !stage) return <div className="p-4">Missing jobId or stage.</div>;

    const jobIdNum = Number(jobId);
    const stageNo = Number(stage);
    if (!Number.isFinite(jobIdNum) || !Number.isFinite(stageNo)) return <div className="p-4">Invalid jobId or stage.</div>;

    const job = await getJob(jobIdNum);
    if (!job) return <div className="p-4">Job not found.</div>;

    const customer = await getCustomer(job.customerId);
    const jobStage = await getJobStageByJobAndStage(job.id, stageNo);
    if (!jobStage) return <div className="p-4">Stage not found.</div>;

    const balconiesForStage = await getBalconiesForStage(job.id, jobStage.id);
    if (!balconiesForStage.length) return <div className="p-4">No balconies found for this stage.</div>;

    const stagePowdercoatColourId = (jobStage?.defaults as any)?.powdercoatColourId ?? null;
    const stagePowdercoat =
      typeof stagePowdercoatColourId === "number" ? await getColourFromID(stagePowdercoatColourId) : undefined;

    const clientName =
      customer?.company ?? [customer?.firstName, customer?.lastName].filter(Boolean).join(" ");

    const jobAddr1Raw = job.address1;
    const jobAddr2Raw = job.address2 ?? "";
    const siteAddressLine1 = jobAddr2Raw ? `${jobAddr2Raw}, ${jobAddr1Raw}` : jobAddr1Raw;
    const siteAddressLine2 = `${job.city} ${customer?.state ?? ""} ${job.zip}`.trim();

    const base = {
      jobNumber: job.job_number.toString(),
      jobStage: jobStage.stage,
      clientName,
      siteAddressLine1,
      siteAddressLine2,
      colourName: stagePowdercoat?.name,
      colourHex: Number(stagePowdercoat?.hex) || undefined,
      dateString: new Date().toLocaleDateString("en-AU"),
    };

    return (
      <PrintClientA4>
        <div className="print-root">
          <CuttingSheetDoc
            base={base}
            balconies={balconiesForStage.map((b) => ({
              id: b.id,
              drop: b.drop,
              balconyNo: b.balconyNo,
              design: b.design,
              toprail: b.toprail,
              infill: b.infill,
              postsArray: b.postsArray,
              foundationArray: b.foundationArray,
            }))}
            jobDefaults={{
              design_default: job.design_default,
              toprail_default: job.toprail_default,
              infill_default: job.infill_default,
            }}
          />
        </div>
      </PrintClientA4>
    );
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e);
      throw e;
    }
    throw e;
  }
}
