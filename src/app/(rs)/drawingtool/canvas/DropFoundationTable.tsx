'use client'

import type { PostsType, FoundationType, TableEvent, FoundationTableEvent } from "@/app/(rs)/drawingtool/canvas/DropAnalyser"
import { NumberPromptDialogControlled } from "@/components/NumberPromptDialogControlled"


import {
    CellContext,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnFiltersState,
    ColumnDef,
    SortingState,
    getPaginationRowModel,
    getFilteredRowModel,
    getFacetedUniqueValues,
    type RowData,
    // getSortedRowModel,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input"


import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"

import { usePolling } from "@/hooks/usePolling"
import { Button } from "@/components/ui/button"
import { Checkbox } from '@/components/ui/checkbox';


import { MoreHorizontal, TableOfContents } from "lucide-react"
import Filter from "@/components/react-table/Filter"
// import { set } from "zod"
// import { param } from "drizzle-orm"

type Props = {
    data: FoundationType[],
    allowed_spacing: number
    action_trigger: (evt: FoundationTableEvent) => void,
}

type EditorMeta =
  | { kind: 'text' }
  | { kind: 'number'; step?: number; min?: number; max?: number }
  | { kind: 'boolean'}
  | { kind: 'select'; options: Array<{ label: string; value: string }> }
  | { kind: 'readonly' };



// Helper for number coercion
const toNumber = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

type RowType = FoundationType

// declare module '@tanstack/react-table' {
//   interface TableMeta<TData extends RowData> {
//     updateData: (rowIndex: number, columnId: string, value: unknown) => void;
//   }
// }

const wrapAngle = (v: number, min = -180, max = 180) => {
  // bring v into [min, max] by adding/subtracting 360
  while (v < min) v += 360;
  while (v > max) v -= 360;
  return v;
};

function clamp(n: number, min?: number, max?: number) {
  if (min != null) n = Math.max(n, min);
  if (max != null) n = Math.min(n, max);
  return n;
}
const parseNum = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
const decimalsFromStep = (step?: number) =>
  !step || !isFinite(step) ? 0 : (step.toString().split('.')[1]?.length ?? 0);
const roundTo = (n: number, d: number) =>
  d <= 0 ? Math.round(n) : Math.round(n * 10 ** d) / 10 ** d;

function EditorCell({
  value,
  kind,
  commit,
  numberProps,
  fieldId,               // 👈 NEW
}: {
  value: unknown;
  kind: 'text' | 'number' | 'boolean' | 'select' | 'readonly';
  commit: (next: unknown) => void;
  numberProps?: { step?: number; min?: number; max?: number };
  fieldId?: string;       // 👈 NEW
}) {
  const [buf, setBuf] = useState<string>(() => (value ?? '').toString());
  useEffect(() => setBuf((value ?? '').toString()), [value]);

  if (kind === 'readonly') return <span>{String(value ?? '')}</span>;

  if (kind === 'number') {
    const { step, min, max } = numberProps ?? {};
    const decimals = decimalsFromStep(step);

    const commitNumber = () => {
      const v = buf.trim();
      if (v === '') return commit(value);
      let next = parseNum(v);

      // angle-specific wrapping on blur
      if (fieldId === 'angle' && min != null && max != null) {
        next = wrapAngle(next, min, max);
      } else {
        next = clamp(next, min, max);
      }

      commit(roundTo(next, decimals));
    };

    return (
      <Input
        id={fieldId}
        name={fieldId}
        type="number"
        inputMode="decimal"
        step={step ?? 1}      // typing step stays as in meta
        min={min}
        max={max}
        className="text-right tabular-nums"
        value={buf}
        onChange={(e) => setBuf(e.target.value)}
        onKeyDownCapture={(e) => {
          if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
            return;
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const base = parseNum(buf === '' ? '0' : buf);
            const unit = e.shiftKey ? 10 : 1; // Shift = coarse step
            let next = e.key === 'ArrowUp' ? base + unit : base - unit;

            // angle-specific wrapping on arrow stepping
            if (fieldId === 'angle' && min != null && max != null) {
              next = wrapAngle(next, min, max);
            } else {
              next = clamp(next, min, max);
            }

            setBuf(String(roundTo(next, decimals)));
          }
        }}
        onBlur={commitNumber}
      />
    );
  }

  // text
  return (
    <Input
      id={fieldId}
      name={fieldId}
      value={buf}
      onChange={(e) => setBuf(e.target.value)}
      onBlur={() => commit(buf)}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}

// --------------------
// Actions cell (FOUNDATION)
// --------------------
type ActionsCellProps = {
    row: CellContext<FoundationType, unknown>["row"];
    allowed_spacing: number;
    action_trigger: (evt: FoundationTableEvent) => void; // ✅ use your real event type here
  rowCount: number;
};

function ActionsCell({ row, allowed_spacing, action_trigger, rowCount }: ActionsCellProps) {
    const [openMultiply, setOpenMultiply] = useState(false);
    const [openDivide, setOpenDivide] = useState(false);
    const [targetRowIndex, setTargetRowIndex] = useState<number | null>(null);

    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open Menu</span>
            <MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {(() => {
              const idx = row.index;
              const isDisallowedIdx = idx === 0 || idx === rowCount - 1;  // uses parent data length
              const isEdge = !isDisallowedIdx;

              if (!isEdge) return null;

              return (
            <DropdownMenuItem
            onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTargetRowIndex(row.index);
                setOpenMultiply(true);
            }}
            >
            Multiply
            </DropdownMenuItem>
              );
            })()}

            <NumberPromptDialogControlled
            open={openMultiply}
            onOpenChange={setOpenMultiply}
            title="Multiply Section"
            description="How many times?"
            confirmLabel="Submit"
            defaultValue={2}
            onConfirm={(times) => {
                if (targetRowIndex != null) {
                action_trigger({
                    kind: "action",
                    action: "multiply",
                    id: targetRowIndex,
                    times: times - 1,
                } as any);
                }
            }}
            />

            {(() => {
              const idx = row.index;
              const isDisallowedIdx = idx === 0 || idx === rowCount - 1;  // uses parent data length
              const isEdge = !isDisallowedIdx;

              if (!isEdge) return null;

              return (
            <DropdownMenuItem
            onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTargetRowIndex(row.index);
                setOpenDivide(true);
            }}
            >
            Divide
            </DropdownMenuItem>
              );
            })()}

            <NumberPromptDialogControlled
            open={openDivide}
            onOpenChange={setOpenDivide}
            title="Divide Section"
            description="How many times?"
            confirmLabel="Submit"
            defaultValue={Math.ceil(row.original.length / allowed_spacing)}
            onConfirm={(times) => {
                if (targetRowIndex != null) {
                action_trigger({
                    kind: "action",
                    action: "divide",
                    id: targetRowIndex,
                    times: times - 1,
                } as any);
                }
            }}
            />

            {(() => {
              const idx = row.index;
              const isDisallowedIdx = idx === 0 || idx === rowCount - 1 || rowCount < 4;  // uses parent data length
              const showRemove = !isDisallowedIdx;

              if (!showRemove) return null;

              return (
            <DropdownMenuItem
            onSelect={() => {
                console.log("Remove");
                action_trigger({ kind: "action", action: "remove", id: row.index, times: 1 } as any);
            }}
            >
            Remove
                </DropdownMenuItem>
              );
            })()}

            {(() => {
              const angle = Number(row.original.angle ?? 0);
              const is180 = angle === 180;
              const idx = row.index;
              const isDisallowedIdx = idx === 0 || idx === 1 || idx === rowCount - 1; // uses parent data length
              const showJoin = is180 && !isDisallowedIdx;

              if (!showJoin) return null;

              return (
                <DropdownMenuItem
                  onSelect={() => {
                    console.log("Join");
                    action_trigger({ kind: "action", action: "join", id: idx, times: 1 } as any);
                  }}
                >
                  Join Previous
                </DropdownMenuItem>
              );
            })()}

        </DropdownMenuContent>
        </DropdownMenu>
    );
    }


const COLUMN_HEADERS: Array<keyof FoundationType> = [
  "id",
  "length",
  "angle",
  "offset",
  "sections",
  "height",
  "type",
];

const COLUMN_WIDTHS: Partial<Record<keyof FoundationType, number>> = {
  length: 400,
  angle: 450,
  offset: 450,
  sections: 250,
  height: 250,
  type: 100,
};

const EDITORS: Record<string, EditorMeta> = {
  id: { kind: "number", min: 1, step: 1 },
  length: { kind: "number", min: 0, step: 0.1 },
  angle: { kind: "number", min: -180, max: 180, step: 0.1 },
  offset: { kind: "number", min: -200, max: 200, step: 0.1 },
  reversed: { kind: "boolean" },
  height: { kind: "number", step: 1 },
  type: {
    kind: "select",
    options: [
      { label: "Floor", value: "F" },
      { label: "Space", value: "S" },
      { label: "Wall", value: "W" },
    ],
  },
};


export default function DropFoundationTable({data, allowed_spacing=1280, action_trigger}:Props){
    // const router = useRouter()

    const searchParams = useSearchParams()

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    const [sorting, setSorting] = useState<SortingState>([
        {
            id: "id",
            desc: false, // flase for ascending
        }
    ])

    // usePolling(searchParams.get("searchText"),300000)

    // const pageParam = searchParams.get("page");
    // const pageIndex = useMemo(() => {
    //     return pageParam ? parseInt(pageParam) - 1 : 0;
    // }, [pageParam]);

    

    const columnHelper = createColumnHelper<RowType>()


    

    // --------------------
    // Columns
    // --------------------
    const columns = useMemo(() => {
  const colHelper = createColumnHelper<RowType>();

  const cols = [
    colHelper.display({
      id: "actions",
      header: () => <TableOfContents />,
      cell: (ctx) => (
        <ActionsCell
          row={ctx.row}
          allowed_spacing={allowed_spacing}
          action_trigger={action_trigger}
          rowCount={ctx.table.getRowModel().rows.length}
        />
      ),
    }),

    ...COLUMN_HEADERS.map((columnName) =>
      colHelper.accessor(columnName, {
        id: columnName,
        size: COLUMN_WIDTHS[columnName] ?? undefined,
        header: columnName[0].toUpperCase() + columnName.slice(1),
        cell: ({ getValue, row }) => {
          const rowIndex = row.index;
          const original = row.original as FoundationType;
          const val = getValue() as unknown;

          const meta = EDITORS[columnName as string] ?? { kind: "text" as const };

          const commit = (columnId: keyof FoundationType, next: unknown) => {
            const patched: FoundationType = { ...original, [columnId]: next as any };
            action_trigger({ kind: "editRow", rowIndex, row: patched } as any);
          };

          if (meta.kind === "select") {
            return (
              <Select value={(val as string) ?? ""} onValueChange={(v) => commit("type", v)}>
                <SelectTrigger className="w-full max-w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {meta.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      <span className="block truncate"></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (meta.kind === "boolean") {
            return (
              <Checkbox
                checked={val === true}
                onCheckedChange={(v) => commit(columnName, v === true)}
                aria-label={String(columnName)}
              />
            );
          }

          return (
            <EditorCell
              value={val}
              kind={meta.kind}
              numberProps={
                meta.kind === "number"
                  ? { step: meta.step, min: meta.min, max: meta.max }
                  : undefined
              }
              fieldId={`foundation-${row.original.id}-${String(columnName)}`}
              commit={(next) => commit(columnName, next)}
            />
          );
        },
      })
    ),
  ];

  return cols;
}, [action_trigger, allowed_spacing]);


      

    const table = useReactTable({
        data,
        columns,
        // state:{
        //     // sorting,
        //     // columnFilters,
        //     pagination: {
        //         pageIndex,
        //         pageSize:10,
        //     },
        // },
        // onColumnFiltersChange: setColumnFilters,
        // onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (r) => String(r.id), // 👈 stable id prevents cell remounts

        // getRowId: (row) => row.id, // <-- use your real stable id field
        // getPaginationRowModel: getPaginationRowModel(),
        // getFilteredRowModel: getFilteredRowModel(),
        // getFacetedUniqueValues: getFacetedUniqueValues(),
        // getSortedRowModel: getSortedRowModel(),
    })

    useEffect(() => {
        const currentPageIndex = table.getState().pagination.pageIndex
        const pageCount = table.getPageCount()

        // if (pageCount <= currentPageIndex && currentPageIndex > 0){
        //     const params = new URLSearchParams(searchParams.toString())
        //     params.set('page','1')
        //     router.replace(`?${params.toString()}`, { scroll: false })
        // }
    }, [table.getState().columnFilters]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-lg overflow-hidden border border-border">
            <Table className={`
                border
                [&_th]:text-[clamp(0.75rem,0.9vw,1rem)]
                [&_td]:text-[clamp(0.75rem,0.9vw,1rem)]
                [&_input]:text-[clamp(0.75rem,0.9vw,1rem)]
                [&_button]:text-[clamp(0.75rem,0.9vw,1rem)]
                [&_[role=checkbox]]:text-[clamp(0.75rem,0.9vw,1rem)]
            `}>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>    
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className={`bg-secondary ${header.id === 'actions' ? 'w-12':header.id === 'sections' ? 'w-12':header.id === 'angle' ? 'w-24':''}`}>
                                    <div className={`${header.id === 'actions' ? 'flex justify-center items-center' : ''}`}>
                                        {header.isPlaceholder
                                        ? null:flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                            
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            className="cursor-pointer hover:bg-border/25 dark:hover:bg-ring/40"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                key={cell.id}
                                className="
                                    border p-1 !text-xs !leading-tight
                                    [&_input]:!h-7 [&_input]:!text-xs [&_input]:!px-2
                                    [&_[role=combobox]]:!h-7 [&_[role=combobox]]:!text-xs
                                    [&_[role=checkbox]]:!h-4 [&_[role=checkbox]]:!w-4
                                "
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </div>
            < div className="flex justify-between items-center gap-1 flex-wrap" >
                <div>
                    <p className="whitespace-nowrap font-bold">
                        {/* {`Page ${table.getState().pagination.pageIndex + 1} of ${Math.max(1,table.getPageCount())}`}
                        &nbsp;&nbsp; */}
                        {`[${table.getFilteredRowModel().rows.length} ${table.getFilteredRowModel().rows.length !== 1 ? "total results" : "result"}]`}
                    </p>
                </div>
                <div className="flex flex-row gap-1">
                    {/* <div className="flex flex-row gap-1" >
                        <Button
                            variant="outline"
                            onClick={() => table.resetSorting()}
                        >
                            Refresh Data
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.refresh()}
                        >
                            Reset Sorting
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => table.resetColumnFilters()}
                        >
                            Reset Filters
                        </Button>
                    </div>
                    <div className="flex flex-row gap-1">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const newIndex = table.getState().pagination.pageIndex-1
                                table.setPageIndex(newIndex)
                                const params = new URLSearchParams(searchParams.toString())
                                params.set("page", (newIndex + 1).toString())
                                router.replace(`?${params.toString()}`, {scroll: false})
                            }}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const newIndex = table.getState().pagination.pageIndex+1
                                table.setPageIndex(newIndex)
                                const params = new URLSearchParams(searchParams.toString())
                                params.set("page", (newIndex + 1).toString())
                                router.replace(`?${params.toString()}`, {scroll: false})
                            }}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div> */}
                </div>
            </div>
        </div>
    )
}

