"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanFace, CheckCircle, Camera, CameraOff } from "lucide-react";

interface FaceRecognitionSimulatorProps {
    onVerified: () => void;
    disabled?: boolean;
}

export function FaceRecognitionSimulator({ onVerified, disabled }: FaceRecognitionSimulatorProps) {
    const [phase, setPhase] = useState<"idle" | "camera" | "scanning" | "verified">("idle");
    const [countdown, setCountdown] = useState(3);
    const [cameraError, setCameraError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Start camera stream
    const startCamera = useCallback(async () => {
        setCameraError(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setPhase("camera");
        } catch {
            // If camera access denied, fall back to simulated viewfinder
            setCameraError(true);
            setPhase("camera");
        }
    }, []);

    // Stop camera stream on unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const startScan = useCallback(() => {
        setPhase("scanning");
        setCountdown(3);
    }, []);

    useEffect(() => {
        if (phase !== "scanning") return;
        if (countdown <= 0) {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            setPhase("verified");
            onVerified();
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [phase, countdown, onVerified]);

    // ── Verified ─────────────────────────────────────────────────
    if (phase === "verified") {
        return (
            <Card className="border border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-6 flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Face Verified ✅</p>
                    <p className="text-xs text-muted-foreground">Identity confirmed (simulated)</p>
                </CardContent>
            </Card>
        );
    }

    // ── Camera / Scanning ─────────────────────────────────────────
    if (phase === "camera" || phase === "scanning") {
        return (
            <Card className="border border-border/50 overflow-hidden">
                <CardContent className="p-0">
                    {/* Camera viewfinder */}
                    <div className="relative w-full bg-black" style={{ aspectRatio: "4/3" }}>
                        {!cameraError ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover mirror"
                                style={{ transform: "scaleX(-1)" }}
                            />
                        ) : (
                            // Simulated viewfinder when camera not available
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800">
                                <ScanFace className="h-20 w-20 text-neutral-600" />
                            </div>
                        )}

                        {/* Face tracking overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Face oval guide */}
                            <div className={`relative w-32 h-40 rounded-full border-2 transition-colors duration-500
                ${phase === "scanning" ? "border-emerald-400" : "border-white/50"}`}>
                                {/* Corner accents */}
                                {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => (
                                    <div
                                        key={corner}
                                        className={`absolute w-5 h-5 border-2 transition-colors duration-300
                      ${corner.includes("top") ? "top-0" : "bottom-0"}
                      ${corner.includes("left") ? "left-0" : "right-0"}
                      ${corner.includes("top") && corner.includes("left") ? "border-t-2 border-l-2 rounded-tl" : ""}
                      ${corner.includes("top") && corner.includes("right") ? "border-t-2 border-r-2 rounded-tr" : ""}
                      ${corner.includes("bottom") && corner.includes("left") ? "border-b-2 border-l-2 rounded-bl" : ""}
                      ${corner.includes("bottom") && corner.includes("right") ? "border-b-2 border-r-2 rounded-br" : ""}
                      ${phase === "scanning" ? "border-emerald-400" : "border-white/70"}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Scanning sweep animation */}
                        {phase === "scanning" && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute left-0 right-0 h-0.5 bg-emerald-400/60 animate-bounce"
                                    style={{ animation: "scanSweep 1s ease-in-out infinite" }} />
                            </div>
                        )}

                        {/* Countdown overlay */}
                        {phase === "scanning" && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-white text-sm font-medium">Scanning... {countdown}s</span>
                                </div>
                            </div>
                        )}

                        {/* Ready overlay */}
                        {phase === "camera" && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5">
                                    <span className="text-white/80 text-xs">Position your face in the oval</span>
                                </div>
                            </div>
                        )}

                        {/* Camera denied badge */}
                        {cameraError && (
                            <div className="absolute top-3 left-3">
                                <div className="flex items-center gap-1 bg-amber-500/80 backdrop-blur-sm rounded px-2 py-1">
                                    <CameraOff className="h-3 w-3 text-white" />
                                    <span className="text-white text-[10px] font-medium">Simulated camera</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-4 flex flex-col items-center gap-2">
                        {phase === "camera" && (
                            <Button onClick={startScan} className="w-full gap-1.5" size="sm">
                                <ScanFace className="h-4 w-4" /> Scan My Face
                            </Button>
                        )}
                        {phase === "scanning" && (
                            <p className="text-xs text-muted-foreground">Please hold still...</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ── Idle ──────────────────────────────────────────────────────
    return (
        <Card className="border border-border/50">
            <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Face Recognition</p>
                <p className="text-xs text-muted-foreground text-center">
                    Verify your identity to proceed with check-in
                </p>
                <Button onClick={startCamera} disabled={disabled} className="gap-1.5 mt-1">
                    <Camera className="h-4 w-4" /> Open Camera
                </Button>
            </CardContent>
        </Card>
    );
}
