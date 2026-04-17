"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Sun, Moon, Monitor, Palette, Bell, Lock, Eye, EyeOff, KeyRound,
    Smartphone, Check,
} from "lucide-react";
import { toast } from "sonner";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   EMPLOYEE VIEW — Personal Preferences Only
   Theme, notification prefs, push, password change
   ═══════════════════════════════════════════════════════════════ */

const defaultPrefs = { emailAbsenceAlerts: true, emailLeaveUpdates: true, emailPayrollAlerts: true };
function readNotifPrefs() {
    if (typeof window === "undefined") return defaultPrefs;
    try {
        const s = localStorage.getItem("sdsi-org-settings");
        if (s) {
            const p = JSON.parse(s);
            return {
                emailAbsenceAlerts: p.emailAbsenceAlerts ?? true,
                emailLeaveUpdates: p.emailLeaveUpdates ?? true,
                emailPayrollAlerts: p.emailPayrollAlerts ?? true,
            };
        }
    } catch { /* ignore */ }
    return defaultPrefs;
}

function useNotificationPrefs() {
    const [prefs, setPrefs] = useState(readNotifPrefs);
    const update = (patch: Partial<typeof prefs>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...patch };
            const stored = localStorage.getItem("sdsi-org-settings");
            const full = stored ? { ...JSON.parse(stored), ...next } : next;
            localStorage.setItem("sdsi-org-settings", JSON.stringify(full));
            return next;
        });
    };
    return { prefs, update };
}

/* ─── Section nav items ────────────────────────────────────── */
const SECTIONS = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "push", label: "Push Notifications", icon: Smartphone },
    { id: "security", label: "Security", icon: Lock },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function EmployeeSettingsView() {
    const { theme, setTheme, currentUser, changePassword } = useAuthStore();
    const { prefs, update } = useNotificationPrefs();

    const [pwOld, setPwOld] = useState("");
    const [pwNew, setPwNew] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionId>("appearance");

    const handleChangePassword = () => {
        if (pwNew.length < 6) { toast.error("Password must be at least 6 characters."); return; }
        if (pwNew !== pwConfirm) { toast.error("Passwords do not match."); return; }
        const result = changePassword(currentUser.id, pwOld, pwNew);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("Password changed successfully.");
        setPwOld(""); setPwNew(""); setPwConfirm("");
    };

    const passwordReady = pwOld.length > 0 && pwNew.length >= 6 && pwConfirm.length > 0;

    const ActiveIcon = SECTIONS.find(s => s.id === activeSection)?.icon || Palette;
    const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label || "Settings";

    return (
        <div className="w-full max-w-5xl px-4 py-8">
            {/* Page header */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your personal preferences</p>
                <Separator className="mt-4" />
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* ─── Sidebar nav ── */}
                <nav className="lg:w-48 shrink-0">
                    <ul className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                        {SECTIONS.map((s) => {
                            const Icon = s.icon;
                            const isActive = activeSection === s.id;
                            return (
                                <li key={s.id}>
                                    <button
                                        onClick={() => setActiveSection(s.id)}
                                        className={cn(
                                            "flex items-center gap-3 w-full whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-accent/50 text-foreground font-semibold"
                                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                                        {s.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* ─── Main content ─────────────────────────────────────── */}
                <div className="flex-1 min-w-0 max-w-2xl">
                    <Card className="border border-border/40 shadow-sm overflow-hidden">
                        {/* Compact Header */}
                        <div className="bg-muted/30 border-b border-border/40 px-5 py-4 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <ActiveIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">{activeLabel}</h2>
                                <p className="text-[11px] text-muted-foreground">
                                    {activeSection === "appearance" && "Choose your preferred color scheme"}
                                    {activeSection === "notifications" && "Control which alerts you receive"}
                                    {activeSection === "push" && "Receive real-time alerts on your device"}
                                    {activeSection === "security" && "Manage your account password"}
                                </p>
                            </div>
                        </div>

                        <CardContent className="p-0">
                            {/* ── Appearance ─────────────────────────────────────── */}
                            {activeSection === "appearance" && (
                                <div className="p-5">
                                    <div className="grid grid-cols-3 gap-3">
                                        {([
                                            { value: "light" as const, icon: Sun, label: "Light" },
                                            { value: "dark" as const, icon: Moon, label: "Dark" },
                                            { value: "system" as const, icon: Monitor, label: "System" },
                                        ]).map((t) => {
                                            const selected = theme === t.value;
                                            return (
                                                <button
                                                    key={t.value}
                                                    onClick={() => { setTheme(t.value); toast.success(`Theme set to ${t.label}`); }}
                                                    className={cn(
                                                        "relative flex items-center justify-center gap-2 rounded-lg border p-3 transition-all",
                                                        selected
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-border hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                                                    )}
                                                >
                                                    {selected && (
                                                        <span className="absolute top-1.5 right-1.5 rounded-full bg-primary p-0.5 text-primary-foreground hidden sm:block">
                                                            <Check className="h-2.5 w-2.5" />
                                                        </span>
                                                    )}
                                                    <t.icon className="h-4 w-4" />
                                                    <span className="text-xs font-semibold">{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Notifications ──────────────────────────────────── */}
                            {activeSection === "notifications" && (
                                <div className="divide-y divide-border/40">
                                    {([
                                        { key: "emailAbsenceAlerts" as const, label: "Absence Alerts", desc: "Get notified when you are marked absent" },
                                        { key: "emailLeaveUpdates" as const, label: "Leave Updates", desc: "Get notified when your leave request is approved or rejected" },
                                        { key: "emailPayrollAlerts" as const, label: "Payroll Alerts", desc: "Get notified when new payslips are published" },
                                    ]).map((n) => (
                                        <div key={n.key} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">{n.label}</p>
                                                <p className="text-xs text-muted-foreground">{n.desc}</p>
                                            </div>
                                            <Switch
                                                checked={prefs[n.key]}
                                                onCheckedChange={(checked) => {
                                                    update({ [n.key]: checked });
                                                    toast.success(`${n.label} ${checked ? "enabled" : "disabled"}`);
                                                }}
                                                className="scale-90 data-[state=checked]:bg-primary"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Push Notifications ─────────────────────────────── */}
                            {activeSection === "push" && (
                                <div className="p-5">
                                    <PushNotificationPrompt variant="inline" className="w-full" />
                                    <p className="text-[11px] text-muted-foreground mt-2 px-1">
                                        Enable push notifications to receive instant alerts even when the app is closed.
                                    </p>
                                </div>
                            )}

                            {/* ── Security ───────────────────────────────────────── */}
                            {activeSection === "security" && (
                                <div className="p-5 grid gap-4">
                                    {/* Current password */}
                                    <div className="space-y-1">
                                        <label htmlFor="pw-old" className="text-xs font-medium">Current Password</label>
                                        <div className="relative">
                                            <Input
                                                id="pw-old"
                                                type={showOld ? "text" : "password"}
                                                value={pwOld}
                                                onChange={(e) => setPwOld(e.target.value)}
                                                placeholder="Enter current password"
                                                autoComplete="current-password"
                                                className="h-9 text-sm pr-9"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowOld((v) => !v)}
                                                tabIndex={-1}
                                            >
                                                {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Separator className="my-1" />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* New password */}
                                        <div className="space-y-1">
                                            <label htmlFor="pw-new" className="text-xs font-medium">New Password</label>
                                            <div className="relative">
                                                <Input
                                                    id="pw-new"
                                                    type={showNew ? "text" : "password"}
                                                    value={pwNew}
                                                    onChange={(e) => setPwNew(e.target.value)}
                                                    placeholder="Min. 6 chars"
                                                    autoComplete="new-password"
                                                    className="h-9 text-sm pr-9"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowNew((v) => !v)}
                                                    tabIndex={-1}
                                                >
                                                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                            {pwNew.length > 0 && pwNew.length < 6 && (
                                                <p className="text-[10px] text-destructive">Must be at least 6 characters</p>
                                            )}
                                        </div>

                                        {/* Confirm password */}
                                        <div className="space-y-1">
                                            <label htmlFor="pw-confirm" className="text-xs font-medium">Confirm Password</label>
                                            <Input
                                                id="pw-confirm"
                                                type="password"
                                                value={pwConfirm}
                                                onChange={(e) => setPwConfirm(e.target.value)}
                                                placeholder="Re-enter password"
                                                autoComplete="new-password"
                                                className="h-9 text-sm"
                                            />
                                            {pwConfirm.length > 0 && pwNew !== pwConfirm && (
                                                <p className="text-[10px] text-destructive">Passwords do not match</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            onClick={handleChangePassword}
                                            disabled={!passwordReady}
                                            className="w-full sm:w-auto h-9 text-xs px-5 shadow-sm"
                                        >
                                            <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Update Password
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
