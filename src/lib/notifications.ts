import { useNotificationsStore } from "@/store/notifications.store";
import { toast } from "sonner";
import type { NotificationType } from "@/types";

interface SendNotificationParams {
    type: NotificationType;
    employeeId: string;
    subject: string;
    body: string;
    // Optional — used to enrich the notification toast if available
    employeeName?: string;
    employeeEmail?: string;
}

/**
 * Mock email notification sender.
 * Logs to notification store and shows a toast.
 */
export function sendNotification(params: SendNotificationParams): void {
    const { employeeId, type, subject, body, employeeName, employeeEmail } = params;

    // Save to notification store
    const addLog = useNotificationsStore.getState().addLog;
    addLog({ employeeId, type, subject, body });

    // Show toast simulating email dispatch
    const toLabel = employeeName ?? employeeId;
    toast.success(`📧 Email sent to ${toLabel}`, { description: subject });

    // Console log for debugging / demo
    console.log(
        `[MOCK EMAIL] To: ${employeeEmail ?? employeeId}\nSubject: ${subject}\nBody: ${body}`
    );
}

/**
 * Convenience factories for common notification types.
 */
export function notifyProjectAssignment(params: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    projectName: string;
}): void {
    sendNotification({
        type: "assignment",
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        employeeEmail: params.employeeEmail,
        subject: `New Project Assignment: ${params.projectName}`,
        body: `Hi ${params.employeeName}, you have been assigned to "${params.projectName}". Please report to the project location. Contact HR for more details.`,
    });
}

export function notifyAbsence(params: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    date: string;
}): void {
    sendNotification({
        type: "absence",
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        employeeEmail: params.employeeEmail,
        subject: `Attendance Alert: Marked absent on ${params.date}`,
        body: `Hi ${params.employeeName}, you were marked absent for ${params.date}. Please provide a reason or contact HR if this is an error.`,
    });
}
