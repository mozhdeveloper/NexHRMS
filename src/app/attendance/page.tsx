"use client";

import { useState, useMemo, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { useAttendanceStore } from "@/store/attendance.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useProjectsStore } from "@/store/projects.store";
import { sendNotification } from "@/lib/notifications";
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
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Clock, LogIn, LogOut, Download, MapPin, CheckCircle, XCircle, Navigation, BellRing, UserX, ShieldCheck, Users, Timer, ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle, Zap, CalendarDays, Plus, Pencil, Trash2, UploadCloud, ShieldAlert, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { isWithinGeofence } from "@/lib/geofence";
import { FaceRecognitionSimulator } from "@/components/attendance/face-recognition";
import type { Holiday } from "@/store/attendance.store";

type CheckInStep = "idle" | "locating" | "location_result" | "done" | "error";

export default function AttendancePage() {
    const { logs, checkIn, checkOut, getTodayLog, markAbsent, updateLog, bulkUpsertLogs, overtimeRequests, submitOvertimeRequest, approveOvertime, rejectOvertime, events, exceptions, getEventsForDate, getEvidenceForEvent, autoGenerateExceptions, resolveException, resetToSeed, holidays, addHoliday, updateHoliday, deleteHoliday, resetHolidaysToDefault } = useAttendanceStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const getProjectForEmployee = useProjectsStore((s) => s.getProjectForEmployee);
    const projects = useProjectsStore((s) => s.projects);

    const [dateFilter, setDateFilter] = useState("");
    const [empFilter, setEmpFilter] = useState("all");
    const [checkInOpen, setCheckInOpen] = useState(false);
    const [step, setStep] = useState<CheckInStep>("idle");
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [geoResult, setGeoResult] = useState<{ within: boolean; distanceMeters: number; accuracy?: number } | null>(null);
    const [spoofReason, setSpoofReason] = useState<string | null>(null);
    const [notifyingId, setNotifyingId] = useState<string | null>(null);
    // Overtime state
    const [otOpen, setOtOpen] = useState(false);
    const [otDate, setOtDate] = useState("");
    const [otHours, setOtHours] = useState("1");
    const [otReason, setOtReason] = useState("");
    // OT rejection dialog state
    const [otRejectId, setOtRejectId] = useState<string | null>(null);
    const [otRejectReason, setOtRejectReason] = useState("");
    // Holiday dialog state
    const [holDialogOpen, setHolDialogOpen] = useState(false);
    const [holEditing, setHolEditing] = useState<Holiday | null>(null);
    const [holDate, setHolDate] = useState("");
    const [holName, setHolName] = useState("");
    const [holType, setHolType] = useState<"regular" | "special">("regular");
    const [holDeleteId, setHolDeleteId] = useState<string | null>(null);

    // ─── CSV file input ref ───────────────────────────────────────
    const csvInputRef = useRef<HTMLInputElement>(null);

    // ─── Admin override state ─────────────────────────────────────
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<typeof logs[0] | null>(null);
    const [ovCheckIn, setOvCheckIn] = useState("");
    const [ovCheckOut, setOvCheckOut] = useState("");
    const [ovStatus, setOvStatus] = useState<"present" | "absent" | "on_leave">("present");
    const [ovLate, setOvLate] = useState("");

    const openOverride = (log: typeof logs[0]) => {
        setEditingLog(log);
        setOvCheckIn(log.checkIn || "");
        setOvCheckOut(log.checkOut || "");
        setOvStatus(log.status as "present" | "absent" | "on_leave");
        setOvLate(log.lateMinutes != null ? String(log.lateMinutes) : "");
        setOverrideOpen(true);
    };

    const handleSaveOverride = () => {
        if (!editingLog) return;
        updateLog(editingLog.id, {
            checkIn: ovCheckIn || undefined,
            checkOut: ovCheckOut || undefined,
            status: ovStatus,
            lateMinutes: ovLate !== "" ? Number(ovLate) : undefined,
        });
        toast.success("Attendance record updated");
        setOverrideOpen(false);
    };

    // ─── Export CSV ───────────────────────────────────────────────
    const handleExportCSV = () => {
        const rows = [
            ["Date", "Employee", "Project", "Check In", "Check Out", "Hours", "Late (min)", "Status"],
            ...filteredLogs.map((l) => [
                l.date,
                getEmpName(l.employeeId),
                getProjectName(l.projectId),
                l.checkIn || "",
                l.checkOut || "",
                l.hours ?? "",
                l.lateMinutes ?? "",
                l.status,
            ]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-${dateFilter || "all"}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredLogs.length} records`);
    };

    // ─── Import CSV ───────────────────────────────────────────────
    const handleImportCSV = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const lines = text.trim().split(/\r?\n/);
                // Detect if first row is a header
                const firstCells = lines[0].split(",").map((c) => c.replace(/^"|"$/g, "").trim().toLowerCase());
                const hasHeader = firstCells.includes("date") || firstCells.includes("employee");
                const dataLines = hasHeader ? lines.slice(1) : lines;
                const parseCell = (c: string) => c.replace(/^"|"$/g, "").trim();
                const rows: Parameters<typeof bulkUpsertLogs>[0] = [];
                let skipped = 0;
                for (const line of dataLines) {
                    if (!line.trim()) continue;
                    const cells = line.split(",").map(parseCell);
                    // Expected: date, employeeId OR employeeName, checkIn, checkOut, status
                    const [dateVal, empRaw, checkInVal, checkOutVal, statusRaw] = cells;
                    if (!dateVal || !empRaw) { skipped++; continue; }
                    // Resolve employee by id or name
                    const emp = employees.find(
                        (e) => e.id === empRaw || e.name.toLowerCase() === empRaw.toLowerCase()
                    );
                    if (!emp) { skipped++; continue; }
                    const status: "present" | "absent" | "on_leave" =
                        (["present", "absent", "on_leave"] as const).includes(statusRaw as any)
                        ? (statusRaw as "present" | "absent" | "on_leave")
                        : checkInVal ? "present" : "absent";
                    rows.push({
                        employeeId: emp.id,
                        date: dateVal,
                        checkIn: checkInVal || undefined,
                        checkOut: checkOutVal || undefined,
                        status,
                    });
                }
                bulkUpsertLogs(rows);
                toast.success(`Imported ${rows.length} record(s)${skipped ? `, skipped ${skipped}` : ""}`);
            } catch {
                toast.error("Failed to parse CSV. Check the format and try again.");
            }
        };
        reader.readAsText(file);
        // Reset so the same file can be re-imported
        e.target.value = "";
    };

    const myEmployeeId = employees.find(
        (e) => e.email === currentUser.email || e.name === currentUser.name
    )?.id;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "hr" || currentUser.role === "supervisor";
    const todayLog = myEmployeeId ? getTodayLog(myEmployeeId) : undefined;
    const myProject = myEmployeeId ? getProjectForEmployee(myEmployeeId) : undefined;

    const pendingOT = overtimeRequests.filter((r) => r.status === "pending").length;
    const myOTRequests = isAdmin ? overtimeRequests : overtimeRequests.filter((r) => r.employeeId === myEmployeeId);

    const handleSubmitOT = () => {
        if (!myEmployeeId || !otDate || !otHours || !otReason) {
            toast.error("Please fill all fields"); return;
        }
        submitOvertimeRequest({ employeeId: myEmployeeId, date: otDate, hoursRequested: Number(otHours), reason: otReason });
        toast.success("Overtime request submitted");
        setOtOpen(false); setOtDate(""); setOtHours("1"); setOtReason("");
    };

    const otStatusColor: Record<string, string> = {
        pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
    };

    useEffect(() => {
        setDateFilter(new Date().toISOString().split("T")[0]);
    }, []);

    const filteredLogs = useMemo(() => {
        return logs
            .filter((l) => {
                const matchDate = !dateFilter || l.date === dateFilter;
                const matchEmp = isAdmin
                    ? empFilter === "all" || l.employeeId === empFilter
                    : l.employeeId === myEmployeeId;
                return matchDate && matchEmp;
            })
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 50);
    }, [logs, dateFilter, empFilter, isAdmin, myEmployeeId]);

    const getEmpName = (id: string) => employees.find((e) => e.id === id)?.name || id;
    const getProjectName = (id?: string) => id ? projects.find((p) => p.id === id)?.name || id : "—";

    const statusColors: Record<string, string> = {
        present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        absent: "bg-red-500/15 text-red-700 dark:text-red-400",
        on_leave: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    };

    // ─── Send absence notification ────────────────────────────────
    const handleAbsenceNotify = async (employeeId: string, date: string) => {
        setNotifyingId(employeeId);
        const emp = employees.find((e) => e.id === employeeId);
        await sendNotification({
            type: "absence",
            employeeId,
            subject: `Absence Alert: ${emp?.name || employeeId} was absent on ${date}`,
            body: `${emp?.name || employeeId} did not check in on ${date}. Please follow up.`,
        });
        setNotifyingId(null);
    };

    // ─── Multi-step check-in flow ─────────────────────────────────
    // ─── Security: DevTools + location spoofing detection ──────────

    // DevTools panel detection — only reliable on desktop (Chrome/Firefox).
    // On Android/iOS, outerWidth === innerWidth because there is no docked panel.
    const isDesktopDevToolsOpen = (): boolean => {
        const threshold = 160;
        return (
            window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold
        );
    };

    // Returns a human-readable reason string if spoofing is detected, null otherwise.
    const detectLocationSpoofing = (coords: GeolocationCoordinates): string | null => {
        const ua = navigator.userAgent;
        const isAndroid = /Android/i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);

        // WebDriver flag: set by browser automation tools and ADB (Android USB debugging + Chrome remote)
        const nav = navigator as unknown as { webdriver?: boolean };
        if (nav.webdriver === true) {
            return "Automation or USB debugging session detected.";
        }

        // Impossibly precise — no real GNSS chipset reports < 1 m indoors consistently
        if (coords.accuracy > 0 && coords.accuracy < 1) {
            return "Suspiciously precise GPS accuracy detected (possible mock provider).";
        }

        // Unrealistically poor — 500 m+ accuracy means the position cannot be trusted
        if (coords.accuracy > 500) {
            return "GPS accuracy is too poor to verify your location reliably.";
        }

        // Negative speed is physically impossible
        if (coords.speed !== null && coords.speed < 0) {
            return "Invalid speed value in location data.";
        }

        // iOS: real CoreLocation always populates altitude; mock providers return null
        if (isIOS && coords.altitude === null) {
            return "Mock location suspected — iOS altitude data is missing.";
        }

        // Android: mock location providers typically leave altitudeAccuracy null
        // while still supplying an altitude value, which is physically inconsistent.
        if (isAndroid && coords.altitude !== null && coords.altitudeAccuracy === null) {
            return "Mock location suspected — Android altitude accuracy data is missing.";
        }

        return null;
    };

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const startCheckIn = () => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        // DevTools panel detection only works reliably on desktop
        if (!isMobile && isDesktopDevToolsOpen()) {
            toast.error("Check-in blocked: Developer tools detected. Please close DevTools and try again.");
            return;
        }
        // Work-day schedule check — warn but don't block (could be overtime / special shift)
        const myEmp = employees.find((e) => e.id === myEmployeeId);
        if (myEmp?.workDays?.length) {
            const todayName = DAY_NAMES[new Date().getDay()];
            if (!myEmp.workDays.includes(todayName)) {
                toast.warning(`${todayName} is not in your scheduled work days. Checking in anyway — submit an OT request if this is overtime.`, { duration: 5000 });
            }
        }
        setSpoofReason(null);
        setStep("idle");
        setUserLocation(null);
        setGeoResult(null);
        setCheckInOpen(true);
    };

    const requestLocation = () => {
        setSpoofReason(null);
        setStep("locating");
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            setStep("error");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // Location spoofing detection (iOS + Android + generic signals)
                const spoof = detectLocationSpoofing(pos.coords);
                if (spoof) {
                    setSpoofReason(spoof);
                    setStep("error");
                    return;
                }

                const gpsAccuracy = Math.round(pos.coords.accuracy);
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);

                if (myProject) {
                    const result = isWithinGeofence(
                        loc.lat, loc.lng,
                        myProject.location.lat, myProject.location.lng,
                        myProject.location.radius
                    );
                    // If GPS accuracy is worse than the geofence radius the check is meaningless;
                    // block and prompt the user to move to an area with better signal.
                    if (!result.within && gpsAccuracy > myProject.location.radius) {
                        setSpoofReason(
                            `GPS accuracy (±${gpsAccuracy}m) is larger than the geofence radius (${myProject.location.radius}m). ` +
                            "Move to an open area with better signal and try again."
                        );
                        setStep("error");
                        return;
                    }
                    setGeoResult({ ...result, accuracy: gpsAccuracy });
                    setStep(result.within ? "location_result" : "error");
                } else {
                    setGeoResult({ within: true, distanceMeters: 0, accuracy: gpsAccuracy });
                    setStep("location_result");
                }
            },
            (err) => {
                const msg = err.code === err.PERMISSION_DENIED
                    ? "Location access denied. Please allow location permissions and try again."
                    : err.code === err.TIMEOUT
                    ? "Location request timed out. Move to an area with better GPS signal."
                    : "Unable to retrieve location. Please try again.";
                toast.error(msg);
                setStep("error");
            },
            // maximumAge: 0 forces a fresh reading — prevents cached/stale positions
            // that mock apps might inject into the browser's position cache.
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleFaceVerified = useCallback(() => {
        if (!myEmployeeId) return;
        checkIn(myEmployeeId, myProject?.id);
        const todayStr = new Date().toISOString().split("T")[0];
        const updatedLogs = useAttendanceStore.getState().logs.map((l) => {
            if (l.employeeId === myEmployeeId && l.date === todayStr && l.checkIn) {
                return { ...l, locationSnapshot: userLocation || undefined, faceVerified: true };
            }
            return l;
        });
        useAttendanceStore.setState({ logs: updatedLogs });
        setStep("done");
        toast.success("Check-in successful! 🎉");
    }, [myEmployeeId, myProject, userLocation, checkIn]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Daily check-in/out logs</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {myEmployeeId && (
                        <>
                            {!todayLog?.checkIn ? (
                                <Button onClick={startCheckIn} className="gap-1.5">
                                    <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Check In</span>
                                </Button>
                            ) : !todayLog?.checkOut ? (
                                <Button
                                    onClick={() => { checkOut(myEmployeeId, myProject?.id); toast.success("Checked out successfully!"); }}
                                    variant="outline" className="gap-1.5"
                                >
                                    <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Check Out</span>
                                </Button>
                            ) : (
                                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-3 py-1.5">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                                    {todayLog.hours}h logged
                                </Badge>
                            )}
                        </>
                    )}
                    {isAdmin && dateFilter && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                            const activeEmps = employees.filter((e) => e.status === "active");
                            const logsForDate = logs.filter((l) => l.date === dateFilter);
                            const loggedIds = new Set(logsForDate.map((l) => l.employeeId));
                            // Don't mark absent employees who aren't scheduled for this weekday
                            const filterDayName = DAY_NAMES[new Date(dateFilter + "T12:00:00").getDay()];
                            const missing = activeEmps.filter((e) => {
                                if (loggedIds.has(e.id)) return false;
                                if (e.workDays?.length && !e.workDays.includes(filterDayName)) return false;
                                return true;
                            });
                            if (missing.length === 0) { toast.info("All scheduled employees have attendance records for this date"); return; }
                            missing.forEach((e) => markAbsent(e.id, dateFilter));
                            toast.success(`Marked ${missing.length} employee(s) as absent for ${dateFilter}`);
                        }}>
                            <Users className="h-4 w-4" /> <span className="hidden sm:inline">Reconcile Day</span>
                        </Button>
                    )}
                    {myEmployeeId && !isAdmin && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setOtDate(new Date().toISOString().split("T")[0]); setOtOpen(true); }}>
                            <Timer className="h-4 w-4" /> <span className="hidden sm:inline">Request OT</span>
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
                        <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    {isAdmin && (
                        <>
                            <input
                                ref={csvInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={handleImportCSV}
                            />
                            <Button
                                variant="outline" size="sm" className="gap-1.5"
                                onClick={() => csvInputRef.current?.click()}
                            >
                                <UploadCloud className="h-4 w-4" /> <span className="hidden sm:inline">Upload CSV</span>
                            </Button>
                        </>
                    )}
                    {/* Reset Button — for simulation */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                                <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Reset</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reset Attendance Data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will clear all attendance logs (including today), overtime requests, and shift assignments. Historical seed data (past 30 days) will be restored. You can then do a fresh check-in for today.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { 
                                    resetToSeed(); 
                                    // Reset to yesterday's date to show historical seed data
                                    const yesterday = new Date();
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    setDateFilter(yesterday.toISOString().split("T")[0]);
                                    toast.success("Attendance data reset to demo state"); 
                                }}>Reset</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Project Banner */}
            {myProject && myEmployeeId && (
                <Card className="border border-blue-500/20 bg-blue-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium">Assigned to: <span className="text-blue-600 dark:text-blue-400">{myProject.name}</span></p>
                            <p className="text-xs text-muted-foreground">
                                Location: {myProject.location.lat.toFixed(4)}, {myProject.location.lng.toFixed(4)} · Radius: {myProject.location.radius}m
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="logs">
                <TabsList className="w-full overflow-x-auto justify-start">
                    <TabsTrigger value="logs">Attendance Logs</TabsTrigger>
                    <TabsTrigger value="events" className="gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Event Ledger
                        {events.length > 0 && <span className="ml-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full">{events.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="exceptions" className="gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Exceptions
                        {exceptions.filter(e => !e.resolvedAt).length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{exceptions.filter(e => !e.resolvedAt).length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="overtime" className="gap-1.5">
                        <Timer className="h-3.5 w-3.5" /> Overtime Requests
                        {pendingOT > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingOT}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="holidays" className="gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> Holidays
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="mt-4 space-y-4">

            {/* Filters */}
            <Card className="border border-border/50">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            type="date" value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full sm:w-[180px]"
                        />
                        {isAdmin && (
                            <Select value={empFilter} onValueChange={setEmpFilter}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="All Employees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    {employees.filter((e) => e.status === "active").map((e) => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border border-border/50">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Employee</TableHead>
                                <TableHead className="text-xs">Project</TableHead>
                                <TableHead className="text-xs">Check In</TableHead>
                                <TableHead className="text-xs">Check Out</TableHead>
                                <TableHead className="text-xs">Hours</TableHead>
                                <TableHead className="text-xs">Late</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                {isAdmin && <TableHead className="text-xs w-[120px]">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-sm text-muted-foreground py-8">
                                        No attendance logs for the selected date
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">{log.date}</TableCell>
                                        <TableCell className="text-sm font-medium">{getEmpName(log.employeeId)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{getProjectName(log.projectId)}</TableCell>
                                        <TableCell className="text-sm">
                                            {log.checkIn || "—"}
                                            {log.faceVerified && <ShieldCheck className="inline h-3.5 w-3.5 ml-1 text-emerald-500" />}
                                        </TableCell>
                                        <TableCell className="text-sm">{log.checkOut || "—"}</TableCell>
                                        <TableCell className="text-sm">{log.hours ? `${log.hours}h` : "—"}</TableCell>
                                        <TableCell className="text-sm">
                                            {log.lateMinutes && log.lateMinutes > 0 ? (
                                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                    +{log.lateMinutes}m
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${statusColors[log.status]}`}>
                                                {log.status.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="sm" variant="ghost"
                                                                className="h-7 w-7 p-0"
                                                                onClick={() => openOverride(log)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left"><p className="text-xs">Override record</p></TooltipContent>
                                                    </Tooltip>
                                                    {log.status === "present" && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm" variant="ghost"
                                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                                                    onClick={() => { markAbsent(log.employeeId, log.date); toast.success(`${getEmpName(log.employeeId)} marked absent`); }}
                                                                >
                                                                    <UserX className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="left"><p className="text-xs">Mark absent</p></TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    {log.status === "absent" && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm" variant="ghost"
                                                                    className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                                                    disabled={notifyingId === log.employeeId}
                                                                    onClick={() => handleAbsenceNotify(log.employeeId, log.date)}
                                                                >
                                                                    <BellRing className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="left"><p className="text-xs">Send absence notification</p></TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>

                </TabsContent>

                {/* Event Ledger Tab */}
                <TabsContent value="events" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Timestamp</TableHead>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Event Type</TableHead>
                                        <TableHead className="text-xs">Project</TableHead>
                                        <TableHead className="text-xs">Device</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No events recorded. Events are created when employees check in/out.</TableCell></TableRow>
                                    ) : events.slice(0, 100).map((evt) => (
                                        <TableRow key={evt.id}>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{new Date(evt.timestampUTC).toLocaleString()}</TableCell>
                                            <TableCell className="text-sm font-medium">{getEmpName(evt.employeeId)}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`text-[10px] ${
                                                    evt.eventType === "IN" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                                    evt.eventType === "OUT" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                                    "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                }`}>
                                                    {evt.eventType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{evt.projectId || "—"}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{evt.deviceId || "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                    </Card>
                    <p className="text-[10px] text-muted-foreground mt-2">⚠️ Event ledger is append-only. Editing/deleting events is disabled by design.</p>
                </TabsContent>

                {/* Exceptions Tab */}
                <TabsContent value="exceptions" className="mt-4 space-y-4">
                    {isAdmin && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Auto-detect attendance anomalies</p>
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                                autoGenerateExceptions(dateFilter || new Date().toISOString().slice(0, 10), employees.filter(e => e.status === "active").map(e => e.id));
                                toast.success("Exceptions auto-generated from event ledger");
                            }}>
                                <AlertTriangle className="h-3.5 w-3.5" /> Scan for Exceptions
                            </Button>
                        </div>
                    )}
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Date</TableHead>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Type</TableHead>
                                        <TableHead className="text-xs">Description</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        {isAdmin && <TableHead className="text-xs w-20">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {exceptions.length === 0 ? (
                                        <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-sm text-muted-foreground py-8">No exceptions found</TableCell></TableRow>
                                    ) : exceptions.map((exc) => {
                                        const typeColor = exc.flag === "missing_in" || exc.flag === "missing_out" ? "bg-red-500/15 text-red-700 dark:text-red-400"
                                            : exc.flag === "out_of_geofence" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                            : exc.flag === "duplicate_scan" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400"
                                            : "bg-slate-500/15 text-slate-700 dark:text-slate-400";
                                        return (
                                            <TableRow key={exc.id}>
                                                <TableCell className="text-sm">{exc.date}</TableCell>
                                                <TableCell className="text-sm font-medium">{getEmpName(exc.employeeId)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] ${typeColor}`}>
                                                        {exc.flag.replace(/_/g, " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{exc.notes || "—"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] ${exc.resolvedAt ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"}`}>
                                                        {exc.resolvedAt ? "resolved" : "open"}
                                                    </Badge>
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell>
                                                        {!exc.resolvedAt && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Resolve" onClick={() => { resolveException(exc.id, currentUser.id, "Manually resolved"); toast.success("Exception resolved"); }}>
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
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

                <TabsContent value="overtime" className="mt-4">
                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Date</TableHead>
                                        <TableHead className="text-xs">Employee</TableHead>
                                        <TableHead className="text-xs">Hours</TableHead>
                                        <TableHead className="text-xs">Reason</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs">Requested</TableHead>
                                        {isAdmin && <TableHead className="text-xs w-24">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myOTRequests.length === 0 ? (
                                        <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-sm text-muted-foreground py-8">No overtime requests</TableCell></TableRow>
                                    ) : myOTRequests.map((ot) => (
                                        <TableRow key={ot.id}>
                                            <TableCell className="text-sm">{ot.date}</TableCell>
                                            <TableCell className="text-sm font-medium">{getEmpName(ot.employeeId)}</TableCell>
                                            <TableCell className="text-sm">{ot.hoursRequested}h</TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{ot.reason}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`text-[10px] ${otStatusColor[ot.status]}`}>
                                                    {ot.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{new Date(ot.requestedAt).toLocaleDateString()}</TableCell>
                                            {isAdmin && (
                                                <TableCell>
                                                    {ot.status === "pending" && (
                                                        <div className="flex items-center gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => { approveOvertime(ot.id, currentUser.id); toast.success("OT approved"); }}>
                                                                        <ThumbsUp className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left"><p className="text-xs">Approve</p></TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => { setOtRejectId(ot.id); setOtRejectReason(""); }}>
                                                                        <ThumbsDown className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left"><p className="text-xs">Reject</p></TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Holidays Tab ─────────────────────────────────── */}
                <TabsContent value="holidays" className="mt-4 space-y-4">
                    {/* upcoming / today banner */}
                    {(() => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const upcoming = [...holidays]
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .find((h) => h.date >= todayStr);
                        const isHolidayToday = upcoming?.date === todayStr;
                        return upcoming ? (
                            <div className={`rounded-lg border p-4 flex items-center gap-3 ${
                                isHolidayToday ? "bg-emerald-500/10 border-emerald-500/40" : "bg-blue-500/5 border-blue-500/20"
                            }`}>
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                    isHolidayToday ? "bg-emerald-500/20" : "bg-blue-500/10"
                                }`}>
                                    <CalendarDays className={`h-5 w-5 ${isHolidayToday ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${isHolidayToday ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                                        {isHolidayToday ? `Today is a Holiday — ${upcoming.name} 🎉` : `Next Holiday: ${upcoming.name}`}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${isHolidayToday ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                        {new Date(upcoming.date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                        {" • "}
                                        <span className={`font-medium ${upcoming.type === "regular" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                                            {upcoming.type === "regular" ? "Regular Holiday" : "Special Non-Working"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
                                No more holidays scheduled — add one below or reset to defaults.
                            </div>
                        );
                    })()}

                    {/* admin toolbar */}
                    {isAdmin && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{holidays.length} holiday{holidays.length !== 1 ? "s" : ""} configured</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    className="gap-1.5 text-xs"
                                    onClick={() => {
                                        resetHolidaysToDefault();
                                        toast.success("Holidays reset to 2026 PH defaults");
                                    }}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 text-xs"
                                    onClick={() => {
                                        setHolEditing(null);
                                        setHolDate(""); setHolName(""); setHolType("regular");
                                        setHolDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Holiday
                                </Button>
                            </div>
                        </div>
                    )}

                    <Card className="border border-border/50">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs w-36">Date</TableHead>
                                        <TableHead className="text-xs">Holiday</TableHead>
                                        <TableHead className="text-xs w-44">Type</TableHead>
                                        <TableHead className="text-xs w-32">Pay if Worked</TableHead>
                                        {isAdmin && <TableHead className="text-xs w-20">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {holidays.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-10">
                                                No holidays configured. Click &ldquo;Add Holiday&rdquo; to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : [...holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => {
                                        const todayStr = new Date().toISOString().split("T")[0];
                                        const isToday = h.date === todayStr;
                                        const isPast = h.date < todayStr;
                                        return (
                                            <TableRow
                                                key={h.id}
                                                className={`${isToday ? "bg-emerald-500/10" : isPast ? "opacity-45" : ""}`}
                                            >
                                                <TableCell className="text-sm font-mono">
                                                    <div className="flex items-center gap-2">
                                                        {isToday && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
                                                        {new Date(h.date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", weekday: "short" })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {h.name}
                                                    {isToday && (
                                                        <Badge variant="secondary" className="ml-2 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Today</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`text-[10px] ${
                                                        h.type === "regular"
                                                            ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                    }`}>
                                                        {h.type === "regular" ? "Regular" : "Special Non-Working"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">
                                                    {h.type === "regular"
                                                        ? <span className="text-red-600 dark:text-red-400 font-semibold">200%</span>
                                                        : <span className="text-amber-600 dark:text-amber-400 font-semibold">130%</span>
                                                    }
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon" variant="ghost" className="h-7 w-7"
                                                                        onClick={() => {
                                                                            setHolEditing(h);
                                                                            setHolDate(h.date);
                                                                            setHolName(h.name);
                                                                            setHolType(h.type);
                                                                            setHolDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left"><p className="text-xs">Edit</p></TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon" variant="ghost" className="h-7 w-7 text-red-500"
                                                                        onClick={() => setHolDeleteId(h.id)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left"><p className="text-xs">Delete</p></TooltipContent>
                                                            </Tooltip>
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

                    <p className="text-[11px] text-muted-foreground text-center pb-2">
                        PH National Holidays 2026 per DOLE Proclamation · Regular = 200% if worked, 100% if not · Special Non-Working = 130% if worked, no pay if absent
                    </p>
                </TabsContent>
            </Tabs>

            {/* ─── Admin Override Dialog ────────────────────────────── */}
            <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Override Attendance Record
                        </DialogTitle>
                    </DialogHeader>
                    {editingLog && (
                        <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{getEmpName(editingLog.employeeId)}</span> &mdash; {editingLog.date}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium">Check In</label>
                                    <Input type="time" value={ovCheckIn} onChange={(e) => setOvCheckIn(e.target.value)} className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Check Out</label>
                                    <Input type="time" value={ovCheckOut} onChange={(e) => setOvCheckOut(e.target.value)} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Status</label>
                                <Select value={ovStatus} onValueChange={(v) => setOvStatus(v as typeof ovStatus)}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                        <SelectItem value="on_leave">On Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Late Minutes</label>
                                <Input
                                    type="number" min="0" max="480"
                                    value={ovLate}
                                    onChange={(e) => setOvLate(e.target.value)}
                                    placeholder="0"
                                    className="mt-1"
                                />
                            </div>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                ⚠️ Admin override — changes are logged for audit purposes.
                            </p>
                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" className="flex-1" onClick={() => setOverrideOpen(false)}>Cancel</Button>
                                <Button className="flex-1" onClick={handleSaveOverride}>Save Override</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Add / Edit Holiday Dialog ────────────────────────── */}
            <Dialog open={holDialogOpen} onOpenChange={setHolDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            {holEditing ? "Edit Holiday" : "Add Holiday"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium">Date</label>
                            <Input
                                type="date"
                                value={holDate}
                                onChange={(e) => setHolDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Holiday Name</label>
                            <Input
                                value={holName}
                                onChange={(e) => setHolName(e.target.value)}
                                placeholder="e.g. National Election Day"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Type</label>
                            <Select value={holType} onValueChange={(v) => setHolType(v as "regular" | "special")}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regular">Regular Holiday (200% if worked)</SelectItem>
                                    <SelectItem value="special">Special Non-Working (130% if worked)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1" onClick={() => setHolDialogOpen(false)}>Cancel</Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    if (!holDate) { toast.error("Please select a date"); return; }
                                    if (!holName.trim()) { toast.error("Please enter a holiday name"); return; }
                                    if (holEditing) {
                                        updateHoliday(holEditing.id, { date: holDate, name: holName.trim(), type: holType });
                                        toast.success(`"${holName}" updated`);
                                    } else {
                                        addHoliday({ date: holDate, name: holName.trim(), type: holType });
                                        toast.success(`"${holName}" added`);
                                    }
                                    setHolDialogOpen(false);
                                }}
                            >
                                {holEditing ? "Save Changes" : "Add Holiday"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Holiday Confirm ───────────────────────────── */}
            <AlertDialog open={!!holDeleteId} onOpenChange={(o) => { if (!o) setHolDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Holiday?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {holDeleteId && (() => {
                                const h = holidays.find((x) => x.id === holDeleteId);
                                return h ? `"${h.name}" (${h.date}) will be permanently removed.` : "This holiday will be permanently removed.";
                            })()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setHolDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (holDeleteId) {
                                    deleteHoliday(holDeleteId);
                                    toast.success("Holiday deleted");
                                    setHolDeleteId(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ─── Overtime Request Dialog ─────────────────────────── */}
            <Dialog open={otOpen} onOpenChange={setOtOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Request Overtime</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium">Date</label>
                            <Input type="date" value={otDate} onChange={(e) => setOtDate(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Hours (1–8)</label>
                            <Input type="number" min="1" max="8" value={otHours} onChange={(e) => setOtHours(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Reason</label>
                            <Input value={otReason} onChange={(e) => setOtReason(e.target.value)} placeholder="e.g. Project deadline" className="mt-1" />
                        </div>
                        <Button onClick={handleSubmitOT} className="w-full">Submit Request</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── OT Rejection Reason Dialog ──────────────────────── */}
            <Dialog open={!!otRejectId} onOpenChange={(open) => { if (!open) { setOtRejectId(null); setOtRejectReason(""); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" /> Reject Overtime Request</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium">Reason for Rejection</label>
                            <Input
                                value={otRejectReason}
                                onChange={(e) => setOtRejectReason(e.target.value)}
                                placeholder="e.g. overtime budget exceeded"
                                className="mt-1"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setOtRejectId(null); setOtRejectReason(""); }}>Cancel</Button>
                            <Button
                                variant="destructive" className="flex-1"
                                onClick={() => {
                                    if (!otRejectId) return;
                                    if (!otRejectReason.trim()) { toast.error("Please enter a rejection reason"); return; }
                                    rejectOvertime(otRejectId, currentUser.id, otRejectReason.trim());
                                    toast.success("Overtime request rejected");
                                    setOtRejectId(null); setOtRejectReason("");
                                }}
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Multi-Step Check-In Dialog ───────────────────────── */}
            <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="h-5 w-5" /> Check In
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {step === "idle" && (
                            <Card className="border border-border/50">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Navigation className="h-8 w-8 text-blue-500" />
                                    </div>
                                    <p className="text-sm font-medium">Step 1: Share Location</p>
                                    <p className="text-xs text-muted-foreground text-center">
                                        {myProject
                                            ? `Verify you are within ${myProject.location.radius}m of ${myProject.name}`
                                            : "Share your location to check in"}
                                    </p>
                                    <Button onClick={requestLocation} className="gap-1.5 mt-1">
                                        <MapPin className="h-4 w-4" /> Share My Location
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {step === "locating" && (
                            <Card className="border border-border/50">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                                    <p className="text-sm font-medium">Getting your location...</p>
                                    <p className="text-xs text-muted-foreground">Please allow location access</p>
                                </CardContent>
                            </Card>
                        )}

                        {step === "location_result" && geoResult && (
                            <>
                                <Card className="border border-emerald-500/30 bg-emerald-500/5">
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Location Verified</p>
                                            <p className="text-xs text-muted-foreground">
                                                {myProject
                                                    ? `${geoResult.distanceMeters}m from ${myProject.name} · radius ${myProject.location.radius}m`
                                                    : "No project assigned — location recorded"}
                                            </p>
                                            {geoResult.accuracy !== undefined && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    <Gauge className="inline w-3 h-3 mr-0.5 -mt-px" />GPS accuracy: ±{geoResult.accuracy}m
                                                </p>
                                            )}
                                            {userLocation && (
                                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                    {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="pt-1">
                                    <p className="text-xs text-muted-foreground text-center mb-3">Step 2: Verify your identity</p>
                                    <FaceRecognitionSimulator onVerified={handleFaceVerified} />
                                </div>
                            </>
                        )}

                        {/* Spoofing / security block — highest priority */}
                        {step === "error" && spoofReason && (
                            <Card className="border border-orange-500/30 bg-orange-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-orange-500/15 flex items-center justify-center">
                                        <ShieldAlert className="h-8 w-8 text-orange-500" />
                                    </div>
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Check-In Blocked</p>
                                    <p className="text-xs text-muted-foreground text-center">{spoofReason}</p>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        Disable mock location apps and developer options, then try again.
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => { setSpoofReason(null); setStep("idle"); }} className="mt-1">Try Again</Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Outside geofence radius */}
                        {step === "error" && !spoofReason && geoResult && !geoResult.within && (
                            <Card className="border border-red-500/30 bg-red-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-red-500/15 flex items-center justify-center">
                                        <XCircle className="h-8 w-8 text-red-500" />
                                    </div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Outside Project Area</p>
                                    <p className="text-xs text-muted-foreground text-center">
                                        You are <strong>{geoResult.distanceMeters}m</strong> away from{" "}
                                        {myProject?.name || "the project location"}.
                                        Must be within <strong>{myProject?.location.radius ?? 100}m</strong>.
                                    </p>
                                    {geoResult.accuracy !== undefined && (
                                        <p className="text-[10px] text-muted-foreground">
                                            <Gauge className="inline w-3 h-3 mr-0.5 -mt-px" />GPS accuracy: ±{geoResult.accuracy}m
                                        </p>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => setStep("idle")} className="mt-1">Try Again</Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Generic location error */}
                        {step === "error" && !spoofReason && !geoResult && (
                            <Card className="border border-red-500/30 bg-red-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <XCircle className="h-8 w-8 text-red-500" />
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Location Error</p>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Could not get your location. Please enable location permissions and try again.
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => setStep("idle")} className="mt-1">Try Again</Button>
                                </CardContent>
                            </Card>
                        )}

                        {step === "done" && (
                            <Card className="border border-emerald-500/30 bg-emerald-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                                    </div>
                                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Check-In Confirmed!</p>
                                    <p className="text-xs text-muted-foreground text-center">
                                        {myProject ? `Checked in at ${myProject.name}` : "Attendance recorded"}
                                        {todayLog?.checkIn && ` at ${todayLog.checkIn}`}
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => setCheckInOpen(false)} className="mt-1">Close</Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
