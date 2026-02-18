"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Employee, EmployeeStatus, WorkType } from "@/types";
import { SEED_EMPLOYEES } from "@/data/seed";

interface EmployeesState {
    employees: Employee[];
    searchQuery: string;
    statusFilter: EmployeeStatus | "all";
    workTypeFilter: WorkType | "all";
    departmentFilter: string;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: EmployeeStatus | "all") => void;
    setWorkTypeFilter: (w: WorkType | "all") => void;
    setDepartmentFilter: (d: string) => void;
    addEmployee: (emp: Employee) => void;
    updateEmployee: (id: string, data: Partial<Employee>) => void;
    toggleStatus: (id: string) => void;
    getEmployee: (id: string) => Employee | undefined;
    getFiltered: () => Employee[];
}

export const useEmployeesStore = create<EmployeesState>()(
    persist(
        (set, get) => ({
            employees: SEED_EMPLOYEES,
            searchQuery: "",
            statusFilter: "all",
            workTypeFilter: "all",
            departmentFilter: "all",
            setSearchQuery: (q) => set({ searchQuery: q }),
            setStatusFilter: (s) => set({ statusFilter: s }),
            setWorkTypeFilter: (w) => set({ workTypeFilter: w }),
            setDepartmentFilter: (d) => set({ departmentFilter: d }),
            addEmployee: (emp) => set((s) => ({ employees: [...s.employees, emp] })),
            updateEmployee: (id, data) =>
                set((s) => ({
                    employees: s.employees.map((e) => (e.id === id ? { ...e, ...data } : e)),
                })),
            toggleStatus: (id) =>
                set((s) => ({
                    employees: s.employees.map((e) =>
                        e.id === id
                            ? { ...e, status: e.status === "active" ? "inactive" : "active" }
                            : e
                    ),
                })),
            getEmployee: (id) => get().employees.find((e) => e.id === id),
            getFiltered: () => {
                const { employees, searchQuery, statusFilter, workTypeFilter, departmentFilter } = get();
                return employees.filter((e) => {
                    const matchesSearch =
                        !searchQuery ||
                        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.id.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
                    const matchesWorkType = workTypeFilter === "all" || e.workType === workTypeFilter;
                    const matchesDept = departmentFilter === "all" || e.department === departmentFilter;
                    return matchesSearch && matchesStatus && matchesWorkType && matchesDept;
                });
            },
        }),
        { name: "nexhrms-employees", version: 1 }
    )
);
