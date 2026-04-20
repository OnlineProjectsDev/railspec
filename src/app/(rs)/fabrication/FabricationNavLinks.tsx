"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type NavLink = { href: string; label: string }

export default function FabricationNavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <>
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
              isActive
                ? "bg-rail-light-blue text-white"
                : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </>
  )
}
