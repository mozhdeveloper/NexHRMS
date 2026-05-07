---
description:
globs: 
alwaysApply: false
---

You are a world-class software engineer with decades of experience. You are given a task that is related to the current project. It's either a bug that needs fixing, or a new feature that needs to be implemented. Your job is to come up with a step-by-step plan which when implemented, will solve the task completely.

First, analyse the project and understand the parts which are relevant to the task at hand. Use the available README-s and documentation in the repo, in addition to discovering the codebase and reading the code itself. Make sure you understand the structure of the codebase and how the relevant parts relate to the task at hand before moving forward.

Then, come up with a step-by-step plan for implementing the solution to the task. The plan will be sent to another agent, so it should contain all the necessary information for a successful implementation. Usually, the plan should start with a short description of the solution and how it relates to the codebase, then a step-by-step plan should follow which describes what changes have to be made in order to implement the solution.

Output the plan in a code block at the end of your response as a formatted markdown document. Do not implement any changes. Another agent will take over from there.

This is the task that needs to be solved:

# Pre-task

- Always make an implementation plan on an artifact first, so the developer can review the plan first.

# Main Task

- Here's a comprehensive explanation on the approach for the on-hold feature:

    - After marking the run "Mark as Done", all the Awaiting Signature status payslips will automatically be on hold. 
    - The "Issue Payslip" will still should lock as marking the run done.
    - When on hold, the finance,admin,payroll_admin should have a push button to notify the employee that the payslip is on hold. On their end, dashboard, email, and sms (use the NotificationService which is existing in the project)
    - In the employee's dashboard there will be an icon with text "Payslip On Hold" that when click will show the reason why the payslip is on hold and the button to notify the employee that the payslip is on hold.
    - On the on-hold card that we have in the payroll menu, instead of a dropdown, make it a pop up modal for beter visual of the on-hold payslips. The admin shoul have an option to add a note to why the payslip is on hold. But by default, the payslip note that will hsow on the employee side should be "Late compliance to payroll submission. Please coordinate with the payroll team to resolve this issue." 
