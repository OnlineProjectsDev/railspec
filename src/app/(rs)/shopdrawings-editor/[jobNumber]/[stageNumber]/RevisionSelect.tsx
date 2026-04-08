// /app/(rs)/shopdrawings-editor/[jobNumber]/[stageNumber]/RevisionSelect.tsx
"use client"

type RevisionOption = {
  id: number
  revisionCode: string
}

type Props = {
  action: string
  currentRevisionCode: string
  revisions: RevisionOption[]
}

export default function RevisionSelect({
  action,
  currentRevisionCode,
  revisions,
}: Props) {
  return (
    <form action={action} className="ml-auto flex items-center gap-2">
      <label htmlFor="revision" className="text-sm text-muted-foreground">
        Revision
      </label>
      <select
        id="revision"
        name="revision"
        value={currentRevisionCode}
        className="h-9 rounded-md border bg-white px-3 text-sm"
        suppressHydrationWarning
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {revisions.map((rev) => (
          <option key={rev.id} value={rev.revisionCode}>
            Rev {rev.revisionCode}
          </option>
        ))}
      </select>
    </form>
  )
}