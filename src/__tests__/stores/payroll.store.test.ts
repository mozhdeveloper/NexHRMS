/**
 * Unit tests for the Payroll store
 */
import { usePayrollStore } from "@/store/payroll.store";
import type { Payslip } from "@/types";

const PAYSLIP_DATA: Omit<Payslip, "id" | "status" | "issuedAt"> & { issuedAt?: string } = {
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
    usePayrollStore.setState({ payslips: [], runs: [], adjustments: [], finalPayComputations: [] });
};

beforeEach(resetStore);

// ─── issuePayslip ─────────────────────────────────────────────────────────────
describe("Payroll Store — issuePayslip", () => {
    it("creates a payslip with a PS- prefixed ID", () => {
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        const slips = usePayrollStore.getState().payslips;
        expect(slips).toHaveLength(1);
        expect(slips[0].id).toMatch(/^PS-/);
    });

    it("sets status to issued", () => {
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        expect(usePayrollStore.getState().payslips[0].status).toBe("issued");
    });

    it("sets issuedAt to today (YYYY-MM-DD)", () => {
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        const issuedAt = usePayrollStore.getState().payslips[0].issuedAt;
        expect(issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("generates unique IDs for each payslip", () => {
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, employeeId: "EMP-TEST-002" });
        const ids = usePayrollStore.getState().payslips.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

// ─── issuePayslip — custom issuedAt ──────────────────────────────────────────
describe("Payroll Store — issuePayslip with custom issuedAt", () => {
    it("uses the provided issuedAt date instead of today", () => {
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, issuedAt: "2026-01-15" });
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.issuedAt).toBe("2026-01-15");
    });

    it("falls back to today when issuedAt is omitted", () => {
        const today = new Date().toISOString().split("T")[0];
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        expect(usePayrollStore.getState().payslips[0].issuedAt).toBe(today);
    });

    it("multiple payslips can have different custom issuedAt dates", () => {
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, issuedAt: "2026-01-15" });
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, issuedAt: "2026-02-15" });
        const slips = usePayrollStore.getState().payslips;
        expect(slips.find((p) => p.issuedAt === "2026-01-15")).toBeDefined();
        expect(slips.find((p) => p.issuedAt === "2026-02-15")).toBeDefined();
    });

    it("custom issuedAt does not affect payslip status (still issued)", () => {
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, issuedAt: "2025-06-30" });
        expect(usePayrollStore.getState().payslips[0].status).toBe("issued");
    });

    it("lockRun targets payslips matching the custom issuedAt", () => {
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, issuedAt: "2026-01-31" });
        usePayrollStore.getState().issuePayslip({ ...PAYSLIP_DATA, issuedAt: "2026-02-28" });
        usePayrollStore.getState().lockRun("2026-01-31");
        const run = usePayrollStore.getState().runs[0];
        const jan = usePayrollStore.getState().payslips.find((p) => p.issuedAt === "2026-01-31")!;
        const feb = usePayrollStore.getState().payslips.find((p) => p.issuedAt === "2026-02-28")!;
        expect(run.payslipIds).toContain(jan.id);
        expect(run.payslipIds).not.toContain(feb.id);
    });
});

// ─── confirmPayslip ───────────────────────────────────────────────────────────
describe("Payroll Store — confirmPayslip", () => {
    it("updates status to confirmed", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-CONF", status: "issued", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
            finalPayComputations: [],
        });
        usePayrollStore.getState().confirmPayslip("PS-CONF");
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.status).toBe("confirmed");
    });

    it("sets confirmedAt timestamp", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-CA", status: "issued", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
            finalPayComputations: [],
        });
        usePayrollStore.getState().confirmPayslip("PS-CA");
        expect(usePayrollStore.getState().payslips[0].confirmedAt).toBeDefined();
    });

    it("does not affect other payslips", () => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-A", status: "issued", issuedAt: "2026-03-31" },
                { ...PAYSLIP_DATA, id: "PS-B", status: "issued", issuedAt: "2026-03-31" },
            ],
            runs: [],
            adjustments: [],
            finalPayComputations: [],
        });
        usePayrollStore.getState().confirmPayslip("PS-A");
        expect(usePayrollStore.getState().payslips.find((p) => p.id === "PS-B")?.status).toBe("issued");
    });

    it("only confirms an issued payslip (not confirmed/published/etc)", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-ALREADY", status: "confirmed", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
            finalPayComputations: [],
        });
        usePayrollStore.getState().confirmPayslip("PS-ALREADY");
        // Should stay confirmed (not double-confirm)
        expect(usePayrollStore.getState().payslips[0].status).toBe("confirmed");
    });
});

// ─── signPayslip ──────────────────────────────────────────────────────────────
describe("Payroll Store — signPayslip", () => {
    it("attaches signatureDataUrl and sets signedAt when status is paid", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-SIGN", status: "paid", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-SIGN", "data:image/png;base64,ABC");
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.signatureDataUrl).toBe("data:image/png;base64,ABC");
        expect(slip.signedAt).toBeDefined();
        expect(slip.status).toBe("acknowledged");
    });

    it("does not sign if status is not paid", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-NO", status: "confirmed", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().signPayslip("PS-NO", "data:image/png;base64,ABC");
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.signatureDataUrl).toBeUndefined();
        expect(slip.status).toBe("confirmed");
    });
});

// ─── lockRun ──────────────────────────────────────────────────────────────────
describe("Payroll Store — lockRun", () => {
    it("creates a new run with locked=true and id=RUN-{date}", () => {
        usePayrollStore.getState().lockRun("2026-03-31", "ADMIN-001");
        const runs = usePayrollStore.getState().runs;
        expect(runs).toHaveLength(1);
        expect(runs[0].id).toBe("RUN-2026-03-31");
        expect(runs[0].locked).toBe(true);
        expect(runs[0].lockedAt).toBeDefined();
    });

    it("immutable — re-locking an already locked run is a no-op", () => {
        usePayrollStore.setState({
            payslips: [],
            runs: [{ id: "RUN-2026-03-31", periodLabel: "2026-03-31", createdAt: "2026-03-31T00:00:00Z", locked: true, payslipIds: [], status: "locked" as const }],
            adjustments: [],
        });
        usePayrollStore.getState().lockRun("2026-03-31", "ADMIN-001");
        expect(usePayrollStore.getState().runs[0].locked).toBe(true);
    });

    it("locks an existing unlocked run", () => {
        usePayrollStore.setState({
            payslips: [],
            runs: [{ id: "RUN-2026-03-31", periodLabel: "2026-03-31", createdAt: "2026-03-31T00:00:00Z", locked: false, payslipIds: [], status: "validated" as const }],
            adjustments: [],
        });
        usePayrollStore.getState().lockRun("2026-03-31", "ADMIN-001");
        expect(usePayrollStore.getState().runs[0].locked).toBe(true);
        expect(usePayrollStore.getState().runs[0].status).toBe("locked");
    });

    it("includes payslips issued on the same runDate", () => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-X", status: "issued", issuedAt: "2026-03-31" },
                { ...PAYSLIP_DATA, id: "PS-Y", status: "issued", issuedAt: "2026-04-15" }, // different date
            ],
            runs: [],
            adjustments: [],
        });
        usePayrollStore.getState().lockRun("2026-03-31");
        const run = usePayrollStore.getState().runs[0];
        expect(run.payslipIds).toContain("PS-X");
        expect(run.payslipIds).not.toContain("PS-Y");
    });
});

// ─── generate13thMonth ───────────────────────────────────────────────────────
describe("Payroll Store — generate13thMonth", () => {
    const EMPLOYEES = [
        { id: "EMP-A", salary: 36000 },
        { id: "EMP-B", salary: 24000 },
    ];

    it("creates one payslip per employee", () => {
        usePayrollStore.getState().generate13thMonth(EMPLOYEES);
        expect(usePayrollStore.getState().payslips).toHaveLength(2);
    });

    it("each payslip has a unique PS- id", () => {
        usePayrollStore.getState().generate13thMonth(EMPLOYEES);
        const ids = usePayrollStore.getState().payslips.map((p) => p.id);
        expect(ids.every((id) => id.startsWith("PS-"))).toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("grossPay = Math.round(salary / 12)", () => {
        usePayrollStore.getState().generate13thMonth(EMPLOYEES);
        const slips = usePayrollStore.getState().payslips;
        const slipA = slips.find((p) => p.employeeId === "EMP-A")!;
        const slipB = slips.find((p) => p.employeeId === "EMP-B")!;
        expect(slipA.grossPay).toBe(Math.round(36000 / 12)); // 3000
        expect(slipB.grossPay).toBe(Math.round(24000 / 12)); // 2000
    });

    it("status is issued and all deductions are zero", () => {
        usePayrollStore.getState().generate13thMonth([EMPLOYEES[0]]);
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.status).toBe("issued");
        expect(slip.sssDeduction).toBe(0);
        expect(slip.philhealthDeduction).toBe(0);
        expect(slip.pagibigDeduction).toBe(0);
        expect(slip.taxDeduction).toBe(0);
    });

    it("period covers the full calendar year", () => {
        usePayrollStore.getState().generate13thMonth([EMPLOYEES[0]]);
        const slip = usePayrollStore.getState().payslips[0];
        const year = new Date().getFullYear();
        expect(slip.periodStart).toBe(`${year}-01-01`);
        expect(slip.periodEnd).toBe(`${year}-12-31`);
    });
});

// ─── getByEmployee / getPending ───────────────────────────────────────────────
describe("Payroll Store — getByEmployee / getPending", () => {
    beforeEach(() => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-E1-A", status: "issued", issuedAt: "2026-03-31" },
                { ...PAYSLIP_DATA, id: "PS-E1-B", employeeId: "EMP-TEST-001", status: "confirmed", issuedAt: "2026-04-30" },
                { ...PAYSLIP_DATA, id: "PS-E2-A", employeeId: "EMP-TEST-002", status: "issued", issuedAt: "2026-03-31" },
            ],
            runs: [],
            adjustments: [],
            finalPayComputations: [],
        });
    });

    it("getByEmployee filters by employeeId", () => {
        const slips = usePayrollStore.getState().getByEmployee("EMP-TEST-001");
        expect(slips).toHaveLength(2);
        expect(slips.every((p) => p.employeeId === "EMP-TEST-001")).toBe(true);
    });

    it("getByEmployee returns empty for unknown employee", () => {
        expect(usePayrollStore.getState().getByEmployee("EMP-NONE")).toHaveLength(0);
    });

    it("getPending returns only issued payslips", () => {
        const pending = usePayrollStore.getState().getPending();
        expect(pending).toHaveLength(2);
        expect(pending.every((p) => p.status === "issued")).toBe(true);
    });

    it("getPending returns empty when none are issued", () => {
        usePayrollStore.setState({ payslips: [{ ...PAYSLIP_DATA, id: "PS-CNF", status: "confirmed", issuedAt: "2026-03-31" }], runs: [], adjustments: [], finalPayComputations: [] });
        expect(usePayrollStore.getState().getPending()).toHaveLength(0);
    });
});

// ─── exportBankFile ───────────────────────────────────────────────────────────
describe("Payroll Store — exportBankFile", () => {
    it("calls URL.createObjectURL when exporting", () => {
        // Seed a payslip with the correct issuedAt so exportBankFile doesn't early-return
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-EXPORT", status: "confirmed", issuedAt: "2026-03-31", employeeId: "EMP001" }],
            runs: [],
            adjustments: [],
        });

        const createSpy = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url");
        const revokeSpy = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

        const employees = [{ id: "EMP001", name: "Alice", salary: 30000 }];

        // Suppress the DOM click error — anchor click will fail in jsdom
        const anchor = { href: "", download: "", click: jest.fn(), remove: jest.fn() } as unknown as HTMLAnchorElement;
        jest.spyOn(document, "createElement").mockReturnValueOnce(anchor);
        jest.spyOn(document.body, "appendChild").mockImplementation(() => anchor);

        usePayrollStore.getState().exportBankFile("2026-03-31", employees);

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(anchor.click).toHaveBeenCalledTimes(1);

        createSpy.mockRestore();
        revokeSpy.mockRestore();
        (document.createElement as jest.Mock).mockRestore?.();
        (document.body.appendChild as jest.Mock).mockRestore?.();
    });
});

// ─── publishPayslip ───────────────────────────────────────────────────────────
describe("Payroll Store — publishPayslip", () => {
    it("publishes a confirmed payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-PUB", status: "confirmed", issuedAt: "2026-03-31" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().publishPayslip("PS-PUB");
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.status).toBe("published");
        expect(slip.publishedAt).toBeDefined();
    });

    it("does not publish an issued payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-NOPUB", status: "issued", issuedAt: "2026-03-31" }],
            runs: [], adjustments: [], finalPayComputations: [],
        });
        usePayrollStore.getState().publishPayslip("PS-NOPUB");
        expect(usePayrollStore.getState().payslips[0].status).toBe("issued");
    });
});

// ─── recordPayment ────────────────────────────────────────────────────────────
describe("Payroll Store — recordPayment", () => {
    it("records payment on a published payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-PAY", status: "published", issuedAt: "2026-03-31" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().recordPayment("PS-PAY", "bank_transfer", "REF-123");
        const slip = usePayrollStore.getState().payslips[0];
        expect(slip.status).toBe("paid");
        expect(slip.paymentMethod).toBe("bank_transfer");
        expect(slip.bankReferenceId).toBe("REF-123");
        expect(slip.paidAt).toBeDefined();
    });

    it("does not record payment on a non-published payslip", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-NOPAY", status: "confirmed", issuedAt: "2026-03-31" }],
            runs: [], adjustments: [],
        });
        usePayrollStore.getState().recordPayment("PS-NOPAY", "bank_transfer", "REF-456");
        expect(usePayrollStore.getState().payslips[0].status).toBe("confirmed");
    });
});

// ─── publishRun ───────────────────────────────────────────────────────────────
describe("Payroll Store — publishRun", () => {
    it("publishes a locked run and auto-publishes confirmed payslips", () => {
        usePayrollStore.setState({
            payslips: [
                { ...PAYSLIP_DATA, id: "PS-R1", status: "confirmed", issuedAt: "2026-03-31" },
                { ...PAYSLIP_DATA, id: "PS-R2", status: "issued", issuedAt: "2026-03-31" },
            ],
            runs: [{ id: "RUN-2026-03-31", periodLabel: "2026-03-31", createdAt: "2026-03-31T00:00:00Z", locked: true, payslipIds: ["PS-R1", "PS-R2"], status: "locked" as const }],
            adjustments: [],
            finalPayComputations: [],
        });
        usePayrollStore.getState().publishRun("2026-03-31");
        const run = usePayrollStore.getState().runs[0];
        expect(run.status).toBe("published");
        expect(run.publishedAt).toBeDefined();
        // Confirmed payslip auto-published
        expect(usePayrollStore.getState().payslips.find((p) => p.id === "PS-R1")?.status).toBe("published");
        // Issued payslip is NOT auto-published
        expect(usePayrollStore.getState().payslips.find((p) => p.id === "PS-R2")?.status).toBe("issued");
    });

    it("does not publish an unlocked run", () => {
        usePayrollStore.setState({
            payslips: [],
            runs: [{ id: "RUN-2026-03-31", periodLabel: "2026-03-31", createdAt: "2026-03-31T00:00:00Z", locked: false, payslipIds: [], status: "draft" as const }],
            adjustments: [],
            finalPayComputations: [],
        });
        usePayrollStore.getState().publishRun("2026-03-31");
        expect(usePayrollStore.getState().runs[0].status).toBeUndefined();
    });
});

// ─── markRunPaid ──────────────────────────────────────────────────────────────
describe("Payroll Store — markRunPaid", () => {
    it("marks a published run as paid", () => {
        usePayrollStore.setState({
            payslips: [],
            runs: [{ id: "RUN-2026-03-31", periodLabel: "2026-03-31", createdAt: "2026-03-31T00:00:00Z", locked: true, payslipIds: [], status: "published" as const }],
            adjustments: [],
        });
        usePayrollStore.getState().markRunPaid("2026-03-31");
        const run = usePayrollStore.getState().runs[0];
        expect(run.status).toBe("paid");
        expect(run.paidAt).toBeDefined();
    });

    it("does not mark a locked (unpublished) run as paid", () => {
        usePayrollStore.setState({
            payslips: [],
            runs: [{ id: "RUN-2026-03-31", periodLabel: "2026-03-31", createdAt: "2026-03-31T00:00:00Z", locked: true, payslipIds: [], status: "locked" as const }],
            adjustments: [],
        });
        usePayrollStore.getState().markRunPaid("2026-03-31");
        expect(usePayrollStore.getState().runs[0].status).toBe("locked");
    });
});

// ─── Adjustments lifecycle ────────────────────────────────────────────────────
describe("Payroll Store — adjustments", () => {
    it("createAdjustment adds a pending adjustment", () => {
        usePayrollStore.getState().createAdjustment({
            payrollRunId: "RUN-2026-03-31",
            employeeId: "EMP-001",
            adjustmentType: "earnings",
            referencePayslipId: "PS-001",
            amount: 5000,
            reason: "Missed overtime pay",
            createdBy: "ADMIN-001",
        });
        const adjs = usePayrollStore.getState().adjustments;
        expect(adjs).toHaveLength(1);
        expect(adjs[0].id).toMatch(/^ADJ-/);
        expect(adjs[0].status).toBe("pending");
    });

    it("approveAdjustment moves pending → approved", () => {
        usePayrollStore.setState({
            payslips: [], runs: [],
            adjustments: [{
                id: "ADJ-TEST", payrollRunId: "RUN-1", employeeId: "EMP-001",
                adjustmentType: "earnings" as const, referencePayslipId: "PS-001",
                amount: 3000, reason: "Correction", createdBy: "HR-001",
                createdAt: "2026-03-01", status: "pending" as const,
            }],
        });
        usePayrollStore.getState().approveAdjustment("ADJ-TEST", "FIN-001");
        const adj = usePayrollStore.getState().adjustments[0];
        expect(adj.status).toBe("approved");
        expect(adj.approvedBy).toBe("FIN-001");
    });

    it("rejectAdjustment moves pending → rejected", () => {
        usePayrollStore.setState({
            payslips: [], runs: [],
            adjustments: [{
                id: "ADJ-REJ", payrollRunId: "RUN-1", employeeId: "EMP-001",
                adjustmentType: "deduction" as const, referencePayslipId: "PS-001",
                amount: -1000, reason: "Error", createdBy: "HR-001",
                createdAt: "2026-03-01", status: "pending" as const,
            }],
        });
        usePayrollStore.getState().rejectAdjustment("ADJ-REJ", "FIN-001");
        expect(usePayrollStore.getState().adjustments[0].status).toBe("rejected");
    });

    it("applyAdjustment creates a correction payslip and marks applied", () => {
        usePayrollStore.setState({
            payslips: [{ ...PAYSLIP_DATA, id: "PS-ORIG", status: "paid", issuedAt: "2026-03-31" }],
            runs: [],
            adjustments: [{
                id: "ADJ-APP", payrollRunId: "RUN-2026-03-31", employeeId: "EMP-TEST-001",
                adjustmentType: "earnings" as const, referencePayslipId: "PS-ORIG",
                amount: 2000, reason: "Missed bonus", createdBy: "HR-001",
                createdAt: "2026-03-01", status: "approved" as const,
            }],
        });
        usePayrollStore.getState().applyAdjustment("ADJ-APP", "RUN-2026-04-30");
        const adjs = usePayrollStore.getState().adjustments;
        expect(adjs[0].status).toBe("applied");
        expect(adjs[0].appliedRunId).toBe("RUN-2026-04-30");
        // A correction payslip was created
        const corrSlips = usePayrollStore.getState().payslips.filter((p) => p.adjustmentRef === "ADJ-APP");
        expect(corrSlips).toHaveLength(1);
        expect(corrSlips[0].id).toMatch(/^PS-ADJ-/);
        expect(corrSlips[0].notes).toContain("Missed bonus");
    });

    it("applyAdjustment does not apply a pending adjustment", () => {
        usePayrollStore.setState({
            payslips: [], runs: [],
            adjustments: [{
                id: "ADJ-PEND", payrollRunId: "RUN-1", employeeId: "EMP-001",
                adjustmentType: "earnings" as const, referencePayslipId: "PS-001",
                amount: 1000, reason: "Test", createdBy: "HR-001",
                createdAt: "2026-03-01", status: "pending" as const,
            }],
        });
        usePayrollStore.getState().applyAdjustment("ADJ-PEND", "RUN-2");
        expect(usePayrollStore.getState().adjustments[0].status).toBe("pending");
    });
});

// ─── Full lifecycle: pending → confirmed → published → paid → acknowledged ───
describe("Payroll Store — full payslip lifecycle", () => {
    it("walks through all 5 statuses in order", () => {
        // Issue (issued)
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        const id = usePayrollStore.getState().payslips[0].id;
        expect(usePayrollStore.getState().payslips[0].status).toBe("issued");

        // Confirm
        usePayrollStore.getState().confirmPayslip(id);
        expect(usePayrollStore.getState().payslips[0].status).toBe("confirmed");

        // Publish
        usePayrollStore.getState().publishPayslip(id);
        expect(usePayrollStore.getState().payslips[0].status).toBe("published");

        // Record Payment
        usePayrollStore.getState().recordPayment(id, "gcash", "GCASH-999");
        expect(usePayrollStore.getState().payslips[0].status).toBe("paid");

        // Sign / Acknowledge
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,SIG");
        expect(usePayrollStore.getState().payslips[0].status).toBe("acknowledged");
    });
});
