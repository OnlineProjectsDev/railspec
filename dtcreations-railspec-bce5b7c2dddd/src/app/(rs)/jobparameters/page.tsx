// import CustomerSearch from "@/app/(rs)/customers/CustomerSearch"
// import { GetCustomerSearchResults } from "@/lib/queries/GetCustomerSearchResults"
import * as Sentry from "@sentry/nextjs"
// import CustomerTable from "@/app/(rs)/customers/CustomerTable"

export const metadata = {
    title: "Drawing tool",
}

export default async function JobParameters({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}){
    const { searchText } = await searchParams

    // if(!searchText) return <CustomerSearch />

    // const span = Sentry.startInactiveSpan({
    //     name: 'getCustomerSearchResults-1'
    // })
    // const results = await GetCustomerSearchResults(searchText)
    // span.end()

    return (
        <div>

            <main className="flex flex-col justify-center text-center max-w-5xl mx-auto h-dvh">

                <div>
                    <h1 className="text-4xl font-bold">RailSpec™<br />Job Parameters placeholder</h1>
                </div>

            </main>

        </div>
    )
}