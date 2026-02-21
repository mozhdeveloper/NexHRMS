/**
 * Integration flow: Payroll → Loan deduction lifecycle
 *
 * Simulates the real-world sequence:
 *   1. HR creates an employee loan
 *   2. Payroll issues a payslip
 *   3. System records a loan deduction linked to that payslip
 *   4. Balance decrements correctly; auto-settles at zero
 */
import { useLoansStore } from "@/store/loans.store";
import { usePayrollStore } from "@/store/payroll.store";
import type { Loan } from "@/types";

const EMP_ID = "EMP-FLOW-001";

const BASE_LOAN: Omit<Loan, "id" | "createdAt" | "remainingBalance"> = {
    employeeId: EMP_ID,
    type: "personal",
    amount: 6000,
    monthlyDeduction: 2000,
    status: "active",
    approvedBy: "ADMIN-001",
    deductionCapPercent: 30,
    deductions: [],
};

const PAYSLIP_BASE = {
    employeeId: EMP_ID,
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    grossPay: 30000,
    allowances: 0,
    sssDeduction: 1350,
    philhealthDeduction: 450,
    pagibigDeduction: 100,
    taxDeduction: 2000,
    otherDeductions: 0,
    loanDeduction: 2000,
    netPay: 24100,
};

beforeEach(() => {
    useLoansStore.setState({ loans: [] });
    usePayrollStore.setState({ payslips: [], runs: [], adjustments: [], finalPayComputations: [] });
});

// ─── Full payroll-loan flow ───────────────────────────────────────────────────

test("flow: create loan → issue payslip → record deduction → balance decrements", () => {
    // Step 1: Create the loan
    useLoansStore.getState().createLoan(BASE_LOAN);
    const loan = useLoansStore.getState().loans[0];
    expect(loan.remainingBalance).toBe(6000);
    expect(loan.status).toBe("active");

    // Step 2: Issue a payslip
    usePayrollStore.getState().issuePayslip({ ...PAYSLIP_BASE, periodStart: "2026-01-01", periodEnd: "2026-01-31" });
    const payslip = usePayrollStore.getState().payslips[0];
    expect(payslip.id).toMatch(/^PS-/);

    // Step 3: Record deduction linked to actual payslip ID
    useLoansStore.getState().recordDeduction(loan.id, payslip.id, 2000);

    const updatedLoan = useLoansStore.getState().loans[0];
    expect(updatedLoan.remainingBalance).toBe(4000);
    expect(updatedLoan.deductions).toHaveLength(1);
    expect(updatedLoan.deductions![0].payslipId).toBe(payslip.id);
    expect(updatedLoan.deductions![0].amount).toBe(2000);
});

test("flow: three monthly deductions settle the loan on the final payment", () => {
    useLoansStore.getState().createLoan(BASE_LOAN); // 6000 / 2000/month → 3 months
    const loan = useLoansStore.getState().loans[0];

    for (let month = 1; month <= 3; month++) {
        usePayrollStore.getState().issuePayslip({
            ...PAYSLIP_BASE,
            periodStart: `2026-0${month}-01`,
            periodEnd: `2026-0${month}-28`,
        });
        const slips = usePayrollStore.getState().payslips;
        const latestPayslip = slips[slips.length - 1];
        useLoansStore.getState().recordDeduction(loan.id, latestPayslip.id, 2000);
    }

    const finalLoan = useLoansStore.getState().loans[0];
    expect(finalLoan.remainingBalance).toBe(0);
    expect(finalLoan.status).toBe("settled");
    expect(finalLoan.deductions).toHaveLength(3);
});

test("flow: getAllDeductions returns each deduction with the correct employeeId", () => {
    useLoansStore.getState().createLoan(BASE_LOAN);
    const loan = useLoansStore.getState().loans[0];

    usePayrollStore.getState().issuePayslip(PAYSLIP_BASE);
    const payslip = usePayrollStore.getState().payslips[0];

    useLoansStore.getState().recordDeduction(loan.id, payslip.id, 2000);

    const allDeductions = useLoansStore.getState().getAllDeductions();
    expect(allDeductions).toHaveLength(1);
    expect(allDeductions[0].employeeId).toBe(EMP_ID);
    expect(allDeductions[0].payslipId).toBe(payslip.id);
});

test("flow: payslip confirmation does not invalidate loan deduction link", () => {
    useLoansStore.getState().createLoan(BASE_LOAN);
    const loan = useLoansStore.getState().loans[0];

    usePayrollStore.getState().issuePayslip(PAYSLIP_BASE);
    const payslip = usePayrollStore.getState().payslips[0];

    useLoansStore.getState().recordDeduction(loan.id, payslip.id, 2000);

    // Confirm the payslip — should not disturb loan records
    usePayrollStore.getState().confirmPayslip(payslip.id);
    expect(usePayrollStore.getState().payslips[0].status).toBe("confirmed");

    const updatedLoan = useLoansStore.getState().loans[0];
    expect(updatedLoan.deductions![0].payslipId).toBe(payslip.id);
    expect(updatedLoan.remainingBalance).toBe(4000);
});

test("flow: frozen loan prevents active lookups; unfreeze restores", () => {
    useLoansStore.getState().createLoan(BASE_LOAN);
    const loan = useLoansStore.getState().loans[0];

    // Freeze the loan
    useLoansStore.getState().freezeLoan(loan.id);
    expect(useLoansStore.getState().getActiveByEmployee(EMP_ID)).toHaveLength(0);

    // Unfreeze
    useLoansStore.getState().unfreezeLoan(loan.id);
    expect(useLoansStore.getState().getActiveByEmployee(EMP_ID)).toHaveLength(1);
});

test("flow: locking a payroll run captures the payslip IDs correctly", () => {
    usePayrollStore.getState().issuePayslip({ ...PAYSLIP_BASE, periodStart: "2026-03-01", periodEnd: "2026-03-31" });
    const payslip = usePayrollStore.getState().payslips[0];

    // Mark confirmed before locking
    usePayrollStore.getState().confirmPayslip(payslip.id);

    usePayrollStore.getState().lockRun(payslip.issuedAt, "ADMIN-001");
    const runs = usePayrollStore.getState().runs;
    expect(runs).toHaveLength(1);
    expect(runs[0].payslipIds).toContain(payslip.id);
    expect(runs[0].locked).toBe(true);
});
