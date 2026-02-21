"use client";

import { useState, useMemo } from "react";
import { usePayrollStore } from "@/store/payroll.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useLoansStore } from "@/store/loans.store";
import { useAttendanceStore } from "@/store/attendance.store";
import { PH_HOLIDAY_MULTIPLIERS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle, Eye, Lock, Gift, Download, CalendarDays, RotateCcw, Send, CreditCard, FileText, Sparkles, Shield } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { computeAllPHDeductions } from "@/lib/ph-deductions";
import { SignaturePad } from "@/components/ui/signature-pad";
import { format, endOfMonth, subMonths, getYear, getMonth } from "date-fns";

export default function PayrollPage() {
    const { payslips, runs, adjustments, finalPayComputations, issuePayslip, confirmPayslip, publishPayslip, recordPayment, signPayslip, lockRun, publishRun, markRunPaid, createAdjustment, approveAdjustment, rejectAdjustment, applyAdjustment, generate13thMonth, exportBankFile, createDraftRun, validateRun, computeFinalPay, getFinalPay, resetToSeed, paySchedule } = usePayrollStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const { getActiveByEmployee, recordDeduction } = useLoansStore();
    const holidays = useAttendanceStore((s) => s.holidays);
    const attendanceLogs = useAttendanceStore((s) => s.logs);

    const [open, setOpen] = useState(false);
    const [snapshotRunDate, setSnapshotRunDate] = useState<string | null>(null);
    const [viewSlip, setViewSlip] = useState<string | null>(null);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [formAllowances, setFormAllowances] = useState("0");
    const [formOtherDeductions, setFormOtherDeductions] = useState("0");
    const [formNotes, setFormNotes] = useState("");
    const [formIssuedAt, setFormIssuedAt] = useState(format(new Date(), "yyyy-MM-dd"));
    // Semi-monthly cutoff state
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
    const [cutoff, setCutoff] = useState<"first" | "second">("first");

    const canIssue = currentUser.role === "admin" || currentUser.role === "finance" || currentUser.role === "payroll_admin";
    const isEmployee = currentUser.role === "employee";

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;

    // ─── Compute cutoff date range (frequency-aware) ─────────────────
    const cutoffDates = useMemo(() => {
        const base = new Date(selectedMonth + "-01");
        const year = getYear(base);
        const month = getMonth(base);
        const freq = paySchedule.defaultFrequency;

        if (freq === "semi_monthly") {
            const cutDay = paySchedule.semiMonthlyFirstCutoff;
            if (cutoff === "first") {
                return {
                    start: `${selectedMonth}-01`,
                    end: `${selectedMonth}-${String(cutDay).padStart(2, "0")}`,
                    label: `${format(new Date(year, month, 1), "MMM d")} – ${format(new Date(year, month, cutDay), "MMM d, yyyy")}`,
                };
            } else {
                const eom = endOfMonth(new Date(year, month, 1));
                return {
                    start: `${selectedMonth}-${String(cutDay + 1).padStart(2, "0")}`,
                    end: format(eom, "yyyy-MM-dd"),
                    label: `${format(new Date(year, month, cutDay + 1), "MMM d")} – ${format(eom, "MMM d, yyyy")}`,
                };
            }
        }
        // monthly / bi_weekly / weekly — full month range
        const eom = endOfMonth(new Date(year, month, 1));
        return {
            start: `${selectedMonth}-01`,
            end: format(eom, "yyyy-MM-dd"),
            label: `${format(new Date(year, month, 1), "MMM d")} – ${format(eom, "MMM d, yyyy")}`,
        };
    }, [selectedMonth, cutoff, paySchedule]);

    const last6Months = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(new Date(), i);
            return format(d, "yyyy-MM");
        });
    }, []);

    const activeEmployees = useMemo(() => {
        return employees.filter((e) => e.status === "active");
    }, [employees]);

    const allSelected = selectedEmployeeIds.length === activeEmployees.length && activeEmployees.length > 0;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedEmployeeIds([]);
        } else {
            setSelectedEmployeeIds(activeEmployees.map((e) => e.id));
        }
    };

    const toggleEmployee = (empId: string) => {
        setSelectedEmployeeIds((prev) =>
            prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
        );
    };

    const handleIssue = () => {
        // Lock check: block if the issuance date falls on a locked run
        const issuanceDateLocked = isRunLocked(formIssuedAt);
        if (issuanceDateLocked) {
            toast.error("The selected issuance date belongs to a locked payroll run. Use adjustments for corrections.");
            return;
        }
        if (selectedEmployeeIds.length === 0 || !cutoffDates.start || !cutoffDates.end) {
            toast.error("Please select at least one employee and ensure valid pay period");
            return;
        }

        let successCount = 0;
        let totalLoanDeductions = 0;

        selectedEmployeeIds.forEach((empId) => {
            const emp = employees.find((e) => e.id === empId);
            if (!emp) return;

            // salary = MONTHLY. Compute grossPay based on pay frequency
            const freq = emp.payFrequency || paySchedule.defaultFrequency;
            let grossPay: number;
            if (freq === "semi_monthly") {
                grossPay = Math.round(emp.salary / 2);
            } else if (freq === "bi_weekly") {
                grossPay = Math.round((emp.salary * 12) / 26);
            } else if (freq === "weekly") {
                grossPay = Math.round((emp.salary * 12) / 52);
            } else {
                grossPay = emp.salary; // monthly
            }

            // Gov deductions are based on monthly salary
            const phDeductions = computeAllPHDeductions(emp.salary);

            // For semi-monthly: only deduct gov from the configured cutoff
            let govMultiplier = 1;
            if (freq === "semi_monthly") {
                if (paySchedule.deductGovFrom === "both") {
                    govMultiplier = 0.5; // split across both
                } else if (paySchedule.deductGovFrom === "first" && cutoff !== "first") {
                    govMultiplier = 0; // 2nd cutoff, no gov deductions
                } else if (paySchedule.deductGovFrom === "second" && cutoff !== "second") {
                    govMultiplier = 0; // 1st cutoff, no gov deductions
                }
            }
            
            // Get active loans for this employee
            const empLoans = getActiveByEmployee(empId);
            const empLoanDeduction = empLoans.reduce((sum, l) => sum + Math.min(l.monthlyDeduction, l.remainingBalance), 0);
            totalLoanDeductions += empLoanDeduction;

            const allowances = Number(formAllowances) || 0;
            const otherDed = Number(formOtherDeductions) || 0;

            const sss = Math.round(phDeductions.sss * govMultiplier);
            const ph = Math.round(phDeductions.philHealth * govMultiplier);
            const pi = Math.round(phDeductions.pagIBIG * govMultiplier);
            const tax = Math.round(phDeductions.withholdingTax * govMultiplier);
            const totalGovDed = sss + ph + pi + tax;

            // ─── Holiday Pay Multipliers (DOLE) ──────────────────────────────
            const dailyRate = Math.round(emp.salary / 22); // ~22 working days/month
            const periodHolidays = holidays.filter(
                (h) => h.date >= cutoffDates.start && h.date <= cutoffDates.end
            );
            let holidayPaySupp = 0;
            periodHolidays.forEach((hol) => {
                const log = attendanceLogs.find((l) => l.employeeId === empId && l.date === hol.date);
                const worked = log?.status === "present";
                const multipliers = PH_HOLIDAY_MULTIPLIERS[
                    hol.type === "regular" ? "regular_holiday" : "special_holiday"
                ];
                if (hol.type === "regular") {
                    // Worked on regular holiday: 200% = base + 100% supplement
                    // Not worked: 100% (base already included in grossPay — no supplement needed)
                    if (worked) holidayPaySupp += dailyRate; // +100% on top of regular base
                } else {
                    // Worked on special holiday: 130% = base + 30% supplement
                    // Not worked: 0 (special non-working = no pay if absent — deduct daily rate)
                    if (worked) holidayPaySupp += Math.round(dailyRate * (multipliers.worked - 1));
                    else holidayPaySupp -= dailyRate; // absent on special holiday = no pay for that day
                }
            });

            const netPay = grossPay + allowances + holidayPaySupp - totalGovDed - otherDed - empLoanDeduction;

            if (netPay <= 0) {
                toast.error(`Skipped ${emp.name}: Net pay would be \u2264 0`);
                return;
            }

            issuePayslip({
                employeeId: empId,
                periodStart: cutoffDates.start,
                periodEnd: cutoffDates.end,
                payFrequency: freq,
                grossPay,
                allowances,
                sssDeduction: sss,
                philhealthDeduction: ph,
                pagibigDeduction: pi,
                taxDeduction: tax,
                otherDeductions: otherDed,
                loanDeduction: empLoanDeduction,
                holidayPay: holidayPaySupp !== 0 ? holidayPaySupp : undefined,
                netPay,
                notes: formNotes || undefined,
                issuedAt: formIssuedAt,
            });

            // Record loan deductions
            const actualPayslipId = usePayrollStore.getState().payslips
                .filter((p) => p.employeeId === empId)
                .sort((a, b) => b.id.localeCompare(a.id))[0]?.id ?? `PS-fallback-${Date.now()}`;

            empLoans.forEach((loan) => {
                const deductAmount = Math.min(loan.monthlyDeduction, loan.remainingBalance);
                if (deductAmount > 0) {
                    recordDeduction(loan.id, actualPayslipId, deductAmount);
                }
            });

            successCount++;
        });

        const loanMsg = totalLoanDeductions > 0 ? ` (incl. ${formatCurrency(totalLoanDeductions)} total loan deductions)` : "";
        toast.success(`✅ Issued ${successCount} payslip${successCount > 1 ? 's' : ''}${loanMsg}`);
        
        setOpen(false);
        setSelectedEmployeeIds([]);
        setFormAllowances("0");
        setFormOtherDeductions("0");
        setFormNotes("");
        setFormIssuedAt(format(new Date(), "yyyy-MM-dd"));
    };

    const handle13thMonth = () => {
        const activeEmps = employees.filter((e) => e.status === "active");
        generate13thMonth(activeEmps.map((e) => ({ id: e.id, salary: e.salary, joinDate: e.joinDate })));
        toast.success(`Generated 13th Month Pay for ${activeEmps.length} employees`);
    };

    const filteredPayslips = useMemo(() => {
        if (isEmployee) {
            const myEmp = employees.find((e) => e.email === currentUser.email || e.name === currentUser.name);
            // Employees can only see payslips that have been published or later
            return payslips.filter((p) => p.employeeId === myEmp?.id && ["published", "paid", "acknowledged"].includes(p.status));
        }
        return payslips;
    }, [payslips, isEmployee, employees, currentUser.name]);

    // Payroll runs — grouped by issuedAt
    const payrollRuns = useMemo(() => {
        const grouped: Record<string, { date: string; count: number; totalNet: number; totalGross: number; confirmed: number }> = {};
        payslips.forEach((p) => {
            const key = p.issuedAt;
            if (!grouped[key]) grouped[key] = { date: key, count: 0, totalNet: 0, totalGross: 0, confirmed: 0 };
            grouped[key].count++;
            grouped[key].totalNet += p.netPay;
            grouped[key].totalGross += (p.grossPay || 0);
            if (p.status === "confirmed") grouped[key].confirmed++;
        });
        return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    }, [payslips]);

    const isRunLocked = (runDate: string) => runs.find((r) => r.periodLabel === runDate)?.locked ?? false;

    const today = new Date().toISOString().split("T")[0];
    // Lock is checked against formIssuedAt at submission time; button uses formIssuedAt too
    const isTodayLocked = isRunLocked(formIssuedAt);

    const viewedPayslip = viewSlip ? payslips.find((p) => p.id === viewSlip) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filteredPayslips.length} payslips</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Reset Button — for simulation */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                                <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Reset</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reset Payroll Data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will clear all payroll data and restore it to the initial demo state. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { resetToSeed(); toast.success("Payroll data reset to demo state"); }}>Reset</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {canIssue && (
                        <>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={handle13thMonth}>
                                <Gift className="h-4 w-4" /> <span className="hidden sm:inline">13th Month</span>
                            </Button>
                            <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger asChild>
                                    <div className="inline-block" title={isTodayLocked ? "Run is locked" : ""}>
                                        <Button className="gap-1.5" disabled={isTodayLocked}>
                                            {isTodayLocked ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                            Issue Payslip
                                        </Button>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
                                    <DialogHeader className="shrink-0">
                                        <DialogTitle>Issue Payslip — Bulk</DialogTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Select employees to issue payslips. Each will use their directory salary.
                                        </p>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-1 overflow-y-auto pr-1">
                                        {/* Pay Period */}
                                        <div>
                                            <label className="text-sm font-medium">Pay Period</label>
                                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {last6Months.map((m) => (
                                                        <SelectItem key={m} value={m}>
                                                            {format(new Date(m + "-01"), "MMMM yyyy")}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {paySchedule.defaultFrequency === "semi_monthly" && (
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <Button
                                                        type="button" size="sm"
                                                        variant={cutoff === "first" ? "default" : "outline"}
                                                        className="gap-1.5 justify-start"
                                                        onClick={() => setCutoff("first")}
                                                    >
                                                        <CalendarDays className="h-3.5 w-3.5" /> 1st – {paySchedule.semiMonthlyFirstCutoff}th
                                                    </Button>
                                                    <Button
                                                        type="button" size="sm"
                                                        variant={cutoff === "second" ? "default" : "outline"}
                                                        className="gap-1.5 justify-start"
                                                        onClick={() => setCutoff("second")}
                                                    >
                                                        <CalendarDays className="h-3.5 w-3.5" /> {paySchedule.semiMonthlyFirstCutoff + 1}th – EOM
                                                    </Button>
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1.5 font-mono bg-muted px-2 py-1 rounded">
                                                {cutoffDates.label}
                                            </p>
                                        </div>

                                        {/* Issue Date */}
                                        <div>
                                            <label className="text-sm font-medium">Issue Date</label>
                                            <Input
                                                type="date"
                                                value={formIssuedAt}
                                                onChange={(e) => setFormIssuedAt(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>

                                        {/* Employee Selection with Select All */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-medium">
                                                    Select Employees ({selectedEmployeeIds.length} selected)
                                                </label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={toggleSelectAll}
                                                    className="h-8 text-xs"
                                                >
                                                    {allSelected ? "Deselect All" : "Select All"}
                                                </Button>
                                            </div>
                                            <Card className="border border-border/50 max-h-[280px] overflow-y-auto">
                                                <CardContent className="p-2 space-y-1">
                                                    {activeEmployees.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground text-center py-4">
                                                            No active employees found
                                                        </p>
                                                    ) : activeEmployees.map((emp) => (
                                                        <div
                                                            key={emp.id}
                                                            onClick={() => toggleEmployee(emp.id)}
                                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
                                                        >
                                                            <Checkbox
                                                                checked={selectedEmployeeIds.includes(emp.id)}
                                                                onCheckedChange={() => toggleEmployee(emp.id)}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium">{emp.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {emp.role} • {emp.department} • {formatCurrency(emp.salary)}/mo
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                                                {(() => {
                                                                    const f = emp.payFrequency || paySchedule.defaultFrequency;
                                                                    if (f === "semi_monthly") return `≈${formatCurrency(Math.round(emp.salary / 2))}/cutoff`;
                                                                    if (f === "bi_weekly") return `≈${formatCurrency(Math.round((emp.salary * 12) / 26))}/period`;
                                                                    if (f === "weekly") return `≈${formatCurrency(Math.round((emp.salary * 12) / 52))}/wk`;
                                                                    return `${formatCurrency(emp.salary)}/mo`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Allowances & Deductions (Applied to ALL) */}
                                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                                                ⚠️ Applied to ALL selected employees
                                            </p>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Extra Allowances / Bonus (+)</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={formAllowances}
                                                        onChange={(e) => setFormAllowances(e.target.value)}
                                                        className="mt-1 h-9"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Other Deductions (−)</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={formOtherDeductions}
                                                        onChange={(e) => setFormOtherDeductions(e.target.value)}
                                                        className="mt-1 h-9"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="text-xs text-muted-foreground">Notes (optional)</label>
                                            <Input
                                                value={formNotes}
                                                onChange={(e) => setFormNotes(e.target.value)}
                                                placeholder="e.g. bonus included"
                                                className="mt-1"
                                            />
                                        </div>

                                        {/* Auto-computed notice */}
                                        {selectedEmployeeIds.length > 0 && (
                                            <Card className="border border-emerald-500/30 bg-emerald-500/5">
                                                <CardContent className="p-3">
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                                        <strong>Auto-computed per employee:</strong>
                                                        <br />• Monthly gross from directory salary
                                                        <br />• PH Gov&apos;t deductions (SSS, PhilHealth, Pag-IBIG, Tax)
                                                        <br />• Active loan deductions (auto-deducted from payslip)
                                                        <br />• Holiday pay premiums (DOLE: 200% reg / 130% special)
                                                        <br />• Net pay validation (must be &gt; 0)
                                                        {holidays.filter(h => h.date >= cutoffDates.start && h.date <= cutoffDates.end).length > 0 && (
                                                            <span className="block mt-1 font-semibold text-amber-700 dark:text-amber-400">
                                                                ⚠️ {holidays.filter(h => h.date >= cutoffDates.start && h.date <= cutoffDates.end).length} holiday(s) in this period — rates applied automatically.
                                                            </span>
                                                        )}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Button
                                            onClick={handleIssue}
                                            className="w-full"
                                            disabled={selectedEmployeeIds.length === 0}
                                        >
                                            Issue {selectedEmployeeIds.length} Payslip{selectedEmployeeIds.length !== 1 ? 's' : ''}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            <Tabs defaultValue="payslips">
                <TabsList className="w-full overflow-x-auto justify-start">
                    <TabsTrigger value="payslips">Payslips</TabsTrigger>
                    <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
                    {canIssue && <TabsTrigger value="adjustments">Adjustments</TabsTrigger>}
                    {canIssue && <TabsTrigger value="final-pay">Final Pay</TabsTrigger>}
                </TabsList>

                <TabsContent value="payslips" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Period</TableHead>
                                        <TableHead className="text-xs">Gross</TableHead>
                                        <TableHead className="text-xs">Deductions</TableHead>
                                        <TableHead className="text-xs">Net Pay</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs w-24"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPayslips.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No payslips</TableCell></TableRow>
                                    ) : filteredPayslips.map((ps) => (
                                        <TableRow key={ps.id}>
                                            <TableCell className="text-sm font-medium">{getEmpName(ps.employeeId)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{ps.periodStart} – {ps.periodEnd}</TableCell>
                                            <TableCell className="text-xs">₱{(ps.grossPay || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-xs text-red-500">
                                                −₱{((ps.sssDeduction || 0) + (ps.philhealthDeduction || 0) + (ps.pagibigDeduction || 0) + (ps.taxDeduction || 0) + (ps.otherDeductions || 0) + (ps.loanDeduction || 0)).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">₱{ps.netPay.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`text-[10px] ${
                                                    ps.status === "acknowledged" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                                    ps.status === "paid" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                                    ps.status === "published" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
                                                    ps.status === "confirmed" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" :
                                                    ps.status === "issued" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                                                    "bg-slate-500/15 text-slate-700 dark:text-slate-400"
                                                }`}>
                                                    {ps.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewSlip(ps.id)}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {canIssue && ps.status === "issued" && !isRunLocked(ps.issuedAt) && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={() => { confirmPayslip(ps.id); toast.success("Payslip confirmed!"); }}>
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {canIssue && ps.status === "confirmed" && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-600 hover:text-violet-700" title="Publish" onClick={() => { publishPayslip(ps.id); toast.success("Payslip published!"); }}>
                                                            <Send className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {canIssue && ps.status === "published" && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" title="Record Payment" onClick={() => { recordPayment(ps.id, "bank_transfer", `REF-${Date.now()}`); toast.success("Payment recorded!"); }}>
                                                            <CreditCard className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="runs" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Date</TableHead>
                                        <TableHead className="text-xs">Payslips</TableHead>
                                        <TableHead className="text-xs">Total Gross</TableHead>
                                        <TableHead className="text-xs">Total Net</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        {canIssue && <TableHead className="text-xs w-40">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollRuns.length === 0 ? (
                                        <TableRow><TableCell colSpan={canIssue ? 6 : 5} className="text-center text-sm text-muted-foreground py-8">No payroll runs</TableCell></TableRow>
                                    ) : payrollRuns.map((run) => {
                                        const locked = isRunLocked(run.date);
                                        const runObj = runs.find((r) => r.periodLabel === run.date);
                                        const runStatus = runObj?.status ?? (locked ? "locked" : "draft");
                                        return (
                                            <TableRow key={run.date}>
                                                <TableCell className="text-sm">{run.date}</TableCell>
                                                <TableCell className="text-sm">{run.count}</TableCell>
                                                <TableCell className="text-sm">₱{run.totalGross.toLocaleString()}</TableCell>
                                                <TableCell className="text-sm font-medium">₱{run.totalNet.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] ${
                                                        runStatus === "paid" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                                        runStatus === "published" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
                                                        runStatus === "locked" ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                                                        runStatus === "validated" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" :
                                                        runStatus === "draft" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                                                        "bg-slate-500/15 text-slate-700 dark:text-slate-400"
                                                    }`}>
                                                        {locked && <Lock className="h-3 w-3 mr-1 inline" />}
                                                        {runStatus}
                                                    </Badge>
                                                </TableCell>
                                                {canIssue && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            {/* Export Bank File */}
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-7 w-7 text-blue-500"
                                                                title="Export bank disbursement file"
                                                                onClick={() => exportBankFile(run.date, employees.map((e) => ({ id: e.id, name: e.name, salary: e.salary })))}
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                            </Button>
                                                            {/* Create Draft Run */}
                                                            {!runObj && (
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] text-amber-600" title="Create draft run" onClick={() => {
                                                                    const runPayslips = payslips.filter((p) => p.issuedAt === run.date).map((p) => p.id);
                                                                    createDraftRun(run.date, runPayslips);
                                                                    toast.success("Draft run created");
                                                                }}>
                                                                    Draft
                                                                </Button>
                                                            )}
                                                            {/* Validate Run */}
                                                            {runObj && runStatus === "draft" && (
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] text-cyan-600" title="Validate run" onClick={() => { validateRun(run.date); toast.success("Run validated"); }}>
                                                                    Validate
                                                                </Button>
                                                            )}
                                                            {/* Lock (immutable — once locked, no unlock) */}
                                                            {!locked && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Lock run">
                                                                            <Lock className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Lock Payroll Run?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This will <strong>permanently</strong> lock the <strong>{run.date}</strong> run and save a policy snapshot for audit. This cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => { lockRun(run.date, currentUser.id); toast.success("Payroll run locked permanently"); }}>
                                                                                Lock Run
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                            {/* Policy Snapshot — locked runs only */}
                                                            {locked && (
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title="View policy snapshot" onClick={() => setSnapshotRunDate(run.date)}>
                                                                    <Shield className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            {/* Publish — after locked */}
                                                            {locked && runStatus === "locked" && (
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-600" title="Publish to employees" onClick={() => { publishRun(run.date); toast.success("Run published — employees can now view payslips"); }}>
                                                                    <Send className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            {/* Mark Paid — after published */}
                                                            {runStatus === "published" && (
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Mark as paid" onClick={() => { markRunPaid(run.date); toast.success("Run marked as paid"); }}>
                                                                    <CreditCard className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Adjustments Tab */}
                {canIssue && (
                    <TabsContent value="adjustments" className="mt-4">
                        <Card className="border border-border/50">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Prior-Period Adjustments</p>
                                    <Badge variant="secondary" className="text-[10px]">{adjustments.length} total</Badge>
                                </div>
                                {adjustments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">No adjustments yet. Adjustments allow corrections to prior payroll runs without unlocking them.</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">ID</TableHead>
                                                <TableHead className="text-xs">Employee</TableHead>
                                                <TableHead className="text-xs">Type</TableHead>
                                                <TableHead className="text-xs">Amount</TableHead>
                                                <TableHead className="text-xs">Reason</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                                <TableHead className="text-xs w-20">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {adjustments.map((adj) => (
                                                <TableRow key={adj.id}>
                                                    <TableCell className="text-xs font-mono">{adj.id}</TableCell>
                                                    <TableCell className="text-sm">{getEmpName(adj.employeeId)}</TableCell>
                                                    <TableCell className="text-xs capitalize">{adj.adjustmentType.replace("_", " ")}</TableCell>
                                                    <TableCell className="text-sm font-medium">{adj.amount >= 0 ? "+" : ""}₱{adj.amount.toLocaleString()}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{adj.reason}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={`text-[10px] ${
                                                            adj.status === "applied" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                                            adj.status === "approved" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                                            adj.status === "rejected" ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                                                            "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                        }`}>
                                                            {adj.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            {adj.status === "pending" && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Approve" onClick={() => { approveAdjustment(adj.id, currentUser.id); toast.success("Adjustment approved"); }}>
                                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {adj.status === "approved" && (
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-600" title="Apply to current run" onClick={() => { applyAdjustment(adj.id, `RUN-${new Date().toISOString().split("T")[0]}`); toast.success("Adjustment applied — correction payslip created"); }}>
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                  </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Final Pay Tab */}
                {canIssue && (
                    <TabsContent value="final-pay" className="mt-4">
                        <Card className="border border-border/50">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Final Pay Computations</p>
                                    <Badge variant="secondary" className="text-[10px]">{finalPayComputations?.length || 0} total</Badge>
                                </div>
                                {(!finalPayComputations || finalPayComputations.length === 0) ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">No final pay computations yet. Resign an employee from Employee Management to trigger final pay.</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Employee</TableHead>
                                                <TableHead className="text-xs">Resigned</TableHead>
                                                <TableHead className="text-xs">Pro-rated</TableHead>
                                                <TableHead className="text-xs">Leave Payout</TableHead>
                                                <TableHead className="text-xs">Unpaid OT</TableHead>
                                                <TableHead className="text-xs">Loan Balance</TableHead>
                                                <TableHead className="text-xs">Deductions</TableHead>
                                                <TableHead className="text-xs">Net Final</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {finalPayComputations.map((fp) => (
                                                <TableRow key={fp.id}>
                                                    <TableCell className="text-sm font-medium">{getEmpName(fp.employeeId)}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{new Date(fp.resignedAt).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-sm">₱{fp.proRatedSalary.toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm">₱{fp.leavePayout.toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm">₱{fp.unpaidOT.toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm text-red-500">−₱{fp.remainingLoanBalance.toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm text-red-500">−₱{fp.deductions.toLocaleString()}</TableCell>
                                                    <TableCell className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{fp.netFinalPay.toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={`text-[10px] ${
                                                            fp.status === "paid" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                                            fp.status === "published" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                                            fp.status === "locked" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
                                                            "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                        }`}>
                                                            {fp.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                  </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Policy Snapshot Dialog */}
            {(() => {
                const snapRun = snapshotRunDate ? runs.find((r) => r.periodLabel === snapshotRunDate) : null;
                const snap = snapRun?.policySnapshot;
                return (
                    <Dialog open={!!snapshotRunDate} onOpenChange={() => setSnapshotRunDate(null)}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-500" /> Policy Snapshot
                                </DialogTitle>
                            </DialogHeader>
                            {snap ? (
                                <div className="space-y-3 pt-2">
                                    <p className="text-xs text-muted-foreground">
                                        Captured at lock time for <strong>{snapshotRunDate}</strong>. This run is immutable.
                                    </p>
                                    <div className="rounded-md border border-border/50 divide-y divide-border/50 text-xs font-mono">
                                        {([
                                            ["Tax Table", snap.taxTableVersion],
                                            ["SSS Schedule", snap.sssVersion],
                                            ["PhilHealth", snap.philhealthVersion],
                                            ["Pag-IBIG", snap.pagibigVersion],
                                            ["Holiday List", snap.holidayListVersion],
                                            ["Formula", snap.formulaVersion],
                                            ["Rule Set", snap.ruleSetVersion],
                                            ["Locked By", snap.lockedBy],
                                        ] as [string, string][]).map(([k, v]) => (
                                            <div key={k} className="flex justify-between px-3 py-1.5">
                                                <span className="text-muted-foreground">{k}</span>
                                                <span className="font-medium">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                        ⚠️ Run is locked — payslips in this batch cannot be altered.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground pt-2">No snapshot recorded for this run.</p>
                            )}
                        </DialogContent>
                    </Dialog>
                );
            })()}

            {/* Payslip Detail Dialog */}
            <Dialog open={!!viewSlip} onOpenChange={() => setViewSlip(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Payslip Detail</DialogTitle></DialogHeader>
                    {viewedPayslip && (
                        <div className="space-y-4 pt-2">
                            <Card className="border border-border/50">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{getEmpName(viewedPayslip.employeeId)}</p>
                                            <p className="text-xs text-muted-foreground">{viewedPayslip.periodStart} – {viewedPayslip.periodEnd}</p>
                                            {viewedPayslip.payFrequency && (
                                                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                                                    {viewedPayslip.payFrequency.replace("_", "-")} payroll
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="secondary" className={`text-[10px] ${
                                            viewedPayslip.status === "acknowledged" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                            viewedPayslip.status === "paid" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                            viewedPayslip.status === "published" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
                                            viewedPayslip.status === "confirmed" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" :
                                            viewedPayslip.status === "issued" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                                            "bg-slate-500/15 text-slate-700 dark:text-slate-400"
                                        }`}>
                                            {viewedPayslip.status}
                                        </Badge>
                                    </div>

                                    {/* Earnings */}
                                    <div className="border-t border-border/50 pt-3 space-y-1.5">
                                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Earnings</p>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Gross Pay</span>
                                            <span>₱{(viewedPayslip.grossPay || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Allowances</span>
                                            <span>+₱{(viewedPayslip.allowances || 0).toLocaleString()}</span>
                                        </div>
                                        {(viewedPayslip.holidayPay ?? 0) !== 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" /> Holiday Pay (DOLE)
                                                </span>
                                                <span className={(viewedPayslip.holidayPay ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}>
                                                    {(viewedPayslip.holidayPay ?? 0) > 0 ? "+" : ""}₱{(viewedPayslip.holidayPay ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Deductions */}
                                    <div className="border-t border-border/50 pt-3 space-y-1.5">
                                        <p className="text-[10px] font-semibold uppercase text-red-500">Deductions</p>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">SSS</span>
                                            <span className="text-red-500">−₱{(viewedPayslip.sssDeduction || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">PhilHealth</span>
                                            <span className="text-red-500">−₱{(viewedPayslip.philhealthDeduction || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Pag-IBIG</span>
                                            <span className="text-red-500">−₱{(viewedPayslip.pagibigDeduction || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Withholding Tax</span>
                                            <span className="text-red-500">−₱{(viewedPayslip.taxDeduction || 0).toLocaleString()}</span>
                                        </div>
                                        {(viewedPayslip.otherDeductions || 0) > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Other</span>
                                                <span className="text-red-500">−₱{viewedPayslip.otherDeductions.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {(viewedPayslip.loanDeduction || 0) > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Loan Repayment</span>
                                                <span className="text-red-500">−₱{viewedPayslip.loanDeduction.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Net Pay */}
                                    <div className="border-t-2 border-border pt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Net Pay</span>
                                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₱{viewedPayslip.netPay.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Signature / Accept Section */}
                                    <div className="border-t border-border/50 pt-4">
                                        {viewedPayslip.signedAt ? (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-semibold uppercase text-emerald-600">Employee Acceptance</p>
                                                <div className="border border-border/50 rounded-md bg-white p-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={viewedPayslip.signatureDataUrl} alt="Signature" className="h-12 object-contain" />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                                    Accepted on {new Date(viewedPayslip.signedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ) : isEmployee && viewedPayslip.status === "paid" ? (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Sign to Acknowledge Payment</p>
                                                <p className="text-xs text-muted-foreground mb-2">Draw your signature below to confirm you have received this payment.</p>
                                                <SignaturePad onSave={(data) => {
                                                    usePayrollStore.getState().signPayslip(viewedPayslip.id, data);
                                                    toast.success("Payment acknowledged — thank you!");
                                                }} />
                                            </div>
                                        ) : isEmployee && ["published"].includes(viewedPayslip.status) ? (
                                            <div className="p-3 bg-muted/30 rounded-md text-center">
                                                <p className="text-xs text-muted-foreground italic">Payment is being processed. You can sign once paid.</p>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-muted/30 rounded-md text-center">
                                                <p className="text-xs text-muted-foreground italic">Waiting for employee to acknowledge payment</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="border-t border-border/50 pt-2 space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Issued</span><span>{viewedPayslip.issuedAt}</span>
                                        </div>
                                        {viewedPayslip.confirmedAt && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Confirmed</span><span>{new Date(viewedPayslip.confirmedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {viewedPayslip.publishedAt && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Published</span><span>{new Date(viewedPayslip.publishedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {viewedPayslip.paidAt && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Paid</span><span>{new Date(viewedPayslip.paidAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {viewedPayslip.paymentMethod && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Payment Method</span><span className="capitalize">{viewedPayslip.paymentMethod.replace("_", " ")}</span>
                                            </div>
                                        )}
                                        {viewedPayslip.bankReferenceId && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Bank Reference</span><span className="font-mono">{viewedPayslip.bankReferenceId}</span>
                                            </div>
                                        )}
                                        {viewedPayslip.adjustmentRef && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Adjustment</span><span className="font-mono">{viewedPayslip.adjustmentRef}</span>
                                            </div>
                                        )}
                                        {viewedPayslip.notes && (
                                            <div className="pt-1">
                                                <p className="text-xs text-muted-foreground">Notes: {viewedPayslip.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
