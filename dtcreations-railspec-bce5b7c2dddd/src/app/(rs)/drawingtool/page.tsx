// src/app/(rs)/drawingtool/page.tsx
import * as Sentry from "@sentry/nextjs";

import { BackButton } from "@/components/BackButton";
import { DropAnalyser } from "@/app/(rs)/drawingtool/canvas/DropAnalyser";
import { SafeHydration } from "./canvas/DropAnalyserSafetyHydration";
import {
  BalconySelector,
  type BalconyOption,
} from "@/app/(rs)/drawingtool/BalconySelector";

import { getJob } from "@/lib/queries/getJob";
import { getCustomer } from "@/lib/queries/getCustomer";
import { getJobStageByJobAndStage } from "@/lib/queries/getJobStage";
import { getBalconiesForStage } from "@/lib/queries/getBalcony";
import { PostsType } from "@/app/(rs)/drawingtool/canvas/DropAnalyser";


export const metadata = {
  title: "Drawing tool",
};

export default async function DrawingToolPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  try {
    const { jobId, stage, balconyId } = await searchParams;

    // -----------------------------
    // 1) Validate required params
    // -----------------------------
    if (!jobId || !stage) {
      return (
        <div className="p-4">
          <h2 className="text-2xl mb-2">
            jobId and stage are required to load the drawing tool.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </div>
      );
    }

    const jobIdNum = Number(jobId);
    const stageNo = Number(stage);

    if (!Number.isFinite(jobIdNum) || !Number.isFinite(stageNo)) {
      return (
        <div className="p-4">
          <h2 className="text-2xl mb-2">
            jobId and stage must be valid numbers.
          </h2>
          <BackButton title="Go Back" variant="default" />
        </div>
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
            No balconies found for Job #{job.job_number}, Stage{" "}
            {jobStage.stage}.
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create a balcony for this stage first, then open the drawing tool.
          </p>
          <BackButton title="Go Back" variant="default" />
        </div>
      );
    }

    const isNumberedPost = (p: { type: string }) =>
      !["S", "G", "NP", "EC", "WC"].includes(p.type);

    const countNumberedPosts = (postsArray: PostsType[]) =>
      postsArray.reduce((n, p) => n + (isNumberedPost(p) ? 1 : 0), 0);

    const balconiesWithPostStart = (() => {
      let running = 1; // first post_id in the whole stage
      return balconiesForStage.map((b) => {
        const postIdStart = running;

        const sourceForCounting =
          (b.postsArrayRaw as PostsType[] | undefined) ??
          (b.postsArray as PostsType[] | undefined) ??
          [];

        const numberedCount = countNumberedPosts(sourceForCounting);

        running += numberedCount;
        return { ...b, postIdStart };
      });
    })();

    // -----------------------------
    // 5) Decide which balcony is selected
    // -----------------------------
    let selectedBalcony =
      balconyId != null
        ? balconiesWithPostStart.find((b) => b.id === Number(balconyId))
        : undefined;

    if (!selectedBalcony) selectedBalcony = balconiesWithPostStart[0];

    const selectedBalconyId = selectedBalcony.id;

    // Build options for the selector (with href + isActive)
    const balconyOptions: BalconyOption[] = balconiesForStage.map((b) => ({
      id: b.id,
      label: `Drop ${b.drop} – Balcony ${b.balconyNo}`,
      href: `/drawingtool?jobId=${jobIdNum}&stage=${stageNo}&balconyId=${b.id}`,
      isActive: b.id === selectedBalconyId,
    }));

    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
            {/* Header / context */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Drawing tool</h1>
                <p className="text-sm text-muted-foreground">
                  Job #{job.job_number} – Stage {jobStage.stage}
                  {customer && (
                    <>
                      {" "}
                      – {customer.company} ({customer.firstName}{" "}
                      {customer.lastName})
                    </>
                  )}
                </p>
              </div>
              <BackButton title="Back to previous page" variant="outline" />
            </div>

            {/* Balcony selector (drag–reorderable) */}
            <BalconySelector
                options={balconyOptions}
                jobId={job.id}
                jobStageId={jobStage.id}
                stageNo={jobStage.stage}   // 👈 add this
            />

            {/* Selected balcony info */}
            <div className="text-sm text-muted-foreground">
              Currently selected:{" "}
              <span className="font-medium">
                Drop {selectedBalcony.drop} – Balcony{" "}
                {selectedBalcony.balconyNo}
              </span>
            </div>

            {/* Drawing tool itself (unchanged for now) */}
            <SafeHydration>
              <DropAnalyser
                balcony={selectedBalcony}
                jobNumber={job.job_number}
                stageNo={jobStage.stage}
                postIdStart={selectedBalcony.postIdStart}
                maxPostSpacing={job.max_post_spacing ?? 1280}
                windload={jobStage.defaults.wind_load}
              />
            </SafeHydration>
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
