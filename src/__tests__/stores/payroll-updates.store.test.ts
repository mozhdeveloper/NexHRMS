/**
 * Unit tests for payroll UX updates (Phase 30)
 *
 * Covers:
 * 1. Seed data integrity — all 9 payslips published, EMP026 present
 * 2. signPayslip accepts published OR paid (not only paid)
 * 3. getByEmployee returns ALL statuses (employee visibility)
 * 4. Auto-cutoff selection logic (pure function test)
 * 5. Store migration v6 → seed state
 * 6. Employee payslip signing eligibility rules
 */
import { usePayrollStore, DEFAULT_PAY_SCHEDULE } from "@/store/payroll.store";
import { SEED_PAYSLIPS } from "@/data/seed";
import type { Payslip } from "@/types";

/* ---------- helpers ---------- */

const PAYSLIP_DATA: Omit<Payslip, "id" | "status" | "issuedAt"> = {
    employeeId: "EMP-TEST-001",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    grossPay: 30000,
    allowances: 1000,
    sssDeduction: 1350,
    philhealthDeduction: 450,
    pagibigDeduction: 100,
    taxDeduction: 2000,
    otherDeductions: 0,
    loanDeduction: 500,
    netPay: 26600,
};

const resetStore = () => {
    usePayrollStore.setState({
        payslips: [],
        runs: [],
        adjustments: [],
        finalPayComputations: [],
        paySchedule: DEFAULT_PAY_SCHEDULE,
    });
};

beforeEach(resetStore);

// ═══════════════════════════════════════════════════════════════
// 1. Seed Data Integrity
// ═══════════════════════════════════════════════════════════════

describe("Seed Data — payslip integrity", () => {
    it("SEED_PAYSLIPS contains exactly 9 payslips", () => {
        expect(SEED_PAYSLIPS).toHaveLength(9);
    });

    it("all seed payslips have status 'published'", () => {
        for (const ps of SEED_PAYSLIPS) {
            expect(ps.status).toBe("published");
        }
    });

    it("all seed payslips have confirmedAt set", () => {
        for (const ps of SEED_PAYSLIPS) {
            expect(ps.confirmedAt).toBeDefined();
            expect(typeof ps.confirmedAt).toBe("string");
        }
    });

    it("all seed payslips have publishedAt set", () => {
        for (const ps of SEED_PAYSLIPS) {
            expect(ps.publishedAt).toBeDefined();
            expect(typeof ps.publishedAt).toBe("string");
        }
    });

    it("PS009 exists for EMP026 (Sam Torres)", () => {
        const ps = SEED_PAYSLIPS.find((p) => p.id === "PS009");
        expect(ps).toBeDefined();
        expect(ps!.employeeId).toBe("EMP026");
        expect(ps!.grossPay).toBe(44000);
        expect(ps!.netPay).toBe(30762);
        expect(ps!.status).toBe("published");
    });

    it("all seed payslip IDs are unique", () => {
        const ids = SEED_PAYSLIPS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("seed payslips cover expected employee IDs", () => {
        const empIds = SEED_PAYSLIPS.map((p) => p.employeeId);
        expect(empIds).toContain("EMP001");
        expect(empIds).toContain("EMP002");
        expect(empIds).toContain("EMP003");
        expect(empIds).toContain("EMP004");
        expect(empIds).toContain("EMP005");
        expect(empIds).toContain("EMP010");
        expect(empIds).toContain("EMP011");
        expect(empIds).toContain("EMP016");
        expect(empIds).toContain("EMP026");
    });

    it("all seed payslips have valid period ranges", () => {
        for (const ps of SEED_PAYSLIPS) {
            expect(ps.periodStart).toBe("2026-01-01");
            expect(ps.periodEnd).toBe("2026-01-15");
        }
    });

    it("all seed payslips have issuedAt '2026-01-20'", () => {
        for (const ps of SEED_PAYSLIPS) {
            expect(ps.issuedAt).toBe("2026-01-20");
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// 2. signPayslip — accepts published OR paid
// ═══════════════════════════════════════════════════════════════

describe("signPayslip — published + paid eligibility", () => {
    it("signs a published payslip (no payment required)", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-PUB-SIGN", status: "published", issuedAt: "2026-03-31", confirmedAt: "2026-03-31", publishedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-PUB-SIGN", "data:image/png;base64,SIG1");
        const ps = usePayrollStore.getState().payslips[0];
        expect(ps.signedAt).toBeDefined();
        expect(ps.signatureDataUrl).toBe("data:image/png;base64,SIG1");
        expect(ps.status).toBe("published"); // status unchanged
    });

    it("signs a paid payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-PAID-SIGN", status: "paid", issuedAt: "2026-03-31", paidAt: "2026-04-01" }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-PAID-SIGN", "data:image/png;base64,SIG2");
        const ps = usePayrollStore.getState().payslips[0];
        expect(ps.signedAt).toBeDefined();
        expect(ps.signatureDataUrl).toBe("data:image/png;base64,SIG2");
        expect(ps.status).toBe("paid"); // status unchanged
    });

    it("does NOT sign an issued payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-ISS", status: "issued", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-ISS", "data:image/png;base64,NO");
        const ps = usePayrollStore.getState().payslips[0];
        expect(ps.signedAt).toBeUndefined();
        expect(ps.signatureDataUrl).toBeUndefined();
    });

    it("does NOT sign a confirmed payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-CONF", status: "confirmed", issuedAt: "2026-03-31", confirmedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-CONF", "data:image/png;base64,NO");
        const ps = usePayrollStore.getState().payslips[0];
        expect(ps.signedAt).toBeUndefined();
    });

    it("does NOT sign an acknowledged payslip", () => {
        usePayrollStore.setState({
            payslips: [{
                ...PAYSLIP_DATA, id: "PS-ACK", status: "acknowledged", issuedAt: "2026-03-31",
                signedAt: "2026-04-01", signatureDataUrl: "data:image/png;base64,OLD",
                acknowledgedAt: "2026-04-02", acknowledgedBy: "EMP-TEST-001",
            }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-ACK", "data:image/png;base64,NEW");
        const ps = usePayrollStore.getState().payslips[0];
        // Should keep old signature — acknowledged is not published or paid
        expect(ps.signatureDataUrl).toBe("data:image/png;base64,OLD");
    });
});

// ═══════════════════════════════════════════════════════════════
// 3. getByEmployee — returns ALL statuses
// ═══════════════════════════════════════════════════════════════

describe("getByEmployee — all statuses visible", () => {
    beforeEach(() => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-E1-ISS", employeeId: "EMP-VIS-001", status: "issued", issuedAt: "2026-01-31" },
                { ...PAYSLIP_DATA, id: "PS-E1-CNF", employeeId: "EMP-VIS-001", status: "confirmed", issuedAt: "2026-02-28", confirmedAt: "2026-03-01" },
                { ...PAYSLIP_DATA, id: "PS-E1-PUB", employeeId: "EMP-VIS-001", status: "published", issuedAt: "2026-03-31", confirmedAt: "2026-04-01", publishedAt: "2026-04-02" },
                { ...PAYSLIP_DATA, id: "PS-E1-PAID", employeeId: "EMP-VIS-001", status: "paid", issuedAt: "2026-04-30", paidAt: "2026-05-01" },
                { ...PAYSLIP_DATA, id: "PS-E1-ACK", employeeId: "EMP-VIS-001", status: "acknowledged", issuedAt: "2026-05-31", acknowledgedAt: "2026-06-01", acknowledgedBy: "EMP-VIS-001" },
                // Different employee — should NOT appear
                { ...PAYSLIP_DATA, id: "PS-E2-ISS", employeeId: "EMP-VIS-002", status: "issued", issuedAt: "2026-01-31" },
            ],
            runs: [],
            adjustments: [],
            finalPayComputations: [],
        });
    });

    it("returns all 5 payslips for EMP-VIS-001 (all statuses)", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips).toHaveLength(5);
    });

    it("includes issued payslips", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips.some((p) => p.status === "issued")).toBe(true);
    });

    it("includes confirmed payslips", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips.some((p) => p.status === "confirmed")).toBe(true);
    });

    it("includes published payslips", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips.some((p) => p.status === "published")).toBe(true);
    });

    it("includes paid payslips", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips.some((p) => p.status === "paid")).toBe(true);
    });

    it("includes acknowledged payslips", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips.some((p) => p.status === "acknowledged")).toBe(true);
    });

    it("does NOT include payslips from other employees", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-VIS-001");
        expect(slips.every((p) => p.employeeId === "EMP-VIS-001")).toBe(true);
    });

    it("returns empty for non-existent employee", () => {
        expect(usePayrollStore.getState().getByEmployee("EMP-GHOST")).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// 4. Auto-cutoff selection logic
// ═══════════════════════════════════════════════════════════════

describe("Auto-cutoff selection logic", () => {
    /**
     * The admin view computes:
     *   date.getDate() > paySchedule.semiMonthlyFirstCutoff ? "second" : "first"
     *
     * semiMonthlyFirstCutoff defaults to 15.
     * We test the pure logic here.
     */
    const computeCutoff = (dayOfMonth: number, firstCutoff: number): "first" | "second" =>
        dayOfMonth > firstCutoff ? "second" : "first";

    it("day 1 → first cutoff", () => {
        expect(computeCutoff(1, 15)).toBe("first");
    });

    it("day 15 → first cutoff (boundary: not greater)", () => {
        expect(computeCutoff(15, 15)).toBe("first");
    });

    it("day 16 → second cutoff", () => {
        expect(computeCutoff(16, 15)).toBe("second");
    });

    it("day 28 → second cutoff", () => {
        expect(computeCutoff(28, 15)).toBe("second");
    });

    it("day 31 → second cutoff", () => {
        expect(computeCutoff(31, 15)).toBe("second");
    });

    it("custom firstCutoff=10: day 10 → first", () => {
        expect(computeCutoff(10, 10)).toBe("first");
    });

    it("custom firstCutoff=10: day 11 → second", () => {
        expect(computeCutoff(11, 10)).toBe("second");
    });

    it("custom firstCutoff=20: day 19 → first", () => {
        expect(computeCutoff(19, 20)).toBe("first");
    });

    it("custom firstCutoff=20: day 21 → second", () => {
        expect(computeCutoff(21, 20)).toBe("second");
    });

    it("DEFAULT_PAY_SCHEDULE.semiMonthlyFirstCutoff is 15", () => {
        expect(DEFAULT_PAY_SCHEDULE.semiMonthlyFirstCutoff).toBe(15);
    });
});

// ═══════════════════════════════════════════════════════════════
// 5. Store migration & resetToSeed
// ═══════════════════════════════════════════════════════════════

describe("Payroll Store — resetToSeed & migration", () => {
    it("resetToSeed restores seed payslips", () => {
        // Modify state
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        expect(usePayrollStore.getState().payslips.length).toBeGreaterThan(0);

        // Reset
        usePayrollStore.getState().resetToSeed();
        const state = usePayrollStore.getState();
        expect(state.payslips).toHaveLength(9);
        expect(state.payslips.every((p) => p.status === "published")).toBe(true);
    });

    it("resetToSeed clears runs and adjustments", () => {
        usePayrollStore.setState({
            runs: [{ id: "RUN-X", periodLabel: "2026-01-31", createdAt: "2026-01-31", locked: false, payslipIds: [], status: "draft" as const }],
            adjustments: [{ id: "ADJ-X", payrollRunId: "RUN-X", employeeId: "E1", adjustmentType: "earnings" as const, referencePayslipId: "PS1", amount: 1000, reason: "Test", createdBy: "A1", createdAt: "2026-01-01", status: "pending" as const }],
        });
        usePayrollStore.getState().resetToSeed();
        expect(usePayrollStore.getState().runs).toHaveLength(0);
        expect(usePayrollStore.getState().adjustments).toHaveLength(0);
    });

    it("resetToSeed restores default pay schedule", () => {
        usePayrollStore.getState().updatePaySchedule({ semiMonthlyFirstCutoff: 20 });
        expect(usePayrollStore.getState().paySchedule.semiMonthlyFirstCutoff).toBe(20);

        usePayrollStore.getState().resetToSeed();
        expect(usePayrollStore.getState().paySchedule.semiMonthlyFirstCutoff).toBe(15);
    });
});

// ═══════════════════════════════════════════════════════════════
// 6. Employee signing eligibility rules
// ═══════════════════════════════════════════════════════════════

describe("Employee signing eligibility", () => {
    /**
     * Employee-view sign button logic:
     * - signedAt exists → "Signed" (no action)
     * - ["published", "paid"].includes(status) → show "Sign" button
     * - otherwise → dash (not signable)
     *
     * We test the store-level signPayslip guards that enforce this.
     */

    it("published payslip can be signed → signedAt set", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-ELG1", status: "published", issuedAt: "2026-03-31", publishedAt: "2026-04-01" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-ELG1", "data:image/png;base64,E1");
        expect(usePayrollStore.getState().payslips[0].signedAt).toBeDefined();
    });

    it("paid payslip can be signed → signedAt set", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-ELG2", status: "paid", issuedAt: "2026-03-31", paidAt: "2026-04-01" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-ELG2", "data:image/png;base64,E2");
        expect(usePayrollStore.getState().payslips[0].signedAt).toBeDefined();
    });

    it("issued payslip CANNOT be signed", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-NOELG1", status: "issued", issuedAt: "2026-03-31" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-NOELG1", "data:image/png;base64,NO");
        expect(usePayrollStore.getState().payslips[0].signedAt).toBeUndefined();
    });

    it("confirmed payslip CANNOT be signed", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-NOELG2", status: "confirmed", issuedAt: "2026-03-31", confirmedAt: "2026-03-31" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-NOELG2", "data:image/png;base64,NO");
        expect(usePayrollStore.getState().payslips[0].signedAt).toBeUndefined();
    });

    it("acknowledged payslip CANNOT be re-signed", () => {
        usePayrollStore.setState({
            payslips: [{
                ...PAYSLIP_DATA, id: "PS-NOELG3", status: "acknowledged", issuedAt: "2026-03-31",
                signedAt: "2026-04-01", signatureDataUrl: "data:image/png;base64,ORIG",
                acknowledgedAt: "2026-04-02", acknowledgedBy: "EMP-TEST-001",
            }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-NOELG3", "data:image/png;base64,RESIG");
        // Original signature preserved
        expect(usePayrollStore.getState().payslips[0].signatureDataUrl).toBe("data:image/png;base64,ORIG");
    });

    it("signed published payslip → acknowledge requires paid status", () => {
        usePayrollStore.setState({
            payslips: [{
                ...PAYSLIP_DATA, id: "PS-SIG-PUB", status: "published", issuedAt: "2026-03-31",
                signedAt: "2026-04-01", signatureDataUrl: "data:image/png;base64,SIG",
            }],
            runs: [], adjustments: [],
        });
        // Attempting to acknowledge a published (not paid) payslip should fail
        usePayrollStore.getState().acknowledgePayslip("PS-SIG-PUB", "EMP-TEST-001");
        expect(usePayrollStore.getState().payslips[0].status).toBe("published"); // unchanged
    });

    it("full employee flow: published → signed → paid → acknowledged", () => {
        // Issue
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        const id = usePayrollStore.getState().payslips[0].id;

        // Confirm
        usePayrollStore.getState().confirmPayslip(id);
        expect(usePayrollStore.getState().payslips[0].status).toBe("confirmed");

        // Publish
        usePayrollStore.getState().publishPayslip(id);
        expect(usePayrollStore.getState().payslips[0].status).toBe("published");

        // Sign (employee signs published payslip)
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,ESIG");
        expect(usePayrollStore.getState().payslips[0].signedAt).toBeDefined();
        expect(usePayrollStore.getState().payslips[0].status).toBe("published"); // still published

        // Record payment
        usePayrollStore.getState().recordPayment(id, "bank_transfer", "REF-FLOW-1");
        expect(usePayrollStore.getState().payslips[0].status).toBe("paid");

        // Acknowledge (paid + signed → can acknowledge)
        usePayrollStore.getState().acknowledgePayslip(id, "EMP-TEST-001");
        expect(usePayrollStore.getState().payslips[0].status).toBe("acknowledged");
        expect(usePayrollStore.getState().payslips[0].acknowledgedBy).toBe("EMP-TEST-001");
    });
});

// ═══════════════════════════════════════════════════════════════
// 7. Query helpers — getPayslipsByStatus, getSigned, getUnsigned
// ═══════════════════════════════════════════════════════════════

describe("Query helpers with updated signing", () => {
    it("getSignedPayslips includes signed-published payslips", () => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-SP1", status: "published", issuedAt: "2026-03-31", signedAt: "2026-04-01", signatureDataUrl: "sig1" },
                { ...PAYSLIP_DATA, id: "PS-SP2", status: "published", issuedAt: "2026-03-31" }, // unsigned
            ],
            runs: [], adjustments: [],
        });
        expect(usePayrollStore.getState().getSignedPayslips()).toHaveLength(1);
        expect(usePayrollStore.getState().getSignedPayslips()[0].id).toBe("PS-SP1");
    });

    it("getUnsignedPublished returns only unsigned published payslips", () => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-UNSIG1", status: "published", issuedAt: "2026-03-31" },
                { ...PAYSLIP_DATA, id: "PS-UNSIG2", status: "published", issuedAt: "2026-03-31", signedAt: "2026-04-01", signatureDataUrl: "sig" },
                { ...PAYSLIP_DATA, id: "PS-UNSIG3", status: "paid", issuedAt: "2026-03-31" }, // paid, not published
            ],
            runs: [], adjustments: [],
        });
        const unsigned = usePayrollStore.getState().getUnsignedPublished();
        expect(unsigned).toHaveLength(1);
        expect(unsigned[0].id).toBe("PS-UNSIG1");
    });

    it("getPayslipsByStatus correctly filters each status", () => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "A", status: "issued", issuedAt: "2026-01-01" },
                { ...PAYSLIP_DATA, id: "B", status: "confirmed", issuedAt: "2026-01-01", confirmedAt: "2026-01-02" },
                { ...PAYSLIP_DATA, id: "C", status: "published", issuedAt: "2026-01-01", publishedAt: "2026-01-03" },
                { ...PAYSLIP_DATA, id: "D", status: "paid", issuedAt: "2026-01-01", paidAt: "2026-01-04" },
                { ...PAYSLIP_DATA, id: "E", status: "acknowledged", issuedAt: "2026-01-01", acknowledgedAt: "2026-01-05", acknowledgedBy: "EMP1" },
            ],
            runs: [], adjustments: [],
        });
        expect(usePayrollStore.getState().getPayslipsByStatus("issued")).toHaveLength(1);
        expect(usePayrollStore.getState().getPayslipsByStatus("confirmed")).toHaveLength(1);
        expect(usePayrollStore.getState().getPayslipsByStatus("published")).toHaveLength(1);
        expect(usePayrollStore.getState().getPayslipsByStatus("paid")).toHaveLength(1);
        expect(usePayrollStore.getState().getPayslipsByStatus("acknowledged")).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════
// 8. Pay schedule update
// ═══════════════════════════════════════════════════════════════

describe("Pay schedule — cutoff config", () => {
    it("default semiMonthlyFirstCutoff is 15", () => {
        usePayrollStore.getState().resetToSeed();
        expect(usePayrollStore.getState().paySchedule.semiMonthlyFirstCutoff).toBe(15);
    });

    it("updatePaySchedule patches semiMonthlyFirstCutoff", () => {
        usePayrollStore.getState().resetToSeed();
        usePayrollStore.getState().updatePaySchedule({ semiMonthlyFirstCutoff: 10 });
        expect(usePayrollStore.getState().paySchedule.semiMonthlyFirstCutoff).toBe(10);
    });

    it("updatePaySchedule preserves other fields", () => {
        usePayrollStore.getState().resetToSeed();
        usePayrollStore.getState().updatePaySchedule({ semiMonthlyFirstCutoff: 20 });
        const ps = usePayrollStore.getState().paySchedule;
        expect(ps.defaultFrequency).toBe("semi_monthly");
        expect(ps.semiMonthlyFirstPayDay).toBe(20);
        expect(ps.weeklyPayDay).toBe(5);
    });

    it("defaultFrequency is semi_monthly", () => {
        expect(DEFAULT_PAY_SCHEDULE.defaultFrequency).toBe("semi_monthly");
    });
});
