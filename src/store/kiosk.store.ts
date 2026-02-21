import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KioskCheckInMethod = "qr" | "pin" | "both";
export type KioskTheme = "dark" | "midnight" | "charcoal";
export type KioskClockFormat = "12h" | "24h";
export type KioskIdleAction = "none" | "screensaver" | "dim";

export interface KioskSettings {
  // ── General ──
  kioskEnabled: boolean;
  kioskTitle: string;
  welcomeMessage: string;
  footerMessage: string;

  // ── Check-in methods ──
  checkInMethod: KioskCheckInMethod;
  allowCheckOut: boolean;

  // ── PIN settings ──
  pinLength: number; // 4-8
  maxPinAttempts: number; // 0 = unlimited
  lockoutDuration: number; // seconds, 0 = until admin unlock

  // ── QR / Token settings ──
  tokenRefreshInterval: number; // seconds 10-120
  tokenLength: number; // 6-12 chars

  // ── Display ──
  kioskTheme: KioskTheme;
  clockFormat: KioskClockFormat;
  showClock: boolean;
  showDate: boolean;
  showLogo: boolean;
  showDeviceId: boolean;
  showSecurityBadge: boolean;

  // ── Behavior ──
  feedbackDuration: number; // ms 1000-5000
  warnOffDay: boolean;
  playSound: boolean;
  idleTimeout: number; // seconds, 0 = off
  idleAction: KioskIdleAction;

  // ── Security ──
  requireGeofence: boolean;
  adminPin: string; // PIN to exit kiosk mode
}

const DEFAULT_SETTINGS: KioskSettings = {
  kioskEnabled: true,
  kioskTitle: "Attendance Kiosk",
  welcomeMessage: "Scan QR or enter your PIN",
  footerMessage: "Unauthorized access is prohibited",

  checkInMethod: "both",
  allowCheckOut: true,

  pinLength: 6,
  maxPinAttempts: 0,
  lockoutDuration: 60,

  tokenRefreshInterval: 30,
  tokenLength: 8,

  kioskTheme: "dark",
  clockFormat: "24h",
  showClock: true,
  showDate: true,
  showLogo: true,
  showDeviceId: true,
  showSecurityBadge: true,

  feedbackDuration: 1800,
  warnOffDay: true,
  playSound: false,
  idleTimeout: 0,
  idleAction: "none",

  requireGeofence: false,
  adminPin: "000000",
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface KioskStore {
  settings: KioskSettings;
  updateSettings: (patch: Partial<KioskSettings>) => void;
  resetSettings: () => void;
}

export const useKioskStore = create<KioskStore>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    { name: "nexhrms-kiosk-settings" }
  )
);
