"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
    const sidebarOpen = useUIStore((s) => s.sidebarOpen);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <Topbar />
            <main
                className={cn(
                    "min-h-[calc(100vh-4rem)] transition-all duration-300 p-3 sm:p-4 md:p-6",
                    // On mobile: full width (sidebar is overlay). On desktop: respect sidebar width.
                    "lg:transition-all lg:duration-300",
                    sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"
                )}
            >
                {children}
            </main>
        </div>
    );
}
