"use client";

import { useNotificationsStore } from "@/store/notifications.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useRolesStore } from "@/store/roles.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Bell, Trash2, Mail, MessageSquare, Settings } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

const typeColors: Record<string, string> = {
    assignment: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    reassignment: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    absence: "bg-red-500/15 text-red-700 dark:text-red-400",
    payslip_published: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    payslip_signed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    payslip_unsigned_reminder: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    payment_confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    leave_submitted: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    leave_approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    leave_rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
    attendance_missing: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    geofence_violation: "bg-red-500/15 text-red-700 dark:text-red-400",
    location_disabled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    loan_reminder: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
    overtime_submitted: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
    birthday: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
    contract_expiry: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    daily_summary: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

const typeLabels: Record<string, string> = {
    assignment: "Assignment",
    reassignment: "Reassignment",
    absence: "Absence",
    payslip_published: "Payslip Published",
    payslip_signed: "Payslip Signed",
    payslip_unsigned_reminder: "Unsigned Reminder",
    payment_confirmed: "Payment Confirmed",
    leave_submitted: "Leave Submitted",
    leave_approved: "Leave Approved",
    leave_rejected: "Leave Rejected",
    attendance_missing: "Missing Attendance",
    geofence_violation: "Geofence Violation",
    location_disabled: "GPS Disabled",
    loan_reminder: "Loan Reminder",
    overtime_submitted: "OT Submitted",
    birthday: "Birthday",
    contract_expiry: "Contract Expiry",
    daily_summary: "Daily Summary",
};

const channelIcons: Record<string, string> = {
    email: "\uD83D\uDCE7 Email",
    sms: "\uD83D\uDCF1 SMS",
    both: "\uD83D\uDCE8 Both",
    in_app: "\uD83D\uDD14 In-App",
};

export default function NotificationsPage() {
    const { logs, clearLogs } = useNotificationsStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);

    const { hasPermission } = useRolesStore();
    const isAdmin = hasPermission(currentUser.role, "notifications:manage");
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Bell className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>
            </div>
        );
    }

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;
    const getEmpEmail = (id: string) => employees.find((e) => e.id === id)?.email || "\u2014";

    const formatSentAt = (iso: string) => {
        try { return format(parseISO(iso), "MMM dd, yyyy \u00B7 hh:mm a"); }
        catch { return iso; }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notification Log</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {logs.length} notification{logs.length !== 1 ? "s" : ""} dispatched
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/settings/notifications">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <Settings className="h-4 w-4" /> Rules
                        </Button>
                    </Link>
                    {logs.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={clearLogs}
                        >
                            <Trash2 className="h-4 w-4" /> Clear All
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Badges */}
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                    <Mail className="h-3 w-3" /> {logs.filter((l) => l.channel === "email" || l.channel === "both").length} email
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                    <MessageSquare className="h-3 w-3" /> {logs.filter((l) => l.channel === "sms" || l.channel === "both").length} SMS
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                    <Bell className="h-3 w-3" /> {logs.filter((l) => l.channel === "in_app" || !l.channel).length} in-app
                </Badge>
            </div>

            <Card className="border border-border/50">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Employee</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Channel</TableHead>
                                <TableHead className="text-xs">Subject</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Sent At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No notifications dispatched yet</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            Notifications are triggered by payroll actions, attendance, leave, and geofence events
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm font-medium">{getEmpName(log.employeeId)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${typeColors[log.type] || ""}`}>
                                                {typeLabels[log.type] || log.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs whitespace-nowrap">
                                                {channelIcons[log.channel || "in_app"] || "\uD83D\uDD14 In-App"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground" title={log.subject}>
                                            {log.subject}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${
                                                log.status === "sent" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                                log.status === "failed" ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                                                "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                            }`}>
                                                {log.status || "simulated"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatSentAt(log.sentAt)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
        </div>
    );
}
