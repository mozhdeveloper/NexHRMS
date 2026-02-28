"use client";

import { RoleViewDispatcher } from "@/components/ui/role-dispatcher";
import EmployeeView from "./_views/employee-view";
import AdminView from "./_views/admin-view";

/* Thin wrappers so each role gets a unique component */
const HrView = () => <AdminView mode="hr" />;
const SupervisorView = () => <AdminView mode="supervisor" />;

export default function AttendancePage() {
    return (
        <RoleViewDispatcher
            views={{
                admin: () => <AdminView mode="admin" />,
                hr: HrView,
                supervisor: SupervisorView,
                employee: EmployeeView,
            }}
        />
    );
}