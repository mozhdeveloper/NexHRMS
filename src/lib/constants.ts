import type { Role } from "@/types";

export const DEPARTMENTS = [
    "Engineering",
    "Design",
    "Marketing",
    "Human Resources",
    "Finance",
    "Sales",
    "Operations",
] as const;

export const ROLES = [
    "Frontend Developer",
    "Backend Developer",
    "UI/UX Designer",
    "Product Manager",
    "HR Manager",
    "HR Specialist",
    "Finance Manager",
    "Accountant",
    "Marketing Lead",
    "Sales Executive",
    "DevOps Engineer",
    "QA Engineer",
] as const;

export const LOCATIONS = [
    "New York",
    "San Francisco",
    "London",
    "Manila",
    "Singapore",
    "Tokyo",
] as const;

// ─── PH Holiday Pay Multipliers (DOLE) ───────────────────────────────────────
export const PH_HOLIDAY_MULTIPLIERS = {
    regular_holiday: {
        worked: 2.0,           // 200% – work on regular holiday
        worked_overtime: 2.6,  // 260% – OT on regular holiday
        rest_day: 2.6,         // 260% – RH falls on rest day
        rest_day_overtime: 3.38, // 338% – RH + rest day + OT
        not_worked: 1.0,       // 100% – absent but paid
    },
    special_holiday: {
        worked: 1.3,           // 130% – work on special holiday
        worked_overtime: 1.69, // 169% – OT on special holiday
        rest_day: 1.5,         // 150% – SH falls on rest day
        rest_day_overtime: 1.95, // 195% – SH + rest day + OT
        not_worked: 0,         // 0% – special holiday, not worked = no pay
    },
} as const;

// ─── Philippine National & Special Holidays 2026 ─────────────────────────────
export const DEFAULT_HOLIDAYS: { date: string; name: string; type: "regular" | "special" }[] = [
    { date: "2026-01-01", name: "New Year's Day", type: "regular" },
    { date: "2026-01-28", name: "Chinese New Year", type: "special" },
    { date: "2026-02-25", name: "EDSA People Power Revolution", type: "special" },
    { date: "2026-04-02", name: "Maundy Thursday", type: "regular" },
    { date: "2026-04-03", name: "Good Friday", type: "regular" },
    { date: "2026-04-04", name: "Black Saturday", type: "special" },
    { date: "2026-04-09", name: "Araw ng Kagitingan", type: "regular" },
    { date: "2026-05-01", name: "Labor Day", type: "regular" },
    { date: "2026-06-12", name: "Independence Day", type: "regular" },
    { date: "2026-08-21", name: "Ninoy Aquino Day", type: "special" },
    { date: "2026-08-31", name: "National Heroes Day", type: "regular" },
    { date: "2026-11-01", name: "All Saints Day", type: "special" },
    { date: "2026-11-02", name: "All Souls Day", type: "special" },
    { date: "2026-11-30", name: "Bonifacio Day", type: "regular" },
    { date: "2026-12-08", name: "Immaculate Conception", type: "special" },
    { date: "2026-12-24", name: "Christmas Eve", type: "special" },
    { date: "2026-12-25", name: "Christmas Day", type: "regular" },
    { date: "2026-12-30", name: "Rizal Day", type: "regular" },
    { date: "2026-12-31", name: "New Year's Eve", type: "special" },
];

// ─── Policy Snapshot Versions ─────────────────────────────────────────────────
export const POLICY_VERSIONS = {
    taxTable: "2026-TRAIN-v1",
    sss: "2026-SSS-v1",
    philhealth: "2026-PhilHealth-v1",
    pagibig: "2026-PagIBIG-v1",
    holidayList: "2026-DOLE-v1",
    formula: "2026-PH-PAYROLL-v1",
    ruleSet: "RS-DEFAULT-v1",
} as const;

export const NAV_ITEMS: {
    label: string;
    href: string;
    icon: string;
    roles: Role[];
}[] = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: "LayoutDashboard",
            roles: ["admin", "hr", "finance", "employee", "supervisor", "payroll_admin", "auditor"],
        },
        {
            label: "Employees",
            href: "/employees/manage",
            icon: "Users",
            roles: ["admin", "hr", "finance", "supervisor"],
        },
        {
            label: "Projects",
            href: "/projects",
            icon: "FolderKanban",
            roles: ["admin", "hr"],
        },
        {
            label: "Attendance",
            href: "/attendance",
            icon: "Clock",
            roles: ["admin", "hr", "supervisor", "employee"],
        },
        {
            label: "Leave",
            href: "/leave",
            icon: "CalendarOff",
            roles: ["admin", "hr", "supervisor", "employee"],
        },
        {
            label: "Payroll",
            href: "/payroll",
            icon: "Wallet",
            roles: ["admin", "finance", "payroll_admin", "employee"],
        },
        {
            label: "Loans",
            href: "/loans",
            icon: "Banknote",
            roles: ["admin", "finance", "payroll_admin"],
        },
        {
            label: "Reports",
            href: "/reports",
            icon: "BarChart3",
            roles: ["admin", "hr", "finance", "payroll_admin", "auditor"],
        },
        {
            label: "Timesheets",
            href: "/timesheets",
            icon: "ClipboardList",
            roles: ["admin", "hr", "supervisor", "payroll_admin"],
        },
        {
            label: "Shifts",
            href: "/settings/shifts",
            icon: "AlarmClock",
            roles: ["admin", "hr"],
        },
        {
            label: "Audit Log",
            href: "/audit",
            icon: "FileSearch",
            roles: ["admin", "auditor"],
        },
        {
            label: "Notifications",
            href: "/notifications",
            icon: "Bell",
            roles: ["admin", "hr"],
        },
        {
            label: "Kiosk",
            href: "/kiosk",
            icon: "Building2",
            roles: ["admin", "hr"],
        },
        {
            label: "Settings",
            href: "/settings",
            icon: "Settings",
            roles: ["admin", "hr"],
        },
    ];

export const ROLE_ACCESS: Record<Role, string[]> = {
    admin: [
        "/dashboard",
        "/employees",
        "/projects",
        "/attendance",
        "/leave",
        "/payroll",
        "/loans",
        "/reports",
        "/reports/government",
        "/settings",
        "/settings/shifts",
        "/settings/organization",
        "/notifications",
        "/timesheets",
        "/audit",
        "/kiosk",
    ],
    hr: ["/dashboard", "/employees", "/projects", "/attendance", "/leave", "/reports", "/notifications", "/timesheets", "/settings/shifts", "/kiosk"],
    finance: ["/dashboard", "/payroll", "/loans", "/reports", "/reports/government", "/employees/directory"],
    employee: ["/dashboard", "/attendance", "/leave", "/payroll"],
    supervisor: ["/dashboard", "/attendance", "/leave", "/timesheets", "/employees"],
    payroll_admin: ["/dashboard", "/payroll", "/loans", "/reports", "/reports/government", "/timesheets"],
    auditor: ["/dashboard", "/audit", "/reports"],
};
