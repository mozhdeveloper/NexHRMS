"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAttendanceStore } from "@/store/attendance.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAuthStore } from "@/store/auth.store";
import { useProjectsStore } from "@/store/projects.store";
import { useLocationStore } from "@/store/location.store";
import { useKioskStore } from "@/store/kiosk.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Clock, LogIn, LogOut, Download, MapPin, CheckCircle, XCircle,
    Navigation, ShieldCheck, Timer, Plus, ShieldAlert, Gauge, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { isWithinGeofence } from "@/lib/geofence";
import { FaceRecognitionSimulator } from "@/components/attendance/face-recognition";
import { SelfieCapture } from "@/components/attendance/selfie-capture";
import { LocationTracker } from "@/components/attendance/location-tracker";
import { BreakTimer } from "@/components/attendance/break-timer";

type CheckInStep = "idle" | "locating" | "location_result" | "done" | "error" | "selfie";

/* ─── Live elapsed‑time display ────────────────────────────── */
function ElapsedTimeDisplay({ checkInTime }: { checkInTime: string }) {
    const [elapsed, setElapsed] = useState("0h 0m");
    useEffect(() => {
        const tick = () => {
            const [h, m] = checkInTime.split(":").map(Number);
            const start = new Date(); start.setHours(h, m, 0, 0);
            const diff = Math.max(0, Date.now() - start.getTime());
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            setElapsed(`${hrs}h ${mins}m`);
        };
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [checkInTime]);
    return (
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl px-8 py-4 border shadow-sm">
            <p className="text-4xl font-extrabold tracking-tight text-center">{elapsed}</p>
            <p className="text-[11px] text-muted-foreground text-center mt-1 uppercase tracking-widest">time elapsed</p>
        </div>
    );
}

/* ─── Spoofing / DevTools helpers ──────────────────────────── */
const isDesktopDevToolsOpen = (): boolean => {
    const threshold = 160;
    return (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
    );
};

const detectLocationSpoofing = (coords: GeolocationCoordinates): string | null => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const nav = navigator as unknown as { webdriver?: boolean };
    if (nav.webdriver === true) return "Automation or USB debugging session detected.";
    if (coords.accuracy > 0 && coords.accuracy < 1) return "Suspiciously precise GPS accuracy detected (possible mock provider).";
    if (coords.accuracy > 500) return "GPS accuracy is too poor to verify your location reliably.";
    if (coords.speed !== null && coords.speed < 0) return "Invalid speed value in location data.";
    if (isIOS && coords.altitude === null) return "Mock location suspected — iOS altitude data is missing.";
    if (isAndroid && coords.altitude !== null && coords.altitudeAccuracy === null) return "Mock location suspected — Android altitude accuracy data is missing.";
    return null;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<string, string> = {
    present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    absent: "bg-red-500/15 text-red-700 dark:text-red-400",
    on_leave: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

const otStatusColor: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
};

/* ═══════════════════════════════════════════════════════════════
   EMPLOYEE VIEW — immersive personal attendance dashboard
   ═══════════════════════════════════════════════════════════════ */
export default function EmployeeView() {
    const { logs, checkIn, checkOut, getTodayLog, overtimeRequests, submitOvertimeRequest, holidays, applyPenalty, getActivePenalty, cleanExpiredPenalties } = useAttendanceStore();
    const employees = useEmployeesStore((s) => s.employees);
    const currentUser = useAuthStore((s) => s.currentUser);
    const getProjectForEmployee = useProjectsStore((s) => s.getProjectForEmployee);
    const locationConfig = useLocationStore((s) => s.config);
    const addPhoto = useLocationStore((s) => s.addPhoto);
    const penaltySettings = useKioskStore((s) => s.settings);

    const myEmployeeId = employees.find(
        (e) => e.email === currentUser.email || e.name === currentUser.name
    )?.id;
    const todayLog = myEmployeeId ? getTodayLog(myEmployeeId) : undefined;
    const myProject = myEmployeeId ? getProjectForEmployee(myEmployeeId) : undefined;
    const myOTRequests = overtimeRequests.filter((r) => r.employeeId === myEmployeeId);

    // ─── Check-in state ───────────────────────────────────────────
    const [checkInOpen, setCheckInOpen] = useState(false);
    const [step, setStep] = useState<CheckInStep>("idle");
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [geoResult, setGeoResult] = useState<{ within: boolean; distanceMeters: number; accuracy?: number } | null>(null);
    const [spoofReason, setSpoofReason] = useState<string | null>(null);
    const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);

    // ─── OT state ─────────────────────────────────────────────────
    const [otOpen, setOtOpen] = useState(false);
    const [otDate, setOtDate] = useState("");
    const [otHours, setOtHours] = useState("1");
    const [otReason, setOtReason] = useState("");

    // ─── Penalty state ────────────────────────────────────────────
    const [penaltyRemainMs, setPenaltyRemainMs] = useState(0);
    const [devToolsOpen, setDevToolsOpen] = useState(false);

    // Continuous devtools monitor — applies penalty on detection,
    // clears the "open" UI flag when closed, but keeps the cooldown.
    useEffect(() => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const t = setInterval(() => {
            cleanExpiredPenalties();
            if (myEmployeeId) {
                const p = getActivePenalty(myEmployeeId);
                setPenaltyRemainMs(p ? Math.max(0, new Date(p.penaltyUntil).getTime() - Date.now()) : 0);
            }
            if (!isMobile) {
                const open = isDesktopDevToolsOpen();
                setDevToolsOpen(open);
                if (open && penaltySettings.devOptionsPenaltyEnabled && myEmployeeId &&
                    (penaltySettings.devOptionsPenaltyApplyTo === "devtools" || penaltySettings.devOptionsPenaltyApplyTo === "both")) {
                    const existing = getActivePenalty(myEmployeeId);
                    if (!existing) {
                        const until = new Date(Date.now() + penaltySettings.devOptionsPenaltyMinutes * 60000).toISOString();
                        applyPenalty({
                            employeeId: myEmployeeId,
                            reason: "Developer tools were opened. Check-in is locked for the penalty duration.",
                            triggeredAt: new Date().toISOString(),
                            penaltyUntil: until,
                        });
                        toast.error(`Developer tools detected. Locked out for ${penaltySettings.devOptionsPenaltyMinutes} minutes.`, { duration: 6000, id: "devtools-penalty" });
                    }
                }
            }
        }, 1000);
        return () => clearInterval(t);
    }, [cleanExpiredPenalties, myEmployeeId, getActivePenalty, applyPenalty, penaltySettings]);
    const activePenalty = myEmployeeId ? getActivePenalty(myEmployeeId) : undefined;

    // ─── Handlers ─────────────────────────────────────────────────
    const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

    const handleSubmitOT = () => {
        if (!myEmployeeId || !otDate || !otHours || !otReason) { toast.error("Please fill all fields"); return; }
        submitOvertimeRequest({ employeeId: myEmployeeId, date: otDate, hoursRequested: Number(otHours), reason: otReason });
        toast.success("Overtime request submitted");
        setOtOpen(false); setOtDate(""); setOtHours("1"); setOtReason("");
    };

    const handleExportCSV = () => {
        const myLogs = logs.filter((l) => l.employeeId === myEmployeeId).sort((a, b) => b.date.localeCompare(a.date));
        const rows = [
            ["Date", "Check In", "Check Out", "Hours", "Late (min)", "Status"],
            ...myLogs.map((l) => [l.date, l.checkIn || "", l.checkOut || "", l.hours ?? "", l.lateMinutes ?? "", l.status]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `my-attendance.csv`; a.click(); URL.revokeObjectURL(a.href);
        toast.success("Attendance exported");
    };

    const startCheckIn = () => {
        const now = Date.now();
        if (myEmployeeId && activePenalty) {
            const remaining = Math.max(0, Math.ceil((new Date(activePenalty.penaltyUntil).getTime() - now) / 60000));
            toast.error(`Check-in locked for ${remaining} more minute${remaining !== 1 ? "s" : ""}. ${activePenalty.reason}`);
            return;
        }
        // Penalty already applied by background monitor; extra guard for edge cases
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile && devToolsOpen) {
            toast.error("Please close Developer Tools before checking in.", { id: "devtools-block" });
            return;
        }
        const myEmp = employees.find((e) => e.id === myEmployeeId);
        if (myEmp?.workDays?.length) {
            const todayName = DAY_NAMES[new Date().getDay()];
            if (!myEmp.workDays.includes(todayName)) {
                toast.warning(`${todayName} is not in your scheduled work days. Checking in anyway.`, { duration: 5000 });
            }
        }
        setSpoofReason(null); setStep("idle"); setUserLocation(null); setGeoResult(null); setSelfieDataUrl(null);
        setCheckInOpen(true);
    };

    const requestLocation = () => {
        setSpoofReason(null); setStep("locating");
        if (!navigator.geolocation) { toast.error("Geolocation is not supported"); setStep("error"); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const spoof = detectLocationSpoofing(pos.coords);
                if (spoof) {
                    if (penaltySettings.devOptionsPenaltyEnabled && myEmployeeId &&
                        (penaltySettings.devOptionsPenaltyApplyTo === "spoofing" || penaltySettings.devOptionsPenaltyApplyTo === "both")) {
                        const until = new Date(Date.now() + penaltySettings.devOptionsPenaltyMinutes * 60000).toISOString();
                        applyPenalty({ employeeId: myEmployeeId, reason: spoof, triggeredAt: new Date().toISOString(), penaltyUntil: until });
                        toast.error(`Location spoofing detected. Locked out for ${penaltySettings.devOptionsPenaltyMinutes} minutes.`, { duration: 6000 });
                    }
                    setSpoofReason(spoof); setStep("error"); return;
                }
                const gpsAccuracy = Math.round(pos.coords.accuracy);
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                if (myProject) {
                    const result = isWithinGeofence(loc.lat, loc.lng, myProject.location.lat, myProject.location.lng, myProject.location.radius);
                    if (!result.within && gpsAccuracy > myProject.location.radius) {
                        setSpoofReason(`GPS accuracy (±${gpsAccuracy}m) is larger than the geofence radius (${myProject.location.radius}m). Move to an open area.`);
                        setStep("error"); return;
                    }
                    setGeoResult({ ...result, accuracy: gpsAccuracy });
                    setStep(result.within ? "location_result" : "error");
                } else {
                    setGeoResult({ within: true, distanceMeters: 0, accuracy: gpsAccuracy });
                    setStep("location_result");
                }
            },
            (err) => {
                const msg = err.code === err.PERMISSION_DENIED ? "Location access denied." : err.code === err.TIMEOUT ? "Location request timed out." : "Unable to retrieve location.";
                toast.error(msg); setStep("error");
            },
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
        if (selfieDataUrl && userLocation) {
            addPhoto({
                eventId: `checkin-${Date.now()}`, employeeId: myEmployeeId, photoDataUrl: selfieDataUrl,
                gpsLat: userLocation.lat, gpsLng: userLocation.lng, gpsAccuracyMeters: geoResult?.accuracy || 0,
                capturedAt: new Date().toISOString(), geofencePass: geoResult?.within ?? true, projectId: myProject?.id,
            });
        }
        setStep("done"); toast.success("Check-in successful!");
    }, [myEmployeeId, myProject, userLocation, selfieDataUrl, geoResult, checkIn, addPhoto]);

    // ─── Computed ─────────────────────────────────────────────────
    const greeting = useMemo(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }, []);

    const empWeekStats = useMemo(() => {
        if (!myEmployeeId) return { daysPresent: 0, totalHours: 0, lateDays: 0, scheduledDays: 5, progressPct: 0 };
        const now = new Date();
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d.toISOString().split("T")[0]; });
        const weekLogs = logs.filter((l) => l.employeeId === myEmployeeId && weekDates.includes(l.date));
        const daysPresent = weekLogs.filter((l) => l.status === "present").length;
        const totalHours = weekLogs.reduce((sum, l) => sum + (l.hours || 0), 0);
        const lateDays = weekLogs.filter((l) => (l.lateMinutes || 0) > 0).length;
        const myEmp = employees.find((e) => e.id === myEmployeeId);
        const scheduledDays = myEmp?.workDays?.length || 5;
        const progressPct = Math.min(100, Math.round((daysPresent / scheduledDays) * 100));
        return { daysPresent, totalHours, lateDays, scheduledDays, progressPct };
    }, [myEmployeeId, logs, employees]);

    const empRecentLogs = useMemo(() => {
        if (!myEmployeeId) return [];
        return logs.filter((l) => l.employeeId === myEmployeeId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    }, [myEmployeeId, logs]);

    const empUpcomingHolidays = useMemo(() => {
        const str = new Date().toISOString().split("T")[0];
        return [...holidays].filter((h) => h.date >= str).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    }, [holidays]);

    if (!myEmployeeId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-sm text-muted-foreground">No employee profile linked to your account.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="max-w-2xl mx-auto w-full space-y-4 sm:space-y-6">

                {/* ── Greeting ──────────────────────────────────────────── */}
                <div className="text-center pt-1 sm:pt-2 space-y-0.5">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                        {greeting}, {currentUser.name.split(" ")[0]}!
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>

                {/* ── DevTools Open Warning (disappears when closed) ────── */}
                {devToolsOpen && (
                    <Card className="border-2 border-orange-500/40 bg-orange-500/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                                <ShieldAlert className="h-6 w-6 text-orange-500 animate-pulse" />
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-1">
                                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Developer Tools Detected</p>
                                <p className="text-xs text-muted-foreground">Close Developer Tools to remove this warning. Your cooldown penalty is still running.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Penalty Cooldown Banner (stays until timer expires) ── */}
                {activePenalty && (() => {
                    const remainMs = penaltyRemainMs;
                    const remainMin = Math.floor(remainMs / 60000);
                    const remainSec = Math.floor((remainMs % 60000) / 1000);
                    return (
                        <Card className="border-2 border-red-500/40 bg-red-500/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                                    <ShieldAlert className="h-6 w-6 text-red-500" />
                                </div>
                                <div className="flex-1 text-center sm:text-left space-y-1">
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Check-In Locked — Cooldown Active</p>
                                    <p className="text-xs text-muted-foreground">{activePenalty.reason}</p>
                                    <p className="text-xs text-red-600/80 dark:text-red-400/80">
                                        {devToolsOpen
                                            ? "Close Developer Tools. Cooldown resets only after closing DevTools."
                                            : <>Unlocks in <span className="font-mono font-bold">{remainMin}m {String(remainSec).padStart(2, "0")}s</span></>}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* ── Status Hero Card ──────────────────────────────────── */}
                <Card className={`border-2 overflow-hidden ${
                    !todayLog?.checkIn ? "border-blue-500/30" :
                    todayLog?.checkOut ? "border-emerald-500/30" : "border-amber-500/30"
                }`}>
                    <div className={`p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-5 ${
                        !todayLog?.checkIn ? "bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-indigo-500/5" :
                        todayLog?.checkOut ? "bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5" :
                        "bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5"
                    }`}>
                        <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center ring-4 ring-offset-2 ring-offset-background ${
                            !todayLog?.checkIn ? "bg-blue-500/15 ring-blue-500/20" :
                            todayLog?.checkOut ? "bg-emerald-500/15 ring-emerald-500/20" : "bg-amber-500/15 ring-amber-500/20"
                        }`}>
                            {!todayLog?.checkIn ? <LogIn className="h-7 w-7 sm:h-9 sm:w-9 text-blue-500" />
                             : todayLog?.checkOut ? <CheckCircle className="h-7 w-7 sm:h-9 sm:w-9 text-emerald-500" />
                             : <Clock className="h-7 w-7 sm:h-9 sm:w-9 text-amber-500 animate-pulse" />}
                        </div>
                        <div className="text-center space-y-1">
                            <p className={`text-lg sm:text-xl font-semibold ${
                                !todayLog?.checkIn ? "text-blue-700 dark:text-blue-400" :
                                todayLog?.checkOut ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                            }`}>
                                {!todayLog?.checkIn ? "Not Clocked In" : todayLog?.checkOut ? "Day Complete" : "Currently Working"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                {!todayLog?.checkIn ? "Tap below to start your day" :
                                 todayLog?.checkOut ? `${todayLog.hours}h logged today — great work!` :
                                 `Clocked in at ${todayLog.checkIn}`}
                            </p>
                        </div>
                        {todayLog?.checkIn && !todayLog?.checkOut && <ElapsedTimeDisplay checkInTime={todayLog.checkIn} />}
                        <div className="w-full sm:w-auto mt-1">
                            {!todayLog?.checkIn ? (
                                <Button size="lg" onClick={startCheckIn} disabled={!!activePenalty || devToolsOpen} className="gap-2 w-full sm:w-auto sm:px-10 h-12 text-base rounded-xl shadow-md">
                                    <LogIn className="h-5 w-5" /> {activePenalty ? "Locked" : devToolsOpen ? "DevTools Detected" : "Check In"}
                                </Button>
                            ) : !todayLog?.checkOut ? (
                                <Button size="lg" onClick={() => { checkOut(myEmployeeId, myProject?.id); toast.success("Checked out — see you tomorrow!"); }}
                                    variant="outline" className="gap-2 w-full sm:w-auto sm:px-10 h-12 text-base rounded-xl">
                                    <LogOut className="h-5 w-5" /> Check Out
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </Card>

                {/* ── Project Assignment ───────────────────────────────── */}
                {myProject && (
                    <Card className="border border-blue-500/20 bg-blue-500/5">
                        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    Assigned to <span className="text-blue-600 dark:text-blue-400">{myProject.name}</span>
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {myProject.location.lat.toFixed(4)}, {myProject.location.lng.toFixed(4)} · {myProject.location.radius}m
                                </p>
                            </div>
                            {todayLog?.checkIn && !todayLog?.checkOut && locationConfig.enabled && (
                                <LocationTracker employeeId={myEmployeeId} employeeName={currentUser.name} active={!!todayLog?.checkIn && !todayLog?.checkOut} />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Break Timer ──────────────────────────────────────── */}
                {todayLog?.checkIn && !todayLog?.checkOut && (
                    <BreakTimer employeeId={myEmployeeId} employeeName={currentUser.name} />
                )}

                {/* ── Weekly Stats ─────────────────────────────────────── */}
                <div className="space-y-2 sm:space-y-3">
                    <h2 className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">This Week</h2>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <Card className="border">
                            <CardContent className="p-2.5 sm:p-4 text-center space-y-1">
                                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                                    {empWeekStats.daysPresent}<span className="text-sm sm:text-base font-normal text-muted-foreground">/{empWeekStats.scheduledDays}</span>
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Days Present</p>
                                <Progress value={empWeekStats.progressPct} className="h-1 sm:h-1.5 mt-1" />
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="p-2.5 sm:p-4 text-center space-y-1">
                                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">{empWeekStats.totalHours.toFixed(1)}</p>
                                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Hours Worked</p>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="p-2.5 sm:p-4 text-center space-y-1">
                                <p className={`text-xl sm:text-2xl font-bold leading-none ${empWeekStats.lateDays > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {empWeekStats.lateDays}
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Late Days</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ── Recent Attendance ────────────────────────────────── */}
                <div className="space-y-2 sm:space-y-3">
                    <h2 className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">Recent Attendance</h2>
                    {empRecentLogs.length === 0 ? (
                        <Card className="border"><CardContent className="p-5 sm:p-6 text-center text-sm text-muted-foreground">No attendance records yet</CardContent></Card>
                    ) : (
                        <div className="space-y-1.5 sm:space-y-2">
                            {empRecentLogs.map((log) => {
                                const isToday = log.date === todayDateStr;
                                const dayLabel = isToday ? "Today" : new Date(log.date + "T12:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
                                return (
                                    <Card key={log.id} className={`border transition-colors ${isToday ? "border-blue-500/30 bg-blue-500/5" : ""}`}>
                                        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                                            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 ${
                                                log.status === "present" ? "bg-emerald-500/15" : log.status === "absent" ? "bg-red-500/15" : "bg-amber-500/15"
                                            }`}>
                                                {log.status === "present" ? <CheckCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${isToday ? "text-blue-500" : "text-emerald-500"}`} />
                                                 : log.status === "absent" ? <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                                                 : <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-sm font-medium">{dayLabel}</p>
                                                    <Badge variant="secondary" className={`text-[10px] ${statusColors[log.status]}`}>{log.status.replace("_", " ")}</Badge>
                                                    {log.faceVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-1.5">
                                                    <span>{log.checkIn || "—"} → {log.checkOut || "—"}</span>
                                                    {log.hours ? <span>· {log.hours}h</span> : null}
                                                    {(log.lateMinutes ?? 0) > 0 ? <span className="text-amber-600 dark:text-amber-400">+{log.lateMinutes}m late</span> : null}
                                                </p>
                                            </div>
                                            {log.hours ? <span className="text-xs sm:text-sm font-semibold text-muted-foreground shrink-0">{log.hours}h</span> : null}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                <Separator className="my-1" />

                {/* ── My Overtime Requests ─────────────────────────────── */}
                <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between px-0.5">
                        <h2 className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Overtime</h2>
                        <Button variant="outline" size="sm" className="gap-1.5 h-7 sm:h-8 text-xs" onClick={() => { setOtDate(todayDateStr); setOtOpen(true); }}>
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Request OT
                        </Button>
                    </div>
                    {myOTRequests.length === 0 ? (
                        <Card className="border"><CardContent className="p-5 sm:p-6 text-center text-sm text-muted-foreground">No overtime requests yet</CardContent></Card>
                    ) : (
                        <div className="space-y-1.5 sm:space-y-2">
                            {myOTRequests.slice(0, 5).map((ot) => (
                                <Card key={ot.id} className="border">
                                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                                        <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${
                                            ot.status === "pending" ? "bg-amber-500/15" : ot.status === "approved" ? "bg-emerald-500/15" : "bg-red-500/15"
                                        }`}>
                                            <Timer className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                                                ot.status === "pending" ? "text-amber-500" : ot.status === "approved" ? "text-emerald-500" : "text-red-500"
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-sm font-medium">{ot.date}</p>
                                                <Badge variant="secondary" className={`text-[10px] ${otStatusColor[ot.status]}`}>{ot.status}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{ot.hoursRequested}h — {ot.reason}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Upcoming Holidays ────────────────────────────────── */}
                {empUpcomingHolidays.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                        <h2 className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">Upcoming Holidays</h2>
                        <div className="space-y-1.5 sm:space-y-2">
                            {empUpcomingHolidays.map((h) => {
                                const isToday = h.date === todayDateStr;
                                return (
                                    <Card key={h.id} className={`border ${isToday ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
                                        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                                            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${isToday ? "bg-emerald-500/15" : "bg-blue-500/10"}`}>
                                                <CalendarDays className={`h-4 w-4 sm:h-5 sm:w-5 ${isToday ? "text-emerald-500" : "text-blue-500"}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {h.name}
                                                    {isToday && <span className="text-emerald-600 dark:text-emerald-400 ml-1.5 text-xs font-normal">Today!</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {new Date(h.date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
                                                    {" · "}
                                                    <span className={h.type === "regular" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>
                                                        {h.type === "regular" ? "Regular" : "Special"}
                                                    </span>
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Footer ───────────────────────────────────────────── */}
                <div className="flex items-center justify-center pb-4">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-8" onClick={handleExportCSV}>
                        <Download className="h-3.5 w-3.5" /> Export My Logs
                    </Button>
                </div>
            </div>

            {/* ═══════════════ DIALOGS ═══════════════ */}

            {/* OT Request Dialog */}
            <Dialog open={otOpen} onOpenChange={setOtOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Request Overtime</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div><label className="text-sm font-medium">Date</label><Input type="date" value={otDate} onChange={(e) => setOtDate(e.target.value)} className="mt-1" /></div>
                        <div><label className="text-sm font-medium">Hours (1–8)</label><Input type="number" min="1" max="8" value={otHours} onChange={(e) => setOtHours(e.target.value)} className="mt-1" /></div>
                        <div><label className="text-sm font-medium">Reason</label><Input value={otReason} onChange={(e) => setOtReason(e.target.value)} placeholder="e.g. Project deadline" className="mt-1" /></div>
                        <Button onClick={handleSubmitOT} className="w-full">Submit Request</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Check-In Dialog */}
            <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
                <DialogContent className="max-w-sm w-[calc(100vw-2rem)] max-h-[90dvh] flex flex-col p-0">
                    <DialogHeader className="px-4 pt-4 pb-2 shrink-0"><DialogTitle className="flex items-center gap-2"><LogIn className="h-5 w-5" /> Check In</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                        {step === "idle" && (
                            <Card className="border border-border/50">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center"><Navigation className="h-8 w-8 text-blue-500" /></div>
                                    <p className="text-sm font-medium">Step 1: Share Location</p>
                                    <p className="text-xs text-muted-foreground text-center">
                                        {myProject ? `Verify you are within ${myProject.location.radius}m of ${myProject.name}` : "Share your location to check in"}
                                    </p>
                                    <Button onClick={requestLocation} className="gap-1.5 mt-1"><MapPin className="h-4 w-4" /> Share My Location</Button>
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
                        {step === "location_result" && geoResult && (<>
                            <Card className="border border-emerald-500/30 bg-emerald-500/5">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Location Verified</p>
                                        <p className="text-xs text-muted-foreground">
                                            {myProject ? `${geoResult.distanceMeters}m from ${myProject.name} · radius ${myProject.location.radius}m` : "No project assigned — location recorded"}
                                        </p>
                                        {geoResult.accuracy !== undefined && <p className="text-[10px] text-muted-foreground mt-0.5"><Gauge className="inline w-3 h-3 mr-0.5 -mt-px" />GPS accuracy: ±{geoResult.accuracy}m</p>}
                                        {userLocation && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</p>}
                                    </div>
                                </CardContent>
                            </Card>
                            {locationConfig.requireSelfie && !selfieDataUrl && (
                                <div className="pt-1">
                                    <p className="text-xs text-muted-foreground text-center mb-3">Step 2: Take a Site Selfie</p>
                                    <SelfieCapture compressionQuality={locationConfig.selfieCompressionQuality} onCapture={(data) => { setSelfieDataUrl(data.photoDataUrl); toast.success("Selfie captured!"); }} onCancel={() => { if (!locationConfig.requireSelfie) setSelfieDataUrl(null); }} />
                                </div>
                            )}
                            {selfieDataUrl && (
                                <Card className="border border-blue-500/20 bg-blue-500/5">
                                    <CardContent className="p-3 flex items-center gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={selfieDataUrl} alt="Selfie" className="h-12 w-12 rounded-lg object-cover" />
                                        <div className="flex-1"><p className="text-xs font-medium text-blue-700 dark:text-blue-400">Selfie Captured</p><button className="text-[10px] text-muted-foreground underline" onClick={() => setSelfieDataUrl(null)}>Retake</button></div>
                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    </CardContent>
                                </Card>
                            )}
                            {(!locationConfig.requireSelfie || selfieDataUrl) && (
                                <div className="pt-1">
                                    <p className="text-xs text-muted-foreground text-center mb-3">{locationConfig.requireSelfie ? "Step 3" : "Step 2"}: Verify your identity</p>
                                    <FaceRecognitionSimulator onVerified={handleFaceVerified} autoStart />
                                </div>
                            )}
                        </>)}
                        {step === "error" && spoofReason && (
                            <Card className="border border-orange-500/30 bg-orange-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-orange-500/15 flex items-center justify-center"><ShieldAlert className="h-8 w-8 text-orange-500" /></div>
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Check-In Blocked</p>
                                    <p className="text-xs text-muted-foreground text-center">{spoofReason}</p>
                                    <p className="text-[10px] text-muted-foreground text-center">Disable mock location apps and developer options, then try again.</p>
                                    <Button variant="outline" size="sm" onClick={() => { setSpoofReason(null); setStep("idle"); }} className="mt-1">Try Again</Button>
                                </CardContent>
                            </Card>
                        )}
                        {step === "error" && !spoofReason && geoResult && !geoResult.within && (
                            <Card className="border border-red-500/30 bg-red-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-red-500/15 flex items-center justify-center"><XCircle className="h-8 w-8 text-red-500" /></div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Outside Project Area</p>
                                    <p className="text-xs text-muted-foreground text-center">
                                        You are <strong>{geoResult.distanceMeters}m</strong> away. Must be within <strong>{myProject?.location.radius ?? 100}m</strong>.
                                    </p>
                                    {geoResult.accuracy !== undefined && <p className="text-[10px] text-muted-foreground"><Gauge className="inline w-3 h-3 mr-0.5 -mt-px" />GPS accuracy: ±{geoResult.accuracy}m</p>}
                                    <Button variant="outline" size="sm" onClick={() => setStep("idle")} className="mt-1">Try Again</Button>
                                </CardContent>
                            </Card>
                        )}
                        {step === "error" && !spoofReason && !geoResult && (
                            <Card className="border border-red-500/30 bg-red-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <XCircle className="h-8 w-8 text-red-500" />
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Location Error</p>
                                    <p className="text-xs text-muted-foreground text-center">Could not get your location. Please enable location permissions and try again.</p>
                                    <Button variant="outline" size="sm" onClick={() => setStep("idle")} className="mt-1">Try Again</Button>
                                </CardContent>
                            </Card>
                        )}
                        {step === "done" && (
                            <Card className="border border-emerald-500/30 bg-emerald-500/5">
                                <CardContent className="p-6 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center"><CheckCircle className="h-8 w-8 text-emerald-500" /></div>
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
