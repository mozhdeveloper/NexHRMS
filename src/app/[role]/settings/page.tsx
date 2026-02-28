"use client";

import { RoleViewDispatcher } from "@/components/ui/role-dispatcher";
import AdminSettingsView from "./_views/admin-view";
import HrSettingsView from "./_views/hr-view";
import EmployeeSettingsView from "./_views/employee-view";

const views = {
    admin: AdminSettingsView,
    hr: HrSettingsView,
    finance: EmployeeSettingsView,
    employee: EmployeeSettingsView,
    supervisor: EmployeeSettingsView,
    payroll_admin: EmployeeSettingsView,
    auditor: EmployeeSettingsView,
};

export default function SettingsPage() {
    return <RoleViewDispatcher views={views} />;
}
