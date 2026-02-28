"use client";

import { RoleViewDispatcher } from "@/components/ui/role-dispatcher";
import EmployeePayrollView from "./_views/employee-view";
import AdminPayrollView from "./_views/admin-view";

const FinanceView = () => <AdminPayrollView mode="finance" />;
const PayrollAdminView = () => <AdminPayrollView mode="payroll_admin" />;

export default function PayrollPage() {
    return (
        <RoleViewDispatcher
            views={{
                admin: () => <AdminPayrollView mode="admin" />,
                finance: FinanceView,
                payroll_admin: PayrollAdminView,
                employee: EmployeePayrollView,
            }}
        />
    );
}
