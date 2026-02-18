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
            roles: ["admin", "hr", "finance", "employee"],
        },
        {
            label: "Employees",
            href: "/employees/manage",
            icon: "Users",
            roles: ["admin", "hr"],
        },
        {
            label: "Directory",
            href: "/employees/directory",
            icon: "Contact",
            roles: ["admin", "hr", "finance", "employee"],
        },
        {
            label: "Attendance",
            href: "/attendance",
            icon: "Clock",
            roles: ["admin", "hr", "employee"],
        },
        {
            label: "Leave",
            href: "/leave",
            icon: "CalendarOff",
            roles: ["admin", "hr", "employee"],
        },
        {
            label: "Payroll",
            href: "/payroll",
            icon: "Wallet",
            roles: ["admin", "finance"],
        },
        {
            label: "Settings",
            href: "/settings",
            icon: "Settings",
            roles: ["admin"],
        },
    ];

export const ROLE_ACCESS: Record<Role, string[]> = {
    admin: [
        "/dashboard",
        "/employees",
        "/attendance",
        "/leave",
        "/payroll",
        "/settings",
    ],
    hr: ["/dashboard", "/employees", "/attendance", "/leave"],
    finance: ["/dashboard", "/payroll", "/employees/directory"],
    employee: ["/dashboard", "/employees/directory", "/attendance", "/leave", "/payroll"],
};
