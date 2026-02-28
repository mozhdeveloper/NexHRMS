"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAttendanceStore } from "@/store/attendance.store";
import { useAuthStore } from "@/store/auth.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAppearanceStore } from "@/store/appearance.store";
import { useKioskStore } from "@/store/kiosk.store";
import { useRolesStore } from "@/store/roles.store";
import { FaceRecognitionSimulator } from "@/components/attendance/face-recognition";
import { AccessDenied } from "@/components/ui/access-denied";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Shield, QrCode, Delete, LogIn, LogOut, RefreshCw, ScanFace,
    KeyRound, Nfc, CheckCircle, XCircle, User, ChevronRight,
} from "lucide-react";

/* ---------- Helpers -------------------------------------------------------- */

function generateToken(length = 8): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let t = "";
    for (let i = 0; i < length; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
}

function generateDeviceId(): string {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem("nexhrms-kiosk-device-id");
    if (stored) return stored;
    const id = `KIOSK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    localStorage.setItem("nexhrms-kiosk-device-id", id);
    return id;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

/* ---------- QR Mosaic (simulated) ----------------------------------------- */

function QrMosaic({ token }: { token: string }) {
    return (
        <div className="relative w-44 h-44 bg-white rounded-2xl p-2.5 shadow-2xl">
            <div className="grid grid-cols-10 grid-rows-10 gap-[2px] h-full">
                {Array.from({ length: 100 }).map((_, i) => {
                    const dark = (token.charCodeAt(i % token.length) * 17 + i * 7) % 4 !== 0;
                    return <div key={`${token}-${i}`} className={cn("rounded-[1px]", dark ? "bg-zinc-900" : "bg-white")} />;
                })}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-7 h-7 bg-white rounded-sm flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-zinc-800" />
                </div>
            </div>
            {["top-2 left-2", "top-2 right-2", "bottom-2 left-2"].map((pos) => (
                <div key={pos} className={`absolute ${pos} w-6 h-6 border-[3px] border-zinc-900 rounded-sm`} />
            ))}
        </div>
    );
}

/* ---------- Countdown Ring ------------------------------------------------ */

function CountdownRing({ value, max }: { value: number; max: number }) {
    const r = 22;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="3"
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - value / max)}
                    strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/70">{value}s</span>
        </div>
    );
}

/* ---------- PIN Dots ------------------------------------------------------ */

function PinDots({ pin, maxLen }: { pin: string; maxLen: number }) {
    return (
        <div className="flex items-center justify-center gap-2.5 h-9">
            {Array.from({ length: maxLen }).map((_, i) => (
                <div key={i} className={cn(
                    "rounded-full transition-all duration-200",
                    i < pin.length ? "w-3.5 h-3.5 bg-white shadow-lg shadow-white/20" : "w-2.5 h-2.5 bg-white/20 border border-white/20"
                )} />
            ))}
        </div>
    );
}

/* ---------- Tab types ----------------------------------------------------- */

type KioskTab = "face" | "pin" | "qr" | "nfc";
type KioskMode = "in" | "out";
type FeedbackState = "idle" | "success-in" | "success-out" | "error";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "\u2190", "0", "\u2713"] as const;

/* ---------- NFC badge data for simulation --------------------------------- */

const SIMULATED_NFC_BADGES = [
    { nfcId: "NFC-001", empId: "EMP001", name: "Olivia Harper",  dept: "Engineering" },
    { nfcId: "NFC-002", empId: "EMP002", name: "Ethan Brooks",   dept: "Engineering" },
    { nfcId: "NFC-003", empId: "EMP003", name: "Sophia Patel",   dept: "Design" },
    { nfcId: "NFC-004", empId: "EMP004", name: "Liam Chen",      dept: "Engineering" },
    { nfcId: "NFC-005", empId: "EMP005", name: "Ava Martinez",   dept: "Engineering" },
    { nfcId: "NFC-006", empId: "EMP006", name: "Noah Williams",  dept: "HR" },
    { nfcId: "NFC-007", empId: "EMP007", name: "Isabella Kim",   dept: "Finance" },
    { nfcId: "NFC-008", empId: "EMP008", name: "James Wilson",   dept: "Marketing" },
];

/* ---------- Demo PIN cheat-sheet ------------------------------------------ */

const DEMO_PINS = [
    { empId: "EMP001", name: "Olivia Harper",  pin: "111111" },
    { empId: "EMP002", name: "Ethan Brooks",   pin: "222222" },
    { empId: "EMP003", name: "Sophia Patel",   pin: "333333" },
    { empId: "EMP004", name: "Liam Chen",      pin: "444444" },
    { empId: "EMP005", name: "Ava Martinez",   pin: "555555" },
    { empId: "EMP006", name: "Noah Williams",  pin: "123456" },
    { empId: "EMP007", name: "Isabella Kim",   pin: "234567" },
    { empId: "EMP008", name: "James Wilson",   pin: "345678" },
];

/* ---------- Page ---------------------------------------------------------- */

export default function KioskPage() {
    const ks = useKioskStore((s) => s.settings);
    const currentUser = useAuthStore((s) => s.currentUser);
    const { hasPermission } = useRolesStore();
    const canAccessKiosk = hasPermission(currentUser.role, "page:kiosk");

    const enabledTabs = useMemo(() => {
        const tabs: KioskTab[] = [];
        if (ks.enableFace) tabs.push("face");
        if (ks.enablePin) tabs.push("pin");
        if (ks.enableQr) tabs.push("qr");
        if (ks.enableNfc) tabs.push("nfc");
        if (tabs.length === 0) tabs.push("pin");
        return tabs;
    }, [ks.enableFace, ks.enablePin, ks.enableQr, ks.enableNfc]);

    const [activeTab, setActiveTab] = useState<KioskTab>(enabledTabs[0]);
    const [token, setToken] = useState(() => generateToken(ks.tokenLength));
    const [countdown, setCountdown] = useState(ks.tokenRefreshInterval);
    const [pin, setPin] = useState("");
    const [mode, setMode] = useState<KioskMode>("in");
    const [feedback, setFeedback] = useState<FeedbackState>("idle");
    const [deviceId] = useState(() => generateDeviceId());
    const [now, setNow] = useState(new Date());
    const [faceVerified, setFaceVerified] = useState(false);
    const [nfcScanning, setNfcScanning] = useState(false);
    const [nfcSelectedBadge, setNfcSelectedBadge] = useState<string | null>(null);
    const [checkedInName, setCheckedInName] = useState("");

    const { appendEvent } = useAttendanceStore();
    const employees = useEmployeesStore((s) => s.employees);
    const companyName = useAppearanceStore((s) => s.companyName);
    const logoUrl = useAppearanceStore((s) => s.logoUrl);

    useEffect(() => {
        if (!enabledTabs.includes(activeTab)) setActiveTab(enabledTabs[0]);
    }, [enabledTabs, activeTab]);

    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

    const refreshToken = useCallback(() => {
        setToken(generateToken(ks.tokenLength));
        setCountdown(ks.tokenRefreshInterval);
    }, [ks.tokenLength, ks.tokenRefreshInterval]);

    useEffect(() => {
        const t = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) { refreshToken(); return ks.tokenRefreshInterval; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [refreshToken, ks.tokenRefreshInterval]);

    const handleFaceVerified = useCallback(() => { setFaceVerified(true); }, []);

    if (!canAccessKiosk) {
        return <AccessDenied title="Kiosk Access Restricted" message="You do not have permission to access the kiosk terminal." />;
    }

    /* --- Clock / Date formatters --- */
    const h = now.getHours();
    const TIME = ks.clockFormat === "12h"
        ? `${h % 12 || 12}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())} ${h >= 12 ? "PM" : "AM"}`
        : `${pad2(h)}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const DATE = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    /* --- Feedback helpers --- */
    const isSuccessIn  = feedback === "success-in";
    const isSuccessOut = feedback === "success-out";
    const isError      = feedback === "error";
    const isSuccess    = isSuccessIn || isSuccessOut;

    const triggerFeedback = (state: FeedbackState, name?: string) => {
        setFeedback(state);
        if (name) setCheckedInName(name);
        setTimeout(() => { setFeedback("idle"); setPin(""); setCheckedInName(""); setFaceVerified(false); }, ks.feedbackDuration);
    };

    const checkWorkDay = (empId: string) => {
        if (!ks.warnOffDay) return;
        const emp = employees.find((e) => e.id === empId);
        if (emp?.workDays?.length) {
            const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
            if (!emp.workDays.includes(day)) toast.warning(`${day} is outside your scheduled days.`, { duration: 4000 });
        }
    };

    const clockEmployee = (empId: string, empName: string) => {
        if (mode === "in") checkWorkDay(empId);
        appendEvent({ employeeId: empId, eventType: mode === "in" ? "IN" : "OUT", timestampUTC: new Date().toISOString(), deviceId });
        triggerFeedback(mode === "in" ? "success-in" : "success-out", empName);
    };

    /* --- PIN submit --- */
    const handlePinSubmit = () => {
        if (pin.length < 4) { triggerFeedback("error"); return; }
        const matched = employees.find((e) => e.pin === pin);
        if (matched) {
            clockEmployee(matched.id, matched.name);
        } else {
            clockEmployee(currentUser.id, currentUser.name);
        }
    };

    const handleKey = (key: typeof KEYS[number]) => {
        if (feedback !== "idle") return;
        if (key === "\u2190") { setPin((p) => p.slice(0, -1)); return; }
        if (key === "\u2713") { handlePinSubmit(); return; }
        if (pin.length >= ks.pinLength) return;
        setPin((p) => p + key);
    };

    /* --- Face check-in --- */
    const handleFaceCheckIn = () => {
        if (!faceVerified) { toast.error("Complete face scan first"); return; }
        clockEmployee(currentUser.id, currentUser.name);
    };

    /* --- NFC simulate --- */
    const handleNfcTap = (badge: typeof SIMULATED_NFC_BADGES[0]) => {
        if (nfcScanning || feedback !== "idle") return;
        setNfcScanning(true);
        setNfcSelectedBadge(badge.nfcId);
        setTimeout(() => {
            setNfcScanning(false);
            setNfcSelectedBadge(null);
            const emp = employees.find((e) => e.id === badge.empId);
            clockEmployee(emp?.id ?? badge.empId, emp?.name ?? badge.name);
        }, ks.nfcSimulatedDelay);
    };

    /* --- QR simulate scan --- */
    const handleQrScan = () => { clockEmployee(currentUser.id, currentUser.name); };

    /* --- Theme --- */
    const themeBg = ks.kioskTheme === "midnight" ? "bg-slate-950" : ks.kioskTheme === "charcoal" ? "bg-neutral-950" : "bg-zinc-950";

    /* --- Tab config --- */
    const TAB_CONFIG: Record<KioskTab, { label: string; icon: React.ElementType }> = {
        face: { label: "Face Scan", icon: ScanFace },
        pin:  { label: "PIN Entry", icon: KeyRound },
        qr:   { label: "QR Code",   icon: QrCode },
        nfc:  { label: "NFC Badge", icon: Nfc },
    };

    /* --- Disabled state --- */
    if (!ks.kioskEnabled) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 text-white/40 select-none">
                <div className="text-center space-y-3">
                    <Shield className="h-12 w-12 mx-auto text-white/20" />
                    <p className="text-lg font-semibold">Kiosk Disabled</p>
                    <p className="text-sm text-white/25">An administrator has disabled this kiosk.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "fixed inset-0 flex flex-col items-center justify-between overflow-hidden transition-colors duration-700 select-none",
            isSuccess ? (isSuccessIn ? "bg-emerald-950" : "bg-sky-950") : isError ? "bg-red-950" : themeBg
        )}>
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={cn(
                    "absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full blur-[130px] opacity-20 transition-colors duration-700",
                    isSuccess ? (isSuccessIn ? "bg-emerald-400" : "bg-sky-400") : isError ? "bg-red-400" : "bg-primary"
                )} />
                <div className={cn(
                    "absolute -bottom-48 -right-48 w-[650px] h-[650px] rounded-full blur-[150px] opacity-15 transition-colors duration-700",
                    isSuccess ? (isSuccessIn ? "bg-emerald-600" : "bg-sky-600") : isError ? "bg-red-700" : "bg-primary/60"
                )} />
            </div>

            {/* Top bar */}
            <header className="relative z-10 w-full flex items-center justify-between px-8 pt-6">
                <div className="flex items-center gap-3 min-w-[160px]">
                    {ks.showLogo && (logoUrl
                        ? <img src={logoUrl} alt={companyName} className="h-8 max-w-[130px] object-contain brightness-0 invert opacity-90" /> // eslint-disable-line @next/next/no-img-element
                        : <span className="text-white font-bold text-lg tracking-tight">{companyName || "NexHRMS"}</span>
                    )}
                </div>
                <div className="text-center">
                    {ks.showClock && <p className="text-white font-mono text-4xl font-bold tracking-widest tabular-nums drop-shadow-lg">{TIME}</p>}
                    {ks.showDate && <p className="text-white/40 text-xs mt-1">{DATE}</p>}
                </div>
                <div className="flex items-center gap-1.5 text-white/25 text-[11px] font-mono min-w-[160px] justify-end">
                    {ks.showDeviceId && <><Shield className="h-3.5 w-3.5" />{deviceId || "..."}</>}
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 flex-1 w-full max-w-4xl">
                {/* Mode toggle (IN / OUT) */}
                <div className="flex rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm">
                    {(["in", ...(ks.allowCheckOut ? ["out"] : [])] as KioskMode[]).map((m) => (
                        <button key={m} onClick={() => { setMode(m); setPin(""); setFaceVerified(false); }} className={cn(
                            "px-10 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                            mode === m
                                ? m === "in" ? "bg-emerald-500/80 text-white shadow-lg shadow-emerald-900/30" : "bg-sky-500/80 text-white shadow-lg shadow-sky-900/30"
                                : "text-white/30 hover:text-white/60"
                        )}>
                            {m === "in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                            {m === "in" ? "Check In" : "Check Out"}
                        </button>
                    ))}
                </div>

                {/* Success / Error overlay */}
                {feedback !== "idle" && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="text-center space-y-4 animate-in zoom-in-90 duration-300">
                            {isSuccess ? (
                                <>
                                    <div className={cn("h-20 w-20 mx-auto rounded-full flex items-center justify-center",
                                        isSuccessIn ? "bg-emerald-500/20" : "bg-sky-500/20")}>
                                        <CheckCircle className={cn("h-10 w-10", isSuccessIn ? "text-emerald-400" : "text-sky-400")} />
                                    </div>
                                    <p className={cn("text-3xl font-bold", isSuccessIn ? "text-emerald-300" : "text-sky-300")}>
                                        {isSuccessIn ? "Checked In" : "Checked Out"}
                                    </p>
                                    {checkedInName && <p className="text-white/60 text-lg">{checkedInName}</p>}
                                    <p className="text-white/30 text-sm">{now.toLocaleTimeString()}</p>
                                </>
                            ) : (
                                <>
                                    <div className="h-20 w-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                                        <XCircle className="h-10 w-10 text-red-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-red-300">Invalid - Try Again</p>
                                    <p className="text-white/30 text-sm">PIN not recognized</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab selector */}
                {enabledTabs.length > 1 && (
                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-1.5 backdrop-blur-sm">
                        {enabledTabs.map((tab) => {
                            const cfg = TAB_CONFIG[tab];
                            const Icon = cfg.icon;
                            const isActive = activeTab === tab;
                            return (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white/10 text-white shadow-lg"
                                        : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                                )}>
                                    <Icon className="h-4 w-4" />
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Tab: Face Scan */}
                {activeTab === "face" && (
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center gap-5 shadow-2xl w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2">
                            <ScanFace className="h-4 w-4 text-emerald-400/60" />
                            <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Face Recognition</p>
                        </div>

                        <FaceRecognitionSimulator
                            onVerified={handleFaceVerified}
                            variant="kiosk"
                            countdownSeconds={ks.faceRecCountdown}
                            autoStart={ks.faceRecAutoStart}
                        />

                        {faceVerified && (
                            <div className="w-full space-y-3">
                                <div className="flex items-center justify-center gap-2 text-emerald-400/80">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Face Verified</span>
                                </div>
                                <button onClick={handleFaceCheckIn} className={cn(
                                    "w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98]",
                                    mode === "in"
                                        ? "bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                                        : "bg-sky-500/80 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40"
                                )}>
                                    {mode === "in" ? "Confirm Check In" : "Confirm Check Out"}
                                </button>
                            </div>
                        )}

                        {!faceVerified && (
                            <p className="text-white/25 text-[10px] text-center">Position your face in the oval and click Scan</p>
                        )}
                    </div>
                )}

                {/* Tab: PIN Entry */}
                {activeTab === "pin" && (
                    <div className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Numpad card */}
                        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center gap-5 w-full max-w-[320px] shadow-2xl transition-colors duration-500">
                            <div className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4 text-blue-400/60" />
                                <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">PIN Check-In</p>
                            </div>

                            <div className="h-12 flex items-center justify-center w-full">
                                <PinDots pin={pin} maxLen={ks.pinLength} />
                            </div>

                            <div className="grid grid-cols-3 gap-2.5 w-full">
                                {KEYS.map((key) => {
                                    const isDel = key === "\u2190";
                                    const isConfirm = key === "\u2713";
                                    return (
                                        <button key={key} onClick={() => handleKey(key)} className={cn(
                                            "h-14 rounded-xl text-xl font-bold transition-all duration-150 active:scale-95",
                                            isConfirm
                                                ? mode === "in"
                                                    ? "bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                                                    : "bg-sky-500/80 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40"
                                                : isDel
                                                    ? "bg-white/8 hover:bg-white/15 text-white/50 text-base"
                                                    : "bg-white/10 hover:bg-white/20 text-white"
                                        )}>
                                            {isDel ? <Delete className="h-5 w-5 mx-auto" /> : key}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-white/20 text-[10px] text-center">Enter your {ks.pinLength}-digit employee PIN</p>
                        </div>

                        {/* Sample PINs cheat-sheet */}
                        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-5 backdrop-blur-sm shadow-xl flex-1 min-w-[200px]">
                            <p className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-3">Demo PINs</p>
                            <div className="space-y-1.5">
                                {DEMO_PINS.map((d) => (
                                    <button
                                        key={d.empId}
                                        onClick={() => { setPin(d.pin); }}
                                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] transition-all duration-150 active:scale-[0.98]"
                                    >
                                        <span className="text-white/70 text-xs font-medium truncate">{d.name}</span>
                                        <span className="font-mono text-xs text-white/50 tracking-widest shrink-0">{d.pin}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-white/20 text-[9px] mt-3 text-center">Tap a row to auto-fill the PIN</p>
                        </div>
                    </div>
                )}

                {/* Tab: QR Code */}
                {activeTab === "qr" && (
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center gap-5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-violet-400/60" />
                            <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">QR Code Scan</p>
                        </div>

                        <QrMosaic token={token} />

                        <div className="text-center space-y-1.5">
                            <p className="font-mono text-xl font-bold tracking-[0.35em] text-white">{token}</p>
                            <p className="text-white/30 text-[11px]">Scan with NexHRMS mobile app</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <CountdownRing value={countdown} max={ks.tokenRefreshInterval} />
                            <button onClick={refreshToken} className="flex items-center gap-1.5 text-white/25 hover:text-white/60 text-[11px] transition-colors">
                                <RefreshCw className="h-3.5 w-3.5" /> Refresh
                            </button>
                        </div>

                        <button onClick={handleQrScan} className={cn(
                            "w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] mt-1",
                            mode === "in"
                                ? "bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                                : "bg-sky-500/80 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40"
                        )}>
                            <span className="flex items-center justify-center gap-2">
                                <QrCode className="h-4 w-4" />
                                Simulate QR Scan
                            </span>
                        </button>
                    </div>
                )}

                {/* Tab: NFC Badge */}
                {activeTab === "nfc" && (
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center gap-5 shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2">
                            <Nfc className="h-4 w-4 text-amber-400/60" />
                            <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">NFC ID Badge Scan</p>
                        </div>

                        <div className="relative">
                            <div className={cn(
                                "w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                                nfcScanning
                                    ? "border-amber-400/60 bg-amber-400/10 shadow-lg shadow-amber-400/20"
                                    : "border-white/15 bg-white/[0.03]"
                            )}>
                                <Nfc className={cn("h-10 w-10 transition-colors duration-500",
                                    nfcScanning ? "text-amber-400" : "text-white/25")} />
                            </div>
                            {nfcScanning && (
                                <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" />
                            )}
                        </div>

                        <p className="text-white/30 text-xs text-center">
                            {nfcScanning ? "Reading badge..." : "Tap an employee badge below to simulate NFC scan"}
                        </p>

                        <div className="w-full max-h-56 overflow-y-auto space-y-1.5">
                            {SIMULATED_NFC_BADGES.map((badge) => {
                                const isSelected = nfcSelectedBadge === badge.nfcId;
                                const isDisabled = (nfcScanning && !isSelected) || feedback !== "idle";
                                return (
                                    <button
                                        key={badge.nfcId}
                                        onClick={() => handleNfcTap(badge)}
                                        disabled={isDisabled}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 border",
                                            isSelected
                                                ? "bg-amber-400/15 border-amber-400/40 shadow-lg shadow-amber-900/20"
                                                : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12]",
                                            isDisabled && "opacity-30 cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                                            isSelected ? "bg-amber-400/20" : "bg-white/10"
                                        )}>
                                            {isSelected
                                                ? <Nfc className="h-4 w-4 text-amber-400 animate-pulse" />
                                                : <User className="h-4 w-4 text-white/50" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{badge.name}</p>
                                            <p className="text-white/30 text-[10px]">{badge.dept} &middot; <span className="font-mono">{badge.nfcId}</span></p>
                                        </div>
                                        {!isSelected && <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />}
                                        {isSelected && <span className="text-amber-400/70 text-[10px] font-medium shrink-0">Reading…</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-white/15 text-[9px] text-center">
                            Simulated NFC reader - in production, badges scan automatically via hardware
                        </p>
                    </div>
                )}

                <p className="text-white/20 text-xs text-center">{ks.welcomeMessage}</p>
            </main>

            {/* Footer */}
            <footer className="relative z-10 pb-5 text-white/15 text-[10px] flex items-center gap-2">
                {ks.showSecurityBadge && <Shield className="h-3 w-3" />}
                {ks.kioskTitle} - {companyName || "NexHRMS"} - {ks.footerMessage}
            </footer>
        </div>
    );
}
