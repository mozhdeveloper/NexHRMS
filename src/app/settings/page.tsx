"use client";

import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Building2, Shield, Bell, Palette } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const { theme, setTheme } = useAuthStore();

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences</p>
            </div>

            {/* Theme */}
            <Card className="border border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Appearance</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Theme</p>
                            <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {[
                                { value: "light" as const, icon: Sun, label: "Light" },
                                { value: "dark" as const, icon: Moon, label: "Dark" },
                                { value: "system" as const, icon: Monitor, label: "System" },
                            ].map((t) => (
                                <Button
                                    key={t.value}
                                    variant={theme === t.value ? "default" : "outline"}
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => { setTheme(t.value); toast.success(`Theme set to ${t.label}`); }}
                                >
                                    <t.icon className="h-4 w-4" />
                                    {t.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Organization (stub) */}
            <Card className="border border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Organization</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Company Name</label>
                        <Input defaultValue="NexHRMS Inc." className="mt-1.5" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Industry</label>
                        <Select defaultValue="technology">
                            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="technology">Technology</SelectItem>
                                <SelectItem value="healthcare">Healthcare</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="education">Education</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={() => toast.success("Organization settings saved")} size="sm">Save Changes</Button>
                </CardContent>
            </Card>

            {/* Roles & Permissions (stub) */}
            <Card className="border border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Roles & Permissions</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[
                            { role: "Admin", desc: "Full system access", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
                            { role: "HR", desc: "Employee management, attendance, leave", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
                            { role: "Finance", desc: "Payroll and financial data", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
                            { role: "Employee", desc: "Self-service access only", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
                        ].map((r) => (
                            <div key={r.role} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className={`text-xs ${r.color}`}>{r.role}</Badge>
                                    <span className="text-sm text-muted-foreground">{r.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Notifications (stub) */}
            <Card className="border border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Notification preferences coming soon.</p>
                </CardContent>
            </Card>
        </div>
    );
}
