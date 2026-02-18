"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Payslip } from "@/types";
import { SEED_PAYSLIPS } from "@/data/seed";

interface PayrollState {
    payslips: Payslip[];
    issuePayslip: (payslip: Omit<Payslip, "id" | "status" | "issuedAt">) => void;
    confirmPayslip: (id: string) => void;
    getByEmployee: (employeeId: string) => Payslip[];
    getPending: () => Payslip[];
}

export const usePayrollStore = create<PayrollState>()(
    persist(
        (set, get) => ({
            payslips: SEED_PAYSLIPS,
            issuePayslip: (data) =>
                set((s) => ({
                    payslips: [
                        ...s.payslips,
                        {
                            ...data,
                            id: `PS${String(s.payslips.length + 1).padStart(3, "0")}`,
                            status: "pending",
                            issuedAt: new Date().toISOString().split("T")[0],
                        },
                    ],
                })),
            confirmPayslip: (id) =>
                set((s) => ({
                    payslips: s.payslips.map((p) =>
                        p.id === id
                            ? { ...p, status: "confirmed", confirmedAt: new Date().toISOString() }
                            : p
                    ),
                })),
            getByEmployee: (employeeId) =>
                get().payslips.filter((p) => p.employeeId === employeeId),
            getPending: () => get().payslips.filter((p) => p.status === "pending"),
        }),
        { name: "nexhrms-payroll", version: 1 }
    )
);
