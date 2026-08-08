"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type StudentItem = {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  sex: "MALE" | "FEMALE";
  learningModality: string;
};

type Props = {
  teacher: { id: string; name: string; email: string };
  assignment: {
    id: string;
    isAdviser: boolean;
    section: { gradeLevel: string; name: string };
    subject: { code: string; name: string } | null;
    schoolYear: { label: string };
  };
  students: StudentItem[];
};

export default function AssignmentRosterView({ teacher, assignment, students }: Props) {
  const [search, setSearch] = useState("");

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      const fullName = `${s.lastName}, ${s.firstName} ${s.middleName ?? ""}`.toLowerCase();
      const lrn = s.lrn.toLowerCase();
      return fullName.includes(q) || lrn.includes(q);
    });
  }, [students, search]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Header Info Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 flex flex-col gap-5 shadow-sm">
        <div>
          <Link
            href={`/admin/users/${teacher.id}`}
            className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-850 transition-colors flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to {teacher.name}&apos;s assignments
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl leading-tight">
                {assignment.section.gradeLevel} · {assignment.section.name}
              </h1>
              {assignment.isAdviser && (
                <span className="inline-flex rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Class Adviser
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Class Roster &amp; Enrolled Learners
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700">
              Teacher: <span className="text-slate-900">{teacher.name}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 font-bold font-mono text-indigo-700">
              {assignment.subject ? `${assignment.subject.code} — ${assignment.subject.name}` : "Adviser-only seat"}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700">
              Term: {assignment.schoolYear.label}
            </span>
          </div>
        </div>
      </section>

      {/* Roster Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Enrolled Students ({students.length})</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredStudents.length} of {students.length} students matching criteria
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or LRN..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-450">
            No active student enrollments found for this section in {assignment.schoolYear.label}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                <tr>
                  <th className="px-4 py-3">LRN</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Sex</th>
                  <th className="px-4 py-3">Learning Modality</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">{s.lrn}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {s.lastName}, {s.firstName} {s.middleName ? `${s.middleName.charAt(0)}.` : ""}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        s.sex === "MALE"
                          ? "bg-blue-50 border border-blue-100 text-blue-700"
                          : "bg-pink-50 border border-pink-100 text-pink-700"
                      }`}>
                        {s.sex}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                      <span className="inline-flex rounded-lg bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {s.learningModality.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      No students match search query &quot;{search}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
