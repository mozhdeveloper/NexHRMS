"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { NAV_ITEMS } from "@/lib/constants";
import {
    LayoutDashboard,
    Users,
    Contact,
    Clock,
    CalendarOff,
    Wallet,
    Settings,
    ChevronLeft,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, React.ElementType> = {
    LayoutDashboard,
    Users,
    Contact,
    Clock,
    CalendarOff,
    Wallet,
    Settings,
};

export function Sidebar() {
    const pathname = usePathname();
    const role = useAuthStore((s) => s.currentUser.role);
    const { sidebarOpen, toggleSidebar } = useUIStore();

    const filtered = NAV_ITEMS.filter((item) => item.roles.includes(role));

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
                sidebarOpen ? "w-64" : "w-[72px]"
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-4">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <Image
                        src="/logo.svg"
                        alt="NexHRMS"
                        width={sidebarOpen ? 140 : 36}
                        height={36}
                        className="transition-all duration-300"
                        priority
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {filtered.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Tooltip key={item.href} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    {Icon && <Icon className="h-5 w-5 shrink-0" />}
                                    {sidebarOpen && (
                                        <span className="truncate">{item.label}</span>
                                    )}
                                </Link>
                            </TooltipTrigger>
                            {!sidebarOpen && (
                                <TooltipContent side="right">{item.label}</TooltipContent>
                            )}
                        </Tooltip>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={toggleSidebar}
                className="flex h-12 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle sidebar"
            >
                <ChevronLeft
                    className={cn(
                        "h-5 w-5 transition-transform duration-300",
                        !sidebarOpen && "rotate-180"
                    )}
                />
            </button>
        </aside>
    );
}
