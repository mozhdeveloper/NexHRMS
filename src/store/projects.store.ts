"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Project } from "@/types";
import { SEED_PROJECTS } from "@/data/seed";
import { projectsDb } from "@/services/db.service";

interface ProjectsState {
    projects: Project[];
    addProject: (data: Omit<Project, "id" | "createdAt">) => void;
    updateProject: (id: string, data: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    assignEmployee: (projectId: string, employeeId: string) => void;
    removeEmployee: (projectId: string, employeeId: string) => void;
    getProjectForEmployee: (employeeId: string) => Project | undefined;
    resetToSeed: () => void;
}

export const useProjectsStore = create<ProjectsState>()(
    (set, get) => ({
        projects: SEED_PROJECTS,
        addProject: (data) => {
            const newProject: Project = {
                ...data,
                id: `PRJ-${nanoid(8)}`,
                createdAt: new Date().toISOString(),
                qrSecret: nanoid(32),
                qrEnabled: data.qrEnabled ?? true,
            };
            set((s) => ({ projects: [...s.projects, newProject] }));
            projectsDb.upsert(newProject).catch((err) => {
                console.warn("[projects] DB write failed:", err);
            });
        },
        updateProject: (id, data) => {
            set((s) => {
                const updated = s.projects.map((p) => (p.id === id ? { ...p, ...data } : p));
                const project = updated.find((p) => p.id === id);
                if (project) {
                    projectsDb.upsert(project).catch((err) => {
                        console.warn("[projects] DB update failed:", err);
                    });
                }
                return { projects: updated };
            });
        },
        deleteProject: (id) => {
            set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
            projectsDb.remove(id).catch((err) => {
                console.warn("[projects] DB delete failed:", err);
            });
        },
        assignEmployee: (projectId, employeeId) => {
            set((s) => {
                // Remove the employee from any other project first (1 project per employee)
                const updated = s.projects.map((p) => {
                    if (p.id === projectId) {
                        return p.assignedEmployeeIds.includes(employeeId)
                            ? p
                            : { ...p, assignedEmployeeIds: [...p.assignedEmployeeIds, employeeId] };
                    }
                    return { ...p, assignedEmployeeIds: p.assignedEmployeeIds.filter((id) => id !== employeeId) };
                });
                // Write the updated project to DB
                const project = updated.find((p) => p.id === projectId);
                if (project) {
                    projectsDb.upsert(project).catch((err) => {
                        console.warn("[projects] DB assign failed:", err);
                    });
                }
                return { projects: updated };
            });
        },
        removeEmployee: (projectId, employeeId) => {
            set((s) => {
                const updated = s.projects.map((p) =>
                    p.id === projectId
                        ? { ...p, assignedEmployeeIds: p.assignedEmployeeIds.filter((id) => id !== employeeId) }
                        : p
                );
                const project = updated.find((p) => p.id === projectId);
                if (project) {
                    projectsDb.upsert(project).catch((err) => {
                        console.warn("[projects] DB remove-employee failed:", err);
                    });
                }
                return { projects: updated };
            });
        },
        getProjectForEmployee: (employeeId) => {
            return get().projects.find((p) => p.assignedEmployeeIds.includes(employeeId));
        },
        resetToSeed: () => set({ projects: SEED_PROJECTS }),
    })
);
