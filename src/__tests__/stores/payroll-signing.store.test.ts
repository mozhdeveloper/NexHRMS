/**
 * Unit tests for the payroll signing / payment workflow
 *
 * Feature D: Payslip Signing, Acknowledgment & Finance Confirmation
 *
 * Lifecycle: issued → confirmed → published → (signed) → paid → acknowledged
 */
import { usePayrollStore } from "@/store/payroll.store";
import type { Payslip } from "@/types";

/* ---------- helpers ---------- */

const PAYSLIP_DATA: Omit<Payslip, "id" | "status" | "issuedAt"> = {
    employeeId: "EMP-001",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    grossPay: 25000,
    allowances: 1500,
    sssDeduction: 900,
    philhealthDeduction: 450,
    pagibigDeduction: 200,
    taxDeduction: 3000,
    otherDeductions: 0,
    loanDeduction: 0,
    netPay: 19950,
};

const resetStore = () => {
    usePayrollStore.setState({ payslips: [], runs: [], adjustments: [], finalPayComputations: [] });
};

/** Create a payslip at a given status by walking through the lifecycle.
 *  Returns the payslip ID by reading state after insert. */
const createPayslipAtStatus = (
    status: "issued" | "confirmed" | "published" | "paid",
): string => {
    const before = usePayrollStore.getState().payslips.length;
    usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
    const id = usePayrollStore.getState().payslips[before].id;

    if (status === "issued") return id;

    usePayrollStore.getState().confirmPayslip(id);
    if (status === "confirmed") return id;

    usePayrollStore.getState().publishPayslip(id);
    if (status === "published") return id;

    usePayrollStore.getState().recordPayment(id, "bank_transfer", "REF-AUTO");
    return id; // status === "paid"
};

beforeEach(resetStore);

// ═══════════════════════════════════════════════════════════════
// signPayslip
// ═══════════════════════════════════════════════════════════════

describe("signPayslip", () => {
    it("signs a published payslip", () => {
        const id = createPayslipAtStatus("published");
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,sig");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.signedAt).toBeDefined();
        expect(ps.signatureDataUrl).toBe("data:image/png;base64,sig");
        // Status should remain "published" — signing alone doesn't advance status
        expect(ps.status).toBe("published");
    });

    it("signs a paid payslip", () => {
        const id = createPayslipAtStatus("paid");
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,sig2");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.signedAt).toBeDefined();
        expect(ps.signatureDataUrl).toBe("data:image/png;base64,sig2");
        expect(ps.status).toBe("paid");
    });

    it("does NOT sign an issued payslip (guard)", () => {
        const id = createPayslipAtStatus("issued");
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,no");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.signedAt).toBeUndefined();
        expect(ps.signatureDataUrl).toBeUndefined();
    });

    it("does NOT sign a confirmed payslip (guard)", () => {
        const id = createPayslipAtStatus("confirmed");
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,no");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.signedAt).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// confirmPaidByFinance
// ═══════════════════════════════════════════════════════════════

describe("confirmPaidByFinance", () => {
    it("transitions published → paid with finance details", () => {
        const id = createPayslipAtStatus("published");
        usePayrollStore
            .getState()
            .confirmPaidByFinance(id, "FIN-USER", "bank_transfer", "REF-123");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.status).toBe("paid");
        expect(ps.paidConfirmedBy).toBe("FIN-USER");
        expect(ps.paidConfirmedAt).toBeDefined();
        expect(ps.paymentMethod).toBe("bank_transfer");
        expect(ps.bankReferenceId).toBe("REF-123");
    });

    it("does NOT confirm an issued payslip", () => {
        const id = createPayslipAtStatus("issued");
        usePayrollStore
            .getState()
            .confirmPaidByFinance(id, "FIN-USER", "bank_transfer", "REF-123");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.status).toBe("issued");
        expect(ps.paidConfirmedBy).toBeUndefined();
    });

    it("does NOT confirm an already-paid payslip", () => {
        const id = createPayslipAtStatus("paid");
        usePayrollStore
            .getState()
            .confirmPaidByFinance(id, "FIN-USER-2", "cash", "REF-999");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        // Should still be paid from original payment, not modified by re-confirm
        expect(ps.paidConfirmedBy).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// acknowledgePayslip
// ═══════════════════════════════════════════════════════════════

describe("acknowledgePayslip", () => {
    it("acknowledges a signed + paid payslip", () => {
        const id = createPayslipAtStatus("paid");
        // sign first
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,ack");
        // acknowledge
        usePayrollStore.getState().acknowledgePayslip(id, "EMP-001");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.status).toBe("acknowledged");
        expect(ps.acknowledgedAt).toBeDefined();
        expect(ps.acknowledgedBy).toBe("EMP-001");
    });

    it("does NOT acknowledge if not signed (guard)", () => {
        const id = createPayslipAtStatus("paid");
        // NOT signed — should fail
        usePayrollStore.getState().acknowledgePayslip(id, "EMP-001");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.status).toBe("paid"); // unchanged
        expect(ps.acknowledgedAt).toBeUndefined();
    });

    it("does NOT acknowledge a published (not paid) payslip", () => {
        const id = createPayslipAtStatus("published");
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,ack");
        usePayrollStore.getState().acknowledgePayslip(id, "EMP-001");
        const ps = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(ps.status).toBe("published"); // unchanged
    });
});

// ═══════════════════════════════════════════════════════════════
// Full lifecycle traversal
// ═══════════════════════════════════════════════════════════════

describe("Full payslip lifecycle", () => {
    it("issued → confirmed → published → signed → paidByFinance → acknowledged", () => {
        // 1. Issue
        usePayrollStore.getState().issuePayslip(PAYSLIP_DATA);
        const id = usePayrollStore.getState().payslips[0].id;
        expect(usePayrollStore.getState().payslips.find((p) => p.id === id)!.status).toBe(
            "issued",
        );

        // 2. Confirm
        usePayrollStore.getState().confirmPayslip(id);
        expect(usePayrollStore.getState().payslips.find((p) => p.id === id)!.status).toBe(
            "confirmed",
        );

        // 3. Publish
        usePayrollStore.getState().publishPayslip(id);
        expect(usePayrollStore.getState().payslips.find((p) => p.id === id)!.status).toBe(
            "published",
        );

        // 4. Sign
        usePayrollStore.getState().signPayslip(id, "data:image/png;base64,lifecycle");
        const after4 = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(after4.signedAt).toBeDefined();
        expect(after4.status).toBe("published"); // signing doesn't change status

        // 5. Paid by Finance
        usePayrollStore
            .getState()
            .confirmPaidByFinance(id, "FIN-ADMIN", "bank_transfer", "REF-LC-001");
        const after5 = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(after5.status).toBe("paid");
        expect(after5.paidConfirmedBy).toBe("FIN-ADMIN");

        // 6. Acknowledge
        usePayrollStore.getState().acknowledgePayslip(id, "EMP-001");
        const after6 = usePayrollStore.getState().payslips.find((p) => p.id === id)!;
        expect(after6.status).toBe("acknowledged");
        expect(after6.acknowledgedBy).toBe("EMP-001");
    });
});

// ═══════════════════════════════════════════════════════════════
// Query helpers
// ═══════════════════════════════════════════════════════════════

describe("Payslip query helpers", () => {
    it("getPayslipsByStatus filters correctly", () => {
        createPayslipAtStatus("issued");
        createPayslipAtStatus("published");
        createPayslipAtStatus("paid");

        expect(usePayrollStore.getState().getPayslipsByStatus("issued")).toHaveLength(1);
        expect(usePayrollStore.getState().getPayslipsByStatus("published")).toHaveLength(1);
        expect(usePayrollStore.getState().getPayslipsByStatus("paid")).toHaveLength(1);
    });

    it("getSignedPayslips returns only signed ones", () => {
        const pubId = createPayslipAtStatus("published");
        createPayslipAtStatus("published"); // unsigned

        usePayrollStore.getState().signPayslip(pubId, "data:image/png;base64,s");
        expect(usePayrollStore.getState().getSignedPayslips()).toHaveLength(1);
    });

    it("getUnsignedPublished returns published without signature", () => {
        const pubId = createPayslipAtStatus("published");
        createPayslipAtStatus("published");

        expect(usePayrollStore.getState().getUnsignedPublished()).toHaveLength(2);

        usePayrollStore.getState().signPayslip(pubId, "data:image/png;base64,s");
        expect(usePayrollStore.getState().getUnsignedPublished()).toHaveLength(1);
    });
});
