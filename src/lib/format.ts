import { format, parseISO } from "date-fns";

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateStr: string): string {
    try {
        return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
        return dateStr;
    }
}

export function formatTime(timeStr: string): string {
    try {
        return format(parseISO(`2000-01-01T${timeStr}`), "hh:mm a");
    } catch {
        return timeStr;
    }
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}
