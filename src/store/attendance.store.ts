"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
    AttendanceLog, AttendanceFlag, AttendanceEvent, AttendanceEvidence,
    AttendanceException, OvertimeRequest, ShiftTemplate,
} from "@/types";
import { SEED_ATTENDANCE } from "@/data/seed";
import { DEFAULT_HOLIDAYS } from "@/lib/constants";

export interface Holiday {
    id: string;
    date: string;   // "YYYY-MM-DD"
    name: string;
    type: "regular" | "special";
}

interface AttendanceState {
    // ─── Append-only event ledger (§2A) ───────────────
    events: AttendanceEvent[];
    evidence: AttendanceEvidence[];
    exceptions: AttendanceException[];
    // ─── Computed daily view (backward-compatible) ────
    logs: AttendanceLog[];
    overtimeRequests: OvertimeRequest[];
    shiftTemplates: ShiftTemplate[];
    employeeShifts: Record<string, string>;

    // ─── Event ledger (append-only — no edit/delete) ──
    appendEvent: (data: Omit<AttendanceEvent, "id" | "createdAt">) => void;
    recordEvidence: (data: Omit<AttendanceEvidence, "id">) => void;
    getEventsForEmployee: (employeeId: string) => AttendanceEvent[];
    getEventsForDate: (date: string) => AttendanceEvent[];
    getEvidenceForEvent: (eventId: string) => AttendanceEvidence | undefined;

    // ─── Auto-generated exceptions ────────────────────
    autoGenerateExceptions: (date: string, employeeIds: string[]) => void;
    resolveException: (exceptionId: string, resolvedBy: string, notes?: string) => void;
    getExceptions: (filters?: { employeeId?: string; date?: string; resolved?: boolean }) => AttendanceException[];

    // ─── Legacy log operations (derived view) ─────────
    checkIn: (employeeId: string, projectId?: string) => void;
    checkOut: (employeeId: string, projectId?: string) => void;
    markAbsent: (employeeId: string, date: string) => void;
    addFlag: (logId: string, flag: AttendanceFlag) => void;
    removeFlag: (logId: string, flag: AttendanceFlag) => void;
    getEmployeeLogs: (employeeId: string) => AttendanceLog[];
    getTodayLog: (employeeId: string) => AttendanceLog | undefined;
    getFlaggedLogs: () => AttendanceLog[];
    updateLog: (id: string, patch: Partial<Pick<AttendanceLog, "checkIn" | "checkOut" | "hours" | "status" | "lateMinutes">>) => void;
    bulkUpsertLogs: (rows: Array<Pick<AttendanceLog, "employeeId" | "date" | "status"> & Partial<Pick<AttendanceLog, "checkIn" | "checkOut" | "hours" | "lateMinutes">>>) => void;

    // ─── Overtime ─────────────────────────────────────
    submitOvertimeRequest: (data: Omit<OvertimeRequest, "id" | "status" | "requestedAt">) => void;
    approveOvertime: (requestId: string, approverId: string) => void;
    rejectOvertime: (requestId: string, approverId: string, reason: string) => void;

    // ─── Shifts ───────────────────────────────────────
    createShift: (shift: Omit<ShiftTemplate, "id">) => void;    updateShift: (id: string, data: Partial<Omit<ShiftTemplate, "id">>) => void;
    deleteShift: (id: string) => void;    assignShift: (employeeId: string, shiftId: string) => void;

    // ─── Holidays CRUD ────────────────────────────────
    holidays: Holiday[];
    addHoliday: (h: Omit<Holiday, "id">) => void;
    updateHoliday: (id: string, patch: Partial<Omit<Holiday, "id">>) => void;
    deleteHoliday: (id: string) => void;
    resetHolidaysToDefault: () => void;

    resetToSeed: () => void;
}

const DEFAULT_SHIFTS: ShiftTemplate[] = [
    { id: "SHIFT-DAY", name: "Day Shift", startTime: "08:00", endTime: "17:00", gracePeriod: 10, breakDuration: 60, workDays: [1, 2, 3, 4, 5] },
    { id: "SHIFT-MID", name: "Mid Shift", startTime: "12:00", endTime: "21:00", gracePeriod: 10, breakDuration: 60, workDays: [1, 2, 3, 4, 5] },
    { id: "SHIFT-NIGHT", name: "Night Shift", startTime: "22:00", endTime: "06:00", gracePeriod: 15, breakDuration: 60, workDays: [1, 2, 3, 4, 5] },
];

export const useAttendanceStore = create<AttendanceState>()(
    persist(
        (set, get) => ({
            events: [],
            evidence: [],
            exceptions: [],
            logs: SEED_ATTENDANCE,
            overtimeRequests: [],
            shiftTemplates: DEFAULT_SHIFTS,
            employeeShifts: {},
            holidays: DEFAULT_HOLIDAYS.map((h, i) => ({ ...h, id: `HOL-${i + 1}` })),

            // ─── Append-only event ledger ─────────────────────────────
            appendEvent: (data) =>
                set((s) => ({
                    events: [
                        ...s.events,
                        {
                            ...data,
                            id: `EVT-${nanoid(8)}`,
                            createdAt: new Date().toISOString(),
                        },
                    ],
                })),

            recordEvidence: (data) =>
                set((s) => ({
                    evidence: [
                        ...s.evidence,
                        { ...data, id: `EVI-${nanoid(8)}` },
                    ],
                })),

            getEventsForEmployee: (employeeId) =>
                get().events.filter((e) => e.employeeId === employeeId),

            getEventsForDate: (date) =>
                get().events.filter((e) => e.timestampUTC.startsWith(date)),

            getEvidenceForEvent: (eventId) =>
                get().evidence.find((e) => e.eventId === eventId),

            // ─── Auto-generate exceptions for a date ──────────────────
            autoGenerateExceptions: (date, employeeIds) =>
                set((s) => {
                    const newExceptions: AttendanceException[] = [];
                    const now = new Date().toISOString();
                    for (const empId of employeeIds) {
                        const dayEvents = s.events.filter(
                            (e) => e.employeeId === empId && e.timestampUTC.startsWith(date)
                        );
                        const ins = dayEvents.filter((e) => e.eventType === "IN");
                        const outs = dayEvents.filter((e) => e.eventType === "OUT");
                        // Missing IN
                        if (ins.length === 0) {
                            const already = s.exceptions.find(
                                (ex) => ex.employeeId === empId && ex.date === date && ex.flag === "missing_in"
                            );
                            if (!already) {
                                newExceptions.push({
                                    id: `EXC-${nanoid(8)}`, eventId: undefined, employeeId: empId,
                                    date, flag: "missing_in", autoGenerated: true, createdAt: now,
                                });
                            }
                        }
                        // Missing OUT
                        if (ins.length > 0 && outs.length === 0) {
                            const already = s.exceptions.find(
                                (ex) => ex.employeeId === empId && ex.date === date && ex.flag === "missing_out"
                            );
                            if (!already) {
                                newExceptions.push({
                                    id: `EXC-${nanoid(8)}`, eventId: ins[0].id, employeeId: empId,
                                    date, flag: "missing_out", autoGenerated: true, createdAt: now,
                                });
                            }
                        }
                        // Duplicate scan
                        if (ins.length > 1) {
                            newExceptions.push({
                                id: `EXC-${nanoid(8)}`, eventId: ins[1].id, employeeId: empId,
                                date, flag: "duplicate_scan", autoGenerated: true, createdAt: now,
                            });
                        }
                        // Out-of-geofence — check evidence
                        for (const evt of dayEvents) {
                            const evi = s.evidence.find((ev) => ev.eventId === evt.id);
                            if (evi && evi.geofencePass === false) {
                                newExceptions.push({
                                    id: `EXC-${nanoid(8)}`, eventId: evt.id, employeeId: empId,
                                    date, flag: "out_of_geofence", autoGenerated: true, createdAt: now,
                                });
                            }
                            if (evi && evi.mockLocationDetected === true) {
                                newExceptions.push({
                                    id: `EXC-${nanoid(8)}`, eventId: evt.id, employeeId: empId,
                                    date, flag: "device_mismatch", autoGenerated: true, createdAt: now,
                                });
                            }
                        }
                    }
                    if (newExceptions.length === 0) return {};
                    return { exceptions: [...s.exceptions, ...newExceptions] };
                }),

            resolveException: (exceptionId, resolvedBy, notes) =>
                set((s) => ({
                    exceptions: s.exceptions.map((ex) =>
                        ex.id === exceptionId
                            ? { ...ex, resolvedAt: new Date().toISOString(), resolvedBy, notes: notes || ex.notes }
                            : ex
                    ),
                })),

            getExceptions: (filters) => {
                let result = get().exceptions;
                if (filters?.employeeId) result = result.filter((e) => e.employeeId === filters.employeeId);
                if (filters?.date) result = result.filter((e) => e.date === filters.date);
                if (filters?.resolved !== undefined) {
                    result = filters.resolved
                        ? result.filter((e) => !!e.resolvedAt)
                        : result.filter((e) => !e.resolvedAt);
                }
                return result;
            },

            // ─── Legacy log operations (also append event) ───────────
            checkIn: (employeeId, projectId) => {
                const today = new Date().toISOString().split("T")[0];
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

                // Append to event ledger
                const eventId = `EVT-${nanoid(8)}`;
                const assignedShiftId = get().employeeShifts[employeeId];
                const assignedShift = assignedShiftId
                    ? get().shiftTemplates.find((s) => s.id === assignedShiftId)
                    : undefined;
                const graceMinutes = assignedShift?.gracePeriod ?? 10;
                const [shiftStartHour, shiftStartMin] = assignedShift
                    ? assignedShift.startTime.split(":").map(Number)
                    : [8, 0];
                const totalMinIn = now.getHours() * 60 + now.getMinutes();
                const shiftStartTotal = shiftStartHour * 60 + shiftStartMin;
                const rawLate = totalMinIn - shiftStartTotal;
                const lateMinutes = rawLate > graceMinutes ? rawLate : 0;

                set((s) => ({
                    events: [
                        ...s.events,
                        { id: eventId, employeeId, eventType: "IN" as const, timestampUTC: now.toISOString(), projectId, createdAt: now.toISOString() },
                    ],
                }));

                const existing = get().logs.find(
                    (l) => l.employeeId === employeeId && l.date === today
                );
                if (existing) {
                    set((s) => ({
                        logs: s.logs.map((l) =>
                            l.id === existing.id ? { ...l, checkIn: timeStr, status: "present" as const, lateMinutes, projectId } : l
                        ),
                    }));
                } else {
                    set((s) => ({
                        logs: [
                            ...s.logs,
                            {
                                id: `ATT-${today}-${employeeId}`,
                                employeeId,
                                projectId,
                                date: today,
                                checkIn: timeStr,
                                status: "present" as const,
                                lateMinutes,
                            },
                        ],
                    }));
                }
            },

            checkOut: (employeeId, projectId) => {
                const today = new Date().toISOString().split("T")[0];
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

                // Append OUT event
                set((s) => ({
                    events: [
                        ...s.events,
                        { id: `EVT-${nanoid(8)}`, employeeId, eventType: "OUT" as const, timestampUTC: now.toISOString(), projectId, createdAt: now.toISOString() },
                    ],
                }));

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

            markAbsent: (employeeId, date) => {
                const existing = get().logs.find(
                    (l) => l.employeeId === employeeId && l.date === date
                );
                if (existing) {
                    set((s) => ({
                        logs: s.logs.map((l) =>
                            l.id === existing.id ? { ...l, status: "absent" as const, checkIn: undefined, checkOut: undefined, hours: undefined } : l
                        ),
                    }));
                } else {
                    set((s) => ({
                        logs: [
                            ...s.logs,
                            { id: `ATT-${date}-${employeeId}`, employeeId, date, status: "absent" as const },
                        ],
                    }));
                }
            },

            getEmployeeLogs: (employeeId) =>
                get().logs.filter((l) => l.employeeId === employeeId),
            getTodayLog: (employeeId) => {
                const today = new Date().toISOString().split("T")[0];
                return get().logs.find(
                    (l) => l.employeeId === employeeId && l.date === today
                );
            },
            addFlag: (logId, flag) =>
                set((s) => ({
                    logs: s.logs.map((l) =>
                        l.id === logId
                            ? { ...l, flags: [...new Set([...(l.flags ?? []), flag])] }
                            : l
                    ),
                })),
            removeFlag: (logId, flag) =>
                set((s) => ({
                    logs: s.logs.map((l) =>
                        l.id === logId
                            ? { ...l, flags: (l.flags ?? []).filter((f) => f !== flag) }
                            : l
                    ),
                })),
            getFlaggedLogs: () =>
                get().logs.filter((l) => l.flags && l.flags.length > 0),

            updateLog: (id, patch) =>
                set((s) => ({
                    logs: s.logs.map((l) => {
                        if (l.id !== id) return l;
                        const updated = { ...l, ...patch };
                        // Recalculate hours if both times are present
                        if (updated.checkIn && updated.checkOut) {
                            const [inH, inM] = updated.checkIn.split(":").map(Number);
                            const [outH, outM] = updated.checkOut.split(":").map(Number);
                            const rawH = (outH * 60 + outM - inH * 60 - inM) / 60;
                            updated.hours = Math.max(0, Math.round(rawH * 10) / 10);
                        }
                        return updated;
                    }),
                })),

            bulkUpsertLogs: (rows) =>
                set((s) => {
                    const logs = [...s.logs];
                    for (const row of rows) {
                        const idx = logs.findIndex(
                            (l) => l.employeeId === row.employeeId && l.date === row.date
                        );
                        const entry: AttendanceLog = idx >= 0
                            ? { ...logs[idx], ...row }
                            : { id: `ATT-${row.date}-${row.employeeId}`, ...row };
                        // recalc hours
                        if (entry.checkIn && entry.checkOut) {
                            const [inH, inM] = entry.checkIn.split(":").map(Number);
                            const [outH, outM] = entry.checkOut.split(":").map(Number);
                            entry.hours = Math.max(0, Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 10) / 10);
                        }
                        if (idx >= 0) logs[idx] = entry; else logs.push(entry);
                    }
                    return { logs };
                }),

            // ─── Overtime ─────────────────────────────────────────────
            submitOvertimeRequest: (data) =>
                set((s) => ({
                    overtimeRequests: [
                        ...s.overtimeRequests,
                        {
                            ...data,
                            id: `OT-${nanoid(8)}`,
                            status: "pending" as const,
                            requestedAt: new Date().toISOString(),
                        },
                    ],
                })),
            approveOvertime: (requestId, approverId) =>
                set((s) => ({
                    overtimeRequests: s.overtimeRequests.map((r) =>
                        r.id === requestId
                            ? { ...r, status: "approved" as const, reviewedBy: approverId, reviewedAt: new Date().toISOString() }
                            : r
                    ),
                })),
            rejectOvertime: (requestId, approverId, reason) =>
                set((s) => ({
                    overtimeRequests: s.overtimeRequests.map((r) =>
                        r.id === requestId
                            ? { ...r, status: "rejected" as const, reviewedBy: approverId, reviewedAt: new Date().toISOString(), rejectionReason: reason }
                            : r
                    ),
                })),

            // ─── Shifts ───────────────────────────────────────────────
            createShift: (shift) =>
                set((s) => ({
                    shiftTemplates: [
                        ...s.shiftTemplates,
                        { ...shift, id: `SHIFT-${nanoid(8)}` },
                    ],
                })),
            updateShift: (id, data) =>
                set((s) => ({
                    shiftTemplates: s.shiftTemplates.map((t) => (t.id === id ? { ...t, ...data } : t)),
                })),
            deleteShift: (id) =>
                set((s) => ({
                    shiftTemplates: s.shiftTemplates.filter((t) => t.id !== id),
                    employeeShifts: Object.fromEntries(
                        Object.entries(s.employeeShifts).filter(([, sid]) => sid !== id)
                    ),
                })),
            assignShift: (employeeId, shiftId) =>
                set((s) => ({
                    employeeShifts: { ...s.employeeShifts, [employeeId]: shiftId },
                })),

            // ─── Holidays CRUD ────────────────────────────────────────
            addHoliday: (h) =>
                set((s) => ({
                    holidays: [...s.holidays, { ...h, id: `HOL-${nanoid(6)}` }]
                        .sort((a, b) => a.date.localeCompare(b.date)),
                })),
            updateHoliday: (id, patch) =>
                set((s) => ({
                    holidays: s.holidays
                        .map((h) => (h.id === id ? { ...h, ...patch } : h))
                        .sort((a, b) => a.date.localeCompare(b.date)),
                })),
            deleteHoliday: (id) =>
                set((s) => ({ holidays: s.holidays.filter((h) => h.id !== id) })),
            resetHolidaysToDefault: () =>
                set(() => ({ holidays: DEFAULT_HOLIDAYS.map((h, i) => ({ ...h, id: `HOL-${i + 1}` })) })),

            resetToSeed: () =>
                set(() => ({
                    events: [],
                    evidence: [],
                    exceptions: [],
                    logs: SEED_ATTENDANCE,
                    overtimeRequests: [],
                    shiftTemplates: DEFAULT_SHIFTS,
                    employeeShifts: {},
                    holidays: DEFAULT_HOLIDAYS.map((h, i) => ({ ...h, id: `HOL-${i + 1}` })),
                })),
        }),
        {
            name: "nexhrms-attendance",
            version: 4,
            migrate: (persistedState: unknown, version: number) => {
                const state = (persistedState ?? {}) as Record<string, unknown>;
                if (version < 4) {
                    // v3 → v4: holidays field was added
                    if (!state.holidays) {
                        state.holidays = DEFAULT_HOLIDAYS.map((h, i) => ({ ...h, id: `HOL-${i + 1}` }));
                    }
                }
                return state;
            },
        }
    )
);
