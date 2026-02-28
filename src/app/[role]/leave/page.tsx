"use client";

import { RoleViewDispatcher } from "@/components/ui/role-dispatcher";
import AdminLeaveView from "./_views/admin-view";
import EmployeeLeaveView from "./_views/employee-view";

const AdminView = () => <AdminLeaveView />;

const views = {
    admin: AdminView,
    hr: AdminView,
    supervisor: AdminView,
    employee: EmployeeLeaveView,
};

export default function LeavePage() {
    return <RoleViewDispatcher views={views} />;
}
