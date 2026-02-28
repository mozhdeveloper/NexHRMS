"use client";

import { Suspense } from "react";
import { useAuthStore } from "@/store/auth.store";
import { AccessDenied } from "./access-denied";
import type { ComponentType } from "react";

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
        </div>
    );
}

interface RoleViewDispatcherProps {
    /** Map of role slug → view component. Roles not listed will see the fallback. */
    views: Partial<Record<string, ComponentType>>;
    /** Component shown when no view matches the role. Defaults to AccessDenied. */
    fallback?: ComponentType;
}

/**
 * Reads the current user's role and renders the matching view component.
 * Wraps the view in Suspense to support React.lazy() loaded views.
 * Usage:
 * ```tsx
 * <RoleViewDispatcher views={{
 *   admin: AdminView,
 *   hr: HRView,
 *   employee: EmployeeView,
 * }} />
 * ```
 */
export function RoleViewDispatcher({ views, fallback: Fallback = AccessDenied }: RoleViewDispatcherProps) {
    const role = useAuthStore((s) => s.currentUser.role);
    const View = views[role];
    if (!View) return <Fallback />;
    return (
        <Suspense fallback={<LoadingFallback />}>
            <View />
        </Suspense>
    );
}
