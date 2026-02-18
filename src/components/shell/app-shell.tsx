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
                    "min-h-[calc(100vh-4rem)] transition-all duration-300 p-6",
                    sidebarOpen ? "ml-64" : "ml-[72px]"
                )}
            >
                {children}
            </main>
        </div>
    );
}
