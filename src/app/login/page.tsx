"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";

const DEMO_ACCOUNTS = [
    { role: "Admin", email: "admin@nexhrms.com", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    { role: "HR", email: "hr@nexhrms.com", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
    { role: "Finance", email: "finance@nexhrms.com", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    { role: "Employee", email: "employee@nexhrms.com", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
    { role: "Supervisor", email: "supervisor@nexhrms.com", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
    { role: "Payroll", email: "payroll@nexhrms.com", color: "bg-teal-500/15 text-teal-700 dark:text-teal-400" },
    { role: "Auditor", email: "auditor@nexhrms.com", color: "bg-slate-500/15 text-slate-700 dark:text-slate-400" },
];

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((s) => s.login);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            const success = login(email, password);
            if (success) {
                toast.success("Welcome back!");
                router.push("/dashboard");
            } else {
                toast.error("Invalid email or password");
            }
            setLoading(false);
        }, 500);
    };

    const handleQuickLogin = (demoEmail: string) => {
        setLoading(true);
        setTimeout(() => {
            const success = login(demoEmail, "demo1234");
            if (success) {
                toast.success("Welcome back!");
                router.push("/dashboard");
            } else {
                toast.error("Login failed");
            }
            setLoading(false);
        }, 400);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] bg-[size:60px_60px] dark:bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)]" />

            <Card className="relative w-full max-w-md border border-border/50 shadow-2xl shadow-black/5 dark:shadow-black/30">
                <CardHeader className="text-center space-y-4 pb-2">
                    <div className="flex justify-center">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Image src="/logo.svg" alt="NexHRMS" width={32} height={32} />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight">NexHRMS</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sign in to your account to continue
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="admin@nexhrms.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1.5"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1.5"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-3 text-muted-foreground">Quick Demo Login</span>
                        </div>
                    </div>

                    {/* Quick Login Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                        {DEMO_ACCOUNTS.map((acc) => (
                            <Button
                                key={acc.role}
                                variant="outline"
                                size="sm"
                                className="h-auto py-2.5 px-3 justify-start gap-2"
                                disabled={loading}
                                onClick={() => handleQuickLogin(acc.email)}
                            >
                                <Badge variant="secondary" className={`text-[10px] ${acc.color} shrink-0`}>
                                    {acc.role}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate">{acc.email}</span>
                            </Button>
                        ))}
                    </div>

                    {/* Demo hint */}
                    <p className="text-[11px] text-muted-foreground text-center">
                        Password for all demo accounts: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">demo1234</code>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
