"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, DemoUser } from "@/types";
import { DEMO_USERS } from "@/data/seed";

// Simple reversible hash for demo localStorage (no server — not for production)
export function hashPassword(password: string): string {
    return btoa(encodeURIComponent(password));
}
export function verifyPassword(password: string, hash: string): boolean {
    try {
        return atob(hash) === encodeURIComponent(password);
    } catch {
        return false;
    }
}

const DEMO_PASSWORD_HASH = hashPassword("demo1234");

// Initialise seed accounts with hashed passwords
function buildSeedAccounts(): DemoUser[] {
    return DEMO_USERS.map((u) => ({
        ...u,
        passwordHash: DEMO_PASSWORD_HASH,
        mustChangePassword: false,
        profileComplete: true,
        createdAt: new Date().toISOString(),
    }));
}

export interface CreateAccountInput {
    name: string;
    email: string;
    role: Role;
    password: string;
    mustChangePassword?: boolean;
    profileComplete?: boolean;
}

interface AuthState {
    accounts: DemoUser[];
    currentUser: DemoUser;
    isAuthenticated: boolean;
    theme: "light" | "dark" | "system";
    // Actions
    setUser: (user: DemoUser) => void;
    switchRole: (role: Role) => void;
    setTheme: (theme: "light" | "dark" | "system") => void;
    login: (email: string, password: string) => boolean;
    logout: () => void;
    // Account management
    createAccount: (input: CreateAccountInput, createdByEmail?: string) => { ok: boolean; error?: string };
    changePassword: (userId: string, oldPassword: string, newPassword: string) => { ok: boolean; error?: string };
    adminSetPassword: (userId: string, newPassword: string) => void;
    completeOnboarding: (userId: string, profile: Partial<DemoUser>, newPassword?: string) => void;
    updateProfile: (userId: string, profile: Partial<DemoUser>) => void;
    deleteAccount: (userId: string) => void;
    resetToSeed: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accounts: buildSeedAccounts(),
            currentUser: buildSeedAccounts()[0],
            isAuthenticated: false,
            theme: "light",

            setUser: (user) => set({ currentUser: user }),
            switchRole: (role) => {
                const user = get().accounts.find((u) => u.role === role) || get().accounts[0];
                set({ currentUser: user });
            },
            setTheme: (theme) => set({ theme }),

            login: (email, password) => {
                const { accounts } = get();
                const user = accounts.find((u) => u.email.toLowerCase() === email.toLowerCase());
                if (!user) return false;
                if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) return false;
                set({ currentUser: user, isAuthenticated: true });
                return true;
            },

            logout: () => {
                const { accounts } = get();
                set({ isAuthenticated: false, currentUser: accounts[0] });
            },

            createAccount: (input, createdByEmail) => {
                const { accounts } = get();
                if (accounts.find((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
                    return { ok: false, error: "An account with this email already exists." };
                }
                if (input.password.length < 6) {
                    return { ok: false, error: "Password must be at least 6 characters." };
                }
                const newAccount: DemoUser = {
                    id: `USR-${Date.now()}`,
                    name: input.name,
                    email: input.email,
                    role: input.role,
                    passwordHash: hashPassword(input.password),
                    mustChangePassword: input.mustChangePassword ?? true,
                    profileComplete: input.profileComplete ?? false,
                    createdAt: new Date().toISOString(),
                    createdBy: createdByEmail,
                };
                set({ accounts: [...accounts, newAccount] });
                return { ok: true };
            },

            changePassword: (userId, oldPassword, newPassword) => {
                const { accounts, currentUser } = get();
                const user = accounts.find((u) => u.id === userId);
                if (!user) return { ok: false, error: "Account not found." };
                if (!user.passwordHash || !verifyPassword(oldPassword, user.passwordHash)) {
                    return { ok: false, error: "Current password is incorrect." };
                }
                if (newPassword.length < 6) {
                    return { ok: false, error: "New password must be at least 6 characters." };
                }
                const updated = { ...user, passwordHash: hashPassword(newPassword), mustChangePassword: false };
                const newAccounts = accounts.map((u) => (u.id === userId ? updated : u));
                const newCurrent = currentUser.id === userId ? updated : currentUser;
                set({ accounts: newAccounts, currentUser: newCurrent });
                return { ok: true };
            },

            adminSetPassword: (userId, newPassword) => {
                const { accounts, currentUser } = get();
                const updated = accounts.map((u) =>
                    u.id === userId ? { ...u, passwordHash: hashPassword(newPassword), mustChangePassword: true } : u
                );
                const newCurrent = currentUser.id === userId
                    ? { ...currentUser, passwordHash: hashPassword(newPassword), mustChangePassword: true }
                    : currentUser;
                set({ accounts: updated, currentUser: newCurrent });
            },

            completeOnboarding: (userId, profile, newPassword) => {
                const { accounts, currentUser } = get();
                const patch: Partial<DemoUser> = {
                    ...profile,
                    profileComplete: true,
                    mustChangePassword: false,
                };
                if (newPassword) patch.passwordHash = hashPassword(newPassword);
                const updated = accounts.map((u) => (u.id === userId ? { ...u, ...patch } : u));
                const newCurrent = currentUser.id === userId ? { ...currentUser, ...patch } : currentUser;
                set({ accounts: updated, currentUser: newCurrent });
            },

            updateProfile: (userId, profile) => {
                const { accounts, currentUser } = get();
                const updated = accounts.map((u) => (u.id === userId ? { ...u, ...profile } : u));
                const newCurrent = currentUser.id === userId ? { ...currentUser, ...profile } : currentUser;
                set({ accounts: updated, currentUser: newCurrent });
            },

            deleteAccount: (userId) => {
                const { accounts } = get();
                set({ accounts: accounts.filter((u) => u.id !== userId) });
            },
            resetToSeed: () => {
                const seed = buildSeedAccounts();
                set({ accounts: seed, currentUser: seed[0], isAuthenticated: false });
            },
        }),
        {
            name: "nexhrms-auth",
            version: 3,
            migrate: (persisted: unknown, version: number) => {
                // v2 → v3: add accounts array seeded from scratch
                if (version < 3) {
                    return { ...(persisted as object), accounts: buildSeedAccounts() };
                }
                return persisted as AuthState;
            },
        }
    )
);
