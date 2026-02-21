"use client";

import { useNotificationsStore } from "@/store/notifications.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Bell, Trash2, Mail } from "lucide-react";
import { format, parseISO } from "date-fns";

const typeColors: Record<string, string> = {
    assignment: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    reassignment: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    absence: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const typeLabels: Record<string, string> = {
    assignment: "Assignment",
    reassignment: "Reassignment",
    absence: "Absence",
};

export default function NotificationsPage() {
    const { logs, clearLogs } = useNotificationsStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);

    const isAdmin = currentUser.role === "admin" || currentUser.role === "hr";
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Bell className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>
            </div>
        );
    }

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;
    const getEmpEmail = (id: string) => employees.find((e) => e.id === id)?.email || "—";

    const formatSentAt = (iso: string) => {
        try { return format(parseISO(iso), "MMM dd, yyyy · hh:mm a"); }
        catch { return iso; }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notification Log</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {logs.length} mock email{logs.length !== 1 ? "s" : ""} sent
                    </p>
                </div>
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

            <Card className="border border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">Employee</TableHead>
                                <TableHead className="text-xs">Email</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Subject</TableHead>
                                <TableHead className="text-xs">Sent At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No notifications sent yet</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            Notifications are triggered by project assignments and absence alerts
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs text-muted-foreground font-mono">{log.id}</TableCell>
                                        <TableCell className="text-sm font-medium">{getEmpName(log.employeeId)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{getEmpEmail(log.employeeId)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${typeColors[log.type] || ""}`}>
                                                {typeLabels[log.type] || log.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground" title={log.subject}>
                                            {log.subject}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatSentAt(log.sentAt)}
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
