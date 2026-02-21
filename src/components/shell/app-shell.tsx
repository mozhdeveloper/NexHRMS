"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useUIStore } from "@/store/ui.store";
import { useAppearanceStore } from "@/store/appearance.store";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
    const sidebarOpen = useUIStore((s) => s.sidebarOpen);
    const density = useAppearanceStore((s) => s.density);
    const bannerEnabled = useAppearanceStore((s) => s.topbarBannerEnabled);
    const bannerText = useAppearanceStore((s) => s.topbarBannerText);
    const bannerColor = useAppearanceStore((s) => s.topbarBannerColor);

    const paddingClass = density === "compact"
        ? "p-2 sm:p-3 md:p-4"
        : density === "relaxed"
            ? "p-4 sm:p-6 md:p-8"
            : "p-3 sm:p-4 md:p-6";

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <Topbar />
            {/* Announcement Banner */}
            {bannerEnabled && bannerText && (
                <div
                    className={cn(
                        "sticky top-16 z-20 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all duration-300",
                        sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"
                    )}
                    style={{ backgroundColor: bannerColor || "#3b82f6" }}
                >
                    <span>{bannerText}</span>
                </div>
            )}
            <main
                className={cn(
                    "min-h-[calc(100vh-4rem)] transition-all duration-300",
                    paddingClass,
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
