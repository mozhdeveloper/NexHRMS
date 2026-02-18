"use client";

import { useEmployeesStore } from "@/store/employees.store";
import { useAttendanceStore } from "@/store/attendance.store";
import { useAuthStore } from "@/store/auth.store";
import { useEventsStore } from "@/store/events.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, formatCurrency } from "@/lib/format";
import {
    Users,
    UserCheck,
    UserX,
    CalendarOff,
    TrendingUp,
    Calendar,
    Cake,
    Eye,
    Plus,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ─── KPI Cards ──────────────────────────────────────────────
function KpiCards() {
    const employees = useEmployeesStore((s) => s.employees);
    const logs = useAttendanceStore((s) => s.logs);
    // Use state so the date is only computed client-side, avoiding SSR mismatch
    const [today, setToday] = useState<string>("");

    useEffect(() => {
        setToday(new Date().toISOString().split("T")[0]);
    }, []);

    const todayLogs = useMemo(
        () => (today ? logs.filter((l) => l.date === today) : []),
        [logs, today]
    );

    const totalEmployees = employees.filter((e) => e.status === "active").length;
    const totalPresent = todayLogs.filter((l) => l.status === "present").length;
    const totalAbsent = todayLogs.filter((l) => l.status === "absent").length;
    const totalOnLeave = todayLogs.filter((l) => l.status === "on_leave").length;

    const cards = [
        { label: "Total Present", value: totalPresent, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Total Absent", value: totalAbsent, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "On Leave", value: totalOnLeave, icon: CalendarOff, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Total Employees", value: totalEmployees, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <Card key={c.label} className="border border-border/50 hover:shadow-md transition-shadow duration-200">
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

// ─── Deterministic chart offsets (no Math.random) ───────────
// Use a seeded sine-based variation so server and client produce the same values
const CHART_OFFSETS = [2, -1, 3, -2, 4, 1, -3, 2, -1, 3, 0, -2];

// ─── Team Performance Chart ─────────────────────────────────
function TeamPerformanceChart() {
    const employees = useEmployeesStore((s) => s.employees);
    const [selectedDept, setSelectedDept] = useState("Engineering");

    const departments = [...new Set(employees.map((e) => e.department))];

    const chartData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months.map((month, i) => {
            const deptEmployees = employees.filter(
                (e) => e.department === selectedDept && e.status === "active"
            );
            const avgProd = deptEmployees.length
                ? Math.round(
                    deptEmployees.reduce((sum, e) => sum + e.productivity, 0) /
                    deptEmployees.length +
                    (Math.sin(i * 0.5) * 8 + CHART_OFFSETS[i])
                )
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
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="productivity"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "hsl(var(--primary))" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// ─── Role Distribution Donut ────────────────────────────────
const DONUT_COLORS = [
    "hsl(160, 60%, 45%)",
    "hsl(220, 60%, 55%)",
    "hsl(280, 50%, 55%)",
    "hsl(35, 80%, 55%)",
    "hsl(0, 60%, 55%)",
    "hsl(190, 55%, 50%)",
];

function RoleDistributionChart() {
    const employees = useEmployeesStore((s) => s.employees);

    const data = useMemo(() => {
        const deptCount: Record<string, number> = {};
        employees
            .filter((e) => e.status === "active")
            .forEach((e) => {
                deptCount[e.department] = (deptCount[e.department] || 0) + 1;
            });
        return Object.entries(deptCount).map(([name, value]) => ({ name, value }));
    }, [employees]);

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Total Employees</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: "12px" }}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// ─── Employee Status Widget ─────────────────────────────────
function EmployeeStatusTable() {
    const employees = useEmployeesStore((s) => s.employees);
    const logs = useAttendanceStore((s) => s.logs);
    // Defer today's date to client-side only
    const [today, setToday] = useState<string>("");

    useEffect(() => {
        setToday(new Date().toISOString().split("T")[0]);
    }, []);

    const statusList = useMemo(() => {
        return employees.slice(0, 8).map((emp) => {
            const todayLog = today
                ? logs.find((l) => l.employeeId === emp.id && l.date === today)
                : undefined;
            return {
                ...emp,
                attendance: todayLog?.status || "absent",
                teamLeaderName: emp.teamLeader
                    ? employees.find((e) => e.id === emp.teamLeader)?.name || "—"
                    : "—",
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
                    <CardTitle className="text-base font-semibold">Employee Status</CardTitle>
                    <Link href="/employees/manage">
                        <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
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
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// ─── Events Widget ──────────────────────────────────────────
function EventsWidget() {
    const { events, addEvent } = useEventsStore();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    const upcoming = [...events]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

    const handleAdd = () => {
        if (!title || !date || !time) return;
        addEvent({ title, date, time, type: "event" });
        setTitle("");
        setDate("");
        setTime("");
        setOpen(false);
        toast.success("Event created successfully");
    };

    return (
        <Card className="border border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Events & Meetings</CardTitle>
                    </div>
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
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {upcoming.map((evt) => (
                    <div key={evt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{evt.title}</p>
                            <p className="text-xs text-muted-foreground">{evt.date} · {evt.time}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                            {evt.type}
                        </Badge>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ─── Birthdays Widget ───────────────────────────────────────
function BirthdaysWidget() {
    const employees = useEmployeesStore((s) => s.employees);
    // Start with 0 (January) on server; update to real month on client
    const [month, setMonth] = useState(0);

    useEffect(() => {
        setMonth(new Date().getMonth());
    }, []);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const birthdays = useMemo(() => {
        return employees.filter((e) => {
            if (!e.birthday) return false;
            return new Date(e.birthday).getMonth() === month;
        }).sort((a, b) => {
            const dayA = new Date(a.birthday!).getDate();
            const dayB = new Date(b.birthday!).getDate();
            return dayA - dayB;
        });
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
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m, i) => (
                                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                            ))}
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

// ─── Main Dashboard Page ────────────────────────────────────
export default function DashboardPage() {
    const currentUser = useAuthStore((s) => s.currentUser);

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back, {currentUser.name.split(" ")[0]} 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening with your team today.
                </p>
            </div>

            {/* KPI Cards */}
            <KpiCards />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TeamPerformanceChart />
                <RoleDistributionChart />
            </div>

            {/* Employee Status Table */}
            <EmployeeStatusTable />

            {/* Bottom Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EventsWidget />
                <BirthdaysWidget />
            </div>
        </div>
    );
}
