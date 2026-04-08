// /app/(rs)/jobs/JobTable.tsx
"use client"

import type { JobSearchResultsType } from "@/lib/queries/GetJobSearchResults"

import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnFiltersState,
    SortingState,
    getPaginationRowModel,
    getFilteredRowModel,
    getFacetedUniqueValues,
    getSortedRowModel,
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
    CircleCheckIcon,
    CircleXIcon,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
} from "lucide-react"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useMemo, useEffect } from "react"
import { usePolling } from "@/hooks/usePolling"
import { Button } from "@/components/ui/button"
import Filter from "@/components/react-table/Filter"
import { set } from "zod"
import { param } from "drizzle-orm"

type Props = {
    data: JobSearchResultsType,
}

type RowType = JobSearchResultsType[0]

export default function JobTable({data}:Props){
    const router = useRouter()

    const searchParams = useSearchParams()

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    const [sorting, setSorting] = useState<SortingState>([
        {
            id: "job_number",
            desc: false, // flase for ascending
        }
    ])

    usePolling(searchParams.get("searchText"),300000)

    const pageParam = searchParams.get("page");

    const pageIndex = useMemo(() => {
    return pageParam ? parseInt(pageParam, 10) - 1 : 0;
    }, [pageParam]);

    const columnHeadersArray: Array<keyof RowType> = [
        "jobDate",
        "job_number",
        "stage",
        "firstName",
        "lastName",
        "email",
    ]

    const columnWidths = {
        jobDate: 150,
        job_number: 150,
        email: 225,
    }

    const columnHelper = createColumnHelper<RowType>()

    const columns = columnHeadersArray.map((columnName) => {
        return columnHelper.accessor((row) => {
            const value = row[columnName]
            if (columnName === "jobDate" && value instanceof Date){
                return value.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                })
            }
            // if (columnName === "completed"){
            //     return value
            //         ?  "COMPLETED" : "OPEN"
            // }
            return value
        },{
            id: columnName,
            size: columnWidths[columnName as keyof typeof columnWidths] ?? undefined,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="pl-1 w-full flex justify-between"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {columnName[0].toUpperCase() + columnName.slice(1)}

                        {column.getIsSorted() === "asc" && (
                            <ArrowUp className="ml-2 h-4 w-4" />
                        )}

                        {column.getIsSorted() === "desc" && (
                            <ArrowDown className="ml-2 h-4 w-4" />
                        )}

                        {column.getIsSorted() !== "desc" && column.getIsSorted() !== "asc" && (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                    </Button>
                )
            },
            cell: ({getValue}) => {
                const value = getValue()
                // if (columnName === "completed"){
                //     return (
                //         <div className="grid place-content-center">
                //             {value === "OPEN" ? <CircleXIcon className="opacity-25" /> : <CircleCheckIcon className="text-green-600" />}
                //         </div>
                //     )
                // }
                return value
            }
        })
    })

    const table = useReactTable({
        data,
        columns,
        state:{
            sorting,
            columnFilters,
            pagination: {
                pageIndex,
                pageSize:10,
            },
        },
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getSortedRowModel: getSortedRowModel(),
    })

    useEffect(() => {
        const currentPageIndex = table.getState().pagination.pageIndex
        const pageCount = table.getPageCount()

        if (pageCount <= currentPageIndex && currentPageIndex > 0){
            const params = new URLSearchParams(searchParams.toString())
            params.set('page','1')
            router.replace(`?${params.toString()}`, { scroll: false })
        }
    }, [table.getState().columnFilters]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-lg overflow-hidden border border-border">
            <Table className="border">
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>    
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="bg-secondary p-1" style={{width: header.getSize()}}>
                                    <div>
                                        {header.isPlaceholder
                                        ? null:flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </div>
                                    {header.column.getCanFilter() ? (
                                        <div className="grid place-content-center">
                                            <Filter 
                                                column={header.column}
                                                filteredRows={table.getFilteredRowModel().rows.map(row => row.getValue(header.column.id))}
                                            />
                                        </div>
                                    ) : null}
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
                            onClick={() => router.push(`/jobs/form?jobId=${row.original.id}`)}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="border">
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
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
                        {`Page ${table.getState().pagination.pageIndex + 1} of ${Math.max(1,table.getPageCount())}`}
                        &nbsp;&nbsp;
                        {`[${table.getFilteredRowModel().rows.length} ${table.getFilteredRowModel().rows.length !== 1 ? "total results" : "result"}]`}
                    </p>
                </div>
                <div className="flex flex-row gap-1">
                    <div className="flex flex-row gap-1" >
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
                    </div>
                </div>
            </div>
        </div>
    )
}