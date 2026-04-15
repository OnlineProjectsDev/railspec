export default async function Template({
    children,
}:{
    children: React.ReactNode
}) {
    return(
        <div className="animate-appear flex-1 min-h-0 flex flex-col">
                {children}
        </div>
    )
}