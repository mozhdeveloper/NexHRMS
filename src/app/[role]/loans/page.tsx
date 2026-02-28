"use client";

import { RoleViewDispatcher } from "@/components/ui/role-dispatcher";
import { lazy } from "react";

const AdminView = lazy(() => import("./_views/admin-view"));
const ReadonlyView = lazy(() => import("./_views/readonly-view"));

export default function LoansPage() {
    return (
        <RoleViewDispatcher
            views={{
                admin: AdminView,
                finance: AdminView,
                payroll_admin: ReadonlyView,
            }}
        />
    );
}
