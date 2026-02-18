"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, DemoUser } from "@/types";
import { DEMO_USERS } from "@/data/seed";

interface AuthState {
    currentUser: DemoUser;
    theme: "light" | "dark" | "system";
    setUser: (user: DemoUser) => void;
    switchRole: (role: Role) => void;
    setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            currentUser: DEMO_USERS[0],
            theme: "light",
            setUser: (user) => set({ currentUser: user }),
            switchRole: (role) => {
                const user = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
                set({ currentUser: user });
            },
            setTheme: (theme) => set({ theme }),
        }),
        { name: "nexhrms-auth", version: 1 }
    )
);
