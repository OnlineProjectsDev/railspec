// app/(rs)/shopdrawings/page.tsx

import * as Sentry from "@sentry/nextjs";

import { BackButton } from "@/components/BackButton";
import {
  BalconySelector,
  type BalconyOption,
} from "@/app/(rs)/shopdrawings/BalconySelector";

import { getJob } from "@/lib/queries/getJob";
import { getCustomer } from "@/lib/queries/getCustomer";
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
import { getBalconiesForStage } from "@/lib/queries/getBalcony";
import { A3Canvas } from "@/app/(rs)/shopdrawings/A3Canvas";
import type {
  A3CanvasProps,
  PowdercoatColor,
} from "@/app/(rs)/shopdrawings/A3Canvas";

import JobSearch from "@/app/(rs)/shopdrawings/JobSearch";
import { GetOpenJobs } from "@/lib/queries/GetopenJobs";
import JobTable from "@/app/(rs)/shopdrawings/JobTable";
import { ShopDrawingClient } from "@/app/(rs)/shopdrawings/ShopDrawingClient";
import { getColourFromID } from "@/lib/queries/getAvailableColours";
import Link from "next/link";


export const metadata = {
  title: "Shop Drawing",
};

type ShopDrawingSearchParams = {
  jobId?: string;
  stage?: string;
};



function normaliseBalconyColor(raw: unknown): PowdercoatColor {
  if (raw && typeof raw === "object") {
    const maybe = raw as { hex?: unknown; name?: unknown };

    if ((typeof maybe.hex === "number") && typeof maybe.name === "string") {
      return { hex: maybe.hex, name: maybe.name };
    }
  }

  // Fallback matches the DB default in the schema
  return { hex: 0xaaaaaa, name: "TBD" };
}

export default async function ShopDrawingPage({
  searchParams,
}: {
  searchParams: Promise<ShopDrawingSearchParams>;
}) {
  try {
    const { jobId, stage } = await searchParams;

    // -----------------------------
    // 1) Validate required params
    // -----------------------------
    if (!jobId || !stage) {
      const results = await GetOpenJobs();

      return (
        <>
          <JobSearch />
          {results.length ? <JobTable data={results} /> : <>No open jobs found.</>}
        </>
      );
    }

    const jobIdNum = Number(jobId);
    const stageNo = Number(stage);

    if (!Number.isFinite(jobIdNum) || !Number.isFinite(stageNo)) {
      const results = await GetOpenJobs();

      return (
        <>
          <JobSearch />
          {results.length ? <JobTable data={results} /> : <>No open jobs found.</>}
        </>
      );
    }

    // -----------------------------
    // 2) Load job + customer
    // -----------------------------
    const job = await getJob(jobIdNum);

    if (!job) {
      return (
        <div className="p-4">
          <h2 className="text-2xl mb-2">Job ID #{jobIdNum} not found.</h2>
          <BackButton title="Go Back" variant="default" />
        </div>
      );
    }

    const customer = await getCustomer(job.customerId);

    // -----------------------------
    // 3) Load stage for this job
    // -----------------------------
    const jobStage = await getJobStageByJobAndStage(job.id, stageNo);

    if (!jobStage) {
      return (
        <div className="p-4">
          <h2 className="text-2xl mb-2">
            Stage {stageNo} not found for Job #{job.job_number}.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </div>
      );
    }

    // -----------------------------
    // 4) Load balconies for this stage
    // -----------------------------
    const balconiesForStage = await getBalconiesForStage(job.id, jobStage.id);

    if (!balconiesForStage.length) {
      return (
        <div className="p-4">
          <h2 className="text-2xl mb-2">
            No balconies found for Job #{job.job_number}, Stage {stageNo}.
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create a balcony for this stage first, then open the shop drawing viewer.
          </p>
          <BackButton title="Go Back" variant="default" />
        </div>
      );
    }

    // -----------------------------
    // 5) Decide which balcony is selected
    // -----------------------------
    // use first balcony as default for any server-only derived fields:
    const selectedBalcony = balconiesForStage[0];
    const selectedBalconyId = selectedBalcony.id;
    // console.log(selectedBalcony.postsArray)

    const balconyOptions: BalconyOption[] = balconiesForStage.map((b) => ({
      id: b.id,
      label: `Drop ${b.drop} – Balcony ${b.balconyNo}`,
      href: `/shopdrawings?jobId=${job.id}&stage=${stageNo}#balconyId=${b.id}`,
    }));


    // -----------------------------
    // 6) Values to feed into A3Canvas
    // -----------------------------

    // Prefer company name; fall back to "First Last" if present.
    const clientName =
      customer?.company ??
      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ");

    // Client address (customers table)
    const clientAddress1 = customer?.address1 ?? "";
    const clientAddress2 = customer?.address2 ?? "";
    const clientCity = customer?.city ?? "";
    const clientState = customer?.state ?? "";
    const clientZip = customer?.zip ?? "";

    // Job site address (jobs table)
    const jobAddr1Raw = job.address1;
    const jobAddr2Raw = job.address2 ?? "";
    const jobCity = job.city;
    const jobState = customer?.state ?? "";
    const jobZip = job.zip;

    const jobAddressLine1 = jobAddr2Raw
      ? `${jobAddr2Raw}, ${jobAddr1Raw}`
      : jobAddr1Raw;
    const jobAddressLine2 = "";

    // Drawing title block info
    const jobNumberString = job.job_number.toString();
    const dropName = `Drop ${selectedBalcony.drop}`;
    const dropDesign = selectedBalcony.design ?? job.design_default;

    // Powdercoat colour from balconies.color jsonb { hex, name }

    // Find the object from props.colours
    const stagePowdercoatColourId =
  (jobStage?.defaults as any)?.powdercoatColourId ?? null;
  const stagePowdercoat =
  typeof stagePowdercoatColourId === "number"
    ? await getColourFromID(stagePowdercoatColourId)
    : undefined;

    // console.log(stagePowdercoat)
    const balconyColour = normaliseBalconyColor(stagePowdercoat);
    const dropColour = balconyColour;
    balconyColour.name = stagePowdercoat?.name ?? balconyColour.name
    balconyColour.hex = Number(stagePowdercoat?.hex) ?? balconyColour.hex;
    const dropColourHex = Number(stagePowdercoat?.hex)  ?? 0xAAAAAA;

    // Glass / infill text from balconies.infill (schema) or job default
    const infillType = selectedBalcony.infill ?? job.infill_default;

    // Simple date string for the title block
    const dateString = new Date().toLocaleDateString("en-AU");

    // For now, keep DPI/scale constant and plot offset centred.
    const dpi = 300;
    const scale = 2;
    const plotOffset = { x: 0, y: 0 };

    const a3BaseProps = {
  // --- title block / global settings ---
  dpi,
  scale,
  clientName,
  clientAddress1,
  clientAddress2,
  jobNumber: jobNumberString,
  // dropName,
  // balconyNo: selectedBalcony.balconyNo,
  // dropDesign,
  dropColour,
  dropColourHex,
  // infillType,
  // sheetRef: "1 of 1",
  dateString,

  clientCity,
  clientState,
  clientZip,

  jobAddress1: jobAddressLine1,
  jobAddress2: jobAddressLine2,
  jobCity,
  jobState,
  jobZip,
  jobStage: jobStage.stage,

  plotOffset,

  cameraSettings: {
    x: 5,
    y: 5,
    z: 5,
    o_x: 0,
    o_y: 0,
    o_z: 0,
    fov: 75,
  },
  lighting: {
    ambient_intensity: 0.5,
    ambient_color: 0xffffff,
    light_intensity: 0.5,
    light_color: 0xffffff,
    x: 10,
    y: 10,
    z: 10,
  },

  maxSpacing: job.max_post_spacing ?? 1280,

  wallDataArray: [
    {
      partName: "150mm Hob",
      id: 1,
      length: 2000,
      x: 0,
      y: -75,
      z: 0,
      o: 0,
      t: 0,
    },
  ],
} satisfies Omit<
  A3CanvasProps,
  | "dropName"
  | "balconyNo"
  | "dropDesign"
  | "infillType"
  | "sheetRef"
  | "postsArray"
  | "postsDataArray"
  | "baseplatesDataArray"
  | "verticalInfillDataArray"
  | "glassInfillDataArray"
  | "midRailDataArray"
  | "topRailDataArray"
  | "fixedComponentsDataArray"
  | "postsVectorsArray"
  | "infillVectorsArray"
  | "toprailVectorsArray"
  | "sectionsArray"
  | "foundationArray"
>;


    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <div className="max-w-12xl mx-auto px-4 py-4 space-y-4">
            {/* Header / context */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Shop Drawing</h1>
                <p className="text-sm text-muted-foreground">
                  Job #{job.job_number} – Stage {jobStage.stage}
                  {customer && (
                    <>
                      {" "}
                      – {customer.company} ({customer.firstName} {customer.lastName})
                    </>
                  )}
                </p>
              </div>
              <BackButton title="Back to previous page" variant="outline" />
              <Link
                href={`/shopdrawings/print?jobId=${job.id}&stage=${jobStage.stage}`}
                className="text-xs px-2 py-1 rounded border hover:bg-muted"
              >
                Print / PDF
              </Link>

            </div>

            {/* Balcony selector (non drag–reorderable) */}
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur border-b -mx-4 px-4 py-2">
              <BalconySelector
                options={balconyOptions}
                jobId={job.id}
                jobStageId={jobStage.id}
                stageNo={jobStage.stage}
              />
            </div>

            {/* Selected balcony info */}
            <div className="text-sm text-muted-foreground">
              Currently selected:{" "}
              <span className="font-medium">
                Drop {selectedBalcony.drop} – Balcony {selectedBalcony.balconyNo}
              </span>
            </div>

            {/* A3 shopdrawing canvas hook point */}
            <section className="mt-4 border rounded-md p-4">
              <h2 className="text-lg font-semibold mb-2">A3 Shop Drawing Preview</h2>
              <p className="text-xs text-muted-foreground mb-2">
                This section will render the canvas / drawing view for the currently
                selected balcony.
              </p>

              <div className="w-full overflow-auto border">
                {/* A3 sheet is physically large at 300 DPI – allow scroll */}
                {/* <A3Canvas {...a3CanvasProps} /> */}
                <div id="shopdrawing-canvas">
                  <ShopDrawingClient
                    a3Base={a3BaseProps}  // now becomes "common base" (see next snippet)
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

              </div>
            </section>
          </div>
        </main>
      </div>
    );
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e);
      throw e;
    }
    throw e;
  }
}
