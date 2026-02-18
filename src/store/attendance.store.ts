"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AttendanceLog } from "@/types";
import { SEED_ATTENDANCE } from "@/data/seed";

interface AttendanceState {
    logs: AttendanceLog[];
    checkIn: (employeeId: string) => void;
    checkOut: (employeeId: string) => void;
    getEmployeeLogs: (employeeId: string) => AttendanceLog[];
    getTodayLog: (employeeId: string) => AttendanceLog | undefined;
}

export const useAttendanceStore = create<AttendanceState>()(
    persist(
        (set, get) => ({
            logs: SEED_ATTENDANCE,
            checkIn: (employeeId) => {
                const today = new Date().toISOString().split("T")[0];
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                const existing = get().logs.find(
                    (l) => l.employeeId === employeeId && l.date === today
                );
                if (existing) {
                    set((s) => ({
                        logs: s.logs.map((l) =>
                            l.id === existing.id ? { ...l, checkIn: timeStr, status: "present" as const } : l
                        ),
                    }));
                } else {
                    set((s) => ({
                        logs: [
                            ...s.logs,
                            {
                                id: `ATT-${today}-${employeeId}`,
                                employeeId,
                                date: today,
                                checkIn: timeStr,
                                status: "present" as const,
                            },
                        ],
                    }));
                }
            },
            checkOut: (employeeId) => {
                const today = new Date().toISOString().split("T")[0];
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                set((s) => ({
                    logs: s.logs.map((l) => {
                        if (l.employeeId === employeeId && l.date === today && l.checkIn) {
                            const [inH, inM] = l.checkIn.split(":").map(Number);
                            const hours = now.getHours() - inH + (now.getMinutes() - inM) / 60;
                            return { ...l, checkOut: timeStr, hours: Math.round(hours * 10) / 10 };
                        }
                        return l;
                    }),
                }));
            },
            getEmployeeLogs: (employeeId) =>
                get().logs.filter((l) => l.employeeId === employeeId),
            getTodayLog: (employeeId) => {
                const today = new Date().toISOString().split("T")[0];
                return get().logs.find(
                    (l) => l.employeeId === employeeId && l.date === today
                );
            },
        }),
        { name: "nexhrms-attendance", version: 1 }
    )
);
