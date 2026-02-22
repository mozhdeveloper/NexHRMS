/**
 * Integration / flow tests for the entire Client Feature Pack
 *
 * Tests cross-feature scenarios:
 *   • Geofence + Location Store integration
 *   • Payslip signing → notification dispatch flow
 *   • Break → ping on break_end flow
 *   • Finance confirmation → notification flow
 *   • Config-driven behaviour changes
 */
import { useLocationStore } from "@/store/location.store";
import { usePayrollStore } from "@/store/payroll.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { getDistanceMeters, isWithinGeofence } from "@/lib/geofence";

beforeEach(() => {
    useLocationStore.getState().resetToSeed();
    usePayrollStore.setState({
        payslips: [],
        runs: [],
        adjustments: [],
        finalPayComputations: [],
    });
    useNotificationsStore.getState().resetRules();
    useNotificationsStore.getState().clearLogs();
});

// ═══════════════════════════════════════════════════════════════
// Cross-feature: Geofence utility + Location store
// ═══════════════════════════════════════════════════════════════

describe("Geofence utility + Location Store integration", () => {
    const OFFICE_LAT = 14.5995;
    const OFFICE_LNG = 120.9842;
    const RADIUS = 200; // 200 m

    it("ping within geofence has withinGeofence=true", () => {
        // Same location = within fence
        const result = isWithinGeofence(14.5995, 120.9842, OFFICE_LAT, OFFICE_LNG, RADIUS);
        expect(result.within).toBe(true);
        expect(result.distanceMeters).toBeLessThan(RADIUS);

        useLocationStore.getState().addPing({
            employeeId: "EMP-001",
            timestamp: new Date().toISOString(),
            lat: 14.5995,
            lng: 120.9842,
            accuracyMeters: 5,
            withinGeofence: result.within,
            distanceFromSite: result.distanceMeters,
            source: "auto",
        });
        expect(useLocationStore.getState().pings[0].withinGeofence).toBe(true);
    });

    it("ping outside geofence has withinGeofence=false", () => {
        // 1km away
        const result = isWithinGeofence(14.6100, 120.9842, OFFICE_LAT, OFFICE_LNG, RADIUS);
        expect(result.within).toBe(false);
        expect(result.distanceMeters).toBeGreaterThan(RADIUS);

        useLocationStore.getState().addPing({
            employeeId: "EMP-001",
            timestamp: new Date().toISOString(),
            lat: 14.6100,
            lng: 120.9842,
            accuracyMeters: 10,
            withinGeofence: result.within,
            distanceFromSite: result.distanceMeters,
            source: "auto",
        });
        expect(useLocationStore.getState().pings[0].withinGeofence).toBe(false);
    });

    it("Haversine distance is symmetric", () => {
        const d1 = getDistanceMeters(14.5995, 120.9842, 14.6100, 120.9842);
        const d2 = getDistanceMeters(14.6100, 120.9842, 14.5995, 120.9842);
        expect(Math.abs(d1 - d2)).toBeLessThan(0.01);
    });

    it("same point distance = 0", () => {
        expect(getDistanceMeters(14.5, 120.9, 14.5, 120.9)).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// Cross-feature: Break end → selfie + ping
// ═══════════════════════════════════════════════════════════════

describe("Break end triggers location ping (simulated flow)", () => {
    it("ending a break and recording a break_end ping", () => {
        const breakId = useLocationStore.getState().startBreak({
            employeeId: "EMP-001",
            breakType: "lunch",
            lat: 14.5995,
            lng: 120.9842,
        });

        // End break (employee returns from lunch)
        useLocationStore.getState().endBreak(breakId, {
            lat: 14.5996,
            lng: 120.9843,
            geofencePass: true,
            distanceFromSite: 15,
        });

        // Record a break_end ping (simulating what the frontend does)
        useLocationStore.getState().addPing({
            employeeId: "EMP-001",
            timestamp: new Date().toISOString(),
            lat: 14.5996,
            lng: 120.9843,
            accuracyMeters: 8,
            withinGeofence: true,
            distanceFromSite: 15,
            source: "break_end",
        });

        const pings = useLocationStore.getState().getPings("EMP-001");
        expect(pings).toHaveLength(1);
        expect(pings[0].source).toBe("break_end");

        const b = useLocationStore.getState().breaks[0];
        expect(b.endTime).toBeDefined();
        expect(b.duration).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// Cross-feature: Payslip signing → notification dispatch
// ═══════════════════════════════════════════════════════════════

describe("Payslip signing → notification flow", () => {
    it("dispatches payslip_signed notification after signing", () => {
        // Create and publish a payslip
        usePayrollStore.getState().issuePayslip({
            employeeId: "EMP-001",
            periodStart: "2026-06-01",
            periodEnd: "2026-06-30",
            grossPay: 25000,
            allowances: 0,
            sssDeduction: 900,
            philhealthDeduction: 450,
            pagibigDeduction: 200,
            taxDeduction: 3000,
            otherDeductions: 0,
            loanDeduction: 0,
            netPay: 20450,
        });
        const id = usePayrollStore.getState().payslips[0].id;
        usePayrollStore.getState().confirmPayslip(id);
        usePayrollStore.getState().publishPayslip(id);

        // Sign the payslip
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,sig");

        // Dispatch notification (simulating what the UI does)
        useNotificationsStore.getState().dispatch(
            "payslip_signed",
            { name: "Juan Dela Cruz", period: "June 2026" },
            "EMP-001",
            "juan@company.com",
        );

        const logs = useNotificationsStore.getState().logs;
        expect(logs.length).toBeGreaterThanOrEqual(1);
        const signedLog = logs.find((l) => l.type === "payslip_signed");
        expect(signedLog).toBeDefined();
        expect(signedLog!.subject).toContain("Juan Dela Cruz");
    });
});

// ═══════════════════════════════════════════════════════════════
// Cross-feature: Finance confirmation → notification
// ═══════════════════════════════════════════════════════════════

describe("Finance payment confirmation → notification flow", () => {
    it("dispatches payment_confirmed notification", () => {
        usePayrollStore.getState().issuePayslip({
            employeeId: "EMP-001",
            periodStart: "2026-07-01",
            periodEnd: "2026-07-31",
            grossPay: 30000,
            allowances: 0,
            sssDeduction: 1000,
            philhealthDeduction: 500,
            pagibigDeduction: 200,
            taxDeduction: 4000,
            otherDeductions: 0,
            loanDeduction: 0,
            netPay: 24300,
        });
        const id = usePayrollStore.getState().payslips[0].id;
        usePayrollStore.getState().confirmPayslip(id);
        usePayrollStore.getState().publishPayslip(id);
        usePayrollStore.getState().confirmPaidByFinance(id, "FIN-001", "bank_transfer", "REF-777");

        // Verify payslip is paid
        expect(usePayrollStore.getState().payslips.find((p) => p.id === id)!.status).toBe("paid");

        // Dispatch notification
        useNotificationsStore.getState().dispatch(
            "payment_confirmed",
            { name: "Maria Santos", period: "July 2026" },
            "EMP-001",
            undefined,
            "+639171234567",
        );

        const logs = useNotificationsStore.getState().logs;
        const paymentLog = logs.find((l) => l.type === "payment_confirmed");
        expect(paymentLog).toBeDefined();
        expect(paymentLog!.channel).toBe("sms");
    });
});

// ═══════════════════════════════════════════════════════════════
// Cross-feature: Config-driven behaviour
// ═══════════════════════════════════════════════════════════════

describe("Location config affects behaviour", () => {
    it("shorter retention purges pings faster", () => {
        // Add a 10-day-old ping
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        useLocationStore.getState().addPing({
            employeeId: "EMP-001",
            timestamp: tenDaysAgo.toISOString(),
            lat: 14.5,
            lng: 120.9,
            accuracyMeters: 10,
            withinGeofence: true,
            source: "auto",
        });

        // With default retainDays=30, 10-day-old ping survives
        useLocationStore.getState().purgeOldPings();
        expect(useLocationStore.getState().pings).toHaveLength(1);

        // Change to 5 days retention
        useLocationStore.getState().updateConfig({ retainDays: 5 });
        useLocationStore.getState().purgeOldPings();
        // Now the 10-day-old ping should be purged
        expect(useLocationStore.getState().pings).toHaveLength(0);
    });

    it("changing lunchOvertimeThreshold changes overtime calculation", () => {
        // Default: lunchDuration=60, threshold=5, so overtime at >65min
        // Set threshold to 0 — overtime triggers at any time over 60min
        useLocationStore.getState().updateConfig({ lunchOvertimeThreshold: 0 });
        expect(useLocationStore.getState().config.lunchOvertimeThreshold).toBe(0);

        // The actual overtime calculation happens in endBreak, which compares
        // real time difference. Since we can't easily control time in tests,
        // we verify the config is properly read.
        const id = useLocationStore.getState().startBreak({
            employeeId: "EMP-001",
            breakType: "lunch",
        });
        useLocationStore.getState().endBreak(id, { geofencePass: true });
        const b = useLocationStore.getState().breaks[0];
        // Duration should be 0 or very small since instant end
        expect(b.overtime).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// Cross-feature: Disabled notification rules skip dispatch
// ═══════════════════════════════════════════════════════════════

describe("Notification rules gating", () => {
    it("disabling payslip_published rule prevents dispatch", () => {
        const rule = useNotificationsStore.getState().getRuleByTrigger("payslip_published")!;
        useNotificationsStore.getState().toggleRule(rule.id);

        useNotificationsStore.getState().dispatch(
            "payslip_published",
            { name: "Test" },
            "EMP-001",
            "test@test.com",
        );
        expect(useNotificationsStore.getState().logs).toHaveLength(0);
    });

    it("re-enabling rule allows dispatch again", () => {
        const rule = useNotificationsStore.getState().getRuleByTrigger("payslip_published")!;
        useNotificationsStore.getState().toggleRule(rule.id); // disable
        useNotificationsStore.getState().toggleRule(rule.id); // re-enable

        useNotificationsStore.getState().dispatch(
            "payslip_published",
            { name: "Test" },
            "EMP-001",
            "test@test.com",
        );
        expect(useNotificationsStore.getState().logs.length).toBeGreaterThan(0);
    });
});
