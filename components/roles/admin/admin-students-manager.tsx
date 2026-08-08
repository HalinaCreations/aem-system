"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/page-header";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { PaginationBar } from "@/components/shell/pagination-bar";
import type { CaseloadRow } from "@/lib/student/queries";
import type { Pagination } from "@/lib/pagination";
import type { FilterSpec } from "@/lib/toolbar-utils";
import CreateStudentModal from "@/components/roles/admin/create-student-modal";

type SectionOption = {
  id: string;
  gradeLevel: string;
  label: string;
};

type Props = {
  students: CaseloadRow[];
  sections: SectionOption[];
  syLabel: string;
  totalUnfiltered: number;
  totalFiltered: number;
  filtered: boolean;
  pagination: Pagination;
  search: string | null;
  filters: FilterSpec[];
  forwardParams: Record<string, string | undefined>;
};

export default function AdminStudentsManager({
  students,
  sections,
  syLabel,
  totalUnfiltered,
  totalFiltered,
  filtered,
  pagination,
  search,
  filters,
  forwardParams,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Student Directory"
        title={`All Students — ${syLabel}`}
        description={
          <>
            <span>Administrative oversight of all {totalUnfiltered.toLocaleString()} enrolled students. </span>
            {filtered && (
              <span className="text-emerald-700 font-semibold">
                {totalFiltered.toLocaleString()} match the current filter.
              </span>
            )}{" "}
            <span>Click any student to view their profile or click + Add Student to add a new learner.</span>
          </>
        }
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
          >
            + Add Student
          </button>
        }
      />

      <ListToolbar
        basePath="/admin/students"
        searchPlaceholder="Search student name or LRN…"
        searchValue={search}
        filters={filters}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">LRN</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Section / Grade</th>
                <th className="px-4 py-3">Sex</th>
                <th className="px-4 py-3">Absence Rate</th>
                <th className="px-4 py-3">Incidents</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((r, i) => (
                <tr key={r.studentId} className="border-t border-slate-100 hover:bg-emerald-50/20 transition-colors">
                  <td className="px-4 py-3.5 text-slate-400 font-medium">{pagination.skip + i + 1}</td>
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">{r.lrn}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">
                    <Link
                      href={`/admin/students/${r.studentId}`}
                      className="hover:text-emerald-700 hover:underline transition-colors"
                    >
                      {r.lastName}, {r.firstName} {r.middleName ? `${r.middleName.charAt(0)}.` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">
                    {r.gradeLevel} · {r.sectionName}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      r.sex === "MALE"
                        ? "bg-blue-50 border border-blue-100 text-blue-700"
                        : "bg-pink-50 border border-pink-100 text-pink-700"
                    }`}>
                      {r.sex}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium">
                    {r.totalAttendanceDays === 0 ? "—" : `${(r.absenceRate * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-semibold">{r.behavioralIncidentCount}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/students/${r.studentId}`}
                      className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-slate-400 italic" colSpan={8}>
                    {filtered
                      ? "No students match the current filter criteria."
                      : "No students enrolled in this school year."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3">
          <PaginationBar
            pagination={pagination}
            basePath="/admin/students"
            forwardParams={forwardParams}
          />
        </div>
      </div>

      {/* Modal Dialog */}
      <CreateStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sections={sections}
      />
    </div>
  );
}
