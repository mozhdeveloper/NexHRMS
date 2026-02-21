import type {
    Employee,
    AttendanceLog,
    LeaveRequest,
    Payslip,
    CalendarEvent,
    DemoUser,
    Project,
    Loan,
} from "@/types";

// ─── Demo Users ──────────────────────────────────────────────
export const DEMO_USERS: DemoUser[] = [
    { id: "U001", name: "Alex Rivera", role: "admin", email: "admin@nexhrms.com" },
    { id: "U002", name: "Jordan Lee", role: "hr", email: "hr@nexhrms.com" },
    { id: "U003", name: "Morgan Chen", role: "finance", email: "finance@nexhrms.com" },
    { id: "U004", name: "Sam Torres", role: "employee", email: "employee@nexhrms.com" },
    { id: "U005", name: "Olivia Harper", role: "employee", email: "olivia@nexhrms.com" },
    { id: "U006", name: "Pat Reyes", role: "supervisor", email: "supervisor@nexhrms.com" },
    { id: "U007", name: "Dana Cruz", role: "payroll_admin", email: "payroll@nexhrms.com" },
    { id: "U008", name: "Rene Santos", role: "auditor", email: "auditor@nexhrms.com" },
];

// ─── Employees ───────────────────────────────────────────────
export const SEED_EMPLOYEES: Employee[] = [
    { id: "EMP001", name: "Olivia Harper", email: "olivia@company.com", role: "Frontend Developer", department: "Engineering", status: "active", workType: "HYBRID", salary: 95000, joinDate: "2023-03-15", productivity: 87, location: "New York", phone: "+1-555-0101", birthday: "1994-06-12", teamLeader: "EMP010" },
    { id: "EMP002", name: "Ethan Brooks", email: "ethan@company.com", role: "Backend Developer", department: "Engineering", status: "active", workType: "WFH", salary: 105000, joinDate: "2022-07-01", productivity: 92, location: "San Francisco", phone: "+1-555-0102", birthday: "1991-11-22", teamLeader: "EMP010" },
    { id: "EMP003", name: "Sophia Patel", email: "sophia@company.com", role: "UI/UX Designer", department: "Design", status: "active", workType: "WFO", salary: 88000, joinDate: "2023-01-10", productivity: 78, location: "London", phone: "+44-555-0103", birthday: "1996-02-28", teamLeader: "EMP011" },
    { id: "EMP004", name: "Liam Chen", email: "liam@company.com", role: "DevOps Engineer", department: "Engineering", status: "active", workType: "WFH", salary: 110000, joinDate: "2021-09-20", productivity: 95, location: "Manila", phone: "+63-555-0104", birthday: "1990-08-05" },
    { id: "EMP005", name: "Ava Martinez", email: "ava@company.com", role: "Product Manager", department: "Engineering", status: "active", workType: "HYBRID", salary: 115000, joinDate: "2022-04-12", productivity: 88, location: "New York", phone: "+1-555-0105", birthday: "1993-12-18" },
    { id: "EMP006", name: "Noah Williams", email: "noah@company.com", role: "HR Manager", department: "Human Resources", status: "active", workType: "WFO", salary: 92000, joinDate: "2021-01-05", productivity: 84, location: "San Francisco", phone: "+1-555-0106", birthday: "1988-04-30" },
    { id: "EMP007", name: "Isabella Kim", email: "isabella@company.com", role: "Finance Manager", department: "Finance", status: "active", workType: "WFO", salary: 105000, joinDate: "2020-11-15", productivity: 91, location: "New York", phone: "+1-555-0107", birthday: "1987-09-14" },
    { id: "EMP008", name: "James Wilson", email: "james@company.com", role: "Marketing Lead", department: "Marketing", status: "active", workType: "HYBRID", salary: 98000, joinDate: "2022-08-23", productivity: 76, location: "London", phone: "+44-555-0108", birthday: "1992-01-07" },
    { id: "EMP009", name: "Mia Rodriguez", email: "mia@company.com", role: "Sales Executive", department: "Sales", status: "active", workType: "WFO", salary: 82000, joinDate: "2023-05-30", productivity: 81, location: "Manila", phone: "+63-555-0109", birthday: "1995-07-25", teamLeader: "EMP008" },
    { id: "EMP010", name: "Lucas Taylor", email: "lucas@company.com", role: "Frontend Developer", department: "Engineering", status: "active", workType: "WFH", salary: 120000, joinDate: "2020-02-14", productivity: 96, location: "San Francisco", phone: "+1-555-0110", birthday: "1989-03-11" },
    { id: "EMP011", name: "Charlotte Davis", email: "charlotte@company.com", role: "UI/UX Designer", department: "Design", status: "active", workType: "HYBRID", salary: 95000, joinDate: "2021-06-01", productivity: 89, location: "Tokyo", phone: "+81-555-0111", birthday: "1993-10-02" },
    { id: "EMP012", name: "Benjamin Lee", email: "benjamin@company.com", role: "QA Engineer", department: "Engineering", status: "active", workType: "WFO", salary: 85000, joinDate: "2023-02-28", productivity: 73, location: "Singapore", phone: "+65-555-0112", birthday: "1994-05-19" },
    { id: "EMP013", name: "Amelia Nguyen", email: "amelia@company.com", role: "HR Specialist", department: "Human Resources", status: "active", workType: "WFO", salary: 72000, joinDate: "2023-09-15", productivity: 82, location: "Manila", phone: "+63-555-0113", birthday: "1997-08-08" },
    { id: "EMP014", name: "Henry Johnson", email: "henry@company.com", role: "Accountant", department: "Finance", status: "inactive", workType: "WFO", salary: 68000, joinDate: "2021-04-01", productivity: 65, location: "New York", phone: "+1-555-0114", birthday: "1990-12-30" },
    { id: "EMP015", name: "Ella Thompson", email: "ella@company.com", role: "Frontend Developer", department: "Engineering", status: "active", workType: "WFH", salary: 92000, joinDate: "2022-11-20", productivity: 85, location: "London", phone: "+44-555-0115", birthday: "1995-02-14" },
    { id: "EMP016", name: "Alexander Brown", email: "alexander@company.com", role: "Backend Developer", department: "Engineering", status: "active", workType: "HYBRID", salary: 100000, joinDate: "2023-01-05", productivity: 90, location: "San Francisco", phone: "+1-555-0116", birthday: "1991-06-21" },
    { id: "EMP017", name: "Grace Mitchell", email: "grace@company.com", role: "Sales Executive", department: "Sales", status: "active", workType: "WFO", salary: 78000, joinDate: "2023-07-10", productivity: 79, location: "Tokyo", phone: "+81-555-0117", birthday: "1996-11-03" },
    { id: "EMP018", name: "Daniel Garcia", email: "daniel@company.com", role: "DevOps Engineer", department: "Engineering", status: "active", workType: "WFH", salary: 108000, joinDate: "2022-03-18", productivity: 93, location: "Manila", phone: "+63-555-0118", birthday: "1992-04-16" },
    { id: "EMP019", name: "Chloe White", email: "chloe@company.com", role: "Marketing Lead", department: "Marketing", status: "inactive", workType: "HYBRID", salary: 85000, joinDate: "2021-12-01", productivity: 60, location: "Singapore", phone: "+65-555-0119", birthday: "1994-09-28" },
    { id: "EMP020", name: "Jack Anderson", email: "jack@company.com", role: "Product Manager", department: "Engineering", status: "active", workType: "WFO", salary: 112000, joinDate: "2020-08-25", productivity: 94, location: "New York", phone: "+1-555-0120", birthday: "1988-01-15" },
    { id: "EMP021", name: "Zoe Parker", email: "zoe@company.com", role: "Frontend Developer", department: "Engineering", status: "active", workType: "HYBRID", salary: 90000, joinDate: "2023-04-22", productivity: 83, location: "London", phone: "+44-555-0121", birthday: "1996-07-09", teamLeader: "EMP010" },
    { id: "EMP022", name: "Ryan Scott", email: "ryan@company.com", role: "Backend Developer", department: "Engineering", status: "active", workType: "WFH", salary: 102000, joinDate: "2022-09-14", productivity: 88, location: "San Francisco", phone: "+1-555-0122", birthday: "1993-03-27", teamLeader: "EMP010" },
    { id: "EMP023", name: "Luna Adams", email: "luna@company.com", role: "UI/UX Designer", department: "Design", status: "active", workType: "WFO", salary: 82000, joinDate: "2023-06-05", productivity: 77, location: "Tokyo", phone: "+81-555-0123", birthday: "1997-05-14", teamLeader: "EMP011" },
    { id: "EMP024", name: "Leo Campbell", email: "leo@company.com", role: "QA Engineer", department: "Engineering", status: "active", workType: "WFH", salary: 87000, joinDate: "2022-12-10", productivity: 86, location: "Manila", phone: "+63-555-0124", birthday: "1994-10-31" },
    { id: "EMP025", name: "Aria Evans", email: "aria@company.com", role: "HR Specialist", department: "Human Resources", status: "active", workType: "HYBRID", salary: 74000, joinDate: "2023-08-01", productivity: 80, location: "Singapore", phone: "+65-555-0125", birthday: "1995-12-20" },
    // Sam Torres (Employee demo user mapped to an EMP record)
    { id: "EMP026", name: "Sam Torres", email: "employee@nexhrms.com", role: "Frontend Developer", department: "Engineering", status: "active", workType: "WFO", salary: 88000, joinDate: "2024-01-10", productivity: 82, location: "Manila", phone: "+63-555-0126", birthday: "1995-04-20", teamLeader: "EMP010" },
];

// ─── Seed Projects ───────────────────────────────────────────
export const SEED_PROJECTS: Project[] = [
    {
        id: "PRJ001",
        name: "Metro Tower Construction",
        description: "High-rise office building construction project in Makati CBD.",
        location: { lat: 14.5547, lng: 121.0244, radius: 200 },
        assignedEmployeeIds: ["EMP001", "EMP002", "EMP004", "EMP026"],
        createdAt: "2025-11-01T00:00:00Z",
    },
    {
        id: "PRJ002",
        name: "Greenfield Data Center",
        description: "New data center build-out in Clark Freeport Zone.",
        location: { lat: 15.1852, lng: 120.5464, radius: 300 },
        assignedEmployeeIds: ["EMP010", "EMP016", "EMP018"],
        createdAt: "2025-12-15T00:00:00Z",
    },
    {
        id: "PRJ003",
        name: "Client Portal Redesign",
        description: "Remote project — UX redesign for enterprise client portal.",
        location: { lat: 40.7128, lng: -74.006, radius: 500 },
        assignedEmployeeIds: ["EMP003", "EMP011", "EMP023"],
        createdAt: "2026-01-05T00:00:00Z",
    },
    {
        id: "PRJ004",
        name: "Warehouse Automation",
        description: "IoT integration for logistics warehouse in Singapore.",
        location: { lat: 1.3521, lng: 103.8198, radius: 150 },
        assignedEmployeeIds: ["EMP012", "EMP024"],
        createdAt: "2026-01-20T00:00:00Z",
    },
];

// ─── Attendance Logs (last 30 days, EXCLUDING today) ─────────
function generateAttendanceLogs(): AttendanceLog[] {
    const logs: AttendanceLog[] = [];
    const today = new Date();
    const statuses: Array<"present" | "absent" | "on_leave"> = ["present", "present", "present", "present", "absent", "on_leave"];

    // Start from d=1 (yesterday) to exclude today's date from seed data
    for (let d = 1; d <= 30; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

        const dateStr = date.toISOString().split("T")[0];

        SEED_EMPLOYEES.filter(e => e.status === "active").forEach((emp) => {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const checkInHour = 7 + Math.floor(Math.random() * 3);
            const checkInMin = Math.floor(Math.random() * 60);
            const hoursWorked = 7 + Math.floor(Math.random() * 3);

            logs.push({
                id: `ATT-${dateStr}-${emp.id}`,
                employeeId: emp.id,
                date: dateStr,
                checkIn: status === "present" ? `${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}` : undefined,
                checkOut: status === "present" ? `${String(checkInHour + hoursWorked).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}` : undefined,
                hours: status === "present" ? hoursWorked : 0,
                status,
            });
        });
    }
    return logs;
}

export const SEED_ATTENDANCE: AttendanceLog[] = generateAttendanceLogs();

// ─── Leave Requests ──────────────────────────────────────────
export const SEED_LEAVES: LeaveRequest[] = [
    { id: "LV001", employeeId: "EMP001", type: "VL", startDate: "2026-02-20", endDate: "2026-02-22", reason: "Family vacation planned for the long weekend.", status: "pending" },
    { id: "LV002", employeeId: "EMP003", type: "SL", startDate: "2026-02-10", endDate: "2026-02-11", reason: "Not feeling well, need to rest.", status: "approved", reviewedBy: "EMP006", reviewedAt: "2026-02-09" },
    { id: "LV003", employeeId: "EMP005", type: "EL", startDate: "2026-02-15", endDate: "2026-02-15", reason: "Family emergency.", status: "approved", reviewedBy: "EMP006", reviewedAt: "2026-02-14" },
    { id: "LV004", employeeId: "EMP009", type: "VL", startDate: "2026-03-01", endDate: "2026-03-05", reason: "Planned travel vacation.", status: "pending" },
    { id: "LV005", employeeId: "EMP012", type: "SL", startDate: "2026-02-18", endDate: "2026-02-18", reason: "Dental appointment.", status: "rejected", reviewedBy: "EMP006", reviewedAt: "2026-02-17" },
    { id: "LV006", employeeId: "EMP015", type: "VL", startDate: "2026-02-25", endDate: "2026-02-28", reason: "Personal time off.", status: "pending" },
    { id: "LV007", employeeId: "EMP002", type: "SL", startDate: "2026-01-20", endDate: "2026-01-21", reason: "Flu symptoms.", status: "approved", reviewedBy: "EMP006", reviewedAt: "2026-01-19" },
    { id: "LV008", employeeId: "EMP018", type: "OTHER", startDate: "2026-02-14", endDate: "2026-02-14", reason: "Conference attendance.", status: "approved", reviewedBy: "EMP006", reviewedAt: "2026-02-12" },
];

// ─── Payslips (based on MONTHLY salary, semi-monthly 1st cutoff Jan 1–15) ────
export const SEED_PAYSLIPS: Payslip[] = [
    { id: "PS001", employeeId: "EMP001", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 47500, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2375, pagibigDeduction: 100, taxDeduction: 10844, otherDeductions: 0, loanDeduction: 0, netPay: 32831, issuedAt: "2026-01-20", status: "confirmed", confirmedAt: "2026-01-21" },
    { id: "PS002", employeeId: "EMP002", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 52500, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2625, pagibigDeduction: 100, taxDeduction: 12606, otherDeductions: 0, loanDeduction: 0, netPay: 35819, issuedAt: "2026-01-20", status: "confirmed", confirmedAt: "2026-01-22" },
    { id: "PS003", employeeId: "EMP003", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 44000, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2200, pagibigDeduction: 100, taxDeduction: 9588, otherDeductions: 0, loanDeduction: 0, netPay: 30762, issuedAt: "2026-01-20", status: "issued" },
    { id: "PS004", employeeId: "EMP004", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 55000, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2750, pagibigDeduction: 100, taxDeduction: 13581, otherDeductions: 0, loanDeduction: 0, netPay: 37219, issuedAt: "2026-01-20", status: "issued" },
    { id: "PS005", employeeId: "EMP005", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 57500, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2875, pagibigDeduction: 100, taxDeduction: 14294, otherDeductions: 0, loanDeduction: 0, netPay: 38881, issuedAt: "2026-01-20", status: "confirmed", confirmedAt: "2026-01-23" },
    { id: "PS006", employeeId: "EMP010", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 60000, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2500, pagibigDeduction: 100, taxDeduction: 15513, otherDeductions: 0, loanDeduction: 0, netPay: 40537, issuedAt: "2026-01-20", status: "issued" },
    { id: "PS007", employeeId: "EMP011", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 47500, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2375, pagibigDeduction: 100, taxDeduction: 10844, otherDeductions: 0, loanDeduction: 0, netPay: 32831, issuedAt: "2026-01-20", status: "issued" },
    { id: "PS008", employeeId: "EMP016", periodStart: "2026-01-01", periodEnd: "2026-01-15", grossPay: 50000, allowances: 0, sssDeduction: 1350, philhealthDeduction: 2500, pagibigDeduction: 100, taxDeduction: 11763, otherDeductions: 0, loanDeduction: 0, netPay: 34287, issuedAt: "2026-01-20", status: "confirmed", confirmedAt: "2026-01-21" },
];

// ─── Events ──────────────────────────────────────────────────
export const SEED_EVENTS: CalendarEvent[] = [
    { id: "EVT001", title: "Team Standup", time: "09:00", date: "2026-02-18", type: "meeting" },
    { id: "EVT002", title: "Sprint Review", time: "14:00", date: "2026-02-20", type: "meeting" },
    { id: "EVT003", title: "Company All-Hands", time: "10:00", date: "2026-02-25", type: "event" },
    { id: "EVT004", title: "Design Workshop", time: "13:00", date: "2026-02-22", type: "event" },
    { id: "EVT005", title: "Q1 Planning", time: "09:30", date: "2026-03-01", type: "meeting" },
    { id: "EVT006", title: "Company Anniversary", time: "18:00", date: "2026-03-15", type: "event" },
];

// ─── Loans ───────────────────────────────────────────────────
export const SEED_LOANS: Loan[] = [
    { id: "LN001", employeeId: "EMP001", type: "cash_advance", amount: 15000, remainingBalance: 10000, monthlyDeduction: 2500, deductionCapPercent: 30, status: "active", approvedBy: "U001", createdAt: "2026-01-15", remarks: "Emergency cash advance" },
    { id: "LN002", employeeId: "EMP004", type: "salary_loan", amount: 50000, remainingBalance: 50000, monthlyDeduction: 5000, deductionCapPercent: 30, status: "active", approvedBy: "U001", createdAt: "2026-02-01", remarks: "Salary loan for housing" },
    { id: "LN003", employeeId: "EMP009", type: "cash_advance", amount: 8000, remainingBalance: 0, monthlyDeduction: 2000, deductionCapPercent: 30, status: "settled", approvedBy: "U001", createdAt: "2025-11-10" },
];
