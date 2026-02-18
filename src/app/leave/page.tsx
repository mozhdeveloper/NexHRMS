"use client";

import { useState } from "react";
import { useLeaveStore } from "@/store/leave.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { LeaveType } from "@/types";
import { Textarea } from "@/components/ui/textarea";

export default function LeavePage() {
    const { requests, addRequest, updateStatus } = useLeaveStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const [open, setOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");

    // Form state
    const [formType, setFormType] = useState<LeaveType>("VL");
    const [formStart, setFormStart] = useState("");
    const [formEnd, setFormEnd] = useState("");
    const [formReason, setFormReason] = useState("");
    const [formEmpId, setFormEmpId] = useState("");

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;

    const filteredRequests = requests.filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        // Employee role sees only own requests
        if (currentUser.role === "employee") {
            const myEmp = employees.find((e) => e.name === currentUser.name);
            if (myEmp && r.employeeId !== myEmp.id) return false;
        }
        return true;
    });

    const canApprove = currentUser.role === "admin" || currentUser.role === "hr";

    const handleSubmit = () => {
        if (!formStart || !formEnd || formReason.length < 5) {
            toast.error("Please fill all fields. Reason must be at least 5 characters.");
            return;
        }
        const empId = formEmpId || employees.find((e) => e.name === currentUser.name)?.id || "EMP001";
        addRequest({ employeeId: empId, type: formType, startDate: formStart, endDate: formEnd, reason: formReason });
        toast.success("Leave request submitted!");
        setOpen(false);
        setFormStart("");
        setFormEnd("");
        setFormReason("");
    };

    const leaveStatusColors = {
        pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filteredRequests.length} requests</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Request</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                            {canApprove && (
                                <Select value={formEmpId} onValueChange={setFormEmpId}>
                                    <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                    <SelectContent>
                                        {employees.filter((e) => e.status === "active").map((e) => (
                                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Select value={formType} onValueChange={(v) => setFormType(v as LeaveType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VL">Vacation Leave</SelectItem>
                                    <SelectItem value="SL">Sick Leave</SelectItem>
                                    <SelectItem value="EL">Emergency Leave</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium">Start Date</label>
                                    <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">End Date</label>
                                    <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Reason</label>
                                <Textarea placeholder="Describe your reason..." value={formReason} onChange={(e) => setFormReason(e.target.value)} className="mt-1" rows={3} />
                            </div>
                            <Button onClick={handleSubmit} className="w-full">Submit Request</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Filter" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Employee</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">From</TableHead>
                                <TableHead className="text-xs">To</TableHead>
                                <TableHead className="text-xs">Reason</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                {canApprove && <TableHead className="text-xs w-24">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.length === 0 ? (
                                <TableRow><TableCell colSpan={canApprove ? 7 : 6} className="text-center text-sm text-muted-foreground py-8">No leave requests</TableCell></TableRow>
                            ) : filteredRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="text-sm font-medium">{getEmpName(req.employeeId)}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{req.type}</Badge></TableCell>
                                    <TableCell className="text-sm">{req.startDate}</TableCell>
                                    <TableCell className="text-sm">{req.endDate}</TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate">{req.reason}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`text-[10px] ${leaveStatusColors[req.status]}`}>
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    {canApprove && (
                                        <TableCell>
                                            {req.status === "pending" && (
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={() => { updateStatus(req.id, "approved", currentUser.id); toast.success("Leave approved"); }}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10" onClick={() => { updateStatus(req.id, "rejected", currentUser.id); toast.success("Leave rejected"); }}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
