# Zustand → Supabase DB-First Migration Checklist

> **Goal:** Remove Zustand as source of truth for 19 stores. Make Supabase the primary data store.
> **Keep as Zustand (client-only):** `ui.store`, `appearance.store`, `kiosk.store`, `offline-queue.store`
> **Pattern:** Create service layer → Update UI to call service → Remove write-through → Remove persist

---

## Migration Order (by complexity)

| # | Store | Complexity | Tables | Status |
|---|-------|-----------|--------|--------|
| 1 | `payroll.store` | ✅ Done | payslips, payroll_runs, adjustments, final_pay | ✅ Service created |
| 2 | `notifications.store` | Low | notification_logs, notification_rules | ✅ Service created |
| 3 | `audit.store` | Low | audit_logs | ✅ Service created |
| 4 | `events.store` | Low | calendar_events | ✅ Service created |
| 5 | `projects.store` | Low | projects, project_assignments | ✅ Service created |
| 6 | `departments.store` | Low | departments | ✅ Service created |
| 7 | `job-titles.store` | Low | job_titles | ✅ Service created |
| 8 | `roles.store` | Low | roles (mostly hardcoded) | ✅ Service created |
| 9 | `location.store` | Low | location_pings, site_survey_photos, break_records | ✅ Service created |
| 10 | `timesheet.store` | Medium | timesheets, attendance_rule_sets | ✅ Service created |
| 11 | `leave.store` | Medium | leave_requests, leave_balances, leave_policies | ⬜ |
| 12 | `loans.store` | Medium | loans, loan_deductions, loan_repayment_schedule | ⬜ |
| 13 | `employees.store` | Medium | employees, salary_change_requests, salary_history | ⬜ |
| 14 | `deductions.store` | Medium | deduction_templates, employee_deduction_assignments | ⬜ |
| 15 | `jobs.store` | Medium | jobs, job_applications | ⬜ |
| 16 | `auth.store` | Medium | profiles (auth handled by Supabase Auth) | ⬜ |
| 17 | `attendance.store` | High | attendance_logs, events, evidence, exceptions, shifts, holidays, penalties | ⬜ |
| 18 | `messaging.store` | High | announcements, text_channels, channel_messages | ⬜ |
| 19 | `tasks.store` | High | task_groups, tasks, completion_reports, task_comments, task_tags | ⬜ |

---

## Per-Store Migration Steps

Each store follows the same 5-step process:

### Step A: Create Service Layer File
- [ ] Create `src/services/{store}-actions.service.ts`
- [ ] Move all mutation logic to async functions that write DB first
- [ ] On DB success → update Zustand cache via `setState`
- [ ] On DB failure → return false, local state unchanged

### Step B: Update UI Consumers
- [ ] Find all files that call store mutations (use grep)
- [ ] Replace `store.mutate()` with `await service.mutate()`
- [ ] Add loading states / error handling where needed

### Step C: Remove Write-Through Subscriber
- [ ] In `sync.service.ts`, delete the `useXxxStore.subscribe(...)` block
- [ ] Verify data still reaches DB via the new service layer

### Step D: Remove `persist` Middleware
- [ ] Remove `persist(...)` wrapper from the store
- [ ] Remove `partialize`, `migrate`, `merge` config
- [ ] Store becomes pure in-memory (hydrated from Supabase on login)

### Step E: Verify
- [ ] Create/update/delete works and persists across page refresh
- [ ] Realtime still pushes changes from other sessions
- [ ] No console errors or data loss

---

## Store 1: `payroll.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/payroll-actions.service.ts`
- [x] `batchReleasePaymentHold(ids)` — DB-first
- [x] `batchPublishPayslips(ids)` — DB-first
- [x] `batchRecordPayment(ids, method, ref)` — DB-first
- [x] `issuePayslip(data)` — DB-first
- [x] `publishPayslip(id)` — DB-first
- [x] `recordPayment(id, method, ref)` — DB-first
- [x] `signPayslip(id, signatureDataUrl)` — DB-first
- [x] `holdPayment(id, note)` — DB-first
- [x] `deletePayslip(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/payroll/_views/admin-view.tsx` — replace store batch calls with service calls
- [ ] `src/app/[role]/my-payslips/page.tsx` — replace sign/acknowledge calls
- [ ] `src/components/payroll/*.tsx` — any direct store mutations

### C. Remove Write-Through
- [ ] Delete `usePayrollStore.subscribe(...)` block in `sync.service.ts` (lines ~575-658)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper from `payroll.store.ts`
- [ ] Delete `partialize`, `migrate` config

### E. Verify
- [ ] Issue payslip → refresh → still there
- [ ] Batch publish → refresh → status updated
- [ ] Delete draft → refresh → gone
- [ ] Second admin session sees changes via realtime

---

## Store 2: `notifications.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/notification-actions.service.ts`
- [x] `batchDispatch(entries[])` — DB-first (insert logs → update cache → fire push)
- [x] `dispatch(trigger, vars, recipientId, ...)` — DB-first single
- [x] `markAsRead(id)` — DB-first
- [x] `markAllAsRead(employeeId)` — DB-first
- [x] `clearLogs()` — DB-first
- [x] `updateRule(id, data)` / `toggleRule(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/lib/notifications.ts` — `dispatchNotification` / `dispatchBatchNotifications`
- [ ] `src/app/[role]/notifications/page.tsx` — markAsRead, markAllAsRead
- [ ] `src/app/[role]/settings/_views/admin-view.tsx` — rule CRUD
- [ ] All stores that call `useNotificationsStore.getState().dispatch(...)` (attendance, leave, payroll, etc.)

### C. Remove Write-Through
- [ ] Delete `useNotificationsStore.subscribe(...)` block in `sync.service.ts` (lines ~910+)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper
- [ ] Delete `partialize`, `migrate` config

### E. Verify
- [ ] Dispatch notification → refresh → still in log
- [ ] Mark as read → refresh → still read
- [ ] Rule update → refresh → persisted

---

## Store 3: `audit.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/audit-actions.service.ts`
- [x] `log(data)` — DB-first (insert → prepend to cache)
- [x] `clearLocalLogs()` — local cache only (audit is immutable in DB)

### B. Update UI Consumers
- [ ] All files calling `useAuditStore.getState().log(...)` (~15+ files)
- [ ] `src/app/[role]/audit/page.tsx` — reads only (no change needed)

### C. Remove Write-Through
- [ ] Delete `useAuditStore.subscribe(...)` block in `sync.service.ts` (lines ~734+)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = empty)

### E. Verify
- [ ] Audit log entry → refresh → still there
- [ ] Audit page loads from Supabase

---

## Store 4: `events.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/events-actions.service.ts`
- [x] `addEvent(data)` — DB-first
- [x] `updateEvent(id, data)` — DB-first
- [x] `removeEvent(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/events/page.tsx` — CRUD calls
- [ ] `src/components/dashboard/admin-dashboard.tsx` — reads only
- [ ] `src/components/dashboard/employee-dashboard.tsx` — reads only

### C. Remove Write-Through
- [ ] Delete `useEventsStore.subscribe(...)` block in `sync.service.ts` (lines ~748+)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper

### E. Verify
- [ ] Add event → refresh → still there
- [ ] Delete event → refresh → gone

---

## Store 5: `projects.store` ✅ SERVICE CREATED

### A. Service Layer
- [x] Created `src/services/projects-actions.service.ts`
- [x] `addProject(data)` — DB-first
- [x] `updateProject(id, data)` — DB-first
- [x] `deleteProject(id)` — DB-first
- [x] `assignEmployee(projectId, employeeId)` — DB-first
- [x] `removeEmployee(projectId, employeeId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/projects/page.tsx` + views
- [ ] `src/app/[role]/employees/manage/_views/admin-view.tsx` — project assignment

### C. Remove Write-Through
- [ ] Delete `useProjectsStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper

### E. Verify
- [ ] Create project → refresh → still there
- [ ] Assign employee → refresh → still assigned

---

## Store 6: `departments.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/departments-actions.service.ts`
- [x] `addDepartment(data)` — DB-first
- [x] `updateDepartment(id, data)` — DB-first
- [x] `deleteDepartment(id)` — DB-first
- [x] `toggleDepartmentActive(id)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/organization/page.tsx` — department CRUD
- [x] `src/app/[role]/employees/manage/_views/admin-view.tsx` — department CRUD tab

### C. Remove Write-Through
- [x] No write-through existed for departments (localStorage-only persist)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `departments.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Add department → refresh → still there
- [ ] Update department → refresh → persisted
- [ ] Delete department → refresh → gone

---

## Store 7: `job-titles.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/job-titles-actions.service.ts`
- [x] `addJobTitle(data)` — DB-first
- [x] `updateJobTitle(id, data)` — DB-first
- [x] `deleteJobTitle(id)` — DB-first
- [x] `toggleJobTitleActive(id)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/organization/page.tsx` — positions CRUD
- [x] `src/app/[role]/employees/manage/_views/admin-view.tsx` — job titles tab

### C. Remove Write-Through
- [x] No write-through existed for job-titles (localStorage-only persist)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `job-titles.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Add job title → refresh → still there
- [ ] Update job title → refresh → persisted
- [ ] Delete job title → refresh → gone

---

## Store 8: `roles.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/roles-actions.service.ts`
- [x] `createRole(data)` — DB-first via /api/roles POST
- [x] `updateRole(id, data)` — DB-first via /api/roles PUT
- [x] `deleteRole(id)` — DB-first via /api/roles DELETE
- [x] `duplicateRole(id)` — DB-first
- [x] `setPermissions(roleId, perms)` — DB-first
- [x] `addPermission(roleId, perm)` — DB-first
- [x] `removePermission(roleId, perm)` — DB-first
- [x] `saveDashboardLayout(roleId, widgets)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/roles/page.tsx` — role CRUD, permissions, duplicate
- [x] `src/app/[role]/settings/dashboard-builder/page.tsx` — saveDashboardLayout

### C. Remove Write-Through
- [x] No write-through existed for roles (used fire-and-forget sync)

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `roles.store.ts`
- [x] Store is now pure in-memory (hydrated via `fetchRoles()` on mount)

### E. Verify
- [ ] Create role → refresh → still there
- [ ] Update role permissions → refresh → persisted
- [ ] Delete custom role → refresh → gone
- [ ] Dashboard layout save → refresh → persisted

---

## Store 9: `location.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/location-actions.service.ts`
- [x] `updateConfig(patch)` — DB-first via /api/settings/location PATCH
- [x] `resetConfig(defaults)` — DB-first
- [x] `addPing(data)` — DB-first
- [x] `addPhoto(data)` — DB-first
- [x] `startBreak(data)` — DB-first
- [x] `endBreak(breakId, data)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/settings/location/page.tsx` — config CRUD
- [x] `src/components/attendance/location-tracker.tsx` — addPing
- [x] `src/components/attendance/break-timer.tsx` — startBreak, endBreak

### C. Remove Write-Through
- [x] Deleted `useLocationStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `location.store.ts`
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Location ping recorded → refresh → still there
- [ ] Start/end break → refresh → persisted
- [ ] Config update → refresh → persisted

---

## Store 10: `timesheet.store` ✅ DONE

### A. Service Layer
- [x] Created `src/services/timesheet-actions.service.ts`
- [x] `saveComputedTimesheet(ts)` — DB-first (computation stays in store)
- [x] `submitTimesheet(id)` — DB-first
- [x] `approveTimesheet(id, approverId)` — DB-first
- [x] `rejectTimesheet(id, approverId)` — DB-first
- [x] `addRuleSet(data)` — DB-first
- [x] `updateRuleSet(id, data)` — DB-first
- [x] `deleteRuleSet(id)` — DB-first

### B. Update UI Consumers
- [x] `src/app/[role]/timesheets/page.tsx` — submit, approve, reject, addRuleSet

### C. Remove Write-Through
- [x] Deleted `useTimesheetStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [x] Removed `persist(...)` wrapper from `timesheet.store.ts`
- [x] Removed `partialize`, `migrate` config
- [x] Store is now pure in-memory (hydrated from Supabase on login)

### E. Verify
- [ ] Compute timesheet → refresh → still there
- [ ] Approve → refresh → status persisted
- [ ] Add rule set → refresh → persisted

---

## Store 11: `leave.store`

### A. Service Layer
- [ ] Create `src/services/leave-actions.service.ts`
- [ ] `addRequest(data)` — DB-first
- [ ] `updateStatus(id, status, reviewedBy)` — DB-first (handles balance deduction)
- [ ] `initBalances(employeeId, year)` — DB-first
- [ ] `accrueLeave(employeeId, type, year, days)` — DB-first
- [ ] `addPolicy(data)` / `updatePolicy(id, data)` / `deletePolicy(id)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/leave/_views/admin-view.tsx` — approve/reject
- [ ] `src/app/[role]/leave/_views/employee-view.tsx` — submit request
- [ ] `src/app/[role]/settings/_views/admin-view.tsx` — policy CRUD

### C. Remove Write-Through
- [ ] Delete `useLeaveStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = policies only)

### E. Verify
- [ ] Submit leave → refresh → still pending
- [ ] Approve → refresh → balance deducted

---

## Store 12: `loans.store`

### A. Service Layer
- [ ] Create `src/services/loans-actions.service.ts`
- [ ] `createLoan(data)` — DB-first
- [ ] `deductFromLoan(id, amount)` — DB-first
- [ ] `settleLoan(id)` — DB-first
- [ ] `freezeLoan(id)` / `unfreezeLoan(id)` — DB-first
- [ ] `cancelLoan(id)` — DB-first
- [ ] `recordDeduction(loanId, payslipId, amount)` — DB-first
- [ ] `recordCappedDeduction(loanId, payslipId, netPay)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/loans/page.tsx` + views
- [ ] Payroll computation (calls recordCappedDeduction)

### C. Remove Write-Through
- [ ] Delete `useLoansStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = empty)

### E. Verify
- [ ] Create loan → refresh → still there
- [ ] Deduction recorded → refresh → balance updated

---

## Store 13: `employees.store`

### A. Service Layer
- [ ] Create `src/services/employees-actions.service.ts`
- [ ] `addEmployee(data)` — DB-first
- [ ] `updateEmployee(id, patch)` — DB-first
- [ ] `removeEmployee(id)` — DB-first
- [ ] `toggleStatus(id)` — DB-first
- [ ] `resignEmployee(id)` — DB-first
- [ ] `proposeSalaryChange(data)` — DB-first
- [ ] `approveSalaryChange(requestId, reviewerId)` — DB-first
- [ ] `rejectSalaryChange(requestId, reviewerId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/employees/manage/_views/admin-view.tsx` — all CRUD
- [ ] `src/app/[role]/employees/[id]/page.tsx` — profile edits
- [ ] Multiple other files that call `updateEmployee`

### C. Remove Write-Through
- [ ] Delete `useEmployeesStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = deletedIds + docs)

### E. Verify
- [ ] Add employee → refresh → still there
- [ ] Delete employee → refresh → gone
- [ ] Salary change → refresh → persisted

---

## Store 14: `deductions.store`

### A. Service Layer
- [ ] Create `src/services/deductions-actions.service.ts`
- [ ] `addTemplate(data)` — DB-first (via API route)
- [ ] `updateTemplate(id, data)` — DB-first
- [ ] `deleteTemplate(id)` — DB-first
- [ ] `assignToEmployee(data)` — DB-first
- [ ] `unassignFromEmployee(assignmentId)` — DB-first
- [ ] `bulkAssignToEmployees(data)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/payroll/_views/admin-view.tsx` — DeductionTemplatesSection
- [ ] `src/app/[role]/employees/manage/_views/admin-view.tsx` — per-employee assignments

### C. Remove Write-Through
- [ ] (Currently no write-through — uses API routes directly)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper

### E. Verify
- [ ] Add template → refresh → still there
- [ ] Assign to employee → refresh → still assigned

---

## Store 15: `jobs.store`

### A. Service Layer
- [ ] Create `src/services/jobs-actions.service.ts`
- [ ] `addJob(data)` — DB-first (via API route)
- [ ] `updateJob(id, data)` — DB-first
- [ ] `deleteJob(id)` — DB-first
- [ ] `addApplication(jobId, data)` — DB-first
- [ ] `updateApplication(jobId, appId, data)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/jobs/_views/admin-view.tsx`

### C. Remove Write-Through
- [ ] (Currently no write-through — uses API routes directly)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper

### E. Verify
- [ ] Post job → refresh → still there
- [ ] Application submitted → refresh → still there

---

## Store 16: `auth.store`

### A. Service Layer
- [ ] Already exists: `src/services/auth.service.ts`
- [ ] `signIn`, `signOut`, `createUserAccount`, `adminResetPassword` — all DB-first
- [ ] Keep Zustand for session state (`currentUser`, `isAuthenticated`)

### B. Update UI Consumers
- [ ] Already using service layer for mutations
- [ ] Keep store for reading `currentUser.role`, `isAuthenticated`

### C. Remove Write-Through
- [ ] (No write-through for auth — already service-based)

### D. Remove Persist
- [ ] Keep persist for `currentUser` + `isAuthenticated` (needed for page refresh)
- [ ] Remove `accounts` array (demo-only data)

### E. Verify
- [ ] Login → refresh → still authenticated
- [ ] Logout → refresh → redirected to login

---

## Store 17: `attendance.store` (COMPLEX)

### A. Service Layer
- [ ] Create `src/services/attendance-actions.service.ts`
- [ ] `checkIn(employeeId, projectId)` — DB-first
- [ ] `checkOut(employeeId, projectId)` — DB-first
- [ ] `markAbsent(employeeId, date)` — DB-first
- [ ] `appendEvent(data)` — DB-first
- [ ] `recordEvidence(data)` — DB-first
- [ ] `autoGenerateExceptions(date, employeeIds)` — DB-first
- [ ] `autoMarkAbsentAfterShift(date, employees)` — DB-first
- [ ] `resolveException(id, resolvedBy, notes)` — DB-first
- [ ] `submitOvertimeRequest(data)` — DB-first
- [ ] `approveOvertime(id, approverId)` — DB-first
- [ ] `rejectOvertime(id, approverId, reason)` — DB-first
- [ ] `createShift(data)` / `updateShift` / `deleteShift` — DB-first
- [ ] `assignShift(employeeId, shiftId)` — DB-first
- [ ] `addHoliday(data)` / `updateHoliday` / `deleteHoliday` — DB-first
- [ ] `applyPenalty(data)` / `clearPenalty(employeeId)` — DB-first
- [ ] `bulkUpsertLogs(rows)` — DB-first
- [ ] `resetTodayLog(employeeId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/attendance/_views/admin-view.tsx` (~122KB)
- [ ] `src/app/[role]/attendance/_views/employee-view.tsx` (~74KB)
- [ ] `src/app/[role]/settings/_views/admin-view.tsx` — shifts/holidays
- [ ] Kiosk pages
- [ ] Multiple API routes that call store directly

### C. Remove Write-Through
- [ ] Delete `useAttendanceStore.subscribe(...)` block in `sync.service.ts` (largest block)

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = shifts/holidays/penalties)

### E. Verify
- [ ] Check-in → refresh → recorded
- [ ] Check-out → refresh → hours calculated
- [ ] Shift CRUD → refresh → persisted
- [ ] Holiday CRUD → refresh → persisted
- [ ] Exception resolve → refresh → persisted

---

## Store 18: `messaging.store` (COMPLEX)

### A. Service Layer
- [ ] Create `src/services/messaging-actions.service.ts`
- [ ] `addAnnouncement(data)` — DB-first
- [ ] `updateAnnouncement(id, data)` — DB-first
- [ ] `deleteAnnouncement(id)` — DB-first
- [ ] `addChannel(data)` — DB-first
- [ ] `updateChannel(id, data)` — DB-first
- [ ] `deleteChannel(id)` — DB-first
- [ ] `sendMessage(channelId, data)` — DB-first
- [ ] `editMessage(channelId, msgId, content)` — DB-first
- [ ] `deleteMessage(channelId, msgId)` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/messages/page.tsx` + views

### C. Remove Write-Through
- [ ] Delete `useMessagingStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = channels only)

### E. Verify
- [ ] Send message → refresh → still there
- [ ] Post announcement → refresh → still there
- [ ] Realtime: other user sees message without refresh

---

## Store 19: `tasks.store` (COMPLEX)

### A. Service Layer
- [ ] Create `src/services/tasks-actions.service.ts`
- [ ] `addGroup(data)` — DB-first
- [ ] `updateGroup(id, data)` — DB-first
- [ ] `deleteGroup(id)` — DB-first
- [ ] `addTask(data)` — DB-first
- [ ] `updateTask(id, data)` — DB-first
- [ ] `deleteTask(id)` — DB-first
- [ ] `submitCompletion(taskId, data)` — DB-first
- [ ] `verifyCompletion(reportId, verifiedBy)` — DB-first
- [ ] `rejectCompletion(reportId, rejectedBy, reason)` — DB-first
- [ ] `addComment(taskId, data)` — DB-first
- [ ] `addTag(data)` / `updateTag` / `deleteTag` — DB-first

### B. Update UI Consumers
- [ ] `src/app/[role]/tasks/_views/admin-view.tsx` (~134KB)
- [ ] `src/app/[role]/tasks/_views/employee-view.tsx`
- [ ] `src/app/[role]/tasks/[id]/page.tsx`

### C. Remove Write-Through
- [ ] Delete `useTasksStore.subscribe(...)` block in `sync.service.ts`

### D. Remove Persist
- [ ] Remove `persist(...)` wrapper (already partialize = tags only)

### E. Verify
- [ ] Create task → refresh → still there
- [ ] Submit completion → refresh → status updated
- [ ] Add comment → refresh → still there

---

## Final Cleanup (After All 19 Stores Migrated)

- [ ] Delete `startWriteThrough()` function body in `sync.service.ts`
- [ ] Delete all `_subscriptions` array management
- [ ] Delete `pauseWriteThrough()` / `resumeWriteThrough()` exports
- [ ] Keep `hydrateAllStores()` — still needed to populate cache on login
- [ ] Keep `startRealtime()` — still needed for multi-session sync
- [ ] Remove `safePersistStorage` from stores that no longer persist
- [ ] Run full test suite to verify nothing broke
- [ ] Deploy and monitor for 48 hours

---

## Progress Tracker

| # | Store | Service | UI Updated | Write-Through Removed | Persist Removed | Verified |
|---|-------|---------|------------|----------------------|-----------------|----------|
| 1 | payroll | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | audit | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | events | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | departments | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | job-titles | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | roles | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | location | ✅ | ✅ | ✅ | ✅ | ⬜ |
| 10 | timesheet | ✅ | ✅ | ✅ | ✅ | ⬜ |
| 11 | leave | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | loans | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 13 | employees | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 14 | deductions | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 15 | jobs | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 16 | auth | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 17 | attendance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 18 | messaging | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 19 | tasks | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Estimated Timeline

| Phase | Stores | Effort | Duration |
|-------|--------|--------|----------|
| Phase 1 | #1-4 (payroll, notifications, audit, events) | Low | 2-3 days |
| Phase 2 | #5-9 (projects, departments, job-titles, roles, location) | Low-Medium | 3-4 days |
| Phase 3 | #10-16 (timesheet, leave, loans, employees, deductions, jobs, auth) | Medium | 5-7 days |
| Phase 4 | #17-19 (attendance, messaging, tasks) | High | 5-7 days |
| Cleanup | Remove write-through, test, deploy | Low | 1-2 days |
| **Total** | | | **~3-4 weeks** |
