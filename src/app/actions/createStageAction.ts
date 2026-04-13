// actions/createStageAction.ts
"use server";

import { actionClient } from "@/lib/safe-action";
import { z } from "zod";
import { createStageOnly } from "@/db/helpers/create-stage";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

const schema = z.object({
  jobId: z.number().int().positive(),
  newStage: z.number().int().min(2).max(8),
});

export const createStageAction = actionClient
  .metadata({ actionName: "createStageAction" })
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    if (!(await isAuthenticated())) redirect("/login");

    const res = await createStageOnly(parsedInput.jobId, parsedInput.newStage);

    return {
      message: `Stage ${res.newStage} created for Job ${res.jobId}.`,
      stageId: res.newStageId,
    };
  });
