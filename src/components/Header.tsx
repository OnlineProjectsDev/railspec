'use client'

import { HomeIcon, File, UsersRound, LogOut, SquarePen, PencilRuler, NotebookTabs, Search ,  NotebookPen} from 'lucide-react';
import Link from 'next/link';
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components';
import { useState } from "react";

import Image from "next/image";

import { Button } from '@/components/ui/button';
import { NavButton } from '@/components/NavButton';
import { ModeToggle } from '@/components/ModeToggle';
import { NavButtonMenu } from './NavButtonMenu';
import { usePathname } from "next/navigation";

export function Header() {

    const [searchQuery, setSearchQuery] = useState("");
    const pathname = usePathname();

    function onSubmitSearch(seachString:string) {
        console.log(seachString.trim())
    }


    return (
        <header className="animate-slide bg-background p-4 rounded-md">

            <div className="flex h-8 items-center justify-between w-full">

                <div className="flex items-center gap-2">
                    {/* <NavButton href="/home" label="Home" icon={HomeIcon} /> */}

                    <Link href="/projects" className="cursor-pointer" title="Projects">
                        <Image 
                            src="/images/logos/RAILSPEC-logo.svg" 
                            alt="RailSpec Logo" 
                            width={120}
                            height={40}
                            className="object-contain h-10 auto"
                            priority
                            quality={75}
                        />
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-md mx-8">
                    <div className="relative">
                        {/* <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            name="headerSearch"     // ✅ add this (or id="headerSearch")
                            placeholder="Search orders, customers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                e.preventDefault();
                                onSubmitSearch(searchQuery);
                                }
                            }}
                            className="w-full pl-10 pr-4 py-2 text-xs bg-[#f5f5f5] border-none rounded-md focus:outline-none focus:ring-2 focus:ring-rail-light-blue focus:bg-white transition-all"
                            suppressHydrationWarning
                        /> */}
                    </div>
                </div>

                <div className="flex items-center">

                    {/* <NavButton href="/jobs" label="Jobs" icon={File} /> */}
                    <NavButtonMenu
                        icon={NotebookTabs}
                        label="Project Menu"
                        choices={[
                            { title: "Existing Projects", href: "/projects" },
                            { title: "New Project", href: "/project-builder" }
                        ]}
                    />

                    <NavButtonMenu
                        icon={UsersRound}
                        label="Customers Menu"
                        choices={[
                            { title: "Search Customers", href: "/customers" },
                            { title: "New Customer", href: "/customers/form" }
                        ]}
                    />

                    {/* <NavButton href="/jobparameters" label="Job parameters" icon={NotebookTabs} /> */}

                    {/* <NavButton href="/drawingtool" label="Drawing tool" icon={PencilRuler} /> */}

                    {/* <NavButton href="/shopdrawings" label="Shop drawing" icon={SquarePen} /> */}

                    <ModeToggle />

                    {/* <NavButton href="/devlog" label="Development log" icon={NotebookPen} /> */}


                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="LogOut"
                        title="LogOut"
                        className="rounded-full"
                        asChild
                    >
                        <LogoutLink>
                            <LogOut />
                        </LogoutLink>
                    </Button>

                    

                </div>

            </div>

        </header>
    )
}