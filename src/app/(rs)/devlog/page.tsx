import { listPublishedDevlogEntries } from "@/lib/devlog/devlog.queries"; // or devlog.queries if you kept that name

function groupByType<T extends { type: string }>(rows: T[]) {
  const releases: T[] = [];
  const issues: T[] = [];
  const features: T[] = [];

  for (const r of rows) {
    if (r.type === "release") releases.push(r);
    else if (r.type === "issue") issues.push(r);
    else if (r.type === "feature") features.push(r);
  }

  return { releases, issues, features };
}

export default async function DevlogPage() {
  // "Updated recently" view: use your existing ordering (pinned, updatedAt desc)
  const all = await listPublishedDevlogEntries(200);

  const { releases, issues, features } = groupByType(all);

//   console.log(await listDevlogEntriesForAdmin());

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Development Log</h1>
        <p className="text-sm opacity-70">
          Release notes, known issues, and planned features.
        </p>
      </div>

      {/* Recently Updated */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Recently Updated</h2>
        <div className="space-y-2">
          {all.slice(0, 10).map((e) => (
            <article key={e.id} className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                  {e.type}
                </span>
                {e.version ? (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                    v{e.version}
                  </span>
                ) : null}
                <span className="text-sm font-medium">{e.title}</span>
              </div>

              {e.summary ? (
                <p className="mt-2 text-sm opacity-80">{e.summary}</p>
              ) : null}


                {e.links?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {e.links.map((l: any) => (
                    <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="text-[12px] underline opacity-80 hover:opacity-100">
                        {l.label}
                    </a>
                    ))}
                </div>
                ) : null}
            </article>
          ))}
        </div>
      </section>

      {/* Release Notes */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Release Notes</h2>
        <div className="space-y-2">
          {releases.length === 0 ? (
            <p className="text-sm opacity-70">No release notes yet.</p>
          ) : (
            releases.slice(0, 50).map((e) => (
              <article key={e.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  {e.version ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                      v{e.version}
                    </span>
                  ) : null}
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                {e.summary ? (
                  <p className="mt-2 text-sm opacity-80">{e.summary}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      {/* Known Issues */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Known Issues</h2>
        <div className="space-y-2">
          {issues.length === 0 ? (
            <p className="text-sm opacity-70">No known issues listed.</p>
          ) : (
            issues.slice(0, 50).map((e) => (
              <article key={e.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                    P{e.priority}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                    {e.status}
                  </span>
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                {e.summary ? (
                  <p className="mt-2 text-sm opacity-80">{e.summary}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      {/* Planned Features */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Planned Features</h2>
        <div className="space-y-2">
          {features.length === 0 ? (
            <p className="text-sm opacity-70">No planned features yet.</p>
          ) : (
            features.slice(0, 50).map((e) => (
              <article key={e.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                    {e.status}
                  </span>
                  {e.targetVersion ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-black/10">
                      target {e.targetVersion}
                    </span>
                  ) : null}
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                {e.summary ? (
                  <p className="mt-2 text-sm opacity-80">{e.summary}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
