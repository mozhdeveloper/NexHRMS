"use client";

import { useState, useMemo, useCallback } from "react";
import { usePayrollStore } from "@/store/payroll.store";
import { useAttendanceStore } from "@/store/attendance.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield, Download } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";

export default function ReportsPage() {
    const payslips = usePayrollStore((s) => s.payslips);
    const logs = useAttendanceStore((s) => s.logs);
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);

    const canView = currentUser.role === "admin" || currentUser.role === "hr" || currentUser.role === "finance";

    const getEmpName = useCallback((id: string) => employees.find((e) => e.id === id)?.name || id, [employees]);

    // ─── Payroll Register (all payslips grouped by period) ───
    const payrollRegister = useMemo(() => {
        return [...payslips].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    }, [payslips]);

    // ─── Government Deductions Summary ──────────────────────
    const govtSummary = useMemo(() => {
        const totals = { sss: 0, philhealth: 0, pagibig: 0, tax: 0 };
        payslips.forEach((p) => {
            totals.sss += (p.sssDeduction || 0);
            totals.philhealth += (p.philhealthDeduction || 0);
            totals.pagibig += (p.pagibigDeduction || 0);
            totals.tax += (p.taxDeduction || 0);
        });
        return totals;
    }, [payslips]);

    // ─── Absence Report ─────────────────────────────────────
    const absenceReport = useMemo(() => {
        const absences: Record<string, number> = {};
        logs.forEach((l) => {
            if (l.status === "absent") {
                absences[l.employeeId] = (absences[l.employeeId] || 0) + 1;
            }
        });
        return Object.entries(absences)
            .map(([empId, count]) => ({ empId, name: getEmpName(empId), count }))
            .sort((a, b) => b.count - a.count);
    }, [logs, employees, getEmpName]);

    // ─── Late Report ────────────────────────────────────────
    const lateReport = useMemo(() => {
        const lates: Record<string, { count: number; totalMinutes: number }> = {};
        logs.forEach((l) => {
            if (l.lateMinutes && l.lateMinutes > 0) {
                if (!lates[l.employeeId]) lates[l.employeeId] = { count: 0, totalMinutes: 0 };
                lates[l.employeeId].count++;
                lates[l.employeeId].totalMinutes += l.lateMinutes;
            }
        });
        return Object.entries(lates)
            .map(([empId, data]) => ({ empId, name: getEmpName(empId), ...data }))
            .sort((a, b) => b.totalMinutes - a.totalMinutes);
    }, [logs, employees, getEmpName]);

    const [tab, setTab] = useState("payroll_register");

    // ─── Government Reports (monthly breakdown) ─────────
    const last6Months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), i);
        return format(d, "yyyy-MM");
    }), []);
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
    const monthPayslips = useMemo(() => payslips.filter((p) => p.issuedAt.startsWith(selectedMonth)), [payslips, selectedMonth]);
    const sssReport = useMemo(() => monthPayslips.map((p) => {
        const empShare = p.sssDeduction || 0;
        const erShare = Math.round(empShare * (9.5 / 4.5));
        return { employeeId: p.employeeId, name: getEmpName(p.employeeId), grossPay: p.grossPay || 0, empShare, erShare, total: empShare + erShare };
    }), [monthPayslips, getEmpName]);
    const philhealthReport = useMemo(() => monthPayslips.map((p) => {
        const empShare = p.philhealthDeduction || 0;
        return { employeeId: p.employeeId, name: getEmpName(p.employeeId), grossPay: p.grossPay || 0, empShare, erShare: empShare, total: empShare * 2 };
    }), [monthPayslips, getEmpName]);
    const pagibigReport = useMemo(() => monthPayslips.map((p) => {
        const empShare = p.pagibigDeduction || 0;
        return { employeeId: p.employeeId, name: getEmpName(p.employeeId), grossPay: p.grossPay || 0, empShare, erShare: empShare, total: empShare * 2 };
    }), [monthPayslips, getEmpName]);
    const taxReport = useMemo(() => monthPayslips.map((p) => ({
        employeeId: p.employeeId, name: getEmpName(p.employeeId), grossIncome: p.grossPay || 0, withholdingTax: p.taxDeduction || 0,
    })), [monthPayslips, getEmpName]);
    const govTotals = useMemo(() => ({
        sss: sssReport.reduce((s, r) => s + r.total, 0),
        philhealth: philhealthReport.reduce((s, r) => s + r.total, 0),
        pagibig: pagibigReport.reduce((s, r) => s + r.total, 0),
        tax: taxReport.reduce((s, r) => s + r.withholdingTax, 0),
    }), [sssReport, philhealthReport, pagibigReport, taxReport]);
    const exportCSV = (rows: string[][], filename: string) => {
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleExport = (label: string) => {
        const month = selectedMonth;
        if (label === "SSS") {
            exportCSV(
                [
                    ["Employee", "Monthly Salary", "Employee Share", "Employer Share", "Total"],
                    ...sssReport.map((r) => [r.name, r.grossPay, r.empShare, r.erShare, r.total].map(String)),
                    ["TOTAL",
                        sssReport.reduce((s, r) => s + r.grossPay, 0),
                        sssReport.reduce((s, r) => s + r.empShare, 0),
                        sssReport.reduce((s, r) => s + r.erShare, 0),
                        govTotals.sss,
                    ].map(String),
                ],
                `sss-${month}.csv`
            );
            toast.success("SSS report downloaded");
        } else if (label === "PhilHealth") {
            exportCSV(
                [
                    ["Employee", "Monthly Salary", "Employee Share", "Employer Share", "Total"],
                    ...philhealthReport.map((r) => [r.name, r.grossPay, r.empShare, r.erShare, r.total].map(String)),
                    ["TOTAL",
                        philhealthReport.reduce((s, r) => s + r.grossPay, 0),
                        philhealthReport.reduce((s, r) => s + r.empShare, 0),
                        philhealthReport.reduce((s, r) => s + r.erShare, 0),
                        govTotals.philhealth,
                    ].map(String),
                ],
                `philhealth-${month}.csv`
            );
            toast.success("PhilHealth report downloaded");
        } else if (label === "Pag-IBIG") {
            exportCSV(
                [
                    ["Employee", "Monthly Salary", "Employee Share", "Employer Share", "Total"],
                    ...pagibigReport.map((r) => [r.name, r.grossPay, r.empShare, r.erShare, r.total].map(String)),
                    ["TOTAL",
                        pagibigReport.reduce((s, r) => s + r.grossPay, 0),
                        pagibigReport.reduce((s, r) => s + r.empShare, 0),
                        pagibigReport.reduce((s, r) => s + r.erShare, 0),
                        govTotals.pagibig,
                    ].map(String),
                ],
                `pagibig-${month}.csv`
            );
            toast.success("Pag-IBIG report downloaded");
        } else if (label === "BIR Tax") {
            exportCSV(
                [
                    ["Employee", "Gross Income", "Withholding Tax", "Effective Rate"],
                    ...taxReport.map((r) => [
                        r.name,
                        r.grossIncome,
                        r.withholdingTax,
                        r.grossIncome > 0 ? ((r.withholdingTax / r.grossIncome) * 100).toFixed(2) + "%" : "0%",
                    ].map(String)),
                    ["TOTAL",
                        taxReport.reduce((s, r) => s + r.grossIncome, 0),
                        taxReport.reduce((s, r) => s + r.withholdingTax, 0),
                        "",
                    ].map(String),
                ],
                `bir-tax-${month}.csv`
            );
            toast.success("BIR/Tax report downloaded");
        }
    };

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Generated from live store data</p>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex flex-wrap gap-1 h-auto">
                    <TabsTrigger value="payroll_register" className="text-xs">Payroll Register</TabsTrigger>
                    <TabsTrigger value="govt" className="text-xs">Gov&apos;t Deductions</TabsTrigger>
                    <TabsTrigger value="absence" className="text-xs">Absence</TabsTrigger>
                    <TabsTrigger value="late" className="text-xs">Late</TabsTrigger>
                    <TabsTrigger value="gov_compliance" className="text-xs">Gov&apos;t Compliance</TabsTrigger>
                </TabsList>

                {/* Payroll Register */}
                <TabsContent value="payroll_register" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Period</TableHead>
                                        <TableHead className="text-xs">Gross</TableHead>
                                        <TableHead className="text-xs">SSS</TableHead>
                                        <TableHead className="text-xs">PH</TableHead>
                                        <TableHead className="text-xs">PI</TableHead>
                                        <TableHead className="text-xs">Tax</TableHead>
                                        <TableHead className="text-xs">Net</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollRegister.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No payroll data</TableCell></TableRow>
                                    ) : payrollRegister.map((ps) => (
                                        <TableRow key={ps.id}>
                                            <TableCell className="text-sm">{getEmpName(ps.employeeId)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{ps.periodStart} – {ps.periodEnd}</TableCell>
                                            <TableCell className="text-xs">₱{(ps.grossPay || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs text-red-500">₱{(ps.sssDeduction || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs text-red-500">₱{(ps.philhealthDeduction || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs text-red-500">₱{(ps.pagibigDeduction || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs text-red-500">₱{(ps.taxDeduction || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-sm font-medium">₱{ps.netPay.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Government Deductions Summary */}
                <TabsContent value="govt" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border border-blue-500/20 bg-blue-500/5">
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium">SSS Total</p>
                                <p className="text-2xl font-bold mt-1">₱{govtSummary.sss.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-green-500/20 bg-green-500/5">
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium">PhilHealth Total</p>
                                <p className="text-2xl font-bold mt-1">₱{govtSummary.philhealth.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-amber-500/20 bg-amber-500/5">
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium">Pag-IBIG Total</p>
                                <p className="text-2xl font-bold mt-1">₱{govtSummary.pagibig.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-red-500/20 bg-red-500/5">
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground font-medium">Tax Total</p>
                                <p className="text-2xl font-bold mt-1">₱{govtSummary.tax.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>
                    <Card className="border border-border/50 mt-4">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs text-muted-foreground">Grand Total Deductions</p>
                            <p className="text-3xl font-bold text-red-500 mt-1">
                                ₱{(govtSummary.sss + govtSummary.philhealth + govtSummary.pagibig + govtSummary.tax).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Absence Report */}
                <TabsContent value="absence" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">#</TableHead>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Absent Days</TableHead>
                                        <TableHead className="text-xs">Severity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {absenceReport.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No absence data</TableCell></TableRow>
                                    ) : absenceReport.map((row, i) => (
                                        <TableRow key={row.empId}>
                                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="text-sm font-medium">{row.name}</TableCell>
                                            <TableCell className="text-sm">{row.count}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`text-[10px] ${row.count >= 5 ? "bg-red-500/15 text-red-700 dark:text-red-400" : row.count >= 3 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"}`}>
                                                    {row.count >= 5 ? "High" : row.count >= 3 ? "Moderate" : "Low"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Late Report */}
                <TabsContent value="late" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">#</TableHead>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Late Count</TableHead>
                                        <TableHead className="text-xs">Total Late (min)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lateReport.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No late data recorded</TableCell></TableRow>
                                    ) : lateReport.map((row, i) => (
                                        <TableRow key={row.empId}>
                                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="text-sm font-medium">{row.name}</TableCell>
                                            <TableCell className="text-sm">{row.count}</TableCell>
                                            <TableCell className="text-sm font-medium">{row.totalMinutes} min</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Government Compliance — SSS / PhilHealth / Pag-IBIG / BIR */}
                <TabsContent value="gov_compliance" className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <p className="text-sm font-semibold">Monthly Government Compliance Report</p>
                        </div>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {last6Months.map((m) => (
                                    <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMMM yyyy")}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Summary totals */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <Card className="border border-blue-500/20 bg-blue-500/5"><CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">SSS Total</p>
                            <p className="text-lg font-bold mt-0.5">₱{govTotals.sss.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{sssReport.length} employees</p>
                        </CardContent></Card>
                        <Card className="border border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">PhilHealth Total</p>
                            <p className="text-lg font-bold mt-0.5">₱{govTotals.philhealth.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{philhealthReport.length} employees</p>
                        </CardContent></Card>
                        <Card className="border border-amber-500/20 bg-amber-500/5"><CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Pag-IBIG Total</p>
                            <p className="text-lg font-bold mt-0.5">₱{govTotals.pagibig.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{pagibigReport.length} employees</p>
                        </CardContent></Card>
                        <Card className="border border-red-500/20 bg-red-500/5"><CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Withholding Tax</p>
                            <p className="text-lg font-bold mt-0.5">₱{govTotals.tax.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{taxReport.length} employees</p>
                        </CardContent></Card>
                    </div>

                    {monthPayslips.length === 0 ? (
                        <Card className="border border-border/50"><CardContent className="p-12 text-center">
                            <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">No payslips for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</p>
                        </CardContent></Card>
                    ) : (
                        <Tabs defaultValue="sss">
                            <TabsList>
                                <TabsTrigger value="sss">SSS</TabsTrigger>
                                <TabsTrigger value="philhealth">PhilHealth</TabsTrigger>
                                <TabsTrigger value="pagibig">Pag-IBIG</TabsTrigger>
                                <TabsTrigger value="tax">BIR / Tax</TabsTrigger>
                            </TabsList>
                            <TabsContent value="sss" className="mt-3">
                                <Card className="border border-border/50">
                                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                        <p className="text-sm font-semibold">SSS Contributions · {sssReport.length} employees</p>
                                        <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => handleExport("SSS")}><Download className="h-3 w-3" /> CSV</Button>
                                    </div>
                                    <CardContent className="p-0">
                                        <Table><TableHeader><TableRow>
                                            <TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Gross Pay</TableHead><TableHead className="text-xs">Emp. Share</TableHead><TableHead className="text-xs">Er. Share</TableHead><TableHead className="text-xs font-semibold">Total</TableHead>
                                        </TableRow></TableHeader><TableBody>
                                            {sssReport.map((r) => (<TableRow key={r.employeeId}>
                                                <TableCell className="text-sm font-medium">{r.name}</TableCell>
                                                <TableCell className="text-sm">₱{r.grossPay.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm">₱{r.empShare.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm">₱{r.erShare.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm font-semibold">₱{r.total.toLocaleString()}</TableCell>
                                            </TableRow>))}
                                            <TableRow className="bg-muted/30 font-semibold">
                                                <TableCell>TOTAL</TableCell><TableCell>₱{sssReport.reduce((s,r)=>s+r.grossPay,0).toLocaleString()}</TableCell>
                                                <TableCell>₱{sssReport.reduce((s,r)=>s+r.empShare,0).toLocaleString()}</TableCell><TableCell>₱{sssReport.reduce((s,r)=>s+r.erShare,0).toLocaleString()}</TableCell>
                                                <TableCell className="text-blue-600 dark:text-blue-400">₱{govTotals.sss.toLocaleString()}</TableCell>
                                            </TableRow>
                                        </TableBody></Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="philhealth" className="mt-3">
                                <Card className="border border-border/50">
                                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                        <p className="text-sm font-semibold">PhilHealth Contributions · {philhealthReport.length} employees</p>
                                        <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => handleExport("PhilHealth")}><Download className="h-3 w-3" /> CSV</Button>
                                    </div>
                                    <CardContent className="p-0">
                                        <Table><TableHeader><TableRow>
                                            <TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Gross Pay</TableHead><TableHead className="text-xs">Emp. Share</TableHead><TableHead className="text-xs">Er. Share</TableHead><TableHead className="text-xs font-semibold">Total</TableHead>
                                        </TableRow></TableHeader><TableBody>
                                            {philhealthReport.map((r) => (<TableRow key={r.employeeId}>
                                                <TableCell className="text-sm font-medium">{r.name}</TableCell>
                                                <TableCell className="text-sm">₱{r.grossPay.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm">₱{r.empShare.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm">₱{r.erShare.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm font-semibold">₱{r.total.toLocaleString()}</TableCell>
                                            </TableRow>))}
                                            <TableRow className="bg-muted/30 font-semibold">
                                                <TableCell>TOTAL</TableCell><TableCell>₱{philhealthReport.reduce((s,r)=>s+r.grossPay,0).toLocaleString()}</TableCell>
                                                <TableCell>₱{philhealthReport.reduce((s,r)=>s+r.empShare,0).toLocaleString()}</TableCell><TableCell>₱{philhealthReport.reduce((s,r)=>s+r.erShare,0).toLocaleString()}</TableCell>
                                                <TableCell className="text-emerald-600 dark:text-emerald-400">₱{govTotals.philhealth.toLocaleString()}</TableCell>
                                            </TableRow>
                                        </TableBody></Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="pagibig" className="mt-3">
                                <Card className="border border-border/50">
                                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                        <p className="text-sm font-semibold">Pag-IBIG Contributions · {pagibigReport.length} employees</p>
                                        <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => handleExport("Pag-IBIG")}><Download className="h-3 w-3" /> CSV</Button>
                                    </div>
                                    <CardContent className="p-0">
                                        <Table><TableHeader><TableRow>
                                            <TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Gross Pay</TableHead><TableHead className="text-xs">Emp. Share</TableHead><TableHead className="text-xs">Er. Share</TableHead><TableHead className="text-xs font-semibold">Total</TableHead>
                                        </TableRow></TableHeader><TableBody>
                                            {pagibigReport.map((r) => (<TableRow key={r.employeeId}>
                                                <TableCell className="text-sm font-medium">{r.name}</TableCell>
                                                <TableCell className="text-sm">₱{r.grossPay.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm">₱{r.empShare.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm">₱{r.erShare.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm font-semibold">₱{r.total.toLocaleString()}</TableCell>
                                            </TableRow>))}
                                            <TableRow className="bg-muted/30 font-semibold">
                                                <TableCell>TOTAL</TableCell><TableCell>₱{pagibigReport.reduce((s,r)=>s+r.grossPay,0).toLocaleString()}</TableCell>
                                                <TableCell>₱{pagibigReport.reduce((s,r)=>s+r.empShare,0).toLocaleString()}</TableCell><TableCell>₱{pagibigReport.reduce((s,r)=>s+r.erShare,0).toLocaleString()}</TableCell>
                                                <TableCell className="text-amber-600 dark:text-amber-400">₱{govTotals.pagibig.toLocaleString()}</TableCell>
                                            </TableRow>
                                        </TableBody></Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="tax" className="mt-3">
                                <Card className="border border-border/50">
                                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                        <p className="text-sm font-semibold">BIR Withholding Tax · {taxReport.length} employees</p>
                                        <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => handleExport("BIR Tax")}><Download className="h-3 w-3" /> CSV</Button>
                                    </div>
                                    <CardContent className="p-0">
                                        <Table><TableHeader><TableRow>
                                            <TableHead className="text-xs">Employee</TableHead><TableHead className="text-xs">Gross Income</TableHead><TableHead className="text-xs font-semibold">Withholding Tax</TableHead><TableHead className="text-xs">Rate</TableHead>
                                        </TableRow></TableHeader><TableBody>
                                            {taxReport.map((r) => (<TableRow key={r.employeeId}>
                                                <TableCell className="text-sm font-medium">{r.name}</TableCell>
                                                <TableCell className="text-sm">₱{r.grossIncome.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm font-semibold text-red-600 dark:text-red-400">₱{r.withholdingTax.toLocaleString()}</TableCell>
                                                <TableCell>{r.grossIncome > 0 ? <Badge variant="secondary" className="text-[10px]">{((r.withholdingTax/r.grossIncome)*100).toFixed(1)}%</Badge> : "—"}</TableCell>
                                            </TableRow>))}
                                            <TableRow className="bg-muted/30 font-semibold">
                                                <TableCell>TOTAL</TableCell><TableCell>₱{taxReport.reduce((s,r)=>s+r.grossIncome,0).toLocaleString()}</TableCell>
                                                <TableCell className="text-red-600 dark:text-red-400">₱{govTotals.tax.toLocaleString()}</TableCell><TableCell></TableCell>
                                            </TableRow>
                                        </TableBody></Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

