"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Fingerprint, Shield } from "lucide-react";
import { useAttendanceStore } from "@/store/attendance.store";
import { useAuthStore } from "@/store/auth.store";
import { useEmployeesStore } from "@/store/employees.store";
import { toast } from "sonner";

function generateToken(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let token = "";
    for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
    return token;
}

function generateDeviceId(): string {
    const stored = typeof window !== "undefined" ? localStorage.getItem("nexhrms-kiosk-device-id") : null;
    if (stored) return stored;
    const id = `KIOSK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (typeof window !== "undefined") localStorage.setItem("nexhrms-kiosk-device-id", id);
    return id;
}

export default function KioskPage() {
    const [token, setToken] = useState(generateToken());
    const [countdown, setCountdown] = useState(30);
    const [pin, setPin] = useState("");
    const [deviceId, setDeviceId] = useState("");
    const { appendEvent } = useAttendanceStore();
    const currentUser = useAuthStore((s) => s.currentUser);
    const employees = useEmployeesStore((s) => s.employees);

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const checkWorkDay = (employeeId: string) => {
        const emp = employees.find((e) => e.id === employeeId);
        if (emp?.workDays?.length) {
            const todayName = DAY_NAMES[new Date().getDay()];
            if (!emp.workDays.includes(todayName)) {
                toast.warning(`${todayName} is not in your scheduled work days. Logging anyway — submit an OT request if needed.`, { duration: 5000 });
            }
        }
    };

    useEffect(() => {
        setDeviceId(generateDeviceId());
    }, []);

    const refreshToken = useCallback(() => {
        setToken(generateToken());
        setCountdown(30);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    refreshToken();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [refreshToken]);

    const handlePinCheckIn = () => {
        if (pin.length < 4) {
            toast.error("PIN must be at least 4 digits");
            return;
        }
        checkWorkDay(currentUser.id);
        // In MVP we accept any PIN and log the event
        appendEvent({
            employeeId: currentUser.id,
            eventType: "IN",
            timestampUTC: new Date().toISOString(),
            deviceId,
        });
        toast.success(`Checked in via PIN on ${deviceId}`);
        setPin("");
    };

    const handlePinCheckOut = () => {
        if (pin.length < 4) {
            toast.error("PIN must be at least 4 digits");
            return;
        }
        appendEvent({
            employeeId: currentUser.id,
            eventType: "OUT",
            timestampUTC: new Date().toISOString(),
            deviceId,
        });
        toast.success(`Checked out via PIN on ${deviceId}`);
        setPin("");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">QR Check-In Kiosk</h1>
                <p className="text-sm text-muted-foreground">Scan this QR code with NexHRMS mobile to check in</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] gap-1">
                        <Shield className="h-3 w-3" /> {deviceId || "..."}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {/* QR Code Card */}
                <Card className="border-2 border-primary/30 bg-card shadow-xl">
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">QR Code</p>
                        {/* Simulated QR Code */}
                        <div className="relative w-44 h-44 bg-white rounded-xl flex items-center justify-center border border-border/30">
                            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-0.5 p-3">
                                {Array.from({ length: 64 }).map((_, i) => (
                                    <div
                                        key={`${token}-${i}`}
                                        className="rounded-sm"
                                        style={{
                                            backgroundColor: (token.charCodeAt(i % token.length) + i) % 3 === 0 ? "#000" : "#fff",
                                        }}
                                    />
                                ))}
                            </div>
                            <QrCode className="h-10 w-10 text-primary absolute opacity-30" />
                        </div>

                        {/* Token Display */}
                        <div className="text-center space-y-1">
                            <p className="font-mono text-xl font-bold tracking-[0.3em] text-primary">{token}</p>
                            <p className="text-xs text-muted-foreground">Token refreshes automatically</p>
                        </div>

                        {/* Countdown */}
                        <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12">
                                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                                    <circle
                                        cx="28" cy="28" r="24" fill="none"
                                        stroke="currentColor" strokeWidth="3"
                                        className="text-primary transition-all duration-1000"
                                        strokeDasharray={Math.PI * 48}
                                        strokeDashoffset={Math.PI * 48 * (1 - countdown / 30)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{countdown}s</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* PIN Entry Card */}
                <Card className="border-2 border-primary/30 bg-card shadow-xl">
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">PIN Check-In/Out</p>
                        <Fingerprint className="h-12 w-12 text-primary/50" />

                        <div className="w-full space-y-3">
                            <Input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="Enter your PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                className="text-center text-2xl tracking-[0.5em] font-mono"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={handlePinCheckIn} className="gap-1.5" variant="default">
                                    Check In
                                </Button>
                                <Button onClick={handlePinCheckOut} className="gap-1.5" variant="outline">
                                    Check Out
                                </Button>
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground text-center">
                            Enter your employee PIN (min 4 digits) to clock in/out
                        </p>
                    </CardContent>
                </Card>
            </div>

            <p className="text-xs text-muted-foreground max-w-sm text-center">
                This kiosk supports QR scan and PIN-based attendance. Device: <code className="bg-muted px-1 rounded">{deviceId}</code>
            </p>
        </div>
    );
}
