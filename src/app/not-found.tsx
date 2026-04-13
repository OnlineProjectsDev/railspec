import Link from "next/link"

export const metadata = {
    title: "Page Not Found",
}
 
export default function NotFound() {
  return (
    <div>
      <div className="px-2 w-full">
        <h2 className="text-2xl">Page Not Found</h2>
            
      </div>
        <Link href="/projects" className="text-center hover:underline">
          <h3>Go Home</h3>  
        </Link>
    </div>
  )
}