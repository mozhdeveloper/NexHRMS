/**
 * Unit tests for the Location store — Features A, B, C
 *
 * Feature A: Site Survey Photo & Location Selfie
 * Feature B: Lunch Break Geofence Enforcement
 * Feature C: Continuous Location Tracking (pings)
 */
import { useLocationStore } from "@/store/location.store";

const resetStore = () => {
    useLocationStore.getState().resetToSeed();
};

beforeEach(resetStore);

// ═══════════════════════════════════════════════════════════════
// Feature A — Site Survey Photos
// ═══════════════════════════════════════════════════════════════

describe("Feature A — Site Survey Photos", () => {
    const PHOTO_DATA = {
        eventId: "EVT-001",
        employeeId: "EMP-001",
        photoDataUrl: "data:image/jpeg;base64,/9j/mock",
        gpsLat: 14.5995,
        gpsLng: 120.9842,
        gpsAccuracyMeters: 12,
        capturedAt: new Date().toISOString(),
        geofencePass: true,
        projectId: "PROJ-001",
    };

    describe("addPhoto", () => {
        it("creates a photo with PHOTO- prefixed ID", () => {
            const id = useLocationStore.getState().addPhoto(PHOTO_DATA);
            expect(id).toMatch(/^PHOTO-/);
        });

        it("stores the photo in state", () => {
            useLocationStore.getState().addPhoto(PHOTO_DATA);
            const photos = useLocationStore.getState().photos;
            expect(photos).toHaveLength(1);
            expect(photos[0].employeeId).toBe("EMP-001");
            expect(photos[0].gpsLat).toBe(14.5995);
            expect(photos[0].gpsLng).toBe(120.9842);
        });

        it("stores multiple photos for different employees", () => {
            useLocationStore.getState().addPhoto(PHOTO_DATA);
            useLocationStore.getState().addPhoto({ ...PHOTO_DATA, employeeId: "EMP-002" });
            expect(useLocationStore.getState().photos).toHaveLength(2);
        });

        it("newest photo appears first (prepend order)", () => {
            useLocationStore.getState().addPhoto({ ...PHOTO_DATA, gpsLat: 10 });
            useLocationStore.getState().addPhoto({ ...PHOTO_DATA, gpsLat: 20 });
            const photos = useLocationStore.getState().photos;
            expect(photos[0].gpsLat).toBe(20); // newest first
            expect(photos[1].gpsLat).toBe(10);
        });

        it("preserves geofencePass and projectId", () => {
            useLocationStore.getState().addPhoto(PHOTO_DATA);
            const photo = useLocationStore.getState().photos[0];
            expect(photo.geofencePass).toBe(true);
            expect(photo.projectId).toBe("PROJ-001");
        });
    });

    describe("getPhotos", () => {
        it("returns all photos when no employeeId filter", () => {
            useLocationStore.getState().addPhoto(PHOTO_DATA);
            useLocationStore.getState().addPhoto({ ...PHOTO_DATA, employeeId: "EMP-002" });
            expect(useLocationStore.getState().getPhotos()).toHaveLength(2);
        });

        it("filters by employeeId", () => {
            useLocationStore.getState().addPhoto(PHOTO_DATA);
            useLocationStore.getState().addPhoto({ ...PHOTO_DATA, employeeId: "EMP-002" });
            const emp1Photos = useLocationStore.getState().getPhotos("EMP-001");
            expect(emp1Photos).toHaveLength(1);
            expect(emp1Photos[0].employeeId).toBe("EMP-001");
        });

        it("returns empty array for unknown employee", () => {
            useLocationStore.getState().addPhoto(PHOTO_DATA);
            expect(useLocationStore.getState().getPhotos("EMP-999")).toHaveLength(0);
        });
    });

    describe("purgeOldPhotos — max 100 limit", () => {
        it("keeps only 100 photos when limit exceeded", () => {
            // Add 105 photos
            for (let i = 0; i < 105; i++) {
                useLocationStore.getState().addPhoto({ ...PHOTO_DATA, eventId: `EVT-${i}` });
            }
            expect(useLocationStore.getState().photos.length).toBeLessThanOrEqual(100);
        });

        it("purgeOldPhotos trims to max", () => {
            // Manually push photos beyond limit
            const photos = Array.from({ length: 110 }, (_, i) => ({
                ...PHOTO_DATA,
                id: `PHOTO-${i}`,
                eventId: `EVT-${i}`,
            }));
            useLocationStore.setState({ photos });
            useLocationStore.getState().purgeOldPhotos();
            expect(useLocationStore.getState().photos).toHaveLength(100);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Feature B — Lunch Break Geofence Enforcement
// ═══════════════════════════════════════════════════════════════

describe("Feature B — Lunch Break Geofence", () => {
    describe("startBreak", () => {
        it("creates a break record with BRK- prefixed ID", () => {
            const id = useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
                lat: 14.5995,
                lng: 120.9842,
            });
            expect(id).toMatch(/^BRK-/);
        });

        it("records the break with today's date", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            const breaks = useLocationStore.getState().breaks;
            expect(breaks).toHaveLength(1);
            expect(breaks[0].date).toBe(new Date().toISOString().split("T")[0]);
            expect(breaks[0].breakType).toBe("lunch");
            expect(breaks[0].endTime).toBeUndefined();
        });

        it("captures start GPS coordinates", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
                lat: 14.5995,
                lng: 120.9842,
            });
            const b = useLocationStore.getState().breaks[0];
            expect(b.startLat).toBe(14.5995);
            expect(b.startLng).toBe(120.9842);
        });

        it("supports 'other' break type", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "other",
            });
            expect(useLocationStore.getState().breaks[0].breakType).toBe("other");
        });
    });

    describe("endBreak", () => {
        it("sets endTime, endLat, endLng, and duration", () => {
            const id = useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            useLocationStore.getState().endBreak(id, {
                lat: 14.5540,
                lng: 120.9930,
                geofencePass: true,
                distanceFromSite: 150,
            });
            const b = useLocationStore.getState().breaks[0];
            expect(b.endTime).toBeDefined();
            expect(b.endLat).toBe(14.5540);
            expect(b.endLng).toBe(120.9930);
            expect(b.endGeofencePass).toBe(true);
            expect(b.distanceFromSite).toBe(150);
            expect(b.duration).toBeDefined();
            expect(typeof b.duration).toBe("number");
        });

        it("marks overtime=false when duration is within limits", () => {
            // Default: lunchDuration=60, lunchOvertimeThreshold=5
            // So overtime triggers at >65 min. A quick break won't trigger it.
            const id = useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            useLocationStore.getState().endBreak(id, { geofencePass: true });
            const b = useLocationStore.getState().breaks[0];
            // Duration should be 0 or very small since start and end are nearly simultaneous
            expect(b.overtime).toBe(false);
        });

        it("records geofencePass=false when employee is outside fence", () => {
            const id = useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            useLocationStore.getState().endBreak(id, {
                lat: 14.0,
                lng: 120.0,
                geofencePass: false,
                distanceFromSite: 5000,
            });
            const b = useLocationStore.getState().breaks[0];
            expect(b.endGeofencePass).toBe(false);
            expect(b.distanceFromSite).toBe(5000);
        });

        it("does not end an already-ended break", () => {
            const id = useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            useLocationStore.getState().endBreak(id, { geofencePass: true });
            const firstEndTime = useLocationStore.getState().breaks[0].endTime;

            // Try ending again — should not change
            useLocationStore.getState().endBreak(id, { geofencePass: false });
            expect(useLocationStore.getState().breaks[0].endTime).toBe(firstEndTime);
            expect(useLocationStore.getState().breaks[0].endGeofencePass).toBe(true);
        });
    });

    describe("getActiveBreak", () => {
        it("returns undefined when no active break", () => {
            expect(useLocationStore.getState().getActiveBreak("EMP-001")).toBeUndefined();
        });

        it("returns the active (unended) break", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            const active = useLocationStore.getState().getActiveBreak("EMP-001");
            expect(active).toBeDefined();
            expect(active!.endTime).toBeUndefined();
        });

        it("returns undefined after break is ended", () => {
            const id = useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            useLocationStore.getState().endBreak(id, { geofencePass: true });
            expect(useLocationStore.getState().getActiveBreak("EMP-001")).toBeUndefined();
        });
    });

    describe("getBreaksToday", () => {
        it("returns only today's breaks for the employee", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            const today = useLocationStore.getState().getBreaksToday("EMP-001");
            expect(today).toHaveLength(1);
        });

        it("returns empty for a different employee", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            expect(useLocationStore.getState().getBreaksToday("EMP-002")).toHaveLength(0);
        });
    });

    describe("getBreaks (by employee + optional date)", () => {
        it("returns all breaks for an employee across all dates", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            const breaks = useLocationStore.getState().getBreaks("EMP-001");
            expect(breaks).toHaveLength(1);
        });

        it("filters by specific date", () => {
            useLocationStore.getState().startBreak({
                employeeId: "EMP-001",
                breakType: "lunch",
            });
            const today = new Date().toISOString().split("T")[0];
            const breaks = useLocationStore.getState().getBreaks("EMP-001", today);
            expect(breaks).toHaveLength(1);

            const breaks2 = useLocationStore.getState().getBreaks("EMP-001", "2020-01-01");
            expect(breaks2).toHaveLength(0);
        });
    });

    describe("allowedBreaksPerDay enforcement (config)", () => {
        it("config defaults to 1 break per day", () => {
            expect(useLocationStore.getState().config.allowedBreaksPerDay).toBe(1);
        });

        it("admin can increase allowed breaks via updateConfig", () => {
            useLocationStore.getState().updateConfig({ allowedBreaksPerDay: 3 });
            expect(useLocationStore.getState().config.allowedBreaksPerDay).toBe(3);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Feature C — Continuous Location Tracking (Pings)
// ═══════════════════════════════════════════════════════════════

describe("Feature C — Continuous Location Tracking", () => {
    describe("addPing", () => {
        it("creates a ping with PING- prefixed ID", () => {
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: new Date().toISOString(),
                lat: 14.5995,
                lng: 120.9842,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            const pings = useLocationStore.getState().pings;
            expect(pings).toHaveLength(1);
            expect(pings[0].id).toMatch(/^PING-/);
        });

        it("stores all ping data correctly", () => {
            const ts = new Date().toISOString();
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: ts,
                lat: 14.5995,
                lng: 120.9842,
                accuracyMeters: 10,
                withinGeofence: true,
                projectId: "PROJ-001",
                distanceFromSite: 50,
                source: "auto",
            });
            const p = useLocationStore.getState().pings[0];
            expect(p.employeeId).toBe("EMP-001");
            expect(p.lat).toBe(14.5995);
            expect(p.lng).toBe(120.9842);
            expect(p.accuracyMeters).toBe(10);
            expect(p.withinGeofence).toBe(true);
            expect(p.projectId).toBe("PROJ-001");
            expect(p.distanceFromSite).toBe(50);
            expect(p.source).toBe("auto");
        });

        it("stores out-of-geofence pings", () => {
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: new Date().toISOString(),
                lat: 14.0,
                lng: 120.0,
                accuracyMeters: 50,
                withinGeofence: false,
                distanceFromSite: 5000,
                source: "auto",
            });
            expect(useLocationStore.getState().pings[0].withinGeofence).toBe(false);
        });

        it("supports different ping sources", () => {
            const base = {
                employeeId: "EMP-001",
                timestamp: new Date().toISOString(),
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
            };
            useLocationStore.getState().addPing({ ...base, source: "auto" });
            useLocationStore.getState().addPing({ ...base, source: "manual" });
            useLocationStore.getState().addPing({ ...base, source: "break_end" });
            const sources = useLocationStore.getState().pings.map((p) => p.source);
            expect(sources).toContain("auto");
            expect(sources).toContain("manual");
            expect(sources).toContain("break_end");
        });
    });

    describe("getPings", () => {
        it("returns all pings for an employee", () => {
            const base = {
                employeeId: "EMP-001",
                timestamp: "2026-02-22T10:00:00.000Z",
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto" as const,
            };
            useLocationStore.getState().addPing(base);
            useLocationStore.getState().addPing({ ...base, timestamp: "2026-02-22T10:10:00.000Z" });
            expect(useLocationStore.getState().getPings("EMP-001")).toHaveLength(2);
        });

        it("filters by date when provided", () => {
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: "2026-02-22T10:00:00.000Z",
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: "2026-02-21T10:00:00.000Z",
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            expect(useLocationStore.getState().getPings("EMP-001", "2026-02-22")).toHaveLength(1);
            expect(useLocationStore.getState().getPings("EMP-001", "2026-02-21")).toHaveLength(1);
            expect(useLocationStore.getState().getPings("EMP-001", "2026-01-01")).toHaveLength(0);
        });

        it("returns empty for unknown employee", () => {
            expect(useLocationStore.getState().getPings("EMP-999")).toHaveLength(0);
        });
    });

    describe("purgeOldPings", () => {
        it("removes pings older than retainDays", () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60); // 60 days ago (beyond 30 day default)
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: oldDate.toISOString(),
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: new Date().toISOString(),
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            expect(useLocationStore.getState().pings).toHaveLength(2);

            useLocationStore.getState().purgeOldPings();
            const remaining = useLocationStore.getState().pings;
            expect(remaining).toHaveLength(1);
            // Only the recent ping should survive
            expect(new Date(remaining[0].timestamp).getTime()).toBeGreaterThan(Date.now() - 86400000);
        });

        it("keeps all pings when none are expired", () => {
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: new Date().toISOString(),
                lat: 14.5,
                lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            useLocationStore.getState().purgeOldPings();
            expect(useLocationStore.getState().pings).toHaveLength(1);
        });
    });

    describe("Config management", () => {
        it("has sensible defaults", () => {
            const c = useLocationStore.getState().config;
            expect(c.enabled).toBe(true);
            expect(c.pingIntervalMinutes).toBe(10);
            expect(c.requireLocation).toBe(true);
            expect(c.warnEmployeeOutOfFence).toBe(true);
            expect(c.alertAdminOutOfFence).toBe(true);
            expect(c.alertAdminLocationDisabled).toBe(true);
            expect(c.trackDuringBreaks).toBe(false);
            expect(c.retainDays).toBe(30);
            expect(c.requireSelfie).toBe(false);
            expect(c.selfieCompressionQuality).toBe(0.6);
            expect(c.lunchDuration).toBe(60);
            expect(c.lunchGeofenceRequired).toBe(true);
            expect(c.lunchOvertimeThreshold).toBe(5);
            expect(c.allowedBreaksPerDay).toBe(1);
            expect(c.breakGracePeriod).toBe(5);
        });

        it("updateConfig merges partial updates", () => {
            useLocationStore.getState().updateConfig({ pingIntervalMinutes: 5, retainDays: 7 });
            const c = useLocationStore.getState().config;
            expect(c.pingIntervalMinutes).toBe(5);
            expect(c.retainDays).toBe(7);
            expect(c.enabled).toBe(true); // untouched
        });

        it("resetConfig restores defaults", () => {
            useLocationStore.getState().updateConfig({ pingIntervalMinutes: 1, enabled: false });
            useLocationStore.getState().resetConfig();
            expect(useLocationStore.getState().config.pingIntervalMinutes).toBe(10);
            expect(useLocationStore.getState().config.enabled).toBe(true);
        });
    });

    describe("resetToSeed", () => {
        it("clears all data and restores defaults", () => {
            useLocationStore.getState().addPhoto({
                eventId: "EVT-001",
                employeeId: "EMP-001",
                photoDataUrl: "mock",
                gpsLat: 14.5,
                gpsLng: 120.9,
                gpsAccuracyMeters: 10,
                capturedAt: new Date().toISOString(),
            });
            useLocationStore.getState().startBreak({ employeeId: "EMP-001", breakType: "lunch" });
            useLocationStore.getState().addPing({
                employeeId: "EMP-001",
                timestamp: new Date().toISOString(),
                lat: 14.5, lng: 120.9,
                accuracyMeters: 10,
                withinGeofence: true,
                source: "auto",
            });
            useLocationStore.getState().updateConfig({ enabled: false });

            useLocationStore.getState().resetToSeed();

            const state = useLocationStore.getState();
            expect(state.photos).toHaveLength(0);
            expect(state.breaks).toHaveLength(0);
            expect(state.pings).toHaveLength(0);
            expect(state.config.enabled).toBe(true);
        });
    });
});
