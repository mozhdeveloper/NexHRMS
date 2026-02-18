"use client";

import { useState, useMemo } from "react";
import { useEmployeesStore } from "@/store/employees.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Search, SlidersHorizontal, Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { getInitials, formatCurrency, formatDate } from "@/lib/format";
import { DEPARTMENTS } from "@/lib/constants";
import Link from "next/link";
import { toast } from "sonner";
import type { Employee } from "@/types";

type SortKey = keyof Employee;
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 20, 50];

export default function EmployeesManagePage() {
    const { employees, searchQuery, setSearchQuery, statusFilter, setStatusFilter, workTypeFilter, setWorkTypeFilter, departmentFilter, setDepartmentFilter, toggleStatus } = useEmployeesStore();
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [salaryRange, setSalaryRange] = useState([0, 200000]);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        id: true, name: true, status: true, role: true, department: false, teamLeader: true, productivity: true, joinDate: true, salary: true, workType: true,
    });

    const filtered = useMemo(() => {
        let result = employees.filter((e) => {
            const matchSearch = !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.email.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchStatus = statusFilter === "all" || e.status === statusFilter;
            const matchWork = workTypeFilter === "all" || e.workType === workTypeFilter;
            const matchDept = departmentFilter === "all" || e.department === departmentFilter;
            const matchSalary = e.salary >= salaryRange[0] && e.salary <= salaryRange[1];
            return matchSearch && matchStatus && matchWork && matchDept && matchSalary;
        });

        result.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal == null || bVal == null) return 0;
            const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
            return sortDir === "asc" ? cmp : -cmp;
        });

        return result;
    }, [employees, searchQuery, statusFilter, workTypeFilter, departmentFilter, salaryRange, sortKey, sortDir]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return null;
        return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Employee Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} employees found</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="border border-border/50">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by name, email, or ID..." className="pl-9" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as "all" | "active" | "inactive"); setPage(1); }}>
                            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={workTypeFilter} onValueChange={(v) => { setWorkTypeFilter(v as "all" | "WFH" | "WFO" | "HYBRID"); setPage(1); }}>
                            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Work Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="WFH">WFH</SelectItem>
                                <SelectItem value="WFO">WFO</SelectItem>
                                <SelectItem value="HYBRID">Hybrid</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Advanced Filter Sheet */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <SlidersHorizontal className="h-4 w-4" /> Advanced
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[340px]">
                                <SheetHeader><SheetTitle>Advanced Filters</SheetTitle></SheetHeader>
                                <div className="space-y-6 mt-6">
                                    <div>
                                        <label className="text-sm font-medium">Department</label>
                                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Departments</SelectItem>
                                                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Salary Range</label>
                                        <div className="mt-3 px-1">
                                            <Slider min={0} max={200000} step={5000} value={salaryRange} onValueChange={setSalaryRange} />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                                <span>{formatCurrency(salaryRange[0])}</span>
                                                <span>{formatCurrency(salaryRange[1])}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Visible Columns</label>
                                        <div className="mt-2 space-y-2">
                                            {Object.keys(visibleCols).map((col) => (
                                                <label key={col} className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" checked={visibleCols[col]} onChange={() => setVisibleCols({ ...visibleCols, [col]: !visibleCols[col] })} className="rounded" />
                                                    {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, " $1")}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border border-border/50">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {visibleCols.id && <TableHead className="cursor-pointer text-xs" onClick={() => handleSort("id")}>ID<SortIcon col="id" /></TableHead>}
                                    {visibleCols.name && <TableHead className="cursor-pointer text-xs" onClick={() => handleSort("name")}>Name<SortIcon col="name" /></TableHead>}
                                    {visibleCols.status && <TableHead className="text-xs">Status</TableHead>}
                                    {visibleCols.role && <TableHead className="cursor-pointer text-xs" onClick={() => handleSort("role")}>Role<SortIcon col="role" /></TableHead>}
                                    {visibleCols.department && <TableHead className="text-xs">Department</TableHead>}
                                    {visibleCols.teamLeader && <TableHead className="text-xs">Team Leader</TableHead>}
                                    {visibleCols.productivity && <TableHead className="cursor-pointer text-xs" onClick={() => handleSort("productivity")}>Productivity<SortIcon col="productivity" /></TableHead>}
                                    {visibleCols.joinDate && <TableHead className="cursor-pointer text-xs" onClick={() => handleSort("joinDate")}>Join Date<SortIcon col="joinDate" /></TableHead>}
                                    {visibleCols.salary && <TableHead className="cursor-pointer text-xs" onClick={() => handleSort("salary")}>Salary<SortIcon col="salary" /></TableHead>}
                                    {visibleCols.workType && <TableHead className="text-xs">Work Type</TableHead>}
                                    <TableHead className="text-xs w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginated.map((emp) => (
                                    <TableRow key={emp.id} className="group">
                                        {visibleCols.id && <TableCell className="text-xs text-muted-foreground">{emp.id}</TableCell>}
                                        {visibleCols.name && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-muted">{getInitials(emp.name)}</AvatarFallback></Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{emp.name}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleCols.status && (
                                            <TableCell>
                                                <Badge variant="secondary" className={emp.status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"} >
                                                    {emp.status}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        {visibleCols.role && <TableCell className="text-xs">{emp.role}</TableCell>}
                                        {visibleCols.department && <TableCell className="text-xs">{emp.department}</TableCell>}
                                        {visibleCols.teamLeader && <TableCell className="text-xs text-muted-foreground">{emp.teamLeader ? employees.find((e) => e.id === emp.teamLeader)?.name || "—" : "—"}</TableCell>}
                                        {visibleCols.productivity && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${emp.productivity}%` }} />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{emp.productivity}%</span>
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleCols.joinDate && <TableCell className="text-xs text-muted-foreground">{formatDate(emp.joinDate)}</TableCell>}
                                        {visibleCols.salary && <TableCell className="text-xs font-medium">{formatCurrency(emp.salary)}</TableCell>}
                                        {visibleCols.workType && (
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px]">{emp.workType}</Badge>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Link href={`/employees/${emp.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                                                </Link>
                                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { toggleStatus(emp.id); toast.success(`${emp.name} ${emp.status === "active" ? "deactivated" : "activated"}`); }}>
                                                    {emp.status === "active" ? "Deactivate" : "Activate"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages || 1}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    );
}
