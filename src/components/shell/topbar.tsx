"use client";

import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { useEmployeesStore } from "@/store/employees.store";
import { DEMO_USERS } from "@/data/seed";
import {
    Search,
    Bell,
    Moon,
    Sun,
    Menu,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { useRouter } from "next/navigation";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useEffect, useState } from "react";

export function Topbar() {
    const { currentUser, theme, setTheme, switchRole } = useAuthStore();
    const { toggleSidebar, sidebarOpen } = useUIStore();
    const employees = useEmployeesStore((s) => s.employees);
    const router = useRouter();
    const [cmdOpen, setCmdOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCmdOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const roleColors: Record<Role, string> = {
        admin: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        hr: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
        finance: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        employee: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    };

    return (
        <>
            <header
                className={cn(
                    "sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-xl px-6 transition-all duration-300",
                    sidebarOpen ? "ml-64" : "ml-[72px]"
                )}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={toggleSidebar}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search... (Ctrl+K)"
                        className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                        onFocus={() => setCmdOpen(true)}
                        readOnly
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                    </Button>

                    {/* Role Switcher */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                <Badge variant="secondary" className={cn("text-xs font-medium", roleColors[currentUser.role])}>
                                    {currentUser.role.toUpperCase()}
                                </Badge>
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {DEMO_USERS.map((u) => (
                                <DropdownMenuItem
                                    key={u.id}
                                    onClick={() => switchRole(u.role)}
                                    className={cn(currentUser.role === u.role && "bg-accent")}
                                >
                                    <span className="flex items-center gap-2">
                                        <Badge variant="secondary" className={cn("text-xs", roleColors[u.role])}>
                                            {u.role}
                                        </Badge>
                                        {u.name}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* User Avatar */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 px-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        {getInitials(currentUser.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden md:block text-sm font-medium">
                                    {currentUser.name}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push("/settings")}>
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Command Palette */}
            <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
                <CommandInput placeholder="Search employees, pages..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Pages">
                        {[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Employees", href: "/employees/manage" },
                            { label: "Directory", href: "/employees/directory" },
                            { label: "Attendance", href: "/attendance" },
                            { label: "Leave", href: "/leave" },
                            { label: "Payroll", href: "/payroll" },
                            { label: "Settings", href: "/settings" },
                        ].map((p) => (
                            <CommandItem
                                key={p.href}
                                onSelect={() => {
                                    router.push(p.href);
                                    setCmdOpen(false);
                                }}
                            >
                                {p.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandGroup heading="Employees">
                        {employees.slice(0, 8).map((emp) => (
                            <CommandItem
                                key={emp.id}
                                onSelect={() => {
                                    router.push(`/employees/${emp.id}`);
                                    setCmdOpen(false);
                                }}
                            >
                                {emp.name} — {emp.role}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
