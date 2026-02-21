"use client";

import { useState, useEffect, useCallback } from "react";
import { useAttendanceStore } from "@/store/attendance.store";
import { useAuthStore } from "@/store/auth.store";
import { useEmployeesStore } from "@/store/employees.store";
import { useAppearanceStore } from "@/store/appearance.store";
import { useKioskStore } from "@/store/kiosk.store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Shield, QrCode, Delete, LogIn, LogOut, RefreshCw } from "lucide-react";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ QR Mosaic (simulated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QrMosaic({ token }: { token: string }) {
    return (
        <div className="relative w-52 h-52 bg-white rounded-2xl p-3 shadow-2xl">
            <div className="grid grid-cols-10 grid-rows-10 gap-[2px] h-full">
                {Array.from({ length: 100 }).map((_, i) => {
                    const dark = (token.charCodeAt(i % token.length) * 17 + i * 7) % 4 !== 0;
                    return <div key={`${token}-${i}`} className={cn("rounded-[1px]", dark ? "bg-zinc-900" : "bg-white")} />;
                })}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-zinc-800" />
                </div>
            </div>
            {["top-2 left-2", "top-2 right-2", "bottom-2 left-2"].map((pos) => (
                <div key={pos} className={`absolute ${pos} w-7 h-7 border-[3px] border-zinc-900 rounded-sm`} />
            ))}
        </div>
    );
}

// â”€â”€â”€ Countdown Ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CountdownRing({ value, max }: { value: number; max: number }) {
    const r = 28;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3.5" />
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="3.5"
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - value / max)}
                    strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/80">{value}s</span>
        </div>
    );
}

// â”€â”€â”€ PIN Dots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PinDots({ pin, maxLen }: { pin: string; maxLen: number }) {
    return (
        <div className="flex items-center justify-center gap-3 h-10">
            {Array.from({ length: maxLen }).map((_, i) => (
                <div key={i} className={cn(
                    "rounded-full transition-all duration-200",
                    i < pin.length ? "w-4 h-4 bg-white shadow-lg shadow-white/20" : "w-3 h-3 bg-white/20 border border-white/20"
                )} />
            ))}
        </div>
    );
}

// â”€â”€â”€ Numpad keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KEYS = ["1","2","3","4","5","6","7","8","9","←","0","✓"] as const;
type KioskMode   = "in" | "out";
type FeedbackState = "idle" | "success-in" | "success-out" | "error";

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function KioskPage() {
    const ks = useKioskStore((s) => s.settings);

    const [token,     setToken]    = useState(() => generateToken(ks.tokenLength));
    const [countdown, setCountdown]= useState(ks.tokenRefreshInterval);
    const [pin,       setPin]      = useState("");
    const [mode,      setMode]     = useState<KioskMode>("in");
    const [feedback,  setFeedback] = useState<FeedbackState>("idle");
    const [deviceId,  setDeviceId] = useState("");
    const [now,       setNow]      = useState(new Date());

    const { appendEvent } = useAttendanceStore();
    const currentUser     = useAuthStore((s) => s.currentUser);
    const employees       = useEmployeesStore((s) => s.employees);
    const companyName     = useAppearanceStore((s) => s.companyName);
    const logoUrl         = useAppearanceStore((s) => s.logoUrl);

    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
    useEffect(() => { setDeviceId(generateDeviceId()); }, []);

    const refreshToken = useCallback(() => { setToken(generateToken(ks.tokenLength)); setCountdown(ks.tokenRefreshInterval); }, [ks.tokenLength, ks.tokenRefreshInterval]);

    useEffect(() => {
        const t = setInterval(() => {
            setCountdown((prev) => { if (prev <= 1) { refreshToken(); return ks.tokenRefreshInterval; } return prev - 1; });
        }, 1000);
        return () => clearInterval(t);
    }, [refreshToken, ks.tokenRefreshInterval]);

    const triggerFeedback = (state: FeedbackState) => {
        setFeedback(state);
        setTimeout(() => { setFeedback("idle"); setPin(""); }, ks.feedbackDuration);
    };

    const checkWorkDay = (empId: string) => {
        if (!ks.warnOffDay) return;
        const emp = employees.find((e) => e.id === empId);
        if (emp?.workDays?.length) {
            const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
            if (!emp.workDays.includes(day)) toast.warning(`${day} is outside your scheduled days.`, { duration: 4000 });
        }
    };

    const handleSubmit = () => {
        if (pin.length < 4) { triggerFeedback("error"); return; }
        if (mode === "in") checkWorkDay(currentUser.id);
        appendEvent({ employeeId: currentUser.id, eventType: mode === "in" ? "IN" : "OUT", timestampUTC: new Date().toISOString(), deviceId });
        triggerFeedback(mode === "in" ? "success-in" : "success-out");
    };

    const handleKey = (key: typeof KEYS[number]) => {
        if (feedback !== "idle") return;
        if (key === "←") { setPin((p) => p.slice(0, -1)); return; }
        if (key === "✓") { handleSubmit(); return; }
        if (pin.length >= ks.pinLength) return;
        setPin((p) => p + key);
    };

    const h = now.getHours();
    const TIME = ks.clockFormat === "12h"
        ? `${h % 12 || 12}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())} ${h >= 12 ? "PM" : "AM"}`
        : `${pad2(h)}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const DATE = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const isSuccessIn  = feedback === "success-in";
    const isSuccessOut = feedback === "success-out";
    const isError      = feedback === "error";
    const isSuccess    = isSuccessIn || isSuccessOut;

    const themeBg = ks.kioskTheme === "midnight" ? "bg-slate-950" : ks.kioskTheme === "charcoal" ? "bg-neutral-950" : "bg-zinc-950";
    const showQr  = ks.checkInMethod === "qr"  || ks.checkInMethod === "both";
    const showPin = ks.checkInMethod === "pin" || ks.checkInMethod === "both";

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
            <header className="relative z-10 w-full flex items-center justify-between px-8 pt-7">
                <div className="flex items-center gap-3 min-w-[160px]">
                    {ks.showLogo && (logoUrl
                        ? <img src={logoUrl} alt={companyName} className="h-8 max-w-[130px] object-contain brightness-0 invert opacity-90" />
                        : <span className="text-white font-bold text-lg tracking-tight">{companyName || "NexHRMS"}</span>
                    )}
                </div>
                <div className="text-center">
                    {ks.showClock && <p className="text-white font-mono text-5xl font-bold tracking-widest tabular-nums drop-shadow-lg">{TIME}</p>}
                    {ks.showDate && <p className="text-white/40 text-xs mt-1">{DATE}</p>}
                </div>
                <div className="flex items-center gap-1.5 text-white/25 text-[11px] font-mono min-w-[160px] justify-end">
                    {ks.showDeviceId && <><Shield className="h-3.5 w-3.5" />{deviceId || "..."}</>}
                </div>
            </header>

            {/* Main */}
            <main className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-10 xl:gap-20 px-6 flex-1 w-full max-w-5xl">

                {/* QR Panel */}
                {showQr && <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center gap-5 shadow-2xl">
                    <p className="text-white/35 text-[11px] font-semibold uppercase tracking-widest">QR Scan Check-In</p>
                    <QrMosaic token={token} />
                    <div className="text-center space-y-1.5">
                        <p className="font-mono text-2xl font-bold tracking-[0.35em] text-white">{token}</p>
                        <p className="text-white/30 text-[11px]">Scan with NexHRMS mobile</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <CountdownRing value={countdown} max={ks.tokenRefreshInterval} />
                        <button onClick={refreshToken} className="flex items-center gap-1.5 text-white/25 hover:text-white/60 text-[11px] transition-colors">
                            <RefreshCw className="h-3.5 w-3.5" /> Refresh
                        </button>
                    </div>
                </div>}

                {/* PIN Panel */}
                {showPin && <div className={cn(
                    "bg-white/[0.04] border rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center gap-5 w-full max-w-[300px] shadow-2xl transition-colors duration-500",
                    isSuccess ? "border-white/20" : isError ? "border-red-400/40" : "border-white/10"
                )}>
                    <p className="text-white/35 text-[11px] font-semibold uppercase tracking-widest">PIN Check-In / Out</p>

                    {/* Mode toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-white/10 w-full">
                        {(["in", ...(ks.allowCheckOut ? ["out"] : [])] as KioskMode[]).map((m) => (
                            <button key={m} onClick={() => { setMode(m); setPin(""); }} className={cn(
                                "flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200",
                                mode === m
                                    ? m === "in" ? "bg-emerald-500/80 text-white" : "bg-sky-500/80 text-white"
                                    : "text-white/30 hover:text-white/60"
                            )}>
                                {m === "in" ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                                {m === "in" ? "Check In" : "Check Out"}
                            </button>
                        ))}
                    </div>

                    {/* Feedback / Dots */}
                    <div className="h-14 flex items-center justify-center w-full">
                        {isSuccess ? (
                            <p className={cn(
                                "text-2xl font-bold animate-in fade-in zoom-in-75 duration-300",
                                isSuccessIn ? "text-emerald-300" : "text-sky-300"
                            )}>
                                {isSuccessIn ? "✓ Checked In" : "✓ Checked Out"}
                            </p>
                        ) : isError ? (
                            <p className="text-red-400 font-semibold animate-in fade-in duration-200">Invalid PIN — try again</p>
                        ) : (
                            <PinDots pin={pin} maxLen={ks.pinLength} />
                        )}
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-3 w-full">
                        {KEYS.map((key) => {
                            const isDel     = key === "←";
                            const isConfirm = key === "✓";
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

                    <p className="text-white/20 text-[10px] text-center">Enter {ks.pinLength}-digit employee PIN</p>
                </div>}
            </main>

            {/* Footer */}
            <footer className="relative z-10 pb-6 text-white/15 text-[10px] flex items-center gap-2">
                {ks.showSecurityBadge && <Shield className="h-3 w-3" />}
                {ks.kioskTitle} · {companyName || "NexHRMS"} · {ks.footerMessage}
            </footer>
        </div>
    );
}
