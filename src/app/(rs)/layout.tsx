import { Header } from "@/components/Header"

export default async function RSLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="w-full h-screen p-4">
            
            <div className="h-full bg-[#f5f5f5] rounded-xl flex flex-col p-4 overflow-hidden">
                <Header />
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-4">
                    {children}
                </div>
            </div>
        </div>
    )
}