"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationLog, NotificationType } from "@/types";

interface NotificationsState {
    logs: NotificationLog[];
    addLog: (data: Omit<NotificationLog, "id" | "sentAt">) => void;
    clearLogs: () => void;
    resetToSeed: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
    persist(
        (set) => ({
            logs: [],
            addLog: (data) =>
                set((s) => ({
                    logs: [
                        {
                            ...data,
                            id: `NOTIF${String(s.logs.length + 1).padStart(4, "0")}`,
                            sentAt: new Date().toISOString(),
                        },
                        ...s.logs,
                    ],
                })),
            clearLogs: () => set({ logs: [] }),
            resetToSeed: () => set({ logs: [] }),
        }),
        { name: "nexhrms-notifications", version: 1 }
    )
);
