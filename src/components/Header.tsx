'use client'

import { LogOut, Menu, X, LayoutDashboard, HelpCircle, MessageCircle, Calendar, Package, Search, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Image from "next/image";

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ModeToggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { usePathname } from "next/navigation";

export function Header() {

    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // Keyboard shortcut: ⌘K / Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setSearchOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (href: string) => {
        setSearchOpen(false);
        router.push(href);
    };

    const navItems = [
        { label: "Dashboard", href: "/projects", icon: LayoutDashboard, iconBg: "bg-rail-light-blue/10", iconColor: "text-rail-light-blue" },
        { label: "Orders", href: "/orders", icon: Package, iconBg: "bg-gray-100", iconColor: "text-gray-500" },
        { label: "Account", href: "/account", icon: User, iconBg: "bg-gray-100", iconColor: "text-gray-500" },
    ];

    return (
        <>
        <header className="animate-slide bg-background p-4 rounded-md">
            <div className="flex h-8 items-center justify-between w-full">
                <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2">
                    {/* Search trigger */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setSearchOpen(true)}
                                aria-label="Search"
                                className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-rail-light-blue hover:text-white transition-colors cursor-pointer"
                            >
                                <Search size={16} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Search <kbd className="ml-1 font-mono text-[10px]">⌘K</kbd></TooltipContent>
                    </Tooltip>
                    <ModeToggle />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Log out"
                                className="h-9 w-9 rounded-md bg-muted cursor-pointer hover:bg-rail-light-blue hover:text-white transition-colors"
                                asChild
                            >
                                <LogoutLink>
                                    <LogOut size={16} />
                                </LogoutLink>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Log out</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open menu"
                                className="h-9 w-9 rounded-md bg-muted cursor-pointer hover:bg-rail-light-blue hover:text-white transition-colors"
                                onClick={() => setMenuOpen(true)}
                            >
                                <Menu size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Menu</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </header>

        {/* Command search dialog */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Search" description="Search pages and actions">
            <CommandInput placeholder="Search pages, actions…" />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Pages">
                    <CommandItem onSelect={() => runCommand("/projects")}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/orders")}>
                        <Package className="mr-2 h-4 w-4" />
                        Orders
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/account")}>
                        <User className="mr-2 h-4 w-4" />
                        Account
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Actions">
                    <CommandItem onSelect={() => runCommand("/project-builder")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        New Project
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>

        {/* Backdrop */}
        {menuOpen && (
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={() => setMenuOpen(false)}
                aria-hidden
            />
        )}

        {/* Off-canvas panel */}
        <div
            className={`fixed top-0 right-0 z-50 h-full w-[280px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
                menuOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
            {/* Panel header – logo + close */}
            <div className="flex items-center justify-between px-4 py-4 border-b">
                <Image
                    src="/images/logos/RAILSPEC-logo.svg"
                    alt="RailSpec Logo"
                    width={100}
                    height={32}
                    className="object-contain h-8"
                    priority
                    quality={75}
                />
                <button
                    onClick={() => setMenuOpen(false)}
                    className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    aria-label="Close menu"
                >
                    <X size={16} />
                </button>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-5 px-6 py-6">

                    {/* Navigation */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[11px] font-semibold text-gray-900">Navigation</h3>
                        <div className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                            active
                                                ? "bg-rail-light-blue text-white"
                                                : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        <div className={`p-1.5 rounded-md ${active ? "bg-white/20" : item.iconBg}`}>
                                            <Icon size={11} className={active ? "text-white" : item.iconColor} />
                                        </div>
                                        <span className="flex-1 text-left">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[11px] font-semibold text-gray-900">Quick Actions</h3>
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/project-builder"
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer"
                            >
                                <div className="p-1.5 rounded-md bg-white/20">
                                    <Calendar size={11} className="text-white" />
                                </div>
                                <span className="flex-1 text-left">New Project</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </ScrollArea>

            {/* Help & Support + Logout */}
            <div className="flex flex-col gap-3 px-6 pb-6 border-t pt-5">
                <h3 className="text-[11px] font-semibold text-gray-900">Help & Support</h3>
                <div className="flex flex-col gap-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer">
                        <div className="p-1.5 rounded-md bg-gray-200">
                            <HelpCircle size={11} className="text-gray-500" />
                        </div>
                        <span className="flex-1 text-left">Help Center</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer">
                        <div className="p-1.5 rounded-md bg-gray-200">
                            <MessageCircle size={11} className="text-gray-500" />
                        </div>
                        <span className="flex-1 text-left">Contact Support</span>
                    </button>
                    <LogoutLink className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer">
                        <div className="p-1.5 rounded-md bg-gray-200">
                            <LogOut size={11} className="text-gray-500" />
                        </div>
                        <span className="flex-1 text-left">Log out</span>
                    </LogoutLink>
                </div>
            </div>
        </div>
        </>
    )
}