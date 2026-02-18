"use client";

import { useState, useMemo } from "react";
import { useAttendanceStore } from "@/store/attendance.store";
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
import { Clock, LogIn, LogOut, Download } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
    const { logs, checkIn, checkOut, getTodayLog } = useAttendanceStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
    const [empFilter, setEmpFilter] = useState("all");

    const filteredLogs = useMemo(() => {
        return logs
            .filter((l) => {
                const matchDate = !dateFilter || l.date === dateFilter;
                const matchEmp = empFilter === "all" || l.employeeId === empFilter;
                return matchDate && matchEmp;
            })
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 50);
    }, [logs, dateFilter, empFilter]);

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;

    const statusColors = {
        present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        absent: "bg-red-500/15 text-red-700 dark:text-red-400",
        on_leave: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    };

    // Find the employee associated with the current demo user
    const myEmployeeId = employees.find(
        (e) => e.email === currentUser.email || e.name === currentUser.name
    )?.id;

    const todayLog = myEmployeeId ? getTodayLog(myEmployeeId) : undefined;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Daily check-in/out logs</p>
                </div>
                <div className="flex items-center gap-2">
                    {myEmployeeId && (
                        <>
                            {!todayLog?.checkIn ? (
                                <Button
                                    onClick={() => {
                                        checkIn(myEmployeeId);
                                        toast.success("Checked in successfully!");
                                    }}
                                    className="gap-1.5"
                                >
                                    <LogIn className="h-4 w-4" /> Check In
                                </Button>
                            ) : !todayLog?.checkOut ? (
                                <Button
                                    onClick={() => {
                                        checkOut(myEmployeeId);
                                        toast.success("Checked out successfully!");
                                    }}
                                    variant="outline"
                                    className="gap-1.5"
                                >
                                    <LogOut className="h-4 w-4" /> Check Out
                                </Button>
                            ) : (
                                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-3 py-1.5">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                                    {todayLog.hours}h logged
                                </Badge>
                            )}
                        </>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("CSV export coming soon!")}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border border-border/50">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-[180px]"
                        />
                        <Select value={empFilter} onValueChange={setEmpFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Employees" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {employees
                                    .filter((e) => e.status === "active")
                                    .map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Employee</TableHead>
                                <TableHead className="text-xs">Check In</TableHead>
                                <TableHead className="text-xs">Check Out</TableHead>
                                <TableHead className="text-xs">Hours</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                        No attendance logs for the selected date
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">{log.date}</TableCell>
                                        <TableCell className="text-sm font-medium">{getEmpName(log.employeeId)}</TableCell>
                                        <TableCell className="text-sm">{log.checkIn || "—"}</TableCell>
                                        <TableCell className="text-sm">{log.checkOut || "—"}</TableCell>
                                        <TableCell className="text-sm">{log.hours ? `${log.hours}h` : "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${statusColors[log.status]}`}>
                                                {log.status.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
