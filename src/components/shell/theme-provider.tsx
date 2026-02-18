"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useAuthStore((s) => s.theme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.classList.add(systemDark ? "dark" : "light");
        } else {
            root.classList.add(theme);
        }
    }, [theme]);

    return <>{children}</>;
}
