import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db"; // adjust if your db import path differs
import { devlogEntries, devlogLinks } from "@/db/schema"; // adjust to where you defined the tables


type DevlogType = "release" | "issue" | "feature";
type DevlogStatus = "draft" | "published" | "archived";

export async function listPublishedDevlogEntries(limit = 50) {
  const entries = await db
    .select()
    .from(devlogEntries)
    .where(and(isNotNull(devlogEntries.publishedAt), eq(devlogEntries.status, "published")))
    .orderBy(desc(devlogEntries.isPinned), desc(devlogEntries.updatedAt))
    .limit(limit);

  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id);

  const links = await db
    .select()
    .from(devlogLinks)
    .where(inArray(devlogLinks.entryId, entryIds))
    .orderBy(devlogLinks.entryId, devlogLinks.sortOrder, devlogLinks.id);

  const linksByEntry = new Map<number, typeof links>();
  for (const l of links) {
    const arr = linksByEntry.get(l.entryId) ?? [];
    arr.push(l);
    linksByEntry.set(l.entryId, arr);
  }

  return entries.map((e) => ({ ...e, links: linksByEntry.get(e.id) ?? [] }));
}


export async function createDevlogEntry() {
  const [row] = await db
    .insert(devlogEntries)
    .values({
      type: "release",
      title: "Initial Devlog Entry",
      summary: "First entry to validate the devlog system end-to-end.",
      body: "This is a seeded entry created during setup.",
      status: "published",
      publishedAt: new Date(),
      version: "0.0.1",
      priority: 2,
      isPinned: true,
    })
    .returning();

  return row;
}


export async function listDevlogEntriesForAdmin(input?: {
  limit?: number;
  type?: DevlogType;
  status?: DevlogStatus;
  pinned?: boolean;
}) {
  const limit = input?.limit ?? 300;

  const whereParts = [];
  if (input?.type) whereParts.push(eq(devlogEntries.type, input.type));
  if (input?.status) whereParts.push(eq(devlogEntries.status, input.status));
  if (typeof input?.pinned === "boolean") whereParts.push(eq(devlogEntries.isPinned, input.pinned));

  const entries = await db
    .select()
    .from(devlogEntries)
    .where(whereParts.length ? and(...whereParts) : undefined)
    .orderBy(
      desc(devlogEntries.isPinned),      // pinned first
      desc(devlogEntries.updatedAt),     // then latest updated
      desc(devlogEntries.id)             // tie-breaker
    )
    .limit(limit);

  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id);

  const links = await db
    .select()
    .from(devlogLinks)
    .where(inArray(devlogLinks.entryId, entryIds))
    .orderBy(devlogLinks.entryId, devlogLinks.sortOrder, devlogLinks.id);

  const linksByEntry = new Map<number, typeof links>();
  for (const l of links) {
    const arr = linksByEntry.get(l.entryId) ?? [];
    arr.push(l);
    linksByEntry.set(l.entryId, arr);
  }

  return entries.map((e) => ({ ...e, links: linksByEntry.get(e.id) ?? [] }));
}
