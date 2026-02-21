"use client";

import { useEmployeesStore } from "@/store/employees.store";
import { useAttendanceStore } from "@/store/attendance.store";
import { useAuthStore } from "@/store/auth.store";
import { useEventsStore } from "@/store/events.store";
import { useLeaveStore } from "@/store/leave.store";
import { useLoansStore } from "@/store/loans.store";
import { usePayrollStore } from "@/store/payroll.store";
import { useAuditStore } from "@/store/audit.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getInitials, formatCurrency } from "@/lib/format";
import {
    Users, UserCheck, UserX, CalendarOff, TrendingUp, Calendar, Cake, Eye, Plus,
    Clock, Banknote, Pencil, Trash2, FileText, CheckCircle, Shield, Activity,
    ClipboardList, CreditCard, LogIn,
} from "lucide-react";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { LeaveType } from "@/types";

const CHART_OFFSETS = [2, -1, 3, -2, 4, 1, -3, 2, -1, 3, 0, -2];

// Admin/HR KPI Cards
function AdminKpiCards() {
    const employees = useEmployeesStore((s) => s.employees);
    const logs = useAttendanceStore((s) => s.logs);
    const leaveRequests = useLeaveStore((s) => s.requests);
    const loans = useLoansStore((s) => s.loans);
    const [today, setToday] = useState("");
    useEffect(() => { setToday(new Date().toISOString().split("T")[0]); }, []);

    const todayLogs = useMemo(() => (today ? logs.filter((l) => l.date === today) : []), [logs, today]);
    const totalPresent = todayLogs.filter((l) => l.status === "present").length;
    const totalAbsent = todayLogs.filter((l) => l.status === "absent").length;
    const totalOnLeave = todayLogs.filter((l) => l.status === "on_leave").length;
    const pendingLeaves = leaveRequests.filter((r) => r.status === "pending").length;
    const outstandingLoans = loans.reduce((sum, l) => l.status === "active" ? sum + l.remainingBalance : sum, 0);
    const activeCount = employees.filter((e) => e.status === "active").length;

    const cards = [
        { label: "Active Employees", value: activeCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
        { label: "Present Today", value: totalPresent, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Absent Today", value: totalAbsent, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "On Leave", value: totalOnLeave, icon: CalendarOff, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Pending Leave Requests", value: pendingLeaves, icon: Clock, color: "text-violet-500", bg: "bg-violet-500/10" },
        { label: "Outstanding Loan Balance", value: `${outstandingLoans.toLocaleString()}`, icon: Banknote, color: "text-blue-600", bg: "bg-blue-500/10" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
                <Card key={c.label} className="border border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{c.label}</p>
                                <p className="text-3xl font-bold mt-1">{c.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${c.bg}`}>
                                <c.icon className={`h-6 w-6 ${c.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Supervisor KPI Cards
function SupervisorKpiCards() {
    const employees = useEmployeesStore((s) => s.employees);
    const logs = useAttendanceStore((s) => s.logs);
    const leaveRequests = useLeaveStore((s) => s.requests);
    const overtimeRequests = useAttendanceStore((s) => s.overtimeRequests);
    const [today, setToday] = useState("");
    useEffect(() => { setToday(new Date().toISOString().split("T")[0]); }, []);

    const todayLogs = useMemo(() => (today ? logs.filter((l) => l.date === today) : []), [logs, today]);
    const totalPresent = todayLogs.filter((l) => l.status === "present").length;
    const totalAbsent = todayLogs.filter((l) => l.status === "absent").length;
    const totalOnLeave = todayLogs.filter((l) => l.status === "on_leave").length;
    const pendingLeaves = leaveRequests.filter((r) => r.status === "pending").length;
    const pendingOT = overtimeRequests.filter((r) => r.status === "pending").length;
    const activeCount = employees.filter((e) => e.status === "active").length;

    const cards = [
        { label: "Active Employees", value: activeCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
        { label: "Present Today", value: totalPresent, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Absent Today", value: totalAbsent, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "On Leave Today", value: totalOnLeave, icon: CalendarOff, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Pending Leave Requests", value: pendingLeaves, icon: Clock, color: "text-violet-500", bg: "bg-violet-500/10" },
        { label: "Pending OT Requests", value: pendingOT, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
                <Card key={c.label} className="border border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{c.label}</p>
                                <p className="text-3xl font-bold mt-1">{c.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${c.bg}`}>
                                <c.icon className={`h-6 w-6 ${c.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Finance / Payroll Admin KPI Cards
function FinanceKpiCards() {
    const payslips = usePayrollStore((s) => s.payslips);
    const runs = usePayrollStore((s) => s.runs);
    const adjustments = usePayrollStore((s) => s.adjustments);
    const loans = useLoansStore((s) => s.loans);

    const totalIssued = payslips.filter((p) => p.status === "issued").length;
    const totalConfirmed = payslips.filter((p) => p.status === "confirmed").length;
    const totalPaid = payslips.filter((p) => p.status === "paid" || p.status === "acknowledged").length;
    const pendingAdj = adjustments.filter((a) => a.status === "pending").length;
    const outstandingLoans = loans.reduce((sum, l) => l.status === "active" ? sum + l.remainingBalance : sum, 0);
    const activeLoans = loans.filter((l) => l.status === "active").length;
    const lockedRuns = runs.filter((r) => r.status === "locked").length;

    const cards = [
        { label: "Payslips Issued (Pending)", value: totalIssued, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10", link: "/payroll" },
        { label: "Confirmed Payslips", value: totalConfirmed, icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10", link: "/payroll" },
        { label: "Paid Payslips", value: totalPaid, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10", link: "/payroll" },
        { label: "Locked Payroll Runs", value: lockedRuns, icon: Shield, color: "text-violet-500", bg: "bg-violet-500/10", link: "/payroll" },
        { label: "Pending Adjustments", value: pendingAdj, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10", link: "/payroll" },
        { label: `Outstanding Loans (${activeLoans} active)`, value: `${outstandingLoans.toLocaleString()}`, icon: Banknote, color: "text-blue-600", bg: "bg-blue-500/10", link: "/loans" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
                <Link key={c.label} href={c.link}>
                    <Card className="border border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{c.label}</p>
                                    <p className="text-2xl font-bold mt-1">{c.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${c.bg}`}>
                                    <c.icon className={`h-6 w-6 ${c.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}

// Auditor KPI Cards
function AuditorKpiCards() {
    const logs = useAuditStore((s) => s.logs);
    const [today, setToday] = useState("");
    useEffect(() => { setToday(new Date().toISOString().split("T")[0]); }, []);

    const totalLogs = logs.length;
    const todayLogs = useMemo(() => today ? logs.filter((l) => l.timestamp.startsWith(today)).length : 0, [logs, today]);
    const uniqueActions = useMemo(() => new Set(logs.map((l) => l.action)).size, [logs]);
    const uniqueActors = useMemo(() => new Set(logs.map((l) => l.performedBy)).size, [logs]);

    const cards = [
        { label: "Total Audit Entries", value: totalLogs, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
        { label: "Actions Today", value: todayLogs, icon: Clock, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Unique Action Types", value: uniqueActions, icon: ClipboardList, color: "text-violet-500", bg: "bg-violet-500/10" },
        { label: "Unique Actors", value: uniqueActors, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <Card key={c.label} className="border border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{c.label}</p>
                                <p className="text-3xl font-bold mt-1">{c.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${c.bg}`}>
                                <c.icon className={`h-6 w-6 ${c.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Employee Personal Dashboard
function EmployeePersonalDashboard({ userId, userName }: { userId: string; userName: string }) {
    const employees = useEmployeesStore((s) => s.employees);
    const logs = useAttendanceStore((s) => s.logs);
    const leaveRequests = useLeaveStore((s) => s.requests);
    const payslips = usePayrollStore((s) => s.payslips);
    const [today, setToday] = useState("");
    useEffect(() => { setToday(new Date().toISOString().split("T")[0]); }, []);

    const empRecord = useMemo(() =>
        employees.find((e) => e.email === userId || e.name === userName),
        [employees, userId, userName]
    );

    const todayLog = useMemo(() => {
        if (!empRecord || !today) return undefined;
        return logs.find((l) => l.employeeId === empRecord.id && l.date === today);
    }, [logs, empRecord, today]);

    const myLeaves = useMemo(() => {
        if (!empRecord) return [];
        return leaveRequests.filter((r) => r.employeeId === empRecord.id);
    }, [leaveRequests, empRecord]);

    const myPayslips = useMemo(() => {
        if (!empRecord) return [];
        return payslips
            .filter((p) => p.employeeId === empRecord.id && ["published", "paid", "acknowledged", "issued", "confirmed"].includes(p.status))
            .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    }, [payslips, empRecord]);

    const latestPayslip = myPayslips[0];
    const leaveTypes: LeaveType[] = ["VL", "SL", "EL", "OTHER"];
    const leaveLabels: Record<LeaveType, string> = { VL: "Vacation Leave", SL: "Sick Leave", EL: "Emergency Leave", OTHER: "Other Leave" };
    const currentYear = new Date().getFullYear();

    const leaveUsage = useMemo(() => {
        return leaveTypes.map((type) => {
            const approved = myLeaves.filter(
                (r) => r.type === type && r.status === "approved" && new Date(r.startDate).getFullYear() === currentYear
            );
            const used = approved.reduce((sum, r) => {
                const days = Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1;
                return sum + days;
            }, 0);
            return { type, label: leaveLabels[type], used, alloc: 15 };
        });
    }, [myLeaves, currentYear]);

    const pendingLeaves = myLeaves.filter((r) => r.status === "pending").length;
    const currentStatus = todayLog?.status || "absent";

    const statusStyle: Record<string, string> = {
        present: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        absent: "border-red-400 bg-red-500/10 text-red-700 dark:text-red-400",
        on_leave: "border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className={`border-2 ${statusStyle[currentStatus]}`}>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-white/20 dark:bg-black/20">
                                <LogIn className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-medium opacity-70">Today`&apos;`s Status</p>
                                <p className="text-xl font-bold capitalize mt-0.5">{currentStatus.replace("_", " ")}</p>
                                {todayLog?.checkIn && (
                                    <p className="text-xs opacity-70 mt-0.5">In: {todayLog.checkIn}{todayLog.checkOut ? `  Out: ${todayLog.checkOut}` : ""}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/50">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-violet-500/10">
                                <Clock className="h-6 w-6 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Pending Leave</p>
                                <p className="text-3xl font-bold mt-0.5">{pendingLeaves}</p>
                                <Link href="/leave" className="text-xs text-primary hover:underline">View requests </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/50">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-emerald-500/10">
                                <CreditCard className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium">Latest Payslip</p>
                                {latestPayslip ? (
                                    <>
                                        <p className="text-xl font-bold mt-0.5">{formatCurrency(latestPayslip.netPay)}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Badge variant="secondary" className="text-[10px]">{latestPayslip.status}</Badge>
                                            <span className="text-xs text-muted-foreground">{latestPayslip.issuedAt}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground mt-1">No payslips yet</p>
                                )}
                                <Link href="/payroll" className="text-xs text-primary hover:underline">View payslips </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-border/50">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <CalendarOff className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Leave Balance  {currentYear}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {leaveUsage.map((l) => (
                            <div key={l.type} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{l.label}</span>
                                    <span className="text-muted-foreground">{l.used} / {l.alloc} days used</span>
                                </div>
                                <Progress value={l.alloc > 0 ? (l.used / l.alloc) * 100 : 0} className="h-2" />
                            </div>
                        ))}
                    </div>
                    <Link href="/leave">
                        <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Request Leave
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {myLeaves.length > 0 && (
                <Card className="border border-border/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">My Leave Requests</CardTitle>
                            <Link href="/leave"><Button variant="ghost" size="sm" className="text-xs">View All</Button></Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Type</TableHead>
                                        <TableHead className="text-xs">Period</TableHead>
                                        <TableHead className="text-xs">Days</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myLeaves.slice(0, 5).map((req) => {
                                        const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / 86400000) + 1;
                                        const statusColors: Record<string, string> = {
                                            pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                                            approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                                            rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
                                        };
                                        return (
                                            <TableRow key={req.id}>
                                                <TableCell className="text-sm font-medium">{req.type}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{req.startDate}  {req.endDate}</TableCell>
                                                <TableCell className="text-sm">{days}d</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] ${statusColors[req.status] || ""}`}>
                                                        {req.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Team Performance Chart
const DONUT_COLORS = [
    "hsl(160, 60%, 45%)", "hsl(220, 60%, 55%)", "hsl(280, 50%, 55%)",
    "hsl(35, 80%, 55%)", "hsl(0, 60%, 55%)", "hsl(190, 55%, 50%)",
];

function TeamPerformanceChart() {
    const employees = useEmployeesStore((s) => s.employees);
    const [selectedDept, setSelectedDept] = useState("Engineering");
    const departments = [...new Set(employees.map((e) => e.department))];

    const chartData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months.map((month, i) => {
            const deptEmployees = employees.filter((e) => e.department === selectedDept && e.status === "active");
            const avgProd = deptEmployees.length
                ? Math.round(deptEmployees.reduce((sum, e) => sum + e.productivity, 0) / deptEmployees.length + (Math.sin(i * 0.5) * 8 + CHART_OFFSETS[i]))
                : 0;
            return { month, productivity: Math.min(100, Math.max(40, avgProd)) };
        });
    }, [employees, selectedDept]);

    return (
        <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Team Performance</CardTitle>
                </div>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="w-[120px] sm:w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Line type="monotone" dataKey="productivity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function RoleDistributionChart() {
    const employees = useEmployeesStore((s) => s.employees);
    const data = useMemo(() => {
        const deptCount: Record<string, number> = {};
        employees.filter((e) => e.status === "active").forEach((e) => {
            deptCount[e.department] = (deptCount[e.department] || 0) + 1;
        });
        return Object.entries(deptCount).map(([name, value]) => ({ name, value }));
    }, [employees]);

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Employees by Department</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                            {data.map((_, index) => <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "12px" }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function EmployeeStatusTable() {
    const employees = useEmployeesStore((s) => s.employees);
    const logs = useAttendanceStore((s) => s.logs);
    const [today, setToday] = useState("");
    useEffect(() => { setToday(new Date().toISOString().split("T")[0]); }, []);

    const statusList = useMemo(() => {
        return employees.filter((e) => e.status === "active").slice(0, 8).map((emp) => {
            const todayLog = today ? logs.find((l) => l.employeeId === emp.id && l.date === today) : undefined;
            return {
                ...emp,
                attendance: todayLog?.status || "absent",
                teamLeaderName: emp.teamLeader ? employees.find((e) => e.id === emp.teamLeader)?.name || "" : "",
            };
        });
    }, [employees, logs, today]);

    const statusColors: Record<string, string> = {
        present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        absent: "bg-red-500/15 text-red-700 dark:text-red-400",
        on_leave: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    };

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Employee Status Today</CardTitle>
                    <Link href="/employees/manage">
                        <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="text-xs">Role</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Team Leader</TableHead>
                                <TableHead className="text-xs w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {statusList.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="text-xs text-muted-foreground">{emp.id}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7">
                                                <AvatarFallback className="text-[10px] bg-muted">{getInitials(emp.name)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{emp.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{emp.role}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`text-[10px] ${statusColors[emp.attendance]}`}>
                                            {emp.attendance.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{emp.teamLeaderName}</TableCell>
                                    <TableCell>
                                        <Link href={`/employees/${emp.id}`}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function RecentAuditLog() {
    const logs = useAuditStore((s) => s.logs);
    const recent = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);

    const actionColors: Record<string, string> = {
        salary_approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        salary_rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
        leave_approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        leave_rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
        payroll_locked: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        payroll_published: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    };

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Recent Audit Activity</CardTitle>
                    </div>
                    <Link href="/audit">
                        <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No audit entries yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Action</TableHead>
                                    <TableHead className="text-xs">Entity</TableHead>
                                    <TableHead className="text-xs">Performed By</TableHead>
                                    <TableHead className="text-xs">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recent.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${actionColors[log.action] || "bg-slate-500/15 text-slate-700 dark:text-slate-400"}`}>
                                                {log.action.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground capitalize">{log.entityType}</TableCell>
                                        <TableCell className="text-xs">{log.performedBy}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function EventsWidget({ readOnly = false }: { readOnly?: boolean }) {
    const { events, addEvent, updateEvent, removeEvent } = useEventsStore();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editEvt, setEditEvt] = useState<(typeof events)[0] | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");
    const [deleteEvtId, setDeleteEvtId] = useState<string | null>(null);

    const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

    const handleAdd = () => {
        if (!title || !date || !time) return;
        addEvent({ title, date, time, type: "event" });
        setTitle(""); setDate(""); setTime("");
        setOpen(false);
        toast.success("Event created");
    };

    const openEdit = (evt: (typeof events)[0]) => {
        setEditEvt(evt); setEditTitle(evt.title); setEditDate(evt.date); setEditTime(evt.time);
        setEditOpen(true);
    };

    const handleEditSave = () => {
        if (!editEvt || !editTitle || !editDate || !editTime) return;
        updateEvent(editEvt.id, { title: editTitle, date: editDate, time: editTime });
        toast.success("Event updated");
        setEditOpen(false); setEditEvt(null);
    };

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Events & Meetings</CardTitle>
                    </div>
                    {!readOnly && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    <Plus className="h-3 w-3" /> Add
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
                                <div className="space-y-3 pt-2">
                                    <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
                                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                                    <Button onClick={handleAdd} className="w-full">Create Event</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {upcoming.map((evt) => (
                    <div key={evt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{evt.title}</p>
                            <p className="text-xs text-muted-foreground">{evt.date}  {evt.time}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{evt.type}</Badge>
                        {!readOnly && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(evt)}>
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeleteEvtId(evt.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>}
            </CardContent>

            {!readOnly && (
                <>
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
                            <div className="space-y-3 pt-2">
                                <Input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
                                    <Button className="flex-1" onClick={handleEditSave}>Save</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <AlertDialog open={!!deleteEvtId} onOpenChange={(o) => !o && setDeleteEvtId(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                <AlertDialogDescription>This event will be permanently removed.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (deleteEvtId) { removeEvent(deleteEvtId); toast.success("Event deleted"); setDeleteEvtId(null); } }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </Card>
    );
}

function BirthdaysWidget() {
    const employees = useEmployeesStore((s) => s.employees);
    const [month, setMonth] = useState(0);
    useEffect(() => { setMonth(new Date().getMonth()); }, []);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const birthdays = useMemo(() => {
        return employees
            .filter((e) => e.birthday && new Date(e.birthday).getMonth() === month)
            .sort((a, b) => new Date(a.birthday!).getDate() - new Date(b.birthday!).getDate());
    }, [employees, month]);

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cake className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Birthdays</CardTitle>
                    </div>
                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                        <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {birthdays.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No birthdays this month</p>
                ) : (
                    birthdays.slice(0, 5).map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs bg-muted">{getInitials(emp.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.role}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {new Date(emp.birthday!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const currentUser = useAuthStore((s) => s.currentUser);
    const role = currentUser.role;

    const isAdmin = role === "admin" || role === "hr";
    const isFinance = role === "finance" || role === "payroll_admin";
    const isSupervisor = role === "supervisor";
    const isEmployee = role === "employee";
    const isAuditor = role === "auditor";

    const roleDescriptions: Record<string, string> = {
        admin: "Full system overview  employees, attendance, payroll, and financials.",
        hr: "HR overview  employee management, leave approvals, and attendance.",
        finance: "Finance summary  payroll runs, loan management, and deductions.",
        payroll_admin: "Payroll overview  payslips, deductions, adjustments, and runs.",
        supervisor: "Team overview  attendance, leave requests, and performance.",
        employee: "Your personal workspace  attendance, leave, and payslips.",
        auditor: "Audit overview  system activity and compliance monitoring.",
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back, {currentUser.name.split(" ")[0]} 
                </h1>
                <p className="text-muted-foreground mt-1">
                    {roleDescriptions[role] || "Here is what is happening today."}
                </p>
            </div>

            {isAdmin && (
                <>
                    <AdminKpiCards />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <TeamPerformanceChart />
                        <RoleDistributionChart />
                    </div>
                    <EmployeeStatusTable />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <EventsWidget />
                        <BirthdaysWidget />
                    </div>
                </>
            )}

            {isSupervisor && (
                <>
                    <SupervisorKpiCards />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <TeamPerformanceChart />
                        <RoleDistributionChart />
                    </div>
                    <EmployeeStatusTable />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <EventsWidget />
                        <BirthdaysWidget />
                    </div>
                </>
            )}

            {isFinance && (
                <>
                    <FinanceKpiCards />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <EventsWidget />
                        <BirthdaysWidget />
                    </div>
                </>
            )}

            {isEmployee && (
                <>
                    <EmployeePersonalDashboard userId={currentUser.email} userName={currentUser.name} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <EventsWidget readOnly />
                        <BirthdaysWidget />
                    </div>
                </>
            )}

            {isAuditor && (
                <>
                    <AuditorKpiCards />
                    <RecentAuditLog />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <EventsWidget readOnly />
                        <BirthdaysWidget />
                    </div>
                </>
            )}
        </div>
    );
}
