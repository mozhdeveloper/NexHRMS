"use client";

import { useAuthStore } from "@/store/auth.store";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/types";

const VALID_ROLES: Role[] = ["admin", "hr", "finance", "employee", "supervisor", "payroll_admin", "auditor"];

export default function RoleLayout({ children }: { children: React.ReactNode }) {
    const { role: urlRole } = useParams<{ role: string }>();
    const userRole = useAuthStore((s) => s.currentUser.role);
    const router = useRouter();
    const pathname = usePathname();

    const isValidRole = VALID_ROLES.includes(urlRole as Role);

    useEffect(() => {
        if (!isValidRole) {
            router.replace(`/${userRole}/dashboard`);
            return;
        }
        if (urlRole !== userRole) {
            // Redirect to correct role prefix, preserving sub-path
            const subPath = pathname.replace(`/${urlRole}`, "");
            router.replace(`/${userRole}${subPath}`);
        }
    }, [urlRole, userRole, isValidRole, router, pathname]);

    if (!isValidRole || urlRole !== userRole) return null;

    return <>{children}</>;
}
