"use client";

import { useState } from "react";
import { useProjectsStore } from "@/store/projects.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import dynamic from "next/dynamic";
import { getInitials } from "@/lib/format";
import { sendNotification } from "@/lib/notifications";
import { FolderKanban, Plus, MapPin, Users, UserPlus, Trash2 } from "lucide-react";

const MapSelector = dynamic(
    () => import("@/components/projects/map-selector").then((m) => m.MapSelector),
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading map…</div> }
);
import { toast } from "sonner";

export default function ProjectsPage() {
    const { projects, addProject, deleteProject, assignEmployee, removeEmployee, updateProject } = useProjectsStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const canManage = currentUser.role === "admin" || currentUser.role === "hr";

    // Add Project Dialog
    const [addOpen, setAddOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [radius, setRadius] = useState("100");

    // Assign Dialog
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignProjectId, setAssignProjectId] = useState<string | null>(null);
    const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

    const handleAddProject = () => {
        if (!name || !lat || !lng) {
            toast.error("Please fill all required fields");
            return;
        }
        addProject({
            name,
            description,
            location: { lat: Number(lat), lng: Number(lng), radius: Number(radius) || 100 },
            assignedEmployeeIds: [],
        });
        toast.success(`Project "${name}" created!`);
        setName(""); setDescription(""); setLat(""); setLng(""); setRadius("100");
        setAddOpen(false);
    };

    const openAssignDialog = (projectId: string) => {
        const project = projects.find((p) => p.id === projectId);
        setAssignProjectId(projectId);
        setSelectedEmpIds(project?.assignedEmployeeIds || []);
        setAssignOpen(true);
    };

    const handleAssignSave = () => {
        if (!assignProjectId) return;
        const project = projects.find((p) => p.id === assignProjectId);
        if (!project) return;

        const currentIds = project.assignedEmployeeIds;
        const toAdd = selectedEmpIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !selectedEmpIds.includes(id));

        toAdd.forEach((empId) => {
            assignEmployee(assignProjectId, empId);
            const emp = employees.find((e) => e.id === empId);
            if (emp) {
                sendNotification({
                    type: "assignment",
                    employeeId: empId,
                    employeeName: emp.name,
                    employeeEmail: emp.email,
                    subject: `New Project Assignment: ${project.name}`,
                    body: `Hi ${emp.name}, you have been assigned to "${project.name}". Please report to the project site. Contact HR for details.`,
                });
            }
        });

        toRemove.forEach((empId) => removeEmployee(assignProjectId, empId));

        toast.success("Assignments updated!");
        setAssignOpen(false);
    };

    const toggleEmpSelection = (empId: string) => {
        setSelectedEmpIds((prev) =>
            prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
        );
    };

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{projects.length} projects</p>
                </div>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-1.5" disabled={!canManage}><Plus className="h-4 w-4" /> New Project</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-sm font-medium">Project Name *</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nexvision" className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="mt-1" rows={2} />
                            </div>
                            
                            {/* Map Selector with Auto-Location */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Geofence Location *</label>
                                <MapSelector
                                    lat={lat}
                                    lng={lng}
                                    radius={radius}
                                    onLatChange={setLat}
                                    onLngChange={setLng}
                                    onRadiusChange={setRadius}
                                />
                            </div>
                            
                            <Button onClick={handleAddProject} className="w-full">Create Project</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Projects Table */}
            <Card className="border border-border/50">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">Project Name</TableHead>
                                <TableHead className="text-xs">Location</TableHead>
                                <TableHead className="text-xs">Radius</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Team</TableHead>
                                <TableHead className="text-xs w-32">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        No projects yet
                                    </TableCell>
                                </TableRow>
                            ) : projects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell className="text-xs text-muted-foreground font-mono">{project.id}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm font-medium">{project.name}</p>
                                            {project.description && (
                                                <p className="text-xs text-muted-foreground max-w-[250px] truncate">{project.description}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            {project.location.lat.toFixed(4)}, {project.location.lng.toFixed(4)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{project.location.radius}m</TableCell>
                                    <TableCell>
                                        <Select value={project.status || "active"} onValueChange={(v) => updateProject(project.id, { status: v as "active" | "completed" | "on_hold" })}>
                                            <SelectTrigger className="h-7 w-full sm:w-[110px] text-xs border-0 bg-transparent">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">🟢 Active</SelectItem>
                                                <SelectItem value="completed">🔵 Completed</SelectItem>
                                                <SelectItem value="on_hold">🟡 On Hold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <div className="flex -space-x-2">
                                                {project.assignedEmployeeIds.slice(0, 3).map((empId) => (
                                                    <Avatar key={empId} className="h-6 w-6 border-2 border-card">
                                                        <AvatarFallback className="text-[8px] bg-muted">
                                                            {getInitials(getEmpName(empId))}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                            </div>
                                            {project.assignedEmployeeIds.length > 3 && (
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    +{project.assignedEmployeeIds.length - 3}
                                                </span>
                                            )}
                                            {project.assignedEmployeeIds.length === 0 && (
                                                <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs gap-1"
                                                onClick={() => openAssignDialog(project.id)}
                                                disabled={!canManage}
                                            >
                                                <UserPlus className="h-3.5 w-3.5" /> Assign
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                                onClick={() => {
                                                    if (!canManage) return;
                                                    deleteProject(project.id);
                                                    toast.success("Project deleted");
                                                }}
                                                disabled={!canManage}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>

            {/* Assign Employees Dialog */}
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Assign Employees to Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 pt-2">
                        {employees.filter((e) => e.status === "active").map((emp) => (
                            <div
                                key={emp.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => toggleEmpSelection(emp.id)}
                            >
                                <Checkbox checked={selectedEmpIds.includes(emp.id)} />
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-muted">{getInitials(emp.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{emp.name}</p>
                                    <p className="text-xs text-muted-foreground">{emp.role} · {emp.department}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleAssignSave} className="w-full mt-2">
                        Save Assignments ({selectedEmpIds.length} selected)
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
