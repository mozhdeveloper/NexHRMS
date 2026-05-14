"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";
import type { AuditLogEntry, AuditAction } from "@/types";
import { auditDb } from "@/services/db.service";

interface AuditState {
    logs: AuditLogEntry[];
    resetToSeed: () => void;
    log: (data: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        performedBy: string;
        reason?: string;
        beforeSnapshot?: Record<string, unknown>;
        afterSnapshot?: Record<string, unknown>;
    }) => void;
    getByEntity: (entityType: string, entityId: string) => AuditLogEntry[];
    getByAction: (action: AuditAction) => AuditLogEntry[];
    getByPerformer: (performedBy: string) => AuditLogEntry[];
    getRecent: (limit?: number) => AuditLogEntry[];
    clearLogs: () => void;
}

export const useAuditStore = create<AuditState>()(
    (set, get) => ({
        logs: [],
        log: (data) => {
            const entry: AuditLogEntry = {
                id: `AUD-${nanoid(8)}`,
                ...data,
                timestamp: new Date().toISOString(),
            };
            // Update local cache immediately (optimistic)
            set((s) => ({ logs: [entry, ...s.logs] }));
            // Write to DB (fire-and-forget — don't block UI)
            auditDb.insert(entry).catch((err) => {
                console.warn("[audit] DB write failed (non-blocking):", err);
            });
        },
        getByEntity: (entityType, entityId) =>
            get().logs.filter((l) => l.entityType === entityType && l.entityId === entityId),
        getByAction: (action) =>
            get().logs.filter((l) => l.action === action),
        getByPerformer: (performedBy) =>
            get().logs.filter((l) => l.performedBy === performedBy),
        getRecent: (limit = 50) =>
            get().logs.slice(0, limit),
        clearLogs: () => set({ logs: [] }),
        resetToSeed: () => set({ logs: [] }),
    })
);
