// ─── Core Types ──────────────────────────────────────────────

export type Role = "admin" | "hr" | "finance" | "employee";

export type EmployeeStatus = "active" | "inactive";
export type WorkType = "WFH" | "WFO" | "HYBRID";
export type AttendanceStatus = "present" | "absent" | "on_leave";
export type LeaveType = "SL" | "VL" | "EL" | "OTHER";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type PayslipStatus = "pending" | "confirmed";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: EmployeeStatus;
  workType: WorkType;
  salary: number;
  joinDate: string;
  productivity: number;
  location: string;
  phone?: string;
  birthday?: string;
  teamLeader?: string;
  avatarUrl?: string;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hours?: number;
  status: AttendanceStatus;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  netPay: number;
  issuedAt: string;
  status: PayslipStatus;
  confirmedAt?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  date: string;
  type?: string;
}

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatarUrl?: string;
}
