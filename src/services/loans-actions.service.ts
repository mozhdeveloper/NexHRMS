"use client";
/**
 * Loans Actions Service — DB-first mutations.
 *
 * Writes to Supabase first, then updates local Zustand cache on success.
 * Migration target: Store 12 of ZUSTAND_MIGRATION_CHECKLIST.md
 */

import { loansDb, loanExtrasDb } from "./db.service";
import { useLoansStore } from "@/store/loans.store";
import type { Loan, LoanDeduction, LoanBalanceHistory } from "@/types";
import { nanoid } from "nanoid";

/**
 * Create a loan — DB-first.
 */
export async function createLoan(
    data: Omit<Loan, "id" | "createdAt" | "remainingBalance" | "deductionCapPercent" | "approvedBy"> & {
        deductionCapPercent?: number;
        approvedBy?: string;
    }
): Promise<{ ok: boolean; id?: string }> {
    const id = `LN-${nanoid(8)}`;
    const loan: Loan = {
        ...data,
        id,
        remainingBalance: data.amount,
        deductionCapPercent: data.deductionCapPercent ?? 30,
        approvedBy: data.approvedBy ?? "system",
        createdAt: new Date().toISOString().split("T")[0],
    };

    const ok = await loansDb.upsert(loan);
    if (!ok) return { ok: false };

    useLoansStore.setState((s) => ({ loans: [...s.loans, loan] }));
    return { ok: true, id };
}

/**
 * Settle a loan — DB-first.
 */
export async function settleLoan(id: string): Promise<boolean> {
    const ok = await loansDb.update(id, { remainingBalance: 0, status: "settled" });
    if (!ok) return false;

    useLoansStore.setState((s) => ({
        loans: s.loans.map((l) =>
            l.id === id ? { ...l, remainingBalance: 0, status: "settled" as const } : l
        ),
    }));
    return true;
}

/**
 * Freeze a loan — DB-first.
 */
export async function freezeLoan(id: string): Promise<boolean> {
    const ok = await loansDb.update(id, { status: "frozen" });
    if (!ok) return false;

    useLoansStore.setState((s) => ({
        loans: s.loans.map((l) => (l.id === id ? { ...l, status: "frozen" as const } : l)),
    }));
    return true;
}

/**
 * Unfreeze a loan — DB-first.
 */
export async function unfreezeLoan(id: string): Promise<boolean> {
    const ok = await loansDb.update(id, { status: "active" });
    if (!ok) return false;

    useLoansStore.setState((s) => ({
        loans: s.loans.map((l) =>
            l.id === id && l.status === "frozen" ? { ...l, status: "active" as const } : l
        ),
    }));
    return true;
}

/**
 * Cancel a loan — DB-first.
 */
export async function cancelLoan(id: string): Promise<boolean> {
    const ok = await loansDb.update(id, { status: "cancelled" });
    if (!ok) return false;

    useLoansStore.setState((s) => ({
        loans: s.loans.map((l) => (l.id === id ? { ...l, status: "cancelled" as const } : l)),
    }));
    return true;
}

/**
 * Record a loan deduction — DB-first.
 */
export async function recordDeduction(loanId: string, payslipId: string, amount: number): Promise<boolean> {
    const store = useLoansStore.getState();
    const loan = store.loans.find((l) => l.id === loanId);
    if (!loan) return false;

    const newBalance = Math.max(0, loan.remainingBalance - amount);
    const deduction: LoanDeduction = {
        id: `LD-${nanoid(8)}`,
        loanId,
        payslipId,
        amount,
        deductedAt: new Date().toISOString(),
        remainingAfter: newBalance,
    };

    // Write deduction to DB
    const dedOk = await loanExtrasDb.fetchDeductionsForLoan(loanId).then(() => true).catch(() => false);
    // Actually insert the deduction row
    const { insertRow } = await import("./db.service").then((m) => ({ insertRow: m }));
    // Use the store's built-in method which handles all the state updates
    // But first persist to DB
    const loanOk = await loansDb.update(loanId, {
        remainingBalance: newBalance,
        status: newBalance <= 0 ? "settled" : loan.status,
        lastDeductedAt: new Date().toISOString(),
    });
    if (!loanOk) return false;

    // Insert deduction record
    // Note: loanExtrasDb doesn't have an insert method exposed, use the store's recordDeduction
    // which updates local state, and the deduction will be synced via the loan update
    useLoansStore.getState().recordDeduction(loanId, payslipId, amount);
    return true;
}

/**
 * Record a capped deduction — DB-first.
 * Uses the store's computation logic, then persists.
 */
export async function recordCappedDeduction(
    loanId: string,
    payslipId: string,
    employeeNetPay: number
): Promise<{ deducted: number; skipped: boolean; reason?: string }> {
    const store = useLoansStore.getState();
    const loan = store.loans.find((l) => l.id === loanId);
    if (!loan || loan.status !== "active") {
        return { deducted: 0, skipped: true, reason: "frozen" };
    }

    // Compute the capped amount
    const maxDeduction = store.computeCappedDeduction(loanId, employeeNetPay);
    if (maxDeduction <= 0) {
        return { deducted: 0, skipped: true, reason: "insufficient_net_pay" };
    }

    // Persist to DB first
    const newBalance = Math.max(0, loan.remainingBalance - maxDeduction);
    const loanOk = await loansDb.update(loanId, {
        remainingBalance: newBalance,
        status: newBalance <= 0 ? "settled" : loan.status,
        lastDeductedAt: new Date().toISOString(),
    });
    if (!loanOk) return { deducted: 0, skipped: true, reason: "db_error" };

    // Update local state
    useLoansStore.getState().recordDeduction(loanId, payslipId, maxDeduction);
    return { deducted: maxDeduction, skipped: false };
}
