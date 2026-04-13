import { Header } from "@/components/Header"

export default async function RSLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="w-full h-screen bg-white p-4">
            
            <div className="p-4 bg-[#f5f5f5] rounded-xl flex flex-col gap-4">
                <Header />
                {children}
            </div>
        </div>
    )
}