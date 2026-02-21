/**
 * Unit tests for the Employees store
 */
import { useEmployeesStore } from "@/store/employees.store";
import type { Employee } from "@/types";

const MOCK_EMP: Employee = {
    id: "TEST-EMP-001",
    name: "Test User",
    email: "test@company.com",
    role: "Developer",
    department: "Engineering",
    status: "active",
    workType: "WFO",
    salary: 80000,
    joinDate: "2024-01-01",
    productivity: 85,
    location: "Manila",
};

const MOCK_EMP_2: Employee = {
    id: "TEST-EMP-002",
    name: "Alice Finance",
    email: "alice@company.com",
    role: "Accountant",
    department: "Finance",
    status: "inactive",
    workType: "WFH",
    salary: 70000,
    joinDate: "2024-02-01",
    productivity: 75,
    location: "Makati",
};

const resetStore = () => {
    useEmployeesStore.setState({
        employees: [],
        salaryRequests: [],
        salaryHistory: [],
        searchQuery: "",
        statusFilter: "all",
        workTypeFilter: "all",
        departmentFilter: "all",
    });
};

beforeEach(resetStore);

describe("Employees Store — addEmployee", () => {
    it("adds an employee to the list", () => {
        const { addEmployee } = useEmployeesStore.getState();
        addEmployee(MOCK_EMP);
        expect(useEmployeesStore.getState().employees).toHaveLength(1);
        expect(useEmployeesStore.getState().employees[0]).toEqual(MOCK_EMP);
    });

    it("can add multiple employees", () => {
        const { addEmployee } = useEmployeesStore.getState();
        addEmployee(MOCK_EMP);
        addEmployee(MOCK_EMP_2);
        expect(useEmployeesStore.getState().employees).toHaveLength(2);
    });
});

describe("Employees Store — getEmployee", () => {
    it("returns the correct employee by ID", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP, MOCK_EMP_2] });
        const emp = useEmployeesStore.getState().getEmployee("TEST-EMP-001");
        expect(emp).toEqual(MOCK_EMP);
    });

    it("returns undefined for a non-existent ID", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        const emp = useEmployeesStore.getState().getEmployee("DOES-NOT-EXIST");
        expect(emp).toBeUndefined();
    });
});

describe("Employees Store — updateEmployee", () => {
    it("updates specific fields of an employee", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        const { updateEmployee } = useEmployeesStore.getState();
        updateEmployee("TEST-EMP-001", { salary: 90000, department: "Design" });

        const updated = useEmployeesStore.getState().getEmployee("TEST-EMP-001");
        expect(updated?.salary).toBe(90000);
        expect(updated?.department).toBe("Design");
        // Other fields unchanged
        expect(updated?.name).toBe("Test User");
    });

    it("does not affect other employees", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP, MOCK_EMP_2] });
        const { updateEmployee } = useEmployeesStore.getState();
        updateEmployee("TEST-EMP-001", { salary: 99999 });

        const emp2 = useEmployeesStore.getState().getEmployee("TEST-EMP-002");
        expect(emp2?.salary).toBe(70000); // unchanged
    });
});

describe("Employees Store — removeEmployee", () => {
    it("removes the specified employee", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP, MOCK_EMP_2] });
        const { removeEmployee } = useEmployeesStore.getState();
        removeEmployee("TEST-EMP-001");

        const employees = useEmployeesStore.getState().employees;
        expect(employees).toHaveLength(1);
        expect(employees[0].id).toBe("TEST-EMP-002");
    });

    it("does nothing if ID does not exist", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] });
        const { removeEmployee } = useEmployeesStore.getState();
        removeEmployee("GHOST");
        expect(useEmployeesStore.getState().employees).toHaveLength(1);
    });
});

describe("Employees Store — toggleStatus", () => {
    it("toggles an active employee to inactive", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP] }); // active
        const { toggleStatus } = useEmployeesStore.getState();
        toggleStatus("TEST-EMP-001");
        expect(useEmployeesStore.getState().getEmployee("TEST-EMP-001")?.status).toBe("inactive");
    });

    it("toggles an inactive employee to active", () => {
        useEmployeesStore.setState({ employees: [MOCK_EMP_2] }); // inactive
        const { toggleStatus } = useEmployeesStore.getState();
        toggleStatus("TEST-EMP-002");
        expect(useEmployeesStore.getState().getEmployee("TEST-EMP-002")?.status).toBe("active");
    });
});

describe("Employees Store — getFiltered", () => {
    beforeEach(() => {
        useEmployeesStore.setState({ employees: [MOCK_EMP, MOCK_EMP_2] });
    });

    it("returns all employees when no filters applied", () => {
        useEmployeesStore.setState({ searchQuery: "", statusFilter: "all", workTypeFilter: "all", departmentFilter: "all" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(2);
    });

    it("filters by search query (name)", () => {
        useEmployeesStore.setState({ searchQuery: "Test User" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("TEST-EMP-001");
    });

    it("filters by search query (email)", () => {
        useEmployeesStore.setState({ searchQuery: "alice@company.com" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("TEST-EMP-002");
    });

    it("filters by status=active", () => {
        useEmployeesStore.setState({ statusFilter: "active" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result.every((e) => e.status === "active")).toBe(true);
        expect(result).toHaveLength(1);
    });

    it("filters by status=inactive", () => {
        useEmployeesStore.setState({ statusFilter: "inactive" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("TEST-EMP-002");
    });

    it("filters by workType", () => {
        useEmployeesStore.setState({ workTypeFilter: "WFH" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("TEST-EMP-002");
    });

    it("filters by department", () => {
        useEmployeesStore.setState({ departmentFilter: "Finance" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(1);
        expect(result[0].department).toBe("Finance");
    });

    it("returns empty array when no employees match", () => {
        useEmployeesStore.setState({ searchQuery: "XXXXXXXXXXX" });
        const result = useEmployeesStore.getState().getFiltered();
        expect(result).toHaveLength(0);
    });
});

// ─── Salary Change Governance ─────────────────────────────────────────────────
describe("Employees Store — salary change governance", () => {
    beforeEach(() => {
        useEmployeesStore.setState({
            employees: [MOCK_EMP],
            salaryRequests: [],
            salaryHistory: [],
            searchQuery: "",
            statusFilter: "all",
            workTypeFilter: "all",
            departmentFilter: "all",
        });
    });

    it("proposeSalaryChange creates a pending request with SCR- prefix", () => {
        useEmployeesStore.getState().proposeSalaryChange({
            employeeId: "TEST-EMP-001",
            proposedBy: "HR-001",
            proposedSalary: 100000,
            effectiveDate: "2026-04-01",
            reason: "Annual review",
        });
        const reqs = useEmployeesStore.getState().salaryRequests;
        expect(reqs).toHaveLength(1);
        expect(reqs[0].id).toMatch(/^SCR-/);
        expect(reqs[0].status).toBe("pending");
        expect(reqs[0].proposedSalary).toBe(100000);
    });

    it("approveSalaryChange updates the employee salary and creates history", () => {
        useEmployeesStore.getState().proposeSalaryChange({
            employeeId: "TEST-EMP-001",
            proposedBy: "HR-001",
            proposedSalary: 120000,
            effectiveDate: "2026-04-01",
            reason: "Promotion",
        });
        const reqId = useEmployeesStore.getState().salaryRequests[0].id;
        useEmployeesStore.getState().approveSalaryChange(reqId, "FIN-001");

        // Request approved
        const req = useEmployeesStore.getState().salaryRequests[0];
        expect(req.status).toBe("approved");
        expect(req.reviewedBy).toBe("FIN-001");

        // Employee salary updated
        const emp = useEmployeesStore.getState().employees[0];
        expect(emp.salary).toBe(120000);

        // History entry created
        const history = useEmployeesStore.getState().salaryHistory;
        expect(history.length).toBeGreaterThanOrEqual(1);
        const entry = history.find((h) => h.employeeId === "TEST-EMP-001" && !h.effectiveTo);
        expect(entry).toBeDefined();
        expect(entry?.annualSalary).toBe(120000);
    });

    it("rejectSalaryChange does not change employee salary", () => {
        useEmployeesStore.getState().proposeSalaryChange({
            employeeId: "TEST-EMP-001",
            proposedBy: "HR-001",
            proposedSalary: 150000,
            effectiveDate: "2026-04-01",
            reason: "Rejected raise",
        });
        const reqId = useEmployeesStore.getState().salaryRequests[0].id;
        useEmployeesStore.getState().rejectSalaryChange(reqId, "FIN-001");

        expect(useEmployeesStore.getState().salaryRequests[0].status).toBe("rejected");
        expect(useEmployeesStore.getState().employees[0].salary).toBe(80000); // unchanged
    });

    it("getSalaryHistory returns history for a specific employee", () => {
        // Manually add history
        useEmployeesStore.setState({
            salaryHistory: [
                { id: "SH-1", employeeId: "TEST-EMP-001", annualSalary: 80000, effectiveFrom: "2024-01-01", approvedBy: "SYS", reason: "Initial" },
                { id: "SH-2", employeeId: "TEST-EMP-002", annualSalary: 70000, effectiveFrom: "2024-01-01", approvedBy: "SYS", reason: "Initial" },
            ],
        });
        const history = useEmployeesStore.getState().getSalaryHistory("TEST-EMP-001");
        expect(history).toHaveLength(1);
        expect(history[0].annualSalary).toBe(80000);
    });
});
