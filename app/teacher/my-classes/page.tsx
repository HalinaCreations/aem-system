import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getTeacherClasses } from "@/lib/teacher/queries";
import PageHeader from "@/components/shell/page-header";

export default async function MyClassesPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return <EmptyState message="No active school year. Ask the admin to activate one." />;
  }

  const classes = await getTeacherClasses(session.user.id, sy.id);

  if (classes.length === 0) {
    return <EmptyState message={`You have no class assignments for ${sy.label}. Ask the admin to assign you to a section.`} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Classroom Actions"
        title="My Classes"
        description={`${classes.length} assignment${classes.length === 1 ? "" : "s"} for ${sy.label}. Open a class workspace to record attendance, input quarterly marks, or file behavioural incidents.`}
      />

      {/* Modern, sleek list layout instead of cards */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm" data-tour="teacher-classes-list">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Classroom Assignments</span>
          <span className="text-xs font-semibold text-slate-500">{sy.label} Term</span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {classes.map((c, idx) => {
            const shortGrade = c.gradeLevel.match(/\d+/)?.[0] ?? c.gradeLevel.slice(0, 2);
            return (
              <Link
                key={c.assignmentId}
                href={`/teacher/my-classes/${c.assignmentId}`}
                data-tour={idx === 0 ? "teacher-first-class-card" : undefined}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Styled Grade Badge */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold text-sm uppercase">
                    G{shortGrade}
                  </div>

                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Grade {c.gradeLevel} &ndash; {c.sectionName}
                      </h3>
                      {c.isAdviser && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/10">
                          Section Adviser
                        </span>
                      )}
                    </div>
                    
                    <p className="mt-0.5 text-xs text-slate-500">
                      {c.subjectCode ? (
                        <>
                          <span className="font-semibold text-slate-700">{c.subjectCode}</span>
                          <span className="text-slate-400"> &middot; </span>
                          <span>{c.subjectName}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Adviser-only assignment</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-100 sm:border-none pt-3 sm:pt-0">
                  {/* Student Count Badge */}
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-100 text-xs font-semibold text-slate-600">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{c.studentCount} student{c.studentCount === 1 ? "" : "s"}</span>
                  </div>

                  {/* Clean CTA arrow */}
                  <div className="text-slate-300 group-hover:text-emerald-600 transition-colors hidden sm:block">
                    <svg className="w-5 h-5 translate-x-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
