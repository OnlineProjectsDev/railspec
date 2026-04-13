// /app/(rs)/jobs/page.tsx
import JobSearch from "@/app/(rs)/jobs/JobSearch"
import { GetOpenJobs } from "@/lib/queries/GetopenJobs"
import { GetJobSearchResults } from "@/lib/queries/GetJobSearchResults"
import JobTable from "@/app/(rs)/jobs/JobTable"

export const metadata = {
    title: "Jobs Search",
}

export default async function Jobs({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}){
    const { searchText } = await searchParams

    if(!searchText){
        const results = await GetOpenJobs()
        return (
            <>
                <JobSearch />
                {results.length ? <JobTable data={results} /> : <>No open jobs found.</>}
            </>
        )
    }

    const results = await GetJobSearchResults(searchText)
    
    return (
        <>
            <JobSearch />
            {results.length ? <JobTable data={results} /> : <>No results found.</>}
        </>
    )
}