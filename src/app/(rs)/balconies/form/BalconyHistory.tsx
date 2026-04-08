// Filename: app/(rs)/balconies/form/BalconyHistory.tsx

import {
  getBalconyRevisions,
  getBalconyById,
} from "@/lib/queries/getBalcony";
import { BalconyRevisionRevertButton } from "@/app/(rs)/balconies/form/BalconyRevisionRevertButton";

type Props = {
  balconyId: number;
};

const foundationFieldsToCheck = [
  "type",
  "length",
  "angle",
  "offset",
  "sections",
  "height",
] as const;

const postFieldsToCheck = [
  "type",
  "length",
  "angle",
  "reversed",
  "height",
] as const;


// Snapshot shape (matches what we store in balcony_revisions.data)
type BalconySnapshot = {
  drop?: string;
  balconyNo?: string;
  color?: unknown;
  foundationArray?: unknown[];
  postsArray?: unknown[];
  heightMm?: number | null;
  panelMm?: number | null;
  fflMm?: number | null;
  ffl_use?: boolean | null;
  design?: string | null;
  anchorage?: string | null;
  toprail?: string | null;
  infill?: string | null;
  metadata?: unknown;
  notes?: string | null;
  version?: number;
  isDeleted?: boolean;
};

type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

// Render values nicely as strings
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }

  return String(value);
}

function diffArray<T extends { id: number }>(
  oldArr: T[] = [],
  newArr: T[] = [],
  fields: readonly string[],
  label: "Foundation" | "Post"
) {
  const changes: FieldChange[] = [];

  const oldMap = new Map(oldArr.map((f) => [f.id, f]));
  const newMap = new Map(newArr.map((f) => [f.id, f]));

  // Detect removed
  for (const [id, oldItem] of oldMap.entries()) {
    if (!newMap.has(id)) {
      changes.push({
        field: `${label} ${id}`,
        oldValue: "(removed)",
        newValue: "",
      });
    }
  }

  // Detect added + changed
  for (const [id, newItem] of newMap.entries()) {
    const oldItem = oldMap.get(id);

    // Added
    if (!oldItem) {
      changes.push({
        field: `${label} ${id}`,
        oldValue: "",
        newValue: "(added)",
      });
      continue;
    }

    // Modified fields
    for (const f of fields) {
      const oldVal = (oldItem as any)[f];
      const newVal = (newItem as any)[f];
      if (oldVal !== newVal) {
        changes.push({
          field: `${label} ${id} – ${f}`,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }

  return changes;
}


// Compute changes between a snapshot (rev.data) and the current balcony row
function diffSnapshotToCurrent(
  snapshot: BalconySnapshot,
  current: BalconySnapshot
): FieldChange[] {
  const changes: FieldChange[] = [];

  // 1) Basic scalar fields
  const fieldsToCheck: { key: keyof BalconySnapshot; label: string }[] = [
    { key: "drop", label: "Drop" },
    { key: "balconyNo", label: "Balcony" },
    { key: "heightMm", label: "Height" },
    { key: "panelMm", label: "Panel" },
    { key: "fflMm", label: "FFL offset" },
    { key: "ffl_use", label: "Use FFL" },
    { key: "design", label: "Design" },
    { key: "anchorage", label: "Anchorage" },
    { key: "toprail", label: "Toprail" },
    { key: "infill", label: "Infill" },
    { key: "isDeleted", label: "Deleted" },
  ];

  for (const { key, label } of fieldsToCheck) {
    const oldVal = snapshot[key];
    const newVal = current[key];
    if (oldVal !== newVal) {
      changes.push({
        field: label,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  // 2) Foundation array differences
  changes.push(
    ...diffArray(
      snapshot.foundationArray as any[],
      current.foundationArray as any[],
      foundationFieldsToCheck,
      "Foundation"
    )
  );

  // 3) Post array differences
  changes.push(
    ...diffArray(
      snapshot.postsArray as any[],
      current.postsArray as any[],
      postFieldsToCheck,
      "Post"
    )
  );

  return changes;
}


export default async function BalconyHistory({ balconyId }: Props) {
  // Get current balcony + all its revisions
  const [currentBalcony, revisions] = await Promise.all([
    getBalconyById(balconyId),
    getBalconyRevisions(balconyId),
  ]);

  if (!currentBalcony) {
    return null; // Shouldn't happen if the form is visible
  }

  if (!revisions.length) {
    return (
      <div className="mt-8 sm:px-8">
        <h3 className="text-lg font-semibold mb-2">Revision history</h3>
        <p className="text-sm text-muted-foreground">
          No revisions yet for this balcony. History will appear after the
          first edit.
        </p>
      </div>
    );
  }

  // Turn current balcony into comparable snapshot shape
  const currentSnapshot: BalconySnapshot = {
    drop: currentBalcony.drop,
    balconyNo: currentBalcony.balconyNo,
    color: currentBalcony.color,
    foundationArray: currentBalcony.foundationArray,
    postsArray: currentBalcony.postsArray,
    heightMm: currentBalcony.heightMm,
    panelMm: currentBalcony.panelMm,
    fflMm: currentBalcony.fflMm,
    ffl_use: currentBalcony.ffl_use,
    design: currentBalcony.design,
    anchorage: currentBalcony.anchorage,
    toprail: currentBalcony.toprail,
    infill: currentBalcony.infill,
    metadata: currentBalcony.metadata,
    notes: currentBalcony.notes,
    version: currentBalcony.version,
    isDeleted: currentBalcony.isDeleted,
  };

  return (
    <div className="mt-8 sm:px-8">
      <h3 className="text-lg font-semibold mb-2">Revision history</h3>

      <div className="border rounded-md overflow-hidden text-sm">
        <div className="grid grid-cols-5 font-semibold bg-muted px-3 py-2">
          <span>Version</span>
          <span>Changed by</span>
          <span>Changed at</span>
          <span>Changes vs current</span>
          <span className="text-right pr-2">Actions</span>
        </div>

        {revisions.map((rev) => {
          const snapshot = (rev.data || {}) as BalconySnapshot;
          const changes = diffSnapshotToCurrent(snapshot, currentSnapshot);

          let summary: string;

          if (!rev.data) {
            summary = "Snapshot of balcony state";
          } else if (changes.length === 0) {
            summary = "Same as current";
          } else {
            const parts = changes.slice(0, 4).map((ch) => {
              const oldStr = formatValue(ch.oldValue);
              const newStr = formatValue(ch.newValue);
              return `${ch.field}: ${oldStr} → ${newStr}`;
            });

            summary = parts.join(" • ");
          }

          return (
            <div
              key={rev.id}
              className="grid grid-cols-5 border-t px-3 py-2 items-center gap-2"
            >
              <span>{rev.version}</span>
              <span>{rev.changedBy ?? "Unknown"}</span>
              <span>
                {rev.changedAt
                  ? rev.changedAt.toLocaleString()
                  : "Unknown"}
              </span>
              <span className="truncate" title={summary}>
                {summary}
              </span>
              <span className="flex justify-end">
                <BalconyRevisionRevertButton
                  revisionId={rev.id}
                  disabled={changes.length === 0}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
