"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addAssignmentAction, removeAssignmentAction } from "@/app/actions/admin/users";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Role, UserStatus } from "@prisma/client";

type YearOption = {
  id: string;
  label: string;
  isActive: boolean;
  sections: { id: string; gradeLevel: string; name: string }[];
  subjects: { id: string; code: string; name: string }[];
};

type AssignmentRow = {
  id: string;
  isAdviser: boolean;
  schoolYearLabel: string;
  schoolYearId: string;
  section: { id: string; label: string };
  subject: { id: string; label: string } | null;
  studentCount?: number;
};

type Props = {
  user: { id: string; email: string; name: string; role: Role; status: UserStatus };
  years: YearOption[];
  assignments: AssignmentRow[];
};

export default function UserAssignmentsPanel({ user, years, assignments }: Props) {
  const router = useRouter();
  const isTeacher = user.role === "TEACHER";
  const defaultYearId = years.find((y) => y.isActive)?.id ?? years[0]?.id ?? "";

  const [yearId, setYearId] = useState(defaultYearId);
  const year = useMemo(() => years.find((y) => y.id === yearId) ?? null, [years, yearId]);

  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isAdviser, setIsAdviser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filterSection, setFilterSection] = useState("ALL");
  const [filterSubject, setFilterSubject] = useState("ALL");

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach(a => set.add(a.section.label));
    return Array.from(set).sort();
  }, [assignments]);

  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach(a => {
      if (a.subject) set.add(a.subject.label);
    });
    return Array.from(set).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterSection !== "ALL" && a.section.label !== filterSection) return false;
      if (filterSubject !== "ALL") {
        if (filterSubject === "ADVISER_ONLY") {
          if (a.subject !== null) return false;
        } else {
          if (!a.subject || a.subject.label !== filterSubject) return false;
        }
      }
      return true;
    });
  }, [assignments, filterSection, filterSubject]);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isTeacher) return;
    if (!sectionId || !yearId) {
      setError("Pick a school year and section.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.set("userId", user.id);
    fd.set("schoolYearId", yearId);
    fd.set("sectionId", sectionId);
    if (subjectId) fd.set("subjectId", subjectId);
    if (isAdviser) fd.set("isAdviser", "true");

    startTransition(async () => {
      const r = await addAssignmentAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSectionId("");
      setSubjectId("");
      setIsAdviser(false);
      setIsModalOpen(false); // Close modal on success!
    });
  };

  const handleRemove = (assignmentId: string) => {
    setError(null);
    const fd = new FormData();
    fd.set("assignmentId", assignmentId);
    startTransition(async () => {
      const r = await removeAssignmentAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  // Generate initials for avatar
  const initials = useMemo(() => {
    const parts = user.name.split(" ");
    const first = parts[0]?.charAt(0) ?? "";
    const last = parts[parts.length - 1]?.charAt(0) ?? "";
    return (first + last).toUpperCase();
  }, [user.name]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Header Profile card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/admin/users" className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-850 transition-colors flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to users
          </Link>
          {isTeacher && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
            >
              + Add Assignment
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5 border-t border-slate-100 pt-5">
          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl leading-tight">{user.name}</h1>
            <p className="mt-1.5 text-sm text-slate-650 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">{user.email}</span>
              <span className="text-slate-300">•</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-600">{user.role}</span>
              <span className="text-slate-300">•</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                user.status === "ACTIVE"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                {user.status === "ACTIVE" ? "Active" : "Suspended"}
              </span>
            </p>
          </div>
        </div>
      </section>

      {!isTeacher ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Section assignments only apply to teacher accounts.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Current Assignments</h2>
              <p className="mt-1 text-xs text-slate-500">List of terms, sections, and courses assigned to this teacher.</p>
            </div>

            {assignments.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Section</span>
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger className="w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition-all flex items-center justify-between">
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Sections</SelectItem>
                      {uniqueSections.map((sec) => (
                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Subject</span>
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition-all flex items-center justify-between">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Subjects</SelectItem>
                      <SelectItem value="ADVISER_ONLY">Adviser-only seats</SelectItem>
                      {uniqueSubjects.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(filterSection !== "ALL" || filterSubject !== "ALL") && (
                  <button
                    onClick={() => {
                      setFilterSection("ALL");
                      setFilterSubject("ALL");
                    }}
                    className="mt-4.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-450">
              No assignments found for this teacher. Click the &quot;+ Add Assignment&quot; button above to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Section / Class</th>
                    <th className="px-4 py-3">Term / Year</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Adviser Role</th>
                    <th className="px-4 py-3">Enrolled Students</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/admin/users/${user.id}/assignments/${a.id}`)}
                      className="border-t border-slate-100 hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900 group-hover:text-indigo-650 transition-colors">
                        <Link
                          href={`/admin/users/${user.id}/assignments/${a.id}`}
                          className="hover:underline inline-flex items-center gap-1.5"
                        >
                          {a.section.label}
                          <svg className="h-3.5 w-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-medium">{a.schoolYearLabel}</td>
                      <td className="px-4 py-3.5">
                        {a.subject ? (
                          <span className="inline-flex rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                            {a.subject.label}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            Adviser-only seat
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {a.isAdviser ? (
                          <span className="inline-flex rounded-lg bg-emerald-50 border border-emerald-250 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">
                            Class Adviser
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {a.studentCount ?? 0} learner{(a.studentCount ?? 0) === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/users/${user.id}/assignments/${a.id}`}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 hover:text-indigo-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Students
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemove(a.id)}
                            disabled={pending}
                            className="rounded-lg border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-650 hover:text-red-750 transition-colors disabled:opacity-55"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                        No assignments match the selected section/subject filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

          <section className="relative z-10 bg-white rounded-3xl border border-slate-200 p-7 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsModalOpen(false)}
              type="button"
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 transition-colors"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Add Assignment</h2>
                <p className="mt-1 text-xs text-slate-500">Assign section classes and subjects to this teacher.</p>
              </div>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">School Year</span>
                <Select
                  value={yearId}
                  onValueChange={(val) => {
                    setYearId(val);
                    setSectionId("");
                    setSubjectId("");
                  }}
                >
                  <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all w-full flex items-center justify-between">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.label} {y.isActive ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Section</span>
                <Select
                  value={sectionId}
                  onValueChange={(val) => setSectionId(val)}
                  name="sectionId"
                >
                  <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all w-full flex items-center justify-between">
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select a section</SelectItem>
                    {year?.sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.gradeLevel} · {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Subject (optional)</span>
                <Select
                  value={subjectId}
                  onValueChange={(val) => setSubjectId(val)}
                  name="subjectId"
                >
                  <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all w-full flex items-center justify-between">
                    <SelectValue placeholder="Adviser-only seat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Adviser-only seat</SelectItem>
                    {year?.subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAdviser}
                  onChange={(e) => setIsAdviser(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-lg border-slate-350 text-indigo-600 focus:ring-indigo-100 focus:ring-2"
                />
                <span className="text-xs font-semibold text-slate-600">Set as Homeroom Adviser of this section</span>
              </label>

              <div className="flex flex-col gap-3 mt-3 border-t border-slate-100 pt-4">
                {error && <p className="text-xs text-red-655 font-bold" role="alert">{error}</p>}
                <div className="flex gap-2.5 justify-end w-full">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all"
                  >
                    {pending ? "Adding…" : "Add Assignment"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
