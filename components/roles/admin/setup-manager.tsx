"use client";

import { useMemo, useState, useTransition, type TransitionStartFunction } from "react";
import {
  createSchoolYearAction,
  activateSchoolYearAction,
  createSectionAction,
  createSubjectAction,
} from "@/app/actions/admin/setup";
import PageHeader from "@/components/shell/page-header";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type YearRow = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sectionCount: number;
  subjectCount: number;
  enrollmentCount: number;
};

type SectionRow = {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYearId: string;
  enrollmentCount: number;
};

type SubjectRow = {
  id: string;
  code: string;
  name: string;
  schoolYearId: string;
};

type Props = {
  years: YearRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
};

export default function SetupManager({ years, sections, subjects }: Props) {
  const defaultYearId = years.find((y) => y.isActive)?.id ?? years[0]?.id ?? "";
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId);
  const [mainTab, setMainTab] = useState<"years" | "sections-subjects">("years");
  const [activeTab, setActiveTab] = useState<"sections" | "subjects">("sections");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  const [pending, startTransition] = useTransition();

  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId) ?? null,
    [years, selectedYearId],
  );
  const yearSections = useMemo(
    () => sections.filter((s) => s.schoolYearId === selectedYearId),
    [sections, selectedYearId],
  );
  const yearSubjects = useMemo(
    () => subjects.filter((s) => s.schoolYearId === selectedYearId),
    [subjects, selectedYearId],
  );

  // Dynamic header action based on active tabs
  const headerAction = useMemo(() => {
    if (mainTab === "years") {
      return (
        <button
          onClick={() => setIsTermModalOpen(true)}
          className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
        >
          + Add Year
        </button>
      );
    } else {
      if (!selectedYear) return null;
      if (activeTab === "sections") {
        return (
          <button
            onClick={() => setIsSectionModalOpen(true)}
            className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
          >
            + Add Section
          </button>
        );
      } else {
        return (
          <button
            onClick={() => setIsSubjectModalOpen(true)}
            className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
          >
            + Add Subject
          </button>
        );
      }
    }
  }, [mainTab, activeTab, selectedYear]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        label="School Operations"
        title="School setup"
        description="Configure academic parameters, manage school terms, and organize section classes and subjects."
        actions={headerAction}
      />

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setMainTab("years")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            mainTab === "years"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Academic Years ({years.length})
        </button>
        <button
          onClick={() => setMainTab("sections-subjects")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            mainTab === "sections-subjects"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Sections &amp; Subjects
        </button>
      </div>

      {/* Tab Contents */}
      {mainTab === "years" ? (
        <div className="w-full">
          <SchoolYearsList years={years} pending={pending} startTransition={startTransition} />
        </div>
      ) : (
        <div className="w-full">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sections &amp; Subjects</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select a school year to configure its offerings.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Target Year</span>
                <Select
                  value={selectedYearId}
                  onValueChange={(val) => setSelectedYearId(val)}
                >
                  <SelectTrigger className="w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all">
                    <SelectValue placeholder="No years yet" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.length === 0 && <SelectItem value="">No years yet</SelectItem>}
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.label} {y.isActive ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedYear ? (
              <div className="flex flex-col gap-5">
                {/* Tab Switchers & View Mode Options */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Sub Tab Switchers */}
                  <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                    <button
                      onClick={() => setActiveTab("sections")}
                      className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        activeTab === "sections"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                      }`}
                    >
                      Sections ({yearSections.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("subjects")}
                      className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        activeTab === "subjects"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                      }`}
                    >
                      Subjects ({yearSubjects.length})
                    </button>
                  </div>

                  {/* View Mode Switcher (Grid / Table) */}
                  <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        viewMode === "grid"
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>Grid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      title="Table View"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        viewMode === "table"
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span>Table</span>
                    </button>
                  </div>
                </div>

                {/* Sub Tab Content */}
                {activeTab === "sections" ? (
                  <SectionsPanel year={selectedYear} sections={yearSections} viewMode={viewMode} />
                ) : (
                  <SubjectsPanel year={selectedYear} subjects={yearSubjects} viewMode={viewMode} />
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-455">
                Create a school year to configure sections and subjects.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modals */}
      {isTermModalOpen && (
        <CreateSchoolYearModal
          onClose={() => setIsTermModalOpen(false)}
          pending={pending}
          startTransition={startTransition}
        />
      )}

      {isSectionModalOpen && selectedYear && (
        <AddSectionModal
          year={selectedYear}
          onClose={() => setIsSectionModalOpen(false)}
          pending={pending}
          startTransition={startTransition}
        />
      )}

      {isSubjectModalOpen && selectedYear && (
        <AddSubjectModal
          year={selectedYear}
          onClose={() => setIsSubjectModalOpen(false)}
          pending={pending}
          startTransition={startTransition}
        />
      )}
    </div>
  );
}

function SchoolYearsList({
  years,
  pending,
  startTransition,
}: {
  years: YearRow[];
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleActivate = (id: string) => {
    setError(null);
    const fd = new FormData();
    fd.set("schoolYearId", id);
    startTransition(async () => {
      const r = await activateSchoolYearAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Academic Term Records</h3>
        <p className="text-xs text-slate-500 mt-1">Select and activate terms. Only one year is active at any time.</p>
      </div>

      {error && <p className="text-xs text-red-655 font-bold" role="alert">{error}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {years.map((y) => (
          <li
            key={y.id}
            className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
              y.isActive
                ? "border-indigo-100 bg-indigo-50/20"
                : "border-slate-100 bg-slate-50/20 hover:border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-900">{y.label}</span>
              {y.isActive ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleActivate(y.id)}
                  disabled={pending}
                  className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors disabled:opacity-55"
                >
                  Activate
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-100/60 pt-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Duration</p>
                <p className="mt-0.5 font-medium text-slate-600">
                  {new Date(y.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - {new Date(y.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex flex-col items-end text-right">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Stats</p>
                <p className="mt-0.5 font-medium text-slate-600">
                  {y.sectionCount} Sect · {y.subjectCount} Subj · {y.enrollmentCount} Enroll
                </p>
              </div>
            </div>
          </li>
        ))}
        {years.length === 0 && (
          <li className="col-span-full py-8 text-center text-xs text-slate-450 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            No school years found.
          </li>
        )}
      </ul>
    </section>
  );
}

function CreateSchoolYearModal({
  onClose,
  pending,
  startTransition,
}: {
  onClose: () => void;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const r = await createSchoolYearAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      form.reset();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <section className="relative z-10 bg-white rounded-3xl border border-slate-200 p-7 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <button onClick={onClose} type="button" className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">New Academic Year</h2>
            <p className="mt-1 text-xs text-slate-500">Configure term labels and calendar bounds.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Term Label</span>
            <input
              name="label"
              required
              maxLength={40}
              placeholder="e.g. SY 2026-2027"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Start Date</span>
              <input
                name="startDate"
                type="date"
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">End Date</span>
              <input
                name="endDate"
                type="date"
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="activate"
              className="h-4.5 w-4.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-100 focus:ring-2"
            />
            <span className="text-xs font-semibold text-slate-600">Set as active school year</span>
          </label>

          <div className="flex flex-col gap-3 mt-3 border-t border-slate-100 pt-4">
            {error && <p className="text-xs text-red-650 font-bold" role="alert">{error}</p>}
            <div className="flex gap-2.5 justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all"
              >
                {pending ? "Creating…" : "Create Term"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function AddSectionModal({
  year,
  onClose,
  pending,
  startTransition,
}: {
  year: YearRow;
  onClose: () => void;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("schoolYearId", year.id);
    setError(null);
    startTransition(async () => {
      const r = await createSectionAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      form.reset();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-955/45 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <section className="relative z-10 bg-white rounded-3xl border border-slate-200 p-7 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <button onClick={onClose} type="button" className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Add New Section</h2>
            <p className="mt-1 text-xs text-slate-500">Adding a classroom section under {year.label}.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Grade Level</span>
            <input
              name="gradeLevel"
              placeholder="e.g. Grade 9"
              required
              maxLength={40}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Section Name</span>
            <input
              name="name"
              placeholder="e.g. Newton"
              required
              maxLength={40}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-3 mt-3 border-t border-slate-100 pt-4">
            {error && <p className="text-xs text-red-655 font-bold" role="alert">{error}</p>}
            <div className="flex gap-2.5 justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all"
              >
                {pending ? "Adding…" : "Add Section"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function AddSubjectModal({
  year,
  onClose,
  pending,
  startTransition,
}: {
  year: YearRow;
  onClose: () => void;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("schoolYearId", year.id);
    setError(null);
    startTransition(async () => {
      const r = await createSubjectAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      form.reset();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-955/45 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <section className="relative z-10 bg-white rounded-3xl border border-slate-200 p-7 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <button onClick={onClose} type="button" className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Add New Subject</h2>
            <p className="mt-1 text-xs text-slate-500">Adding a course subject under {year.label}.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Subject Code</span>
            <input
              name="code"
              placeholder="e.g. MATH9"
              required
              maxLength={20}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Subject Name</span>
            <input
              name="name"
              placeholder="e.g. Mathematics 9"
              required
              maxLength={80}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-3 mt-3 border-t border-slate-100 pt-4">
            {error && <p className="text-xs text-red-655 font-bold" role="alert">{error}</p>}
            <div className="flex gap-2.5 justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all"
              >
                {pending ? "Adding…" : "Add Subject"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function SectionsPanel({
  year,
  sections,
  viewMode,
}: {
  year: YearRow;
  sections: SectionRow[];
  viewMode: "grid" | "table";
}) {
  if (viewMode === "table") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Grade Level</th>
                <th className="px-4 py-3">Section Name</th>
                <th className="px-4 py-3">Enrolled Students</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-3.5 text-slate-400 font-medium text-xs">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      {s.gradeLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium text-xs">
                    {s.enrollmentCount} student enrollment(s)
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                    No sections yet for {year.label}. Click the &quot;+ Add Section&quot; button above to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {sections.map((s) => (
          <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center justify-between gap-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <div>
              <p className="font-bold text-slate-900">{s.gradeLevel} · {s.name}</p>
              <p className="text-xs text-slate-550 mt-0.5">{s.enrollmentCount} student enrollment(s)</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
          </li>
        ))}
        {sections.length === 0 && (
          <li className="col-span-full py-8 text-center text-xs text-slate-455 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            No sections yet for {year.label}. Click the &quot;+ Add Section&quot; button above to add one.
          </li>
        )}
      </ul>
    </div>
  );
}

function SubjectsPanel({
  year,
  subjects,
  viewMode,
}: {
  year: YearRow;
  subjects: SubjectRow[];
  viewMode: "grid" | "table";
}) {
  if (viewMode === "table") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Subject Code</th>
                <th className="px-4 py-3">Subject Name</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-3.5 text-slate-400 font-medium text-xs">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold font-mono text-indigo-700 uppercase tracking-wider">
                      {s.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{s.name}</td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                    No subjects yet for {year.label}. Click the &quot;+ Add Subject&quot; button above to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {subjects.map((s) => (
          <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <span className="inline-flex rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold font-mono text-indigo-700 uppercase tracking-wider self-start">
              {s.code}
            </span>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">{s.name}</p>
          </li>
        ))}
        {subjects.length === 0 && (
          <li className="col-span-full py-8 text-center text-xs text-slate-455 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            No subjects yet for {year.label}. Click the &quot;+ Add Subject&quot; button above to add one.
          </li>
        )}
      </ul>
    </div>
  );
}
