import { db } from "@/db";
import { devlogEntries, devlogLinks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateDevlogEntryAction, addDevlogLinkAction, deleteDevlogLinkAction } from "@/lib/devlog/devlog.actions";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

export default async function DevlogAdminEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  // ─────────────────────────────────────────────
  // Auth guard: admins + managers only
  // ─────────────────────────────────────────────
  const { getUser, getPermission } = getKindeServerSession();

  const user = await getUser();
  if (!user) redirect("/");

  const admin = await getPermission("admin");
  const manager = await getPermission("manager");

  if (!(admin?.isGranted || manager?.isGranted)) {
    redirect("/devlog");
  }

  // ─────────────────────────────────────────────
  // Turbopack-safe params
  // ─────────────────────────────────────────────
  const { id: idParam } = await props.params;
  const id = Number(idParam);

  const [row] = await db
    .select()
    .from(devlogEntries)
    .where(eq(devlogEntries.id, id))
    .limit(1);

  const links = await db
    .select()
    .from(devlogLinks)
    .where(eq(devlogLinks.entryId, id))
    .orderBy(asc(devlogLinks.sortOrder), asc(devlogLinks.id));

  if (!row) {
    return <div className="p-6">Not found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Edit Devlog Entry</h1>
        <p className="text-sm opacity-70">ID: {row.id}</p>
      </div>

      <form
        action={async (formData) => {
          "use server";

          await updateDevlogEntryAction({
            id: row.id,
            type: formData.get("type") as any,
            title: String(formData.get("title") ?? ""),
            summary: String(formData.get("summary") ?? "") || null,
            body: String(formData.get("body") ?? "") || null,
            status: formData.get("status") as any,
            priority: Number(formData.get("priority") ?? 2),
            isPinned: formData.get("isPinned") === "on",
            version: String(formData.get("version") ?? "") || null,
            targetVersion: String(formData.get("targetVersion") ?? "") || null,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <div className="text-[11px] font-medium opacity-70">Type</div>
            <select
              name="type"
              defaultValue={row.type}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            >
              <option value="release">release</option>
              <option value="issue">issue</option>
              <option value="feature">feature</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-[11px] font-medium opacity-70">Status</div>
            <select
              name="status"
              defaultValue={row.status}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>

          <label className="col-span-2 space-y-1">
            <div className="text-[11px] font-medium opacity-70">Title</div>
            <input
              name="title"
              defaultValue={row.title}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
          </label>

          <label className="col-span-2 space-y-1">
            <div className="text-[11px] font-medium opacity-70">Summary</div>
            <input
              name="summary"
              defaultValue={row.summary ?? ""}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
          </label>

          <label className="col-span-2 space-y-1">
            <div className="text-[11px] font-medium opacity-70">Body</div>
            <textarea
              name="body"
              defaultValue={row.body ?? ""}
              rows={8}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
          </label>

          <label className="space-y-1">
            <div className="text-[11px] font-medium opacity-70">Priority</div>
            <input
              name="priority"
              type="number"
              min={0}
              max={10}
              defaultValue={row.priority ?? 2}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              name="isPinned"
              type="checkbox"
              defaultChecked={!!row.isPinned}
              suppressHydrationWarning
            />
            <span className="text-sm">Pinned</span>
          </label>

          <label className="space-y-1">
            <div className="text-[11px] font-medium opacity-70">Version (release)</div>
            <input
              name="version"
              defaultValue={row.version ?? ""}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
          </label>

          <label className="space-y-1">
            <div className="text-[11px] font-medium opacity-70">Target Version (feature)</div>
            <input
              name="targetVersion"
              defaultValue={row.targetVersion ?? ""}
              className="w-full rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
          </label>
        </div>

        <button
          type="submit"
          className="px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer"
          suppressHydrationWarning
        >
          Save
        </button>
      </form>

      <section className="pt-6 space-y-3">
        <h2 className="text-base font-semibold">Instructional Links</h2>

        {links.length === 0 ? (
          <p className="text-sm opacity-70">No links yet.</p>
        ) : (
          <div className="space-y-2">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.label}</div>
                  <div className="text-[12px] opacity-70 truncate">{l.url}</div>
                  <div className="text-[11px] opacity-70">
                    {l.kind ? `kind: ${l.kind}` : "kind: (none)"} · sort: {l.sortOrder}
                  </div>
                </div>

                <form
                  action={async () => {
                    "use server";
                    await deleteDevlogLinkAction({ entryId: row.id, linkId: l.id });
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-md text-[11px] font-medium bg-black/10 hover:bg-black/15"
                    suppressHydrationWarning
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border p-3">
          <div className="text-[11px] font-medium opacity-70 mb-2">Add link</div>

          <form
            action={async (formData) => {
              "use server";

              await addDevlogLinkAction({
                entryId: row.id,
                label: String(formData.get("label") ?? ""),
                url: String(formData.get("url") ?? ""),
                kind: String(formData.get("kind") ?? "") || null,
                sortOrder: Number(formData.get("sortOrder") ?? 0),
              });
            }}
            className="grid grid-cols-4 gap-2"
          >
            <input
              name="label"
              placeholder="Label"
              className="col-span-1 rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
            <input
              name="url"
              placeholder="https://..."
              className="col-span-2 rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
            <input
              name="kind"
              placeholder="kind (optional)"
              className="col-span-1 rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="col-span-1 rounded-md border px-3 py-2 text-sm"
              suppressHydrationWarning
            />

            <div className="col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer"
                suppressHydrationWarning
              >
                Add link
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
