"use server";

import { db } from "@/db";
import { devlogEntries, devlogLinks } from "@/db/schema";
import { createDevlogEntry } from "@/lib/devlog/devlog.queries";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** =========================
 *  Create
 *  ========================= */

export async function createDevlogEntryAction() {
  await createDevlogEntry();

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
}

export async function createDevlogDraftAction() {
  await db.insert(devlogEntries).values({
    type: "release",
    title: "New draft",
    status: "draft",
    priority: 2,
    isPinned: false,
  });

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
}

/** =========================
 *  Update entry
 *  ========================= */

export async function updateDevlogEntryAction(input: {
  id: number;
  type: "release" | "issue" | "feature";
  title: string;
  summary: string | null;
  body: string | null;
  status: "draft" | "published" | "archived";
  priority: number;
  isPinned: boolean;
  version: string | null;
  targetVersion: string | null;
}) {
  const publishedAt =
    input.status === "published" ? new Date() : null;

  await db
    .update(devlogEntries)
    .set({
      type: input.type,
      title: input.title,
      summary: input.summary,
      body: input.body,
      status: input.status,
      priority: input.priority,
      isPinned: input.isPinned,
      version: input.version,
      targetVersion: input.targetVersion,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(devlogEntries.id, input.id));

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
  revalidatePath(`/devlog/admin/${input.id}`);
}

/** =========================
 *  Links
 *  ========================= */

export async function addDevlogLinkAction(input: {
  entryId: number;
  label: string;
  url: string;
  kind: string | null;
  sortOrder: number;
}) {
  await db.insert(devlogLinks).values({
    entryId: input.entryId,
    label: input.label,
    url: input.url,
    kind: input.kind,
    sortOrder: input.sortOrder,
  });

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
  revalidatePath(`/devlog/admin/${input.entryId}`);
}

export async function deleteDevlogLinkAction(input: {
  entryId: number;
  linkId: number;
}) {
  await db
    .delete(devlogLinks)
    .where(
      and(
        eq(devlogLinks.id, input.linkId),
        eq(devlogLinks.entryId, input.entryId)
      )
    );

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
  revalidatePath(`/devlog/admin/${input.entryId}`);
}

/** =========================
 *  Quick admin actions
 *  ========================= */

export async function toggleDevlogPinnedAction(input: {
  id: number;
  isPinned: boolean;
}) {
  await db
    .update(devlogEntries)
    .set({ isPinned: input.isPinned, updatedAt: new Date() })
    .where(eq(devlogEntries.id, input.id));

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
  revalidatePath(`/devlog/admin/${input.id}`);
}

export async function setDevlogStatusAction(input: {
  id: number;
  status: "draft" | "published" | "archived";
}) {
  await db
    .update(devlogEntries)
    .set({
      status: input.status,
      publishedAt: input.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(devlogEntries.id, input.id));

  revalidatePath("/devlog");
  revalidatePath("/devlog/admin");
  revalidatePath(`/devlog/admin/${input.id}`);
}
