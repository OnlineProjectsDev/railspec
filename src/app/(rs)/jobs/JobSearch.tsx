// app/(rs)/jobs/JobSearch.tsx
import Form from "next/form"
import { Input } from "@/components/ui/input"
import SearchButton from "@/components/SearchButton"

export default function JobSearch(){
    return (
        <Form 
            action="/jobs"
            className="flex gap-2 items-center"
        >
            <Input
                name="searchText"
                type="text"
                placeholder="Search Jobs"
                className="w-full"
                autoFocus
            />
            <SearchButton />
        </Form>
    )
}