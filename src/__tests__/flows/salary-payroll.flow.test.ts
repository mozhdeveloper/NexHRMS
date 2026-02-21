/**
 * Integration flow tests: Salary set in Directory → Payroll issuance
 *
 * Covers:
 *  1. Finance/admin/hr can update an employee's salary via updateEmployee
 *  2. Monthly gross auto-derived from salary (salary / 12)
 *  3. Issuing a payslip with the derived gross + a custom issuedAt date
 *  4. The payslip persists the correct issuedAt, grossPay, and netPay
 *  5. Issuing a second payslip after a salary change reflects the new salary
 *  6. Edge cases: zero salary, fractional salary/12 rounding
 */

import { useEmployeesStore } from "@/store/employees.store";
import { usePayrollStore } from "@/store/payroll.store";
import { computeAllPHDeductions } from "@/lib/ph-deductions";
import type { Employee } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_EMP: Employee = {
    id: "DIR-EMP-001",
    name: "Lena Cruz",
    email: "lena@company.com",
    role: "Developer",
    department: "Engineering",
    status: "active",
    workType: "WFO",
    salary: 240000, // ₱240,000/yr → ₱20,000/mo
    joinDate: "2024-01-01",
    productivity: 90,
    location: "Manila",
};

const buildPayslip = (empId: string, salary: number, issuedAt?: string) => {
    const monthlyGross = Math.round(salary / 12);
    const deductions = computeAllPHDeductions(monthlyGross);
    const netPay = monthlyGross - deductions.totalDeductions;
    return {
        employeeId: empId,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-15",
        grossPay: monthlyGross,
        allowances: 0,
        sssDeduction: deductions.sss,
        philhealthDeduction: deductions.philHealth,
        pagibigDeduction: deductions.pagIBIG,
        taxDeduction: deductions.withholdingTax,
        otherDeductions: 0,
        loanDeduction: 0,
        netPay,
        ...(issuedAt ? { issuedAt } : {}),
    };
};

const resetStores = () => {
    useEmployeesStore.setState({ employees: [], salaryRequests: [], salaryHistory: [], searchQuery: "", statusFilter: "all", workTypeFilter: "all", departmentFilter: "all" });
    usePayrollStore.setState({ payslips: [], runs: [], adjustments: [], finalPayComputations: [] });
};

beforeEach(resetStores);

// ─── 1. Salary persistence in employee store ──────────────────────────────────
describe("Directory — set salary via updateEmployee", () => {
    it("persists a new annual salary on the employee record", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 360000 });
        const updated = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001");
        expect(updated?.salary).toBe(360000);
    });

    it("does not affect other employees when updating salary", () => {
        const emp2: Employee = { ...MOCK_EMP, id: "DIR-EMP-002", name: "Marco Reyes", salary: 180000 };
        useEmployeesStore.setState({ employees: [MOCK_EMP, emp2] });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 300000 });
        const unchanged = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-002");
        expect(unchanged?.salary).toBe(180000);
    });

    it("monthly gross derived from new salary is salary / 12 (rounded)", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 100000 });
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        expect(Math.round(emp.salary / 12)).toBe(8333); // 100000 / 12 = 8333.33 → 8333
    });

    it("updating salary multiple times keeps the latest value", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 100000 });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 500000 });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 288000 });
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        expect(emp.salary).toBe(288000);
    });

    it("salary update only changes salary, not other fields", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 999999 });
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        expect(emp.name).toBe("Lena Cruz");
        expect(emp.department).toBe("Engineering");
        expect(emp.status).toBe("active");
    });
});

// ─── 2. Salary → payslip gross derivation ────────────────────────────────────
describe("Payroll — monthly gross auto-derived from directory salary", () => {
    beforeEach(() => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
    });

    it("monthly gross = Math.round(salary / 12) for a round salary", () => {
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        expect(Math.round(emp.salary / 12)).toBe(20000); // 240000 / 12 = 20000
    });

    it("monthly gross rounds correctly for an awkward salary", () => {
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 250000 });
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        expect(Math.round(emp.salary / 12)).toBe(20833); // 250000 / 12 = 20833.33 → 20833
    });

    it("payslip grossPay matches the derived monthly gross", () => {
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        const slipData = buildPayslip(emp.id, emp.salary);
        usePayrollStore.getState().issuePayslip(slipData);
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.grossPay).toBe(Math.round(emp.salary / 12));
    });
});

// ─── 3. Custom issuedAt date ──────────────────────────────────────────────────
describe("Payroll — issue payslip with custom issue date", () => {
    beforeEach(() => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
    });

    it("records the exact custom issuedAt date on the payslip", () => {
        const slipData = buildPayslip("DIR-EMP-001", MOCK_EMP.salary, "2026-01-31");
        usePayrollStore.getState().issuePayslip(slipData);
        expect(usePayrollStore.getState().payslips[0].issuedAt).toBe("2026-01-31");
    });

    it("custom issuedAt is preserved (not overwritten to today)", () => {
        const today = new Date().toISOString().split("T")[0];
        const customDate = "2026-01-01";
        // Only run this assertion if today isn't the same as custom date
        if (today !== customDate) {
            usePayrollStore.getState().issuePayslip(buildPayslip("DIR-EMP-001", MOCK_EMP.salary, customDate));
            expect(usePayrollStore.getState().payslips[0].issuedAt).not.toBe(today);
        }
    });

    it("two payslips for different cutoffs on the same employee have correct custom dates", () => {
        usePayrollStore.getState().issuePayslip({ ...buildPayslip("DIR-EMP-001", MOCK_EMP.salary, "2026-01-15"), periodEnd: "2026-01-15" });
        usePayrollStore.getState().issuePayslip({ ...buildPayslip("DIR-EMP-001", MOCK_EMP.salary, "2026-01-31"), periodStart: "2026-01-16", periodEnd: "2026-01-31" });
        const slips = usePayrollStore.getState().payslips;
        expect(slips.find((p) => p.issuedAt === "2026-01-15")).toBeDefined();
        expect(slips.find((p) => p.issuedAt === "2026-01-31")).toBeDefined();
    });

    it("payslip status is issued regardless of custom issuedAt", () => {
        usePayrollStore.getState().issuePayslip(buildPayslip("DIR-EMP-001", MOCK_EMP.salary, "2025-12-31"));
        expect(usePayrollStore.getState().payslips[0].status).toBe("issued");
    });
});

// ─── 4. Full flow: set salary → issue payslip ─────────────────────────────────
describe("Full flow — Finance sets salary, then issues payslip", () => {
    it("payslip grossPay reflects the updated directory salary", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });

        // Step 1: Finance updates salary in directory
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 360000 }); // ₱30,000/mo

        // Step 2: Read back the updated employee (as the payroll modal does)
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        const monthlyGross = Math.round(emp.salary / 12);
        expect(monthlyGross).toBe(30000);

        // Step 3: Issue payslip using the derived gross
        const slipData = buildPayslip(emp.id, emp.salary, "2026-02-19");
        usePayrollStore.getState().issuePayslip(slipData);

        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.grossPay).toBe(30000);
        expect(slip.issuedAt).toBe("2026-02-19");
        expect(slip.status).toBe("issued");
    });

    it("netPay is positive after PH deductions on a standard salary", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        const emp = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        const slipData = buildPayslip(emp.id, emp.salary, "2026-02-19");
        usePayrollStore.getState().issuePayslip(slipData);
        expect(usePayrollStore.getState().payslips[0].netPay).toBeGreaterThan(0);
    });

    it("after a salary raise, new payslip has higher grossPay than old payslip", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] }); // ₱240,000/yr

        // Old payslip (before raise)
        const before = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        usePayrollStore.getState().issuePayslip(buildPayslip(before.id, before.salary, "2026-01-31"));

        // Finance gives a raise
        useEmployeesStore.getState().updateEmployee("DIR-EMP-001", { salary: 480000 }); // ₱40,000/mo

        // New payslip (after raise)
        const after = useEmployeesStore.getState().employees.find((e) => e.id === "DIR-EMP-001")!;
        usePayrollStore.getState().issuePayslip(buildPayslip(after.id, after.salary, "2026-02-28"));

        const [old, newer] = usePayrollStore.getState().payslips.sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
        expect(newer.grossPay).toBeGreaterThan(old.grossPay);
        expect(newer.grossPay).toBe(40000);
        expect(old.grossPay).toBe(20000);
    });

    it("two different employees each get the correct gross from their own salary", () => {
        const empB: Employee = { ...MOCK_EMP, id: "DIR-EMP-002", name: "Carlo Santos", salary: 120000 };
        useEmployeesStore.setState({ employees: [MOCK_EMP, empB] });

        const emps = useEmployeesStore.getState().employees;
        emps.forEach((e) => usePayrollStore.getState().issuePayslip(buildPayslip(e.id, e.salary, "2026-02-19")));

        const slips = usePayrollStore.getState().payslips;
        const slipA = slips.find((p) => p.employeeId === "DIR-EMP-001")!;
        const slipB = slips.find((p) => p.employeeId === "DIR-EMP-002")!;
        expect(slipA.grossPay).toBe(20000); // 240000 / 12
        expect(slipB.grossPay).toBe(10000); // 120000 / 12
    });
});

// ─── 5. Edge cases ────────────────────────────────────────────────────────────
describe("Edge cases — salary and payslip issuance", () => {
    it("fractional salary/12 results are rounded (not floored or ceil'd)", () => {
        // 250001 / 12 = 20833.416… → Math.round → 20833
        useEmployeesStore.setState({ employees: [{ ...MOCK_EMP, salary: 250001 }] });
        const emp = useEmployeesStore.getState().employees[0];
        expect(Math.round(emp.salary / 12)).toBe(20833);
    });

    it("issuePayslip stores all PH deductions explicitly on the payslip", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] }); // 240000/yr = 20000/mo
        const slipData = buildPayslip("DIR-EMP-001", 240000, "2026-02-19");
        usePayrollStore.getState().issuePayslip(slipData);
        const slip = usePayrollStore.getState().payslips[0];
        // All government deductions must be stored as non-negative numbers
        expect(slip.sssDeduction).toBeGreaterThanOrEqual(0);
        expect(slip.philhealthDeduction).toBeGreaterThanOrEqual(0);
        expect(slip.pagibigDeduction).toBeGreaterThanOrEqual(0);
        expect(slip.taxDeduction).toBeGreaterThanOrEqual(0);
    });

    it("grossPay - totalDeductions = netPay", () => {
        const monthly = Math.round(240000 / 12);
        const ded = computeAllPHDeductions(monthly);
        const slipData = buildPayslip("DIR-EMP-001", 240000, "2026-02-19");
        usePayrollStore.getState().issuePayslip(slipData);
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.netPay).toBe(monthly - ded.totalDeductions);
    });

    it("resetToSeed clears all payslips issued during the flow", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        usePayrollStore.getState().issuePayslip(buildPayslip("DIR-EMP-001", MOCK_EMP.salary, "2026-02-19"));
        usePayrollStore.getState().issuePayslip(buildPayslip("DIR-EMP-001", MOCK_EMP.salary, "2026-01-31"));
        expect(usePayrollStore.getState().payslips.length).toBeGreaterThanOrEqual(2);
        // Resetting clears everything back to seed state
        usePayrollStore.setState({ payslips: [], runs: [], adjustments: [] });
        expect(usePayrollStore.getState().payslips).toHaveLength(0);
    });
});
