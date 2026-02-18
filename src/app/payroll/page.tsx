"use client";

import { useState } from "react";
import { usePayrollStore } from "@/store/payroll.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import { Wallet, Send, CheckCircle, Plus } from "lucide-react";
import { toast } from "sonner";

export default function PayrollPage() {
    const { payslips, issuePayslip, confirmPayslip } = usePayrollStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const [issueOpen, setIssueOpen] = useState(false);
    const [issueEmpId, setIssueEmpId] = useState("");
    const [issuePeriodStart, setIssuePeriodStart] = useState("");
    const [issuePeriodEnd, setIssuePeriodEnd] = useState("");
    const [issueNetPay, setIssueNetPay] = useState("");

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;

    const isFinanceOrAdmin = currentUser.role === "admin" || currentUser.role === "finance";

    const pendingPayslips = payslips.filter((p) => p.status === "pending");
    const confirmedPayslips = payslips.filter((p) => p.status === "confirmed");

    const handleIssue = () => {
        if (!issueEmpId || !issuePeriodStart || !issuePeriodEnd || !issueNetPay) {
            toast.error("Please fill all fields");
            return;
        }
        issuePayslip({
            employeeId: issueEmpId,
            periodStart: issuePeriodStart,
            periodEnd: issuePeriodEnd,
            netPay: Number(issueNetPay),
        });
        toast.success("Payslip issued!");
        setIssueOpen(false);
        setIssueEmpId("");
        setIssuePeriodStart("");
        setIssuePeriodEnd("");
        setIssueNetPay("");
    };

    // Payroll runs (stub data)
    const payrollRuns = [
        { id: "PR001", date: "2026-02-05", cutoffStart: "2026-01-01", cutoffEnd: "2026-01-31", status: "completed", totalAmount: 78000 },
        { id: "PR002", date: "2026-01-05", cutoffStart: "2025-12-01", cutoffEnd: "2025-12-31", status: "completed", totalAmount: 76500 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage payroll runs and payslips</p>
                </div>
                {isFinanceOrAdmin && (
                    <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Issue Payslip</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Issue Payslip</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                                <Select value={issueEmpId} onValueChange={setIssueEmpId}>
                                    <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                    <SelectContent>
                                        {employees.filter((e) => e.status === "active").map((e) => (
                                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Period Start</label>
                                        <Input type="date" value={issuePeriodStart} onChange={(e) => setIssuePeriodStart(e.target.value)} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Period End</label>
                                        <Input type="date" value={issuePeriodEnd} onChange={(e) => setIssuePeriodEnd(e.target.value)} className="mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Net Pay ($)</label>
                                    <Input type="number" placeholder="0.00" value={issueNetPay} onChange={(e) => setIssueNetPay(e.target.value)} className="mt-1" />
                                </div>
                                <Button onClick={handleIssue} className="w-full gap-1.5"><Send className="h-4 w-4" /> Issue Payslip</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Tabs defaultValue="payslips">
                <TabsList>
                    <TabsTrigger value="payslips">Payslip Inbox</TabsTrigger>
                    <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
                </TabsList>

                <TabsContent value="payslips" className="mt-4 space-y-4">
                    {/* Pending Payslips */}
                    <Card className="border border-border/50">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-amber-500" />
                                <CardTitle className="text-base font-semibold">Pending ({pendingPayslips.length})</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Period</TableHead>
                                        <TableHead className="text-xs">Net Pay</TableHead>
                                        <TableHead className="text-xs">Issued</TableHead>
                                        <TableHead className="text-xs w-24">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingPayslips.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No pending payslips</TableCell></TableRow>
                                    ) : pendingPayslips.map((ps) => (
                                        <TableRow key={ps.id}>
                                            <TableCell className="text-sm font-medium">{getEmpName(ps.employeeId)}</TableCell>
                                            <TableCell className="text-sm">{ps.periodStart} – {ps.periodEnd}</TableCell>
                                            <TableCell className="text-sm font-medium">{formatCurrency(ps.netPay)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{ps.issuedAt}</TableCell>
                                            <TableCell>
                                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { confirmPayslip(ps.id); toast.success("Payslip confirmed!"); }}>
                                                    <CheckCircle className="h-3.5 w-3.5" /> Confirm
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Confirmed Payslips */}
                    <Card className="border border-border/50">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                                <CardTitle className="text-base font-semibold">Confirmed ({confirmedPayslips.length})</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Period</TableHead>
                                        <TableHead className="text-xs">Net Pay</TableHead>
                                        <TableHead className="text-xs">Confirmed At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {confirmedPayslips.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No confirmed payslips</TableCell></TableRow>
                                    ) : confirmedPayslips.map((ps) => (
                                        <TableRow key={ps.id}>
                                            <TableCell className="text-sm font-medium">{getEmpName(ps.employeeId)}</TableCell>
                                            <TableCell className="text-sm">{ps.periodStart} – {ps.periodEnd}</TableCell>
                                            <TableCell className="text-sm font-medium">{formatCurrency(ps.netPay)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{ps.confirmedAt ? new Date(ps.confirmedAt).toLocaleString() : "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="runs" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Run ID</TableHead>
                                        <TableHead className="text-xs">Run Date</TableHead>
                                        <TableHead className="text-xs">Cutoff Range</TableHead>
                                        <TableHead className="text-xs">Total Amount</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollRuns.map((run) => (
                                        <TableRow key={run.id}>
                                            <TableCell className="text-sm font-medium">{run.id}</TableCell>
                                            <TableCell className="text-sm">{run.date}</TableCell>
                                            <TableCell className="text-sm">{run.cutoffStart} – {run.cutoffEnd}</TableCell>
                                            <TableCell className="text-sm font-medium">{formatCurrency(run.totalAmount)}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                                    {run.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
