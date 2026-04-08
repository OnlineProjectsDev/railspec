// /app/editor/balcony/[editorBalconyId]/page.tsx
import * as Sentry from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { jobs, jobStages } from "@/db/schema";
import EditorHydratedClient from "@/components/EditorHydratedClient";
import { loadOrInitializeBalconyEditorState } from "@/lib/editor-persistence/loadOrInitializeBalconyEditorState";
import { hydrateRootStateFromPersisted } from "@/lib/editor-persistence/initializeEditorState";
import { buildEditorUiHydrationState } from "@/lib/editor-persistence/buildUiHydrationState";
import { BackButton } from "@/components/BackButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ editorBalconyId: string }>;
}) {
  const { editorBalconyId } = await params;
  const editorBalconyIdNum = Number(editorBalconyId);

  if (!Number.isFinite(editorBalconyIdNum)) {
    return { title: "Editor" };
  }

  try {
    const loaded = await loadOrInitializeBalconyEditorState(editorBalconyIdNum);

    const drop = loaded.balcony.drop;
    const balconyNo = loaded.balcony.balconyNo;

    const title =
      drop && balconyNo
        ? `Drop ${drop} — Balcony ${balconyNo}`
        : "Editor";

    return {
      title,
    };
  } catch {
    return { title: "Editor" };
  }
}

export default async function EditorBalconyPage({
  params,
}: {
  params: Promise<{ editorBalconyId: string }>;
}) {
  try {
    const { editorBalconyId } = await params;
    const editorBalconyIdNum = Number(editorBalconyId);

    if (!Number.isFinite(editorBalconyIdNum)) {
      return (
        <div className="p-4">
          <h2 className="text-2xl mb-2">Invalid editor balcony ID.</h2>
          <BackButton title="Go Back" variant="default" />
        </div>
      );
    }

    const loaded = await loadOrInitializeBalconyEditorState(editorBalconyIdNum);

    const routeRows = await db
      .select({
        jobNumber: jobs.job_number,
        stageNumber: jobStages.stage,
      })
      .from(jobStages)
      .innerJoin(jobs, eq(jobs.id, jobStages.jobId))
      .where(
        and(
          eq(jobStages.id, loaded.balcony.jobStageId),
          eq(jobs.id, loaded.balcony.jobId)
        )
      )
      .limit(1);

    const routeInfo = routeRows[0];

    if (!routeInfo) {
      throw new Error(`Could not resolve job/stage route for editor balcony ${editorBalconyIdNum}.`);
    }

    const initialEditorState = hydrateRootStateFromPersisted({
      persisted: loaded.persisted,
      uiState: {
        ...buildEditorUiHydrationState(),
        editorContext: "project",
      },
    });

    //     console.log("loaded.persisted.editorConfig.color", loaded.persisted.editorConfig.color)
    // console.log("initialEditorState.color", initialEditorState.color)

    const toolbarTitle = `Drop ${loaded.balcony.drop} — Balcony ${loaded.balcony.balconyNo}`;

    return (
      <div className="fixed inset-0 overflow-hidden bg-background">
        <EditorHydratedClient
          editorBalconyId={loaded.balcony.id}
          jobId={loaded.balcony.jobId}
          jobStageId={loaded.balcony.jobStageId}
          jobNumber={routeInfo.jobNumber}
          stageNumber={routeInfo.stageNumber}
          initialEditorState={initialEditorState}
          initialVersion={loaded.persisted.version}
          toolbarTitle={toolbarTitle}
        />
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