/**
 * Unit tests for the Loans store
 */
import { useLoansStore } from "@/store/loans.store";
import type { Loan } from "@/types";

const BASE_LOAN: Omit<Loan, "id" | "createdAt" | "remainingBalance"> = {
    employeeId: "EMP-TEST-001",
    type: "personal",
    amount: 20000,
    monthlyDeduction: 2000,
    status: "active",
    approvedBy: "ADMIN-001",
    deductionCapPercent: 30,
    deductions: [],
};

const resetStore = () => {
    useLoansStore.setState({ loans: [] });
};

beforeEach(resetStore);

// ─── createLoan ──────────────────────────────────────────────────────────────
describe("Loans Store — createLoan", () => {
    it("creates a loan with a generated LN- id", () => {
        useLoansStore.getState().createLoan(BASE_LOAN);
        const loans = useLoansStore.getState().loans;
        expect(loans).toHaveLength(1);
        expect(loans[0].id).toMatch(/^LN-/);
    });

    it("sets remainingBalance equal to amount", () => {
        useLoansStore.getState().createLoan(BASE_LOAN);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.remainingBalance).toBe(20000);
    });

    it("sets createdAt to today (ISO date format)", () => {
        useLoansStore.getState().createLoan(BASE_LOAN);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("preserves all provided fields", () => {
        useLoansStore.getState().createLoan(BASE_LOAN);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.employeeId).toBe("EMP-TEST-001");
        expect(loan.amount).toBe(20000);
        expect(loan.monthlyDeduction).toBe(2000);
        expect(loan.status).toBe("active");
    });
});

// ─── deductFromLoan ───────────────────────────────────────────────────────────
describe("Loans Store — deductFromLoan", () => {
    const LOAN_ID = "LN-DEDUCT-TEST";

    beforeEach(() => {
        useLoansStore.setState({
            loans: [{
                ...BASE_LOAN,
                id: LOAN_ID,
                remainingBalance: 10000,
                createdAt: "2026-01-01",
            }],
        });
    });

    it("reduces the remaining balance", () => {
        useLoansStore.getState().deductFromLoan(LOAN_ID, 2000);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.remainingBalance).toBe(8000);
    });

    it("auto-settles when balance reaches exactly zero", () => {
        useLoansStore.getState().deductFromLoan(LOAN_ID, 10000);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.remainingBalance).toBe(0);
        expect(loan.status).toBe("settled");
    });

    it("does not go below zero (over-deduction clamped)", () => {
        useLoansStore.getState().deductFromLoan(LOAN_ID, 99999);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.remainingBalance).toBe(0);
        expect(loan.status).toBe("settled");
    });

    it("does not affect other loans", () => {
        useLoansStore.setState({
            loans: [
                { ...BASE_LOAN, id: LOAN_ID, remainingBalance: 10000, createdAt: "2026-01-01" },
                { ...BASE_LOAN, id: "LN-OTHER", employeeId: "EMP002", remainingBalance: 5000, createdAt: "2026-01-01" },
            ],
        });
        useLoansStore.getState().deductFromLoan(LOAN_ID, 1000);
        const other = useLoansStore.getState().loans.find((l) => l.id === "LN-OTHER");
        expect(other?.remainingBalance).toBe(5000);
    });
});

// ─── settleLoan ───────────────────────────────────────────────────────────────
describe("Loans Store — settleLoan", () => {
    it("sets status to settled and balance to 0", () => {
        useLoansStore.setState({
            loans: [{ ...BASE_LOAN, id: "LN-S", remainingBalance: 5000, createdAt: "2026-01-01" }],
        });
        useLoansStore.getState().settleLoan("LN-S");
        const loan = useLoansStore.getState().loans[0];
        expect(loan.status).toBe("settled");
        expect(loan.remainingBalance).toBe(0);
    });
});

// ─── freezeLoan / unfreezeLoan ────────────────────────────────────────────────
describe("Loans Store — freezeLoan / unfreezeLoan", () => {
    beforeEach(() => {
        useLoansStore.setState({
            loans: [{ ...BASE_LOAN, id: "LN-F", remainingBalance: 8000, createdAt: "2026-01-01" }],
        });
    });

    it("freezes an active loan", () => {
        useLoansStore.getState().freezeLoan("LN-F");
        expect(useLoansStore.getState().loans[0].status).toBe("frozen");
    });

    it("unfreezes a frozen loan back to active", () => {
        useLoansStore.getState().freezeLoan("LN-F");
        useLoansStore.getState().unfreezeLoan("LN-F");
        expect(useLoansStore.getState().loans[0].status).toBe("active");
    });

    it("unfreeze does not change status if loan is already active", () => {
        // Loan starts as active — unfreeze should be a no-op
        useLoansStore.getState().unfreezeLoan("LN-F");
        expect(useLoansStore.getState().loans[0].status).toBe("active");
    });
});

// ─── getByEmployee / getActiveByEmployee ──────────────────────────────────────
describe("Loans Store — getByEmployee / getActiveByEmployee", () => {
    beforeEach(() => {
        useLoansStore.setState({
            loans: [
                { ...BASE_LOAN, id: "LN-1", employeeId: "EMP001", status: "active", remainingBalance: 5000, createdAt: "2026-01-01" },
                { ...BASE_LOAN, id: "LN-2", employeeId: "EMP001", status: "settled", remainingBalance: 0, createdAt: "2026-01-01" },
                { ...BASE_LOAN, id: "LN-3", employeeId: "EMP002", status: "active", remainingBalance: 3000, createdAt: "2026-01-01" },
            ],
        });
    });

    it("getByEmployee returns all loans for an employee", () => {
        const result = useLoansStore.getState().getByEmployee("EMP001");
        expect(result).toHaveLength(2);
    });

    it("getByEmployee returns empty for unknown employee", () => {
        expect(useLoansStore.getState().getByEmployee("EMP999")).toHaveLength(0);
    });

    it("getActiveByEmployee returns only active loans", () => {
        const result = useLoansStore.getState().getActiveByEmployee("EMP001");
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("LN-1");
    });

    it("getActiveByEmployee excludes settled / frozen", () => {
        const result = useLoansStore.getState().getActiveByEmployee("EMP001");
        expect(result.every((l) => l.status === "active")).toBe(true);
    });
});

// ─── recordDeduction ──────────────────────────────────────────────────────────
describe("Loans Store — recordDeduction", () => {
    const LOAN_ID = "LN-RD";
    const PAYSLIP_ID = "PS-PAYSLIP-01";

    beforeEach(() => {
        useLoansStore.setState({
            loans: [{
                ...BASE_LOAN,
                id: LOAN_ID,
                remainingBalance: 10000,
                createdAt: "2026-01-01",
                deductions: [],
            }],
        });
    });

    it("creates a LoanDeduction entry linked to payslipId", () => {
        useLoansStore.getState().recordDeduction(LOAN_ID, PAYSLIP_ID, 2000);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.deductions).toHaveLength(1);
        expect(loan.deductions![0].payslipId).toBe(PAYSLIP_ID);
        expect(loan.deductions![0].amount).toBe(2000);
        expect(loan.deductions![0].loanId).toBe(LOAN_ID);
    });

    it("reduces the remaining balance after recording a deduction", () => {
        useLoansStore.getState().recordDeduction(LOAN_ID, PAYSLIP_ID, 2000);
        expect(useLoansStore.getState().loans[0].remainingBalance).toBe(8000);
    });

    it("auto-settles when deduction brings balance to zero", () => {
        useLoansStore.getState().recordDeduction(LOAN_ID, PAYSLIP_ID, 10000);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.status).toBe("settled");
        expect(loan.remainingBalance).toBe(0);
    });

    it("accumulates multiple deductions in order", () => {
        useLoansStore.getState().recordDeduction(LOAN_ID, "PS-A", 1000);
        useLoansStore.getState().recordDeduction(LOAN_ID, "PS-B", 1500);
        const loan = useLoansStore.getState().loans[0];
        expect(loan.deductions).toHaveLength(2);
        expect(loan.remainingBalance).toBe(7500);
    });
});

// ─── getAllDeductions ──────────────────────────────────────────────────────────
describe("Loans Store — getAllDeductions", () => {
    it("returns deductions sorted descending by deductedAt", () => {
        useLoansStore.setState({
            loans: [
                {
                    ...BASE_LOAN,
                    id: "LN-ALL",
                    remainingBalance: 4000,
                    createdAt: "2026-01-01",
                    deductions: [
                        { id: "LD-1", loanId: "LN-ALL", payslipId: "PS-1", amount: 1000, deductedAt: "2026-01-01T08:00:00.000Z", remainingAfter: 19000 },
                        { id: "LD-2", loanId: "LN-ALL", payslipId: "PS-2", amount: 1000, deductedAt: "2026-02-01T08:00:00.000Z", remainingAfter: 18000 },
                    ],
                },
            ],
        });
        const all = useLoansStore.getState().getAllDeductions();
        expect(all.length).toBe(2);
        // Most recent first
        expect(all[0].deductedAt > all[1].deductedAt).toBe(true);
    });

    it("injects employeeId from the parent loan", () => {
        useLoansStore.setState({
            loans: [
                {
                    ...BASE_LOAN,
                    id: "LN-EID",
                    employeeId: "EMP-OWNER",
                    remainingBalance: 5000,
                    createdAt: "2026-01-01",
                    deductions: [
                        { id: "LD-X", loanId: "LN-EID", payslipId: "PS-X", amount: 500, deductedAt: "2026-01-15T08:00:00.000Z", remainingAfter: 4500 },
                    ],
                },
            ],
        });
        const all = useLoansStore.getState().getAllDeductions();
        expect(all[0].employeeId).toBe("EMP-OWNER");
    });

    it("returns empty array when no loans have deductions", () => {
        useLoansStore.setState({
            loans: [{ ...BASE_LOAN, id: "LN-EMPTY", remainingBalance: 10000, createdAt: "2026-01-01", deductions: [] }],
        });
        expect(useLoansStore.getState().getAllDeductions()).toHaveLength(0);
    });
});
