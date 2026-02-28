"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { User, Lock, ChevronRight, CheckCircle2 } from "lucide-react";

interface FormState {
    phone: string;
    department: string;
    birthday: string;
    address: string;
    emergencyContact: string;
    newPassword: string;
    confirmPassword: string;
}

export function OnboardingModal() {
    const { currentUser, isAuthenticated, completeOnboarding } = useAuthStore();

    const needsOnboarding =
        isAuthenticated &&
        currentUser &&
        (currentUser.mustChangePassword || !currentUser.profileComplete);

    // If profile is already complete (set by admin), skip straight to password step.
    const profileAlreadyComplete = !!currentUser?.profileComplete;
    const [open, setOpen] = useState(true);
    const [step, setStep] = useState(profileAlreadyComplete ? 1 : 0);
    const totalSteps = profileAlreadyComplete ? 1 : 2;
    const [form, setForm] = useState<FormState>({
        phone: currentUser?.phone ?? "",
        department: currentUser?.department ?? "",
        birthday: currentUser?.birthday ?? "",
        address: currentUser?.address ?? "",
        emergencyContact: currentUser?.emergencyContact ?? "",
        newPassword: "",
        confirmPassword: "",
    });

    if (!needsOnboarding || !open) return null;

    const displayStep = profileAlreadyComplete ? 1 : step + 1;
    const progress = (displayStep / totalSteps) * 100;

    const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleNext = () => {
        if (step === 0) {
            if (!form.phone || !form.department) {
                toast.error("Phone and department are required.");
                return;
            }
            setStep(1);
        }
    };

    const handleFinish = () => {
        if (!form.newPassword) {
            toast.error("Please set a new password.");
            return;
        }
        if (form.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        completeOnboarding(
            currentUser.id,
            {
                phone: form.phone,
                department: form.department,
                birthday: form.birthday,
                address: form.address,
                emergencyContact: form.emergencyContact,
            },
            form.newPassword
        );
        toast.success("Welcome! Your profile and password have been saved.");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                className="sm:max-w-md"
                // Block accidental dismissal via outside-click or Escape;
                // the X button still works via onOpenChange above.
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                            Step {displayStep} of {totalSteps}
                        </Badge>
                    </div>
                    <DialogTitle className="text-xl">
                        {step === 0 ? "Complete Your Profile" : "Set Your Password"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 0
                            ? "Please fill in your personal information before continuing."
                            : "You must set a new secure password for your account."}
                    </DialogDescription>
                </DialogHeader>

                <Progress value={progress} className="h-1.5 mb-4" />

                {step === 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{currentUser.name}</p>
                                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-sm font-medium">Phone Number *</label>
                                <Input
                                    placeholder="+63 9XX XXX XXXX"
                                    value={form.phone}
                                    onChange={handleChange("phone")}
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-sm font-medium">Department *</label>
                                <Input
                                    placeholder="e.g. Engineering"
                                    value={form.department}
                                    onChange={handleChange("department")}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Birthday</label>
                                <Input
                                    type="date"
                                    value={form.birthday}
                                    onChange={handleChange("birthday")}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Emergency Contact</label>
                                <Input
                                    placeholder="Name & number"
                                    value={form.emergencyContact}
                                    onChange={handleChange("emergencyContact")}
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-sm font-medium">Address</label>
                                <Input
                                    placeholder="Street, City, Province"
                                    value={form.address}
                                    onChange={handleChange("address")}
                                />
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleNext}>
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mb-2">
                            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Your account requires a password change. Choose a strong password with at least 6 characters.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">New Password *</label>
                                <Input
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={form.newPassword}
                                    onChange={handleChange("newPassword")}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Confirm Password *</label>
                                <Input
                                    type="password"
                                    placeholder="Re-enter your password"
                                    value={form.confirmPassword}
                                    onChange={handleChange("confirmPassword")}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {!profileAlreadyComplete && (
                                <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                                    Back
                                </Button>
                            )}
                            <Button className="flex-1" onClick={handleFinish}>
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Finish Setup
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
