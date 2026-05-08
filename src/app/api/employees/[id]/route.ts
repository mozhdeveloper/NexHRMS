<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/services/supabase-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function deleteWhere(
  admin: Awaited<ReturnType<typeof createAdminSupabaseClient>>,
  table: string,
  column: string,
  value: string
) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error && error.code !== "42P01") {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function deleteIn(
  admin: Awaited<ReturnType<typeof createAdminSupabaseClient>>,
  table: string,
  column: string,
  values: string[]
) {
  if (values.length === 0) return;
  const { error } = await admin.from(table).delete().in(column, values);
  if (error && error.code !== "42P01") {
    throw new Error(`${table}: ${error.message}`);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing employee id" }, { status: 400 });
    }

    const serverSupabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = await createAdminSupabaseClient();
    const { data: actor, error: actorError } = await admin
      .from("employees")
      .select("id, role")
      .or(`profile_id.eq.${user.id},email.eq.${user.email ?? ""}`)
      .limit(1)
      .maybeSingle();

    if (actorError) {
      console.error("[employees/delete] actor lookup:", actorError.message);
      return NextResponse.json({ ok: false, error: "Actor lookup failed" }, { status: 500 });
    }

    const actorRole = String(actor?.role || "").toLowerCase();
    if (!["admin", "hr"].includes(actorRole)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (actor?.id === id) {
      return NextResponse.json({ ok: false, error: "You cannot delete your own employee record" }, { status: 400 });
    }

    const { data: employee, error: employeeError } = await admin
      .from("employees")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();

    if (employeeError) {
      console.error("[employees/delete] employee lookup:", employeeError.message);
      return NextResponse.json({ ok: false, error: "Employee lookup failed" }, { status: 500 });
    }

    if (!employee?.id) {
      return NextResponse.json({ ok: true, deleted: false });
    }

    const { data: eventRows } = await admin
      .from("attendance_events")
      .select("id")
      .eq("employee_id", id);
    const eventIds = (eventRows ?? []).map((row) => row.id).filter(Boolean);

    const { data: loanRows } = await admin
      .from("loans")
      .select("id")
      .eq("employee_id", id);
    const loanIds = (loanRows ?? []).map((row) => row.id).filter(Boolean);

    const { data: payslipRows } = await admin
      .from("payslips")
      .select("id")
      .eq("employee_id", id);
    const payslipIds = (payslipRows ?? []).map((row) => row.id).filter(Boolean);

    await deleteIn(admin, "attendance_evidence", "event_id", eventIds);
    await deleteWhere(admin, "attendance_exceptions", "employee_id", id);
    await deleteWhere(admin, "attendance_events", "employee_id", id);
    await deleteWhere(admin, "attendance_logs", "employee_id", id);

    await deleteWhere(admin, "employee_shifts", "employee_id", id);
    await deleteWhere(admin, "employee_documents", "employee_id", id);
    await deleteWhere(admin, "face_enrollments", "employee_id", id);
    await deleteWhere(admin, "project_assignments", "employee_id", id);
    await deleteWhere(admin, "qr_tokens", "employee_id", id);

    await deleteWhere(admin, "leave_balances", "employee_id", id);
    await deleteWhere(admin, "leave_requests", "employee_id", id);
    await deleteWhere(admin, "overtime_requests", "employee_id", id);
    await deleteWhere(admin, "penalty_records", "employee_id", id);
    await deleteWhere(admin, "manual_checkins", "employee_id", id);
    await deleteWhere(admin, "manual_checkins", "performed_by", id);
    await deleteWhere(admin, "notification_logs", "employee_id", id);
    await deleteWhere(admin, "push_subscriptions", "employee_id", id);

    await deleteWhere(admin, "location_pings", "employee_id", id);
    await deleteWhere(admin, "break_records", "employee_id", id);
    await deleteWhere(admin, "site_survey_photos", "employee_id", id);
    await deleteWhere(admin, "task_comments", "employee_id", id);
    await deleteWhere(admin, "task_completion_reports", "employee_id", id);
    await deleteWhere(admin, "timesheets", "employee_id", id);

    await deleteWhere(admin, "salary_change_requests", "employee_id", id);
    await deleteWhere(admin, "salary_history", "employee_id", id);
    await deleteWhere(admin, "payroll_adjustments", "employee_id", id);
    await deleteWhere(admin, "final_pay_computations", "employee_id", id);
    await deleteWhere(admin, "deduction_overrides", "employee_id", id);
    await deleteWhere(admin, "employee_deduction_assignments", "employee_id", id);

    await deleteIn(admin, "loan_deductions", "loan_id", loanIds);
    await deleteIn(admin, "loan_repayment_schedule", "loan_id", loanIds);
    await deleteIn(admin, "loan_balance_history", "loan_id", loanIds);
    await deleteWhere(admin, "loans", "employee_id", id);

    await deleteIn(admin, "payslip_line_items", "payslip_id", payslipIds);
    await deleteIn(admin, "payroll_run_payslips", "payslip_id", payslipIds);
    await deleteWhere(admin, "payslips", "employee_id", id);

    const { error: deleteError } = await admin.from("employees").delete().eq("id", id);
    if (deleteError) {
      console.error("[employees/delete] employee delete:", deleteError.message);
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[employees/delete] error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Employee delete failed" },
      { status: 500 }
    );
  }
=======
import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/services/supabase-server";
import { hasPermissionServer } from "@/lib/permissions-server";

/**
 * DELETE /api/employees/:id
 * Hard-deletes an employee record from Supabase and the linked auth user account.
 * Requires employees:edit permission.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.debug(`[api/employees/DELETE] 401 — no session for id=${id}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Permission guard — fetch caller's role from profiles
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const callerRole = callerProfile?.role ?? "";
  if (!hasPermissionServer(callerRole, "employees:edit")) {
    console.debug(`[api/employees/DELETE] 403 — role "${callerRole}" lacks employees:edit for id=${id}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = await createAdminSupabaseClient();

  // Fetch the employee first so we can log and get profile_id
  const { data: emp, error: fetchErr } = await admin
    .from("employees")
    .select("id, name, email, profile_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    console.error(`[api/employees/DELETE] fetch error for id=${id}:`, fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!emp) {
    // Not in DB — nothing to delete. Return 200 so the client-side store removal still succeeds.
    console.debug(`[api/employees/DELETE] employee id=${id} not found in DB — already absent`);
    return NextResponse.json({ deleted: false, reason: "not_found" }, { status: 200 });
  }

  console.debug(`[api/employees/DELETE] deleting employee id=${id} name="${emp.name}" email="${emp.email}" profile_id=${emp.profile_id ?? "none"}`);

  // Delete employee row (cascades to related tables via FK ON DELETE CASCADE in schema)
  const { error: deleteErr } = await admin
    .from("employees")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    console.error(`[api/employees/DELETE] delete error for id=${id}:`, deleteErr.message);
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  // If there's a linked auth account, also delete it so they cannot log back in
  if (emp.profile_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(emp.profile_id);
    if (authErr) {
      // Non-fatal: employee row is gone, auth user might not exist
      console.warn(`[api/employees/DELETE] auth user delete warning for profile_id=${emp.profile_id}:`, authErr.message);
    } else {
      console.debug(`[api/employees/DELETE] auth user ${emp.profile_id} deleted`);
    }
  }

  console.debug(`[api/employees/DELETE] ✓ employee ${id} fully deleted`);
  return NextResponse.json({ deleted: true, id, name: emp.name }, { status: 200 });
>>>>>>> 3a470fc (fix: employee delete tombstone, 401 session refresh, delete API route, import dryRun validation)
}
