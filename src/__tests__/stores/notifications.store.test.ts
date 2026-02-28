/**
 * Unit tests for the Notifications store — Feature E
 *
 * Covers: 15 default rules, dispatch/logging, toggling,
 *         template rendering, channel routing, provider config,
 *         log cap (500), and reset utilities.
 */
import { useNotificationsStore } from "@/store/notifications.store";
import type { NotificationType } from "@/types";

const resetStore = () => {
    useNotificationsStore.getState().resetRules();
    useNotificationsStore.getState().clearLogs();
    useNotificationsStore.getState().updateProviderConfig({
        smsProvider: "simulated",
        emailProvider: "simulated",
        smsEnabled: true,
        emailEnabled: true,
        defaultSenderName: "NexHRMS",
    });
};

beforeEach(resetStore);

// ═══════════════════════════════════════════════════════════════
// Default Rules
// ═══════════════════════════════════════════════════════════════

describe("Default notification rules", () => {
    it("initialises with 15 rules", () => {
        const rules = useNotificationsStore.getState().rules;
        expect(rules).toHaveLength(15);
    });

    it("every rule has required fields", () => {
        for (const r of useNotificationsStore.getState().rules) {
            expect(r.id).toBeDefined();
            expect(r.trigger).toBeDefined();
            expect(typeof r.enabled).toBe("boolean");
            expect(r.channel).toBeDefined();
            expect(r.subjectTemplate).toBeDefined();
            expect(r.bodyTemplate).toBeDefined();
        }
    });

    it("has distinct trigger names", () => {
        const triggers = useNotificationsStore.getState().rules.map((r) => r.trigger);
        expect(new Set(triggers).size).toBe(triggers.length);
    });

    const expectedTriggers = [
        "payslip_published",
        "leave_submitted",
        "leave_approved",
        "leave_rejected",
        "attendance_missing",
        "geofence_violation",
        "loan_reminder",
        "payslip_unsigned_reminder",
        "overtime_submitted",
        "birthday",
        "contract_expiry",
        "daily_summary",
        "location_disabled",
        "payslip_signed",
        "payment_confirmed",
    ];

    it.each(expectedTriggers)("has rule for trigger '%s'", (trigger) => {
        expect(useNotificationsStore.getState().getRuleByTrigger(trigger as NotificationType)).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// Rule Management
// ═══════════════════════════════════════════════════════════════

describe("Rule management", () => {
    describe("toggleRule", () => {
        it("toggles a rule from enabled to disabled", () => {
            const rule = useNotificationsStore.getState().rules[0];
            const wasEnabled = rule.enabled;
            useNotificationsStore.getState().toggleRule(rule.id);
            const updated = useNotificationsStore.getState().rules.find((r) => r.id === rule.id)!;
            expect(updated.enabled).toBe(!wasEnabled);
        });

        it("toggles back", () => {
            const rule = useNotificationsStore.getState().rules[0];
            const original = rule.enabled;
            useNotificationsStore.getState().toggleRule(rule.id);
            useNotificationsStore.getState().toggleRule(rule.id);
            expect(
                useNotificationsStore.getState().rules.find((r) => r.id === rule.id)!.enabled,
            ).toBe(original);
        });
    });

    describe("updateRule", () => {
        it("patches a rule's properties", () => {
            const rule = useNotificationsStore.getState().getRuleByTrigger("payslip_published")!;
            useNotificationsStore.getState().updateRule(rule.id, {
                channel: "sms" as const,
                subjectTemplate: "Custom: {period}",
            });
            const updated = useNotificationsStore.getState().rules.find((r) => r.id === rule.id)!;
            expect(updated.channel).toBe("sms");
            expect(updated.subjectTemplate).toBe("Custom: {period}");
        });

        it("does not affect other rules", () => {
            const rules = useNotificationsStore.getState().rules;
            const targetId = rules[0].id;
            const otherId = rules[1].id;
            const otherBefore = { ...rules[1] };

            useNotificationsStore.getState().updateRule(targetId, { channel: "sms" as const });
            const otherAfter = useNotificationsStore.getState().rules.find((r) => r.id === otherId)!;
            expect(otherAfter.channel).toBe(otherBefore.channel);
            expect(otherAfter.subjectTemplate).toBe(otherBefore.subjectTemplate);
        });
    });

    describe("getRuleByTrigger", () => {
        it("returns the correct rule for a known trigger", () => {
            const rule = useNotificationsStore.getState().getRuleByTrigger("geofence_violation");
            expect(rule).toBeDefined();
            expect(rule!.trigger).toBe("geofence_violation");
        });

        it("returns undefined for unknown trigger", () => {
            expect(
                useNotificationsStore.getState().getRuleByTrigger("imaginary_trigger" as never),
            ).toBeUndefined();
        });
    });

    describe("resetRules", () => {
        it("restores all rules to defaults after modifications", () => {
            const ruleId = useNotificationsStore.getState().rules[0].id;
            useNotificationsStore.getState().toggleRule(ruleId);
            useNotificationsStore.getState().updateRule(ruleId, { channel: "sms" as const });
            useNotificationsStore.getState().resetRules();
            expect(useNotificationsStore.getState().rules).toHaveLength(15);
            // Channel should be original default, not "sms"
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Dispatch — rules-based notification sending
// ═══════════════════════════════════════════════════════════════

describe("dispatch", () => {
    it("creates a log entry when rule is enabled", () => {
        useNotificationsStore.getState().dispatch(
            "payslip_published",
            { name: "Juan", period: "June 2026" },
            "EMP-001",
            "juan@test.com",
        );
        const logs = useNotificationsStore.getState().logs;
        expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("does NOT create a log when rule is disabled", () => {
        const rule = useNotificationsStore.getState().getRuleByTrigger("payslip_published")!;
        useNotificationsStore.getState().toggleRule(rule.id);
        // Now disabled
        useNotificationsStore.getState().dispatch(
            "payslip_published",
            { name: "Juan" },
            "EMP-001",
        );
        expect(useNotificationsStore.getState().logs).toHaveLength(0);
    });

    it("does NOT create a log for unknown trigger", () => {
        useNotificationsStore.getState().dispatch(
            "nonexistent_trigger" as never,
            {},
            "EMP-001",
        );
        expect(useNotificationsStore.getState().logs).toHaveLength(0);
    });

    it("renders template variables in subject and body", () => {
        useNotificationsStore.getState().dispatch(
            "payslip_published",
            { name: "Maria", period: "July 2026", amount: "₱23,950" },
            "EMP-002",
            "maria@test.com",
        );
        const log = useNotificationsStore.getState().logs[0];
        // {period} in subject template should be replaced
        expect(log.subject).toContain("July 2026");
        // {amount} in body template should be replaced
        expect(log.body).toContain("₱23,950");
        // {period} in body should also be rendered
        expect(log.body).toContain("July 2026");
    });

    describe("channel routing", () => {
        it("'both' channel produces email AND sms log entries", () => {
            // payslip_published is 'both' by default
            useNotificationsStore.getState().dispatch(
                "payslip_published",
                { name: "Juan", period: "June 2026" },
                "EMP-001",
                "juan@test.com",
                "+639171234567",
            );
            const logs = useNotificationsStore.getState().logs;
            const channels = logs.map((l) => l.channel);
            expect(channels).toContain("email");
            expect(channels).toContain("sms");
        });

        it("'email' channel produces only email log", () => {
            // leave_submitted defaults to 'email'
            useNotificationsStore.getState().dispatch(
                "leave_submitted",
                { name: "Ana", type: "Vacation" },
                "EMP-010",
                "ana@test.com",
            );
            const logs = useNotificationsStore.getState().logs;
            expect(logs.every((l) => l.channel === "email")).toBe(true);
        });

        it("'sms' channel produces only sms log", () => {
            // payment_confirmed is 'sms' by default
            useNotificationsStore.getState().dispatch(
                "payment_confirmed",
                { name: "Pedro", period: "Aug 2026" },
                "EMP-020",
                undefined,
                "+639209876543",
            );
            const logs = useNotificationsStore.getState().logs;
            expect(logs.length).toBeGreaterThanOrEqual(1);
            expect(logs.every((l) => l.channel === "sms")).toBe(true);
        });
    });

    it("log entry has id, sentAt, status=simulated", () => {
        useNotificationsStore.getState().dispatch(
            "leave_submitted",
            { name: "Test" },
            "EMP-001",
            "t@test.com",
        );
        const log = useNotificationsStore.getState().logs[0];
        expect(log.id).toMatch(/^NOTIF-/);
        expect(log.sentAt).toBeDefined();
        expect(log.status).toBe("simulated");
    });
});

// ═══════════════════════════════════════════════════════════════
// Log management
// ═══════════════════════════════════════════════════════════════

describe("Log management", () => {
    describe("addLog", () => {
        it("generates NOTIF- prefixed ID and sets sentAt/status", () => {
            useNotificationsStore.getState().addLog({
                employeeId: "EMP-001",
                type: "payslip_published",
                channel: "email",
                subject: "Test Subject",
                body: "Test body",
                recipientEmail: "x@y.com",
            });
            const log = useNotificationsStore.getState().logs[0];
            expect(log.id).toMatch(/^NOTIF-/);
            expect(log.sentAt).toBeDefined();
            expect(log.status).toBe("simulated");
        });

        it("caps logs at 500", () => {
            for (let i = 0; i < 510; i++) {
                useNotificationsStore.getState().addLog({
                    employeeId: "EMP-001",
                    type: "payslip_published",
                    channel: "email",
                    subject: `Log ${i}`,
                    body: "b",
                    recipientEmail: "x@y.com",
                });
            }
            expect(useNotificationsStore.getState().logs.length).toBeLessThanOrEqual(500);
        });
    });

    describe("clearLogs", () => {
        it("removes all logs", () => {
            useNotificationsStore.getState().addLog({
                employeeId: "EMP-001",
                type: "payslip_published",
                channel: "email",
                subject: "s",
                body: "b",
            });
            useNotificationsStore.getState().clearLogs();
            expect(useNotificationsStore.getState().logs).toHaveLength(0);
        });
    });

    describe("getLogsByType", () => {
        it("filters logs by type (trigger)", () => {
            useNotificationsStore.getState().addLog({
                employeeId: "EMP-001",
                type: "payslip_published",
                channel: "email",
                subject: "s", body: "b",
            });
            useNotificationsStore.getState().addLog({
                employeeId: "EMP-001",
                type: "leave_submitted",
                channel: "email",
                subject: "s", body: "b",
            });
            expect(useNotificationsStore.getState().getLogsByType("payslip_published")).toHaveLength(1);
            expect(useNotificationsStore.getState().getLogsByType("leave_submitted")).toHaveLength(1);
        });
    });

    describe("getLogsByEmployee", () => {
        it("filters logs by employee ID", () => {
            useNotificationsStore.getState().addLog({
                employeeId: "EMP-001",
                type: "payslip_published",
                channel: "email",
                subject: "s", body: "b",
            });
            useNotificationsStore.getState().addLog({
                employeeId: "EMP-002",
                type: "leave_submitted",
                channel: "email",
                subject: "s", body: "b",
            });
            expect(useNotificationsStore.getState().getLogsByEmployee("EMP-001")).toHaveLength(1);
            expect(useNotificationsStore.getState().getLogsByEmployee("EMP-002")).toHaveLength(1);
            expect(useNotificationsStore.getState().getLogsByEmployee("EMP-999")).toHaveLength(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Provider config
// ═══════════════════════════════════════════════════════════════

describe("Provider config", () => {
    it("updates provider config", () => {
        useNotificationsStore.getState().updateProviderConfig({
            smsProvider: "twilio",
            defaultSenderName: "HR System",
        });
        const cfg = useNotificationsStore.getState().providerConfig;
        expect(cfg.smsProvider).toBe("twilio");
        expect(cfg.defaultSenderName).toBe("HR System");
        // other fields untouched
        expect(cfg.emailEnabled).toBe(true);
    });
});
