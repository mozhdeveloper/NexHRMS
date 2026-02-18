"use client";

import { ThemeProvider } from "@/components/shell/theme-provider";
import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isRoot = pathname === "/";

    return (
        <TooltipProvider>
            <ThemeProvider>
                {isRoot ? children : <AppShell>{children}</AppShell>}
            </ThemeProvider>
        </TooltipProvider>
    );
}
