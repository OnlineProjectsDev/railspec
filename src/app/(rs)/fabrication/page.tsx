// src/app/(rs)/fabrication/page.tsx

import Link from "next/link"

export const metadata = {
  title: "Fabrication",
}

export default function FabricationIndexPage() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Fabrication</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open a fabrication stage directly by job number and stage number.
        </p>
      </div>

      <div className="rounded-md border p-4 bg-white text-sm">
        <div className="font-medium mb-2">Route format</div>
        <div className="text-muted-foreground">
          Use:
        </div>
        <code className="block mt-2 rounded bg-muted px-3 py-2">
          /fabrication/[jobNumber]/[stageNumber]
        </code>

        <div className="mt-4">
          Example:
        </div>
        <Link
          href="/fabrication/1000/1"
          className="inline-flex mt-2 items-center justify-center px-3 py-2 text-sm rounded-md border hover:bg-muted"
        >
          Open example route
        </Link>
      </div>
    </div>
  )
}
// import * as Sentry from "@sentry/nextjs";

// import { FabricationClient } from "@/app/(rs)/fabrication/FabricationClient";
// import type { FabricationDocType } from "@/lib/fabrication/types";

// import { getJob } from "@/lib/queries/getJob";
// import { getCustomer } from "@/lib/queries/getCustomer";
// import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
// import { getBalconiesForStage } from "@/lib/queries/getBalcony";
// import { getColourFromID } from "@/lib/queries/getAvailableColours";

// import type {
//   FabricationBase,
//   FabricationBalconyInput,
// } from "@/app/(print)/fabrication/FabricationClient";

// type SearchParams = {
//   jobId?: string;
//   stage?: string;
//   doc?: FabricationDocType; // "cutting" | "powdercoat" | "glass" | "components"
// };

// export default async function FabricationPage({
//   searchParams,
// }: {
//   searchParams: Promise<SearchParams>;
// }) {
//   try {
//     const { jobId, stage, doc = "cutting" } = await searchParams;

//     if (!jobId || !stage) {
//       return <div className="p-4">Missing jobId or stage.</div>;
//     }

//     const jobIdNum = Number(jobId);
//     const stageNo = Number(stage);
//     if (!Number.isFinite(jobIdNum) || !Number.isFinite(stageNo)) {
//       return <div className="p-4">Invalid jobId or stage.</div>;
//     }

//     const job = await getJob(jobIdNum);
//     if (!job) return <div className="p-4">Job not found.</div>;

//     const customer = await getCustomer(job.customerId);
//     const jobStage = await getJobStageByJobAndStage(job.id, stageNo);
//     if (!jobStage) return <div className="p-4">Stage not found.</div>;

//     const balconies = await getBalconiesForStage(job.id, jobStage.id);
//     if (!balconies.length) {
//       return <div className="p-4">No balconies for this stage.</div>;
//     }

//     // ---- colour ----
//     const powdercoatId = (jobStage.defaults as any)?.powdercoatColourId;
//     const powdercoat =
//       typeof powdercoatId === "number"
//         ? await getColourFromID(powdercoatId)
//         : undefined;

//     // ---- build FabricationBase ----
//     const base: FabricationBase = {
//       jobNumber: job.job_number.toString(),
//       jobStage: jobStage.stage,

//       clientName:
//         customer?.company ??
//         [customer?.firstName, customer?.lastName].filter(Boolean).join(" "),

//       siteAddressLine1: job.address2
//         ? `${job.address2}, ${job.address1}`
//         : job.address1,

//       siteAddressLine2: `${job.city} ${customer?.state ?? ""} ${job.zip}`.trim(),

//       colourName: powdercoat?.name,
//       colourHex: Number(powdercoat?.hex) || undefined,

//       dateString: new Date().toLocaleDateString("en-AU"),
//     };

//     // ---- normalize balconies ----
//     const balconyInputs: FabricationBalconyInput[] = balconies.map((b) => ({
//       id: b.id,
//       drop: b.drop,
//       balconyNo: b.balconyNo,
//       design: b.design,
//       toprail: b.toprail,
//       infill: b.infill,
//       postsArray: b.postsArray,
//       foundationArray: b.foundationArray,
//     }));

//     return (
//       <FabricationClient
//         docType={doc}
//         base={base}
//         balconies={balconyInputs}
//         jobDefaults={{
//           design_default: job.design_default,
//           toprail_default: job.toprail_default,
//           infill_default: job.infill_default,
//         }}
//       />
//     );
//   } catch (e) {
//     Sentry.captureException(e);
//     throw e;
//   }
// }
