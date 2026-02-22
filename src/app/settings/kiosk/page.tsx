"use client";

import { useState } from "react";
import { useKioskStore } from "@/store/kiosk.store";
import type { KioskCheckInMethod, KioskTheme, KioskClockFormat, KioskIdleAction } from "@/store/kiosk.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Monitor, QrCode, KeyRound, Shield, Clock3, Eye, EyeOff,
    RotateCcw, Save, ArrowLeft, Fingerprint, Bell, Lock,
    Palette, Layout, Timer, Volume2, MapPin, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, description, children }: {
    icon: React.ElementType; title: string; description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">{children}</CardContent>
        </Card>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function SliderRow({ label, hint, value, min, max, step, unit, onChange }: {
    label: string; hint?: string; value: number; min: number; max: number;
    step: number; unit: string; onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium">{label}</p>
                    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
                </div>
                <Badge variant="secondary" className="tabular-nums text-xs">{value}{unit}</Badge>
            </div>
            <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="w-full" />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KioskSettingsPage() {
    const { settings, updateSettings, resetSettings } = useKioskStore();
    const [resetOpen, setResetOpen] = useState(false);
    const [showAdminPin, setShowAdminPin] = useState(false);

    const s = settings;
    const u = updateSettings;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Kiosk Settings</h1>
                        <p className="text-sm text-muted-foreground">Customize the attendance kiosk appearance and behavior</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/kiosk" target="_blank">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" /> Preview Kiosk
                        </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setResetOpen(true)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                </div>
            </div>

            {/* ── General ── */}
            <Section icon={Monitor} title="General" description="Basic kiosk info and messaging">
                <Row label="Kiosk Enabled" hint="Toggle the kiosk on or off">
                    <Switch checked={s.kioskEnabled} onCheckedChange={(v) => u({ kioskEnabled: v })} />
                </Row>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">Kiosk Title</p>
                    <Input value={s.kioskTitle} onChange={(e) => u({ kioskTitle: e.target.value })} placeholder="Attendance Kiosk" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">Welcome Message</p>
                    <p className="text-xs text-muted-foreground">Displayed under QR and PIN panels</p>
                    <Input value={s.welcomeMessage} onChange={(e) => u({ welcomeMessage: e.target.value })} placeholder="Scan QR or enter your PIN" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">Footer Message</p>
                    <Textarea value={s.footerMessage} onChange={(e) => u({ footerMessage: e.target.value })} rows={2} placeholder="Unauthorized access is prohibited" />
                </div>
            </Section>

            {/* ── Check-in Methods ── */}
            <Section icon={Fingerprint} title="Check-in Methods" description="Choose which methods are available on the kiosk">
                <Row label="Methods" hint="QR scan, PIN entry, or both">
                    <Select value={s.checkInMethod} onValueChange={(v: KioskCheckInMethod) => u({ checkInMethod: v })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">QR + PIN</SelectItem>
                            <SelectItem value="qr">QR Only</SelectItem>
                            <SelectItem value="pin">PIN Only</SelectItem>
                        </SelectContent>
                    </Select>
                </Row>
                <Row label="Allow Check-Out" hint="If off, kiosk only records check-ins">
                    <Switch checked={s.allowCheckOut} onCheckedChange={(v) => u({ allowCheckOut: v })} />
                </Row>
            </Section>

            {/* ── PIN Configuration ── */}
            <Section icon={KeyRound} title="PIN Configuration" description="Employee PIN length and security">
                <SliderRow label="PIN Length" hint="Maximum digits employees can enter"
                    value={s.pinLength} min={4} max={8} step={1} unit=" digits" onChange={(v) => u({ pinLength: v })} />
                <SliderRow label="Max Failed Attempts" hint="0 = unlimited"
                    value={s.maxPinAttempts} min={0} max={10} step={1} unit="" onChange={(v) => u({ maxPinAttempts: v })} />
                {s.maxPinAttempts > 0 && (
                    <SliderRow label="Lockout Duration" hint="Seconds before trying again"
                        value={s.lockoutDuration} min={10} max={600} step={10} unit="s" onChange={(v) => u({ lockoutDuration: v })} />
                )}
            </Section>

            {/* ── QR / Token ── */}
            <Section icon={QrCode} title="QR & Token" description="Token generation and refresh timing">
                <SliderRow label="Refresh Interval" hint="How often the QR code refreshes"
                    value={s.tokenRefreshInterval} min={10} max={120} step={5} unit="s" onChange={(v) => u({ tokenRefreshInterval: v })} />
                <SliderRow label="Token Length" hint="Number of characters in the token"
                    value={s.tokenLength} min={6} max={12} step={1} unit=" chars" onChange={(v) => u({ tokenLength: v })} />
            </Section>

            {/* ── Display ── */}
            <Section icon={Palette} title="Display & Appearance" description="Visual customization for the kiosk screen">
                <Row label="Theme" hint="Background style of the kiosk">
                    <Select value={s.kioskTheme} onValueChange={(v: KioskTheme) => u({ kioskTheme: v })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dark">Dark (Zinc 950)</SelectItem>
                            <SelectItem value="midnight">Midnight (Blue)</SelectItem>
                            <SelectItem value="charcoal">Charcoal (Gray)</SelectItem>
                        </SelectContent>
                    </Select>
                </Row>
                <Row label="Clock Format" hint="12-hour or 24-hour">
                    <Select value={s.clockFormat} onValueChange={(v: KioskClockFormat) => u({ clockFormat: v })}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">24-hour</SelectItem>
                            <SelectItem value="12h">12-hour</SelectItem>
                        </SelectContent>
                    </Select>
                </Row>
                <Row label="Show Clock" hint="Display the live clock on screen">
                    <Switch checked={s.showClock} onCheckedChange={(v) => u({ showClock: v })} />
                </Row>
                <Row label="Show Date" hint="Display the current date">
                    <Switch checked={s.showDate} onCheckedChange={(v) => u({ showDate: v })} />
                </Row>
                <Row label="Show Logo" hint="Display company logo in the header">
                    <Switch checked={s.showLogo} onCheckedChange={(v) => u({ showLogo: v })} />
                </Row>
                <Row label="Show Device ID" hint="Display device identifier badge">
                    <Switch checked={s.showDeviceId} onCheckedChange={(v) => u({ showDeviceId: v })} />
                </Row>
                <Row label="Security Badge" hint="Show shield icon on footer">
                    <Switch checked={s.showSecurityBadge} onCheckedChange={(v) => u({ showSecurityBadge: v })} />
                </Row>
            </Section>

            {/* ── Behavior ── */}
            <Section icon={Timer} title="Behavior" description="Feedback timing, sounds, and idle options">
                <SliderRow label="Feedback Duration" hint="How long success/error feedback shows"
                    value={s.feedbackDuration} min={1000} max={5000} step={200} unit="ms" onChange={(v) => u({ feedbackDuration: v })} />
                <Row label="Warn on Off-Days" hint="Show warning if clocking in outside scheduled days">
                    <Switch checked={s.warnOffDay} onCheckedChange={(v) => u({ warnOffDay: v })} />
                </Row>
                <Row label="Play Sound" hint="Audible feedback on check-in/out">
                    <Switch checked={s.playSound} onCheckedChange={(v) => u({ playSound: v })} />
                </Row>
                <SliderRow label="Idle Timeout" hint="Seconds before idle action triggers (0 = off)"
                    value={s.idleTimeout} min={0} max={300} step={15} unit="s" onChange={(v) => u({ idleTimeout: v })} />
                {s.idleTimeout > 0 && (
                    <Row label="Idle Action" hint="What happens when kiosk is idle">
                        <Select value={s.idleAction} onValueChange={(v: KioskIdleAction) => u({ idleAction: v })}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="screensaver">Screensaver</SelectItem>
                                <SelectItem value="dim">Dim Screen</SelectItem>
                                <SelectItem value="none">Do Nothing</SelectItem>
                            </SelectContent>
                        </Select>
                    </Row>
                )}
            </Section>

            {/* ── Security ── */}
            <Section icon={Lock} title="Security" description="Access control and geofencing">
                <Row label="Require Geofence" hint="Only accept check-ins within approved locations">
                    <Switch checked={s.requireGeofence} onCheckedChange={(v) => u({ requireGeofence: v })} />
                </Row>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Admin Exit PIN</p>
                            <p className="text-xs text-muted-foreground">Required to exit kiosk mode</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAdminPin(!showAdminPin)}>
                            {showAdminPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <Input
                        type={showAdminPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        value={s.adminPin}
                        onChange={(e) => u({ adminPin: e.target.value.replace(/\D/g, "") })}
                        className="font-mono tracking-[0.3em] w-48"
                    />
                    <p className="text-[10px] text-muted-foreground">This PIN is used to unlock the kiosk for admin configuration. Keep it secure.</p>
                </div>
            </Section>

            {/* ── Selfie & Photo ── */}
            <Section icon={MapPin} title="Selfie & Photo" description="Photo capture during kiosk check-in">
                <Row label="Enable Selfie Capture" hint="Allow camera selfie during kiosk check-in">
                    <Switch checked={s.selfieEnabled} onCheckedChange={(v) => u({ selfieEnabled: v })} />
                </Row>
                <Row label="Require Selfie" hint="Block check-in if selfie is not captured">
                    <Switch checked={s.selfieRequired} onCheckedChange={(v) => u({ selfieRequired: v })} disabled={!s.selfieEnabled} />
                </Row>
                <p className="text-[10px] text-muted-foreground">
                    When enabled, employees checking in via kiosk will be prompted to take a selfie. Photos are stored with GPS coordinates for site verification.
                    Configure additional selfie settings (quality, retention) in <span className="font-medium text-foreground">Settings &rarr; Location & GPS</span>.
                </p>
            </Section>

            {/* ── Quick reference ── */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Layout className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Quick Reference</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">Kiosk URL:</span> /kiosk</p>
                        <p><span className="font-medium text-foreground">Status:</span>{" "}
                            <Badge variant={s.kioskEnabled ? "default" : "secondary"} className="text-[10px] ml-1">
                                {s.kioskEnabled ? "Active" : "Disabled"}
                            </Badge>
                        </p>
                        <p><span className="font-medium text-foreground">Check-in:</span> {s.checkInMethod === "both" ? "QR + PIN" : s.checkInMethod === "qr" ? "QR Only" : "PIN Only"}</p>
                        <p><span className="font-medium text-foreground">PIN length:</span> {s.pinLength} digits</p>
                        <p><span className="font-medium text-foreground">Token refresh:</span> every {s.tokenRefreshInterval}s</p>
                        <p><span className="font-medium text-foreground">Feedback:</span> {s.feedbackDuration}ms</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">
                        Tip: Open the kiosk in a separate browser window in fullscreen mode (F11) for the best experience.
                        Use the admin PIN to exit kiosk lock if needed.
                    </p>
                </CardContent>
            </Card>

            {/* Reset dialog */}
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Kiosk Settings</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will restore all kiosk settings to their defaults. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { resetSettings(); toast.success("Kiosk settings reset to defaults."); }}>
                            Reset All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
