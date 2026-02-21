/**
 * Unit tests for the Haversine geofence utility
 */
import { getDistanceMeters, isWithinGeofence } from "@/lib/geofence";

// Manila City Hall approximate coordinates
const MANILA = { lat: 14.5947, lng: 120.9842 };
// Makati CBD ~5 km from Manila City Hall
const MAKATI = { lat: 14.5547, lng: 121.0244 };

describe("getDistanceMeters", () => {
    it("returns 0 meters when both points are identical", () => {
        const d = getDistanceMeters(MANILA.lat, MANILA.lng, MANILA.lat, MANILA.lng);
        expect(d).toBe(0);
    });

    it("returns a positive distance between Manila and Makati", () => {
        const d = getDistanceMeters(MANILA.lat, MANILA.lng, MAKATI.lat, MAKATI.lng);
        expect(d).toBeGreaterThan(0);
    });

    it("distance Manila↔Makati is approximately 5,000–7,000 m", () => {
        const d = getDistanceMeters(MANILA.lat, MANILA.lng, MAKATI.lat, MAKATI.lng);
        expect(d).toBeGreaterThan(4000);
        expect(d).toBeLessThan(8000);
    });

    it("is symmetric (A→B equals B→A)", () => {
        const ab = getDistanceMeters(MANILA.lat, MANILA.lng, MAKATI.lat, MAKATI.lng);
        const ba = getDistanceMeters(MAKATI.lat, MAKATI.lng, MANILA.lat, MANILA.lng);
        expect(Math.abs(ab - ba)).toBeLessThan(1); // within 1 meter
    });
});

describe("isWithinGeofence", () => {
    it("returns within=true and distanceMeters=0 when user is at the fence center", () => {
        const result = isWithinGeofence(MANILA.lat, MANILA.lng, MANILA.lat, MANILA.lng, 100);
        expect(result.within).toBe(true);
        expect(result.distanceMeters).toBe(0);
    });

    it("returns within=true when user is inside the radius", () => {
        // Move 0.0001° (~11 m) from center, inside a 100 m radius
        const result = isWithinGeofence(
            MANILA.lat + 0.0001,
            MANILA.lng,
            MANILA.lat,
            MANILA.lng,
            100
        );
        expect(result.within).toBe(true);
    });

    it("returns within=false when user is outside the radius", () => {
        // ~5–7 km away from center, radius is 200 m
        const result = isWithinGeofence(
            MAKATI.lat,
            MAKATI.lng,
            MANILA.lat,
            MANILA.lng,
            200
        );
        expect(result.within).toBe(false);
        expect(result.distanceMeters).toBeGreaterThan(200);
    });

    it("distanceMeters matches getDistanceMeters rounded to nearest meter", () => {
        const raw = getDistanceMeters(MAKATI.lat, MAKATI.lng, MANILA.lat, MANILA.lng);
        const result = isWithinGeofence(MAKATI.lat, MAKATI.lng, MANILA.lat, MANILA.lng, 200);
        expect(result.distanceMeters).toBe(Math.round(raw));
    });

    it("edge case: user sits exactly on the boundary (distance === radius) → within=true", () => {
        // Place user exactly equal to radius distance — using a tiny radius of 0 m at same point
        const result = isWithinGeofence(MANILA.lat, MANILA.lng, MANILA.lat, MANILA.lng, 0);
        expect(result.within).toBe(true); // 0 <= 0
    });
});
