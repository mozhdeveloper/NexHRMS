"use client";

import { Suspense, lazy, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";

const AdminPayrollView = lazy(() => import("./_views/admin-view"));

const ALLOWED: Record<string, "admin" | "finance" | "payroll_admin"> = {
    admin: "admin",
    finance: "finance",
    payroll_admin: "payroll_admin",
};

function PayrollLoading() {
    return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        </div>
    );
}

export default function PayrollPage() {
    const role = useAuthStore((s) => s.currentUser.role);
    const router = useRouter();
    const mode = ALLOWED[role];

    useEffect(() => {
        if (!mode) {
            router.replace(`/${role}/my-payslips`);
        }
    }, [mode, role, router]);

    if (!mode) {
        return <PayrollLoading />;
    }

    return (
        <Suspense fallback={<PayrollLoading />}>
            <AdminPayrollView mode={mode} />
        </Suspense>
    );
}
