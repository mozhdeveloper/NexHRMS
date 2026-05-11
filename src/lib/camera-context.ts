const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLoopbackHostname(hostname: string): boolean {
    return LOOPBACK_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

export function canUseCamera(windowLike: Pick<Window, "isSecureContext" | "location">): boolean {
    return Boolean(windowLike.isSecureContext || isLoopbackHostname(windowLike.location.hostname));
}

export function cameraHttpsHint(pagePath?: string): string {
    const pageSegment = pagePath ? ` and open ${pagePath}` : "";
    return `Camera access requires HTTPS. Run npm run dev:https${pageSegment} over https://localhost:3000.`;
}
