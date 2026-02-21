"use client";

import { ThemeProvider } from "@/components/shell/theme-provider";
import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OnboardingModal } from "@/components/auth/onboarding-modal";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useEffect, useState } from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated && pathname !== "/login") {
            router.replace("/login");
        }
    }, [mounted, isAuthenticated, pathname, router]);

    const isLoginPage = pathname === "/login";
    const isRoot = pathname === "/";

    // Show nothing until mounted (prevents hydration flash)
    if (!mounted) return null;

    // If not authenticated and not on login page, show nothing (redirect happening)
    if (!isAuthenticated && !isLoginPage) return null;

    return (
        <TooltipProvider>
            <ThemeProvider>
                <OnboardingModal />
                {isLoginPage || isRoot ? children : <AppShell>{children}</AppShell>}
            </ThemeProvider>
        </TooltipProvider>
    );
}
