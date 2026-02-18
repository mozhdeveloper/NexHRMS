"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaveRequest, LeaveStatus } from "@/types";
import { SEED_LEAVES } from "@/data/seed";

interface LeaveState {
    requests: LeaveRequest[];
    addRequest: (req: Omit<LeaveRequest, "id" | "status">) => void;
    updateStatus: (id: string, status: LeaveStatus, reviewedBy: string) => void;
    getByEmployee: (employeeId: string) => LeaveRequest[];
    getPending: () => LeaveRequest[];
}

export const useLeaveStore = create<LeaveState>()(
    persist(
        (set, get) => ({
            requests: SEED_LEAVES,
            addRequest: (req) =>
                set((s) => ({
                    requests: [
                        ...s.requests,
                        {
                            ...req,
                            id: `LV${String(s.requests.length + 1).padStart(3, "0")}`,
                            status: "pending",
                        },
                    ],
                })),
            updateStatus: (id, status, reviewedBy) =>
                set((s) => ({
                    requests: s.requests.map((r) =>
                        r.id === id
                            ? { ...r, status, reviewedBy, reviewedAt: new Date().toISOString().split("T")[0] }
                            : r
                    ),
                })),
            getByEmployee: (employeeId) =>
                get().requests.filter((r) => r.employeeId === employeeId),
            getPending: () => get().requests.filter((r) => r.status === "pending"),
        }),
        { name: "nexhrms-leave", version: 1 }
    )
);
