/**
 * Unit tests for Philippine Government Deduction Calculators
 */
import {
    computeSSS,
    computePhilHealth,
    computePagIBIG,
    computeWithholdingTax,
    computeAllPHDeductions,
} from "@/lib/ph-deductions";

// ─── SSS ─────────────────────────────────────────────────────
describe("computeSSS", () => {
    it("returns floor contribution (₱180) for salary ≤ ₱4,250", () => {
        expect(computeSSS(3000)).toBe(180);
        expect(computeSSS(4250)).toBe(180);
    });

    it("returns ceiling contribution (₱1,350) for salary ≥ ₱29,750", () => {
        expect(computeSSS(29750)).toBe(1350);
        expect(computeSSS(50000)).toBe(1350);
        expect(computeSSS(100000)).toBe(1350);
    });

    it("returns 4.5% bracket for mid-range salary", () => {
        // ₱20,000 → nearest bracket: 20,000 → 4.5% = 900
        const result = computeSSS(20000);
        expect(result).toBeGreaterThan(180);
        expect(result).toBeLessThan(1350);
    });

    it("returns a positive number for any positive salary", () => {
        [5000, 15000, 25000].forEach((salary) => {
            expect(computeSSS(salary)).toBeGreaterThan(0);
        });
    });
});

// ─── PhilHealth ──────────────────────────────────────────────
describe("computePhilHealth", () => {
    it("returns floor (₱250) for salary ≤ ₱10,000", () => {
        expect(computePhilHealth(8000)).toBe(250);
        expect(computePhilHealth(10000)).toBe(250);
    });

    it("returns ceiling (₱2,500) for salary ≥ ₱100,000", () => {
        expect(computePhilHealth(100000)).toBe(2500);
        expect(computePhilHealth(200000)).toBe(2500);
    });

    it("returns 2.5% of salary for mid-range salary", () => {
        // ₱50,000 → 2.5% = ₱1,250
        expect(computePhilHealth(50000)).toBe(1250);
        // ₱30,000 → 2.5% = ₱750
        expect(computePhilHealth(30000)).toBe(750);
    });
});

// ─── Pag-IBIG ────────────────────────────────────────────────
describe("computePagIBIG", () => {
    it("returns 1% of salary for salary ≤ ₱1,500", () => {
        expect(computePagIBIG(1000)).toBe(10);
        expect(computePagIBIG(1500)).toBe(15);
    });

    it("returns capped ₱100 for salary > ₱1,500", () => {
        expect(computePagIBIG(5000)).toBe(100);
        expect(computePagIBIG(50000)).toBe(100);
        expect(computePagIBIG(200000)).toBe(100);
    });
});

// ─── Withholding Tax ─────────────────────────────────────────
describe("computeWithholdingTax", () => {
    it("returns 0 for taxable income ≤ ₱20,833 (≤250K/yr exempt)", () => {
        expect(computeWithholdingTax(0)).toBe(0);
        expect(computeWithholdingTax(15000)).toBe(0);
        expect(computeWithholdingTax(20833)).toBe(0);
    });

    it("applies 15% bracket correctly (₱20,834 – ₱33,333)", () => {
        // ₱22,833 → 15% of (22,833 - 20,833) = 15% of 2,000 = ₱300
        expect(computeWithholdingTax(22833)).toBe(300);
    });

    it("applies 20% bracket correctly (₱33,334 – ₱66,667)", () => {
        // ₱40,000 → ₱1,875 + 20% of (40,000 - 33,333) = 1,875 + 1,333 = ₱3,208
        const result = computeWithholdingTax(40000);
        expect(result).toBeGreaterThan(1875);
    });

    it("applies 25% bracket for mid-high income", () => {
        const result = computeWithholdingTax(100000);
        expect(result).toBeGreaterThan(8542);
    });

    it("applies 30% bracket above ₱166,667", () => {
        const result = computeWithholdingTax(200000);
        expect(result).toBeGreaterThan(33542);
    });

    it("applies 35% bracket above ₱666,667", () => {
        const result = computeWithholdingTax(700000);
        expect(result).toBeGreaterThan(183542);
    });
});

// ─── All-in-one ──────────────────────────────────────────────
describe("computeAllPHDeductions", () => {
    it("totalDeductions equals sum of all individual deductions", () => {
        const result = computeAllPHDeductions(50000);
        const expected = result.sss + result.philHealth + result.pagIBIG + result.withholdingTax;
        expect(result.totalDeductions).toBe(expected);
    });

    it("returns correct shape for a ₱30,000 monthly gross", () => {
        const result = computeAllPHDeductions(30000);
        expect(result).toMatchObject({
            sss: expect.any(Number),
            philHealth: 750,      // 2.5% of 30,000
            pagIBIG: 100,         // capped
            withholdingTax: expect.any(Number),
            totalDeductions: expect.any(Number),
        });
    });

    it("exempt employee with very low salary has 0 withholding tax", () => {
        const result = computeAllPHDeductions(15000);
        expect(result.withholdingTax).toBe(0);
    });

    it("all deductions are non-negative for any positive gross", () => {
        const result = computeAllPHDeductions(10000);
        expect(result.sss).toBeGreaterThanOrEqual(0);
        expect(result.philHealth).toBeGreaterThanOrEqual(0);
        expect(result.pagIBIG).toBeGreaterThanOrEqual(0);
        expect(result.withholdingTax).toBeGreaterThanOrEqual(0);
    });
});
