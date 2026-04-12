// src/actions/createNextStageAction.ts
"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { createNextStageForJob } from "@/db/helpers/jobStageDefaults";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

const createNextStageSchema = z.object({
  jobId: z.number().int().positive(),
  currentStage: z.number().int().min(1),
});

export const createNextStageAction = actionClient
  .metadata({ actionName: "createNextStageAction" })
  .schema(createNextStageSchema)
  .action(async ({ parsedInput }) => {
    const { isAuthenticated } = getKindeServerSession();
    if (!(await isAuthenticated())) redirect("/login");

    const res = await createNextStageForJob(
      parsedInput.jobId,
      parsedInput.currentStage
    );

    return {
      message: `Stage ${res.newStage} created from Stage ${res.fromStage} for Job #${res.jobId}.`,
    };
  });
