//src/app/(print)/shopdrawings/print/page.tsx
import * as Sentry from "@sentry/nextjs";

import { PrintClient } from "@/app/(print)/shopdrawings/print/PrintClient";
import { ShopDrawingClient } from "@/app/(rs)/shopdrawings/ShopDrawingClient";

import { getJob } from "@/lib/queries/getJob";
import { getCustomer } from "@/lib/queries/getCustomer";
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
import { getBalconiesForStage } from "@/lib/queries/getBalcony";
import { getColourFromID } from "@/lib/queries/getAvailableColours";

import type { A3CanvasProps, PowdercoatColor } from "@/app/(rs)/shopdrawings/A3Canvas";

type ShopDrawingSearchParams = {
  jobId?: string;
  stage?: string;
};

function normaliseBalconyColor(raw: unknown): PowdercoatColor {
  if (raw && typeof raw === "object") {
    const maybe = raw as { hex?: unknown; name?: unknown };
    if (typeof maybe.hex === "number" && typeof maybe.name === "string") {
      return { hex: maybe.hex, name: maybe.name };
    }
  }
  return { hex: 0xaaaaaa, name: "TBD" };
}

export default async function ShopDrawingPrintPage({
  searchParams,
}: {
  searchParams: Promise<ShopDrawingSearchParams>;
}) {
  try {
    const { jobId, stage } = await searchParams;

    if (!jobId || !stage) {
      return <div className="p-4">Missing jobId or stage.</div>;
    }

    const jobIdNum = Number(jobId);
    const stageNo = Number(stage);

    if (!Number.isFinite(jobIdNum) || !Number.isFinite(stageNo)) {
      return <div className="p-4">Invalid jobId or stage.</div>;
    }

    const job = await getJob(jobIdNum);
    if (!job) return <div className="p-4">Job not found.</div>;

    const customer = await getCustomer(job.customerId);

    const jobStage = await getJobStageByJobAndStage(job.id, stageNo);
    if (!jobStage) return <div className="p-4">Stage not found.</div>;

    const balconiesForStage = await getBalconiesForStage(job.id, jobStage.id);
    if (!balconiesForStage.length) {
      return <div className="p-4">No balconies found for this stage.</div>;
    }

    // ---- base props (shared across all pages) ----
    const clientName =
      customer?.company ??
      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ");

    const clientAddress1 = customer?.address1 ?? "";
    const clientAddress2 = customer?.address2 ?? "";
    const clientCity = customer?.city ?? "";
    const clientState = customer?.state ?? "";
    const clientZip = customer?.zip ?? "";

    const jobAddr1Raw = job.address1;
    const jobAddr2Raw = job.address2 ?? "";
    const jobCity = job.city;
    const jobState = customer?.state ?? "";
    const jobZip = job.zip;

    const jobAddressLine1 = jobAddr2Raw ? `${jobAddr2Raw}, ${jobAddr1Raw}` : jobAddr1Raw;
    const jobAddressLine2 = "";

    const stagePowdercoatColourId = (jobStage?.defaults as any)?.powdercoatColourId ?? null;
    const stagePowdercoat =
      typeof stagePowdercoatColourId === "number"
        ? await getColourFromID(stagePowdercoatColourId)
        : undefined;

    const balconyColour = normaliseBalconyColor(stagePowdercoat);
    balconyColour.name = stagePowdercoat?.name ?? balconyColour.name;
    balconyColour.hex = Number(stagePowdercoat?.hex) ?? balconyColour.hex;

    const dpi = 300;
    const scale = 2;
    const plotOffset = { x: 0, y: 0 };
    const dateString = new Date().toLocaleDateString("en-AU");

    const a3Base = {
      dpi,
      scale,
      clientName,
      clientAddress1,
      clientAddress2,
      clientCity,
      clientState,
      clientZip,

      jobNumber: job.job_number.toString(),

      jobAddress1: jobAddressLine1,
      jobAddress2: jobAddressLine2,
      jobCity,
      jobState,
      jobZip,
      jobStage: jobStage.stage,

      dropColour: balconyColour,
      dropColourHex: Number(stagePowdercoat?.hex) ?? 0xaaaaaa,

      dateString,
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
      <PrintClient
        expectedViewerIds={balconiesForStage.map((b) => `${jobIdNum}-${stageNo}-${b.id}`)}
      >

        {/* IMPORTANT: render all balconies ONCE; ShopDrawingClient handles 1-per-page */}
        <div className="print-root">
          <ShopDrawingClient
            a3Base={a3Base}
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
      </PrintClient>
    );
  } catch (e) {
    if (e instanceof Error) {
      Sentry.captureException(e);
      throw e;
    }
    throw e;
  }
}
