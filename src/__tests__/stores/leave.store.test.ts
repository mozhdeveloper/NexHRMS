/**
 * Unit tests for the Leave store
 */
import { useLeaveStore } from "@/store/leave.store";

const resetStore = () => {
    useLeaveStore.setState({ requests: [], policies: [], balances: [] });
};

beforeEach(resetStore);

const BASE_REQUEST = {
    employeeId: "EMP-TEST-001",
    type: "VL" as const,
    startDate: "2026-03-01",
    endDate: "2026-03-05",
    reason: "Annual vacation to relax",
};

describe("Leave Store — addRequest", () => {
    it("creates a pending leave request with a generated ID", () => {
        useLeaveStore.getState().addRequest(BASE_REQUEST);
        const reqs = useLeaveStore.getState().requests;
        expect(reqs).toHaveLength(1);
        expect(reqs[0].status).toBe("pending");
        expect(reqs[0].id).toMatch(/^LV-/);
        expect(reqs[0].employeeId).toBe("EMP-TEST-001");
        expect(reqs[0].type).toBe("VL");
        expect(reqs[0].startDate).toBe("2026-03-01");
        expect(reqs[0].endDate).toBe("2026-03-05");
    });

    it("can add multiple requests", () => {
        useLeaveStore.getState().addRequest(BASE_REQUEST);
        useLeaveStore.getState().addRequest({ ...BASE_REQUEST, type: "SL", startDate: "2026-04-01", endDate: "2026-04-02" });
        expect(useLeaveStore.getState().requests).toHaveLength(2);
    });

    it("each generated ID is unique", () => {
        useLeaveStore.getState().addRequest(BASE_REQUEST);
        useLeaveStore.getState().addRequest({ ...BASE_REQUEST, reason: "Second request" });
        const ids = useLeaveStore.getState().requests.map((r) => r.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });
});

describe("Leave Store — updateStatus", () => {
    beforeEach(() => {
        useLeaveStore.setState({
            requests: [{
                id: "LV-FIXED",
                employeeId: "EMP-TEST-001",
                type: "VL",
                startDate: "2026-03-01",
                endDate: "2026-03-03",
                reason: "Vacation",
                status: "pending",
            }],
        });
    });

    it("approves a pending request", () => {
        useLeaveStore.getState().updateStatus("LV-FIXED", "approved", "ADMIN-001");
        const req = useLeaveStore.getState().requests[0];
        expect(req.status).toBe("approved");
        expect(req.reviewedBy).toBe("ADMIN-001");
        expect(req.reviewedAt).toBeDefined();
    });

    it("rejects a pending request", () => {
        useLeaveStore.getState().updateStatus("LV-FIXED", "rejected", "ADMIN-001");
        const req = useLeaveStore.getState().requests[0];
        expect(req.status).toBe("rejected");
    });

    it("does not affect other requests", () => {
        useLeaveStore.setState({
            requests: [
                { id: "LV-FIXED", employeeId: "EMP001", type: "VL", startDate: "2026-03-01", endDate: "2026-03-03", reason: "A", status: "pending" },
                { id: "LV-OTHER", employeeId: "EMP002", type: "SL", startDate: "2026-03-01", endDate: "2026-03-01", reason: "B", status: "pending" },
            ],
        });
        useLeaveStore.getState().updateStatus("LV-FIXED", "approved", "ADMIN");
        const other = useLeaveStore.getState().requests.find((r) => r.id === "LV-OTHER");
        expect(other?.status).toBe("pending"); // unchanged
    });
});

describe("Leave Store — getPending", () => {
    it("returns only pending requests", () => {
        useLeaveStore.setState({
            requests: [
                { id: "LV-A", employeeId: "EMP001", type: "VL", startDate: "2026-01-01", endDate: "2026-01-02", reason: "X", status: "pending" },
                { id: "LV-B", employeeId: "EMP002", type: "SL", startDate: "2026-01-01", endDate: "2026-01-01", reason: "Y", status: "approved" },
                { id: "LV-C", employeeId: "EMP003", type: "EL", startDate: "2026-01-01", endDate: "2026-01-01", reason: "Z", status: "rejected" },
            ],
        });
        const pending = useLeaveStore.getState().getPending();
        expect(pending).toHaveLength(1);
        expect(pending[0].id).toBe("LV-A");
    });

    it("returns empty array when there are no pending requests", () => {
        useLeaveStore.setState({ requests: [] });
        expect(useLeaveStore.getState().getPending()).toHaveLength(0);
    });
});

describe("Leave Store — getByEmployee", () => {
    it("returns requests for the specified employee only", () => {
        useLeaveStore.setState({
            requests: [
                { id: "LV-E1-A", employeeId: "EMP001", type: "VL", startDate: "2026-01-01", endDate: "2026-01-03", reason: "R", status: "pending" },
                { id: "LV-E1-B", employeeId: "EMP001", type: "SL", startDate: "2026-02-01", endDate: "2026-02-02", reason: "S", status: "approved" },
                { id: "LV-E2-A", employeeId: "EMP002", type: "VL", startDate: "2026-01-01", endDate: "2026-01-01", reason: "T", status: "pending" },
            ],
        });
        const result = useLeaveStore.getState().getByEmployee("EMP001");
        expect(result).toHaveLength(2);
        expect(result.every((r) => r.employeeId === "EMP001")).toBe(true);
    });

    it("returns empty array when employee has no requests", () => {
        useLeaveStore.setState({ requests: [] });
        expect(useLeaveStore.getState().getByEmployee("EMP999")).toHaveLength(0);
    });
});
