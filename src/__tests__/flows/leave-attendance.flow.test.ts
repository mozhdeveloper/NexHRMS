/**
 * Integration flow: Leave approval → Attendance sync
 *
 * Simulates the real-world sequence:
 *   1. Employee submits a leave request
 *   2. Admin sees it in getPending()
 *   3. Admin approves → status updates
 *   4. System creates "on_leave" attendance logs for each date in the range
 *   5. Attendance records reflect the approved leave correctly
 */
import { useLeaveStore } from "@/store/leave.store";
import { useAttendanceStore } from "@/store/attendance.store";
import type { AttendanceLog } from "@/types";

const EMP_ID = "EMP-LEAVE-FLOW";
const ADMIN_ID = "ADMIN-001";

/** Replicate the handleApprove logic from leave/page.tsx */
function simulateApproveLeave(requestId: string, employeeId: string, startDate: string, endDate: string) {
    useLeaveStore.getState().updateStatus(requestId, "approved", ADMIN_ID);

    // Build attendance logs for each calendar day in [startDate, endDate]
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateCursor = new Date(start);

    while (dateCursor <= end) {
        const dateStr = dateCursor.toISOString().split("T")[0];

        useAttendanceStore.setState((state) => {
            const existing = state.logs.find(
                (l: AttendanceLog) => l.employeeId === employeeId && l.date === dateStr
            );
            if (existing) {
                return {
                    logs: state.logs.map((l: AttendanceLog) =>
                        l.employeeId === employeeId && l.date === dateStr
                            ? { ...l, status: "on_leave" as const }
                            : l
                    ),
                };
            }
            return {
                logs: [
                    ...state.logs,
                    {
                        id: `AL-${employeeId}-${dateStr}`,
                        employeeId,
                        date: dateStr,
                        status: "on_leave" as const,
                        lateMinutes: 0,
                    } as AttendanceLog,
                ],
            };
        });

        dateCursor.setDate(dateCursor.getDate() + 1);
    }
}

beforeEach(() => {
    useLeaveStore.setState({ requests: [], policies: [], balances: [] });
    useAttendanceStore.setState({ logs: [], overtimeRequests: [], shiftTemplates: [], employeeShifts: {}, events: [], evidence: [], exceptions: [] });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test("flow: submitted leave appears in getPending()", () => {
    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-14",
        endDate: "2026-07-16",
        reason: "Family holiday",
    });

    const pending = useLeaveStore.getState().getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("pending");
});

test("flow: approving leave updates request status to approved", () => {
    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-14",
        endDate: "2026-07-16",
        reason: "Rest",
    });

    const req = useLeaveStore.getState().requests[0];
    simulateApproveLeave(req.id, EMP_ID, req.startDate, req.endDate);

    expect(useLeaveStore.getState().requests[0].status).toBe("approved");
    expect(useLeaveStore.getState().requests[0].reviewedBy).toBe(ADMIN_ID);
    expect(useLeaveStore.getState().requests[0].reviewedAt).toBeDefined();
});

test("flow: approved leave creates on_leave attendance logs for each date in range", () => {
    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-14",
        endDate: "2026-07-16",
        reason: "3-day vacation",
    });

    const req = useLeaveStore.getState().requests[0];
    simulateApproveLeave(req.id, EMP_ID, req.startDate, req.endDate);

    const logs = useAttendanceStore.getState().logs.filter((l) => l.employeeId === EMP_ID);
    expect(logs).toHaveLength(3);

    const dates = logs.map((l) => l.date).sort();
    expect(dates).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"]);
    expect(logs.every((l) => l.status === "on_leave")).toBe(true);
});

test("flow: approved leave does not affect other employees' attendance", () => {
    const OTHER_EMP = "EMP-OTHER-999";

    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-14",
        endDate: "2026-07-14",
        reason: "Single day off",
    });

    const req = useLeaveStore.getState().requests[0];
    simulateApproveLeave(req.id, EMP_ID, req.startDate, req.endDate);

    const otherLogs = useAttendanceStore.getState().logs.filter((l) => l.employeeId === OTHER_EMP);
    expect(otherLogs).toHaveLength(0);
});

test("flow: approval overwrites an existing attendance log status to on_leave", () => {
    // Employee already has a checked-in log for the leave date
    useAttendanceStore.setState({
        logs: [{
            id: "AL-PRE",
            employeeId: EMP_ID,
            date: "2026-07-14",
            status: "present",
            checkIn: "08:00",
            checkOut: "17:00",
            hours: 9,
            lateMinutes: 0,
        }],
        overtimeRequests: [],
        shiftTemplates: [],
        employeeShifts: {},
    });

    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-14",
        endDate: "2026-07-14",
        reason: "Retroactive leave",
    });

    const req = useLeaveStore.getState().requests[0];
    simulateApproveLeave(req.id, EMP_ID, req.startDate, req.endDate);

    const log = useAttendanceStore.getState().logs.find(
        (l) => l.employeeId === EMP_ID && l.date === "2026-07-14"
    );
    expect(log?.status).toBe("on_leave");
    // Original log was updated, not duplicated
    expect(useAttendanceStore.getState().logs.filter((l) => l.employeeId === EMP_ID)).toHaveLength(1);
});

test("flow: rejecting leave does NOT create attendance logs", () => {
    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-14",
        endDate: "2026-07-16",
        reason: "Rejected request",
    });

    const req = useLeaveStore.getState().requests[0];
    useLeaveStore.getState().updateStatus(req.id, "rejected", ADMIN_ID);

    // No attendance sync for rejected leave
    const logs = useAttendanceStore.getState().logs.filter((l) => l.employeeId === EMP_ID);
    expect(logs).toHaveLength(0);
});

test("flow: single-day leave creates exactly one attendance log", () => {
    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "SL",
        startDate: "2026-07-20",
        endDate: "2026-07-20",
        reason: "Sick",
    });

    const req = useLeaveStore.getState().requests[0];
    simulateApproveLeave(req.id, EMP_ID, req.startDate, req.endDate);

    const logs = useAttendanceStore.getState().logs.filter((l) => l.employeeId === EMP_ID);
    expect(logs).toHaveLength(1);
    expect(logs[0].date).toBe("2026-07-20");
    expect(logs[0].status).toBe("on_leave");
});

test("flow: multi-week leave creates correct number of logs", () => {
    // 7-day leave: Jul 21 → Jul 27
    useLeaveStore.getState().addRequest({
        employeeId: EMP_ID,
        type: "VL",
        startDate: "2026-07-21",
        endDate: "2026-07-27",
        reason: "Week off",
    });

    const req = useLeaveStore.getState().requests[0];
    simulateApproveLeave(req.id, EMP_ID, req.startDate, req.endDate);

    const logs = useAttendanceStore.getState().logs.filter((l) => l.employeeId === EMP_ID);
    expect(logs).toHaveLength(7);
});
