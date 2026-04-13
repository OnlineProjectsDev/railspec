import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

import { listDevlogEntriesForAdmin } from "@/lib/devlog/devlog.queries";
import {
  createDevlogDraftAction,
  setDevlogStatusAction,
  toggleDevlogPinnedAction,
} from "@/lib/devlog/devlog.actions";

import Link from "next/link";

function badgeClass(kind: "neutral" | "good" | "warn" | "bad") {
  if (kind === "good") return "bg-green-500/10 text-green-700 border-green-500/20";
  if (kind === "warn") return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (kind === "bad") return "bg-red-500/10 text-red-700 border-red-500/20";
  return "bg-black/5 text-black/70 border-black/10";
}

function TypeBadge({ type }: { type: string }) {
  const kind = type === "release" ? "good" : type === "issue" ? "bad" : "warn";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${badgeClass(kind)}`}
      suppressHydrationWarning
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const kind = status === "published" ? "good" : status === "draft" ? "neutral" : "warn";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${badgeClass(kind)}`}
      suppressHydrationWarning
    >
      {status}
    </span>
  );
}

function hrefWith(base: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

function FilterLink({
  label,
  href,
  active,
  removable = true,
}: {
  label: string;
  href: string;
  active: boolean;
  removable?: boolean;
}) {
  return (
    <a
      href={href}
      className={[
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] transition-colors",
        active
          ? "bg-black/10 border-black/20 text-black font-medium"
          : "bg-transparent border-black/10 text-black/70 hover:bg-black/5",
      ].join(" ")}
      suppressHydrationWarning
    >
      <span>{label}</span>

      {active && removable ? (
        <span className="ml-1 opacity-60 hover:opacity-100">×</span>
      ) : null}
    </a>
  );
}




export default async function DevlogAdminPage(props: {
  searchParams?: Promise<{ type?: string; status?: string; pinned?: string }>;
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
  // Safe async searchParams (Turbopack fix)
  // ─────────────────────────────────────────────
  const sp = (await props.searchParams) ?? {};

    const type = (sp.type as "release" | "issue" | "feature" | undefined) ?? undefined;
    const status = (sp.status as "draft" | "published" | "archived" | undefined) ?? undefined;
    const pinned = sp.pinned === "1" ? true : sp.pinned === "0" ? false : undefined;

    const rows = await listDevlogEntriesForAdmin({
    limit: 300,
    type,
    status,
    pinned,
    });

  const filtered = rows.filter((r) => {
    if (type && r.type !== type) return false;
    if (status && r.status !== status) return false;
    if (pinned !== undefined && r.isPinned !== pinned) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Devlog Admin</h1>
          <p className="text-sm opacity-70">Manage releases, known issues, and planned features.</p>
        </div>

        <form action={createDevlogDraftAction}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer"
            suppressHydrationWarning
          >
            <span className="flex-1 text-left">New entry</span>
          </button>
        </form>
      </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {/* All (clears everything) */}
        <FilterLink
            label="All"
            href="/devlog/admin"
            active={!type && !status && pinned === undefined}
            removable={false}
        />

        <span className="opacity-50">|</span>

        {/* Pinned toggle */}
        <FilterLink
            label="Pinned"
            active={pinned === true}
            href={
            pinned === true
                ? hrefWith("/devlog/admin", { type, status }) // remove pinned
                : hrefWith("/devlog/admin", { type, status, pinned: "1" })
            }
        />

        <span className="opacity-50">|</span>

        {/* Status toggles */}
        <FilterLink
            label="Draft"
            active={status === "draft"}
            href={
            status === "draft"
                ? hrefWith("/devlog/admin", { type, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" }) // remove status
                : hrefWith("/devlog/admin", { type, status: "draft", pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
            }
        />

        <FilterLink
            label="Published"
            active={status === "published"}
            href={
            status === "published"
                ? hrefWith("/devlog/admin", { type, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
                : hrefWith("/devlog/admin", { type, status: "published", pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
            }
        />

        <FilterLink
            label="Archived"
            active={status === "archived"}
            href={
            status === "archived"
                ? hrefWith("/devlog/admin", { type, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
                : hrefWith("/devlog/admin", { type, status: "archived", pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
            }
        />

        <span className="opacity-50">|</span>

        {/* Type toggles */}
        <FilterLink
            label="Releases"
            active={type === "release"}
            href={
            type === "release"
                ? hrefWith("/devlog/admin", { status, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" }) // remove type
                : hrefWith("/devlog/admin", { type: "release", status, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
            }
        />

        <FilterLink
            label="Issues"
            active={type === "issue"}
            href={
            type === "issue"
                ? hrefWith("/devlog/admin", { status, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
                : hrefWith("/devlog/admin", { type: "issue", status, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
            }
        />

        <FilterLink
            label="Features"
            active={type === "feature"}
            href={
            type === "feature"
                ? hrefWith("/devlog/admin", { status, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
                : hrefWith("/devlog/admin", { type: "feature", status, pinned: pinned === undefined ? undefined : pinned ? "1" : "0" })
            }
        />
        </div>


      <div className="rounded-md border overflow-hidden">
        <div
            className="grid items-center gap-3 px-3 py-2 text-[11px] font-medium bg-black/5"
            style={{ gridTemplateColumns: "48px 160px 1fr 120px 180px 260px" }}
        >
            <div>ID</div>
            <div>Type</div>
            <div>Title</div>
            <div>Status</div>
            <div>Updated</div>
            <div className="text-right">Actions</div>
        </div>

        <div className="divide-y">
          {filtered.map((r) => (
           <div
            key={r.id}
            className="grid items-center gap-3 px-3 py-2 text-[12px]"
            style={{ gridTemplateColumns: "48px 160px 1fr 120px 180px 260px" }}
            >
            {/* ID */}
            <div className="opacity-70 tabular-nums">{r.id}</div>

            {/* Type */}
            <div className="flex items-center gap-2 min-w-0">
                <TypeBadge type={r.type} />
                {r.isPinned ? (
                <span className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] bg-black/5 text-black/70 border-black/10">
                    pinned
                </span>
                ) : null}
            </div>

            {/* Title */}
            <div className="min-w-0">
                <Link className="font-medium hover:underline block truncate" href={`/devlog/admin/${r.id}`}>
                {r.title}
                </Link>

                <div className="mt-1 flex items-center gap-2 text-[11px] opacity-70">
                <span className="tabular-nums">P{r.priority ?? 0}</span>
                {r.version ? <span className="tabular-nums">v{r.version}</span> : null}
                {r.targetVersion ? <span className="tabular-nums">target {r.targetVersion}</span> : null}
                </div>
            </div>

            {/* Status */}
            <div>
                <StatusBadge status={r.status} />
            </div>

            {/* Updated */}
            <div className="opacity-70 whitespace-nowrap tabular-nums">
                {new Date(r.updatedAt).toLocaleString()}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 whitespace-nowrap">
                <form
                action={async () => {
                    "use server";
                    await toggleDevlogPinnedAction({ id: r.id, isPinned: !r.isPinned });
                }}
                >
                <button
                    type="submit"
                    className="px-2 py-1 rounded text-[11px] font-medium bg-black/10 hover:bg-black/15"
                    suppressHydrationWarning
                >
                    {r.isPinned ? "Unpin" : "Pin"}
                </button>
                </form>

                <form
                action={async () => {
                    "use server";
                    await setDevlogStatusAction({
                    id: r.id,
                    status: r.status === "published" ? "draft" : "published",
                    });
                }}
                >
                <button
                    type="submit"
                    className="px-2 py-1 rounded text-[11px] font-medium bg-rail-light-blue text-white hover:bg-[#333]"
                    suppressHydrationWarning
                >
                    {r.status === "published" ? "Unpub" : "Pub"}
                </button>
                </form>

                <form
                action={async () => {
                    "use server";
                    await setDevlogStatusAction({ id: r.id, status: "archived" });
                }}
                >
                <button
                    type="submit"
                    className="px-2 py-1 rounded text-[11px] font-medium bg-black/10 hover:bg-black/15"
                    suppressHydrationWarning
                >
                    Archive
                </button>
                </form>
            </div>
            </div>
          ))}

          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-sm opacity-70">No entries found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
