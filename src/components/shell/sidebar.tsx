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
    FolderKanban,
    Clock,
    CalendarOff,
    Wallet,
    Banknote,
    BarChart3,
    Settings,
    Bell,
    ChevronLeft,
    LogOut,
    Building2,
    Clock3,
    Shield,
    ClipboardList,
    FileSearch,
    AlarmClock,
    X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect } from "react";

const iconMap: Record<string, React.ElementType> = {
    LayoutDashboard,
    Users,
    Contact,
    FolderKanban,
    Clock,
    CalendarOff,
    Wallet,
    Banknote,
    BarChart3,
    Settings,
    Bell,
    Building2,
    Clock3,
    Shield,
    ClipboardList,
    FileSearch,
    AlarmClock,
};

export function Sidebar() {
    const pathname = usePathname();
    const role = useAuthStore((s) => s.currentUser.role);
    const { sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

    const filtered = NAV_ITEMS.filter((item) => item.roles.includes(role));

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileSidebarOpen(false);
    }, [pathname, setMobileSidebarOpen]);

    // Close mobile sidebar on window resize to desktop
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) setMobileSidebarOpen(false);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [setMobileSidebarOpen]);

    /* ---------- Shared navigation content ---------- */
    const navContent = (showLabel: boolean, isMobile: boolean) => (
        <>
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-4">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <Image
                        src="/logo.svg"
                        alt="NexHRMS"
                        width={showLabel ? 140 : 36}
                        height={36}
                        className="transition-all duration-300"
                        priority
                    />
                </Link>
                {isMobile && (
                    <button
                        onClick={() => setMobileSidebarOpen(false)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {filtered.map((item) => {
                    const Icon = iconMap[item.icon];
                    const exactMatch = pathname === item.href;
                    const prefixMatch = pathname.startsWith(item.href + "/");
                    const moreSpecificExists = prefixMatch && filtered.some(
                        (other) => other.href !== item.href && (pathname === other.href || pathname.startsWith(other.href + "/")) && other.href.startsWith(item.href)
                    );
                    const isActive = exactMatch || (prefixMatch && !moreSpecificExists);
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
                                    {showLabel && <span className="truncate">{item.label}</span>}
                                </Link>
                            </TooltipTrigger>
                            {!showLabel && (
                                <TooltipContent side="right">{item.label}</TooltipContent>
                            )}
                        </Tooltip>
                    );
                })}
            </nav>

            {/* Sign Out */}
            <div className="border-t border-border p-3">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                useAuthStore.getState().logout();
                                window.location.href = "/login";
                            }}
                            className={cn(
                                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                "text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                            )}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {showLabel && <span className="truncate">Sign Out</span>}
                        </button>
                    </TooltipTrigger>
                    {!showLabel && <TooltipContent side="right">Sign Out</TooltipContent>}
                </Tooltip>
            </div>

            {/* Collapse toggle — desktop only */}
            {!isMobile && (
                <button
                    onClick={toggleSidebar}
                    className="flex h-12 w-full items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Toggle sidebar"
                >
                    <ChevronLeft
                        className={cn(
                            "h-5 w-5 transition-transform duration-300",
                            !sidebarOpen && "rotate-180"
                        )}
                    />
                </button>
            )}
        </>
    );

    return (
        <>
            {/* Desktop sidebar — hidden below lg */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 hidden lg:flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
                    sidebarOpen ? "w-64" : "w-[72px]"
                )}
            >
                {navContent(sidebarOpen, false)}
            </aside>

            {/* Mobile sidebar overlay — shown only when mobileSidebarOpen, hidden at lg+ */}
            {mobileSidebarOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                    {/* Drawer */}
                    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl lg:hidden animate-in slide-in-from-left duration-200">
                        {navContent(true, true)}
                    </aside>
                </>
            )}
        </>
    );
}
