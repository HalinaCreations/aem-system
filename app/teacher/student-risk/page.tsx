import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getTeacherClasses } from "@/lib/teacher/queries";
import { getSectionRiskForTeacher } from "@/lib/risk/queries";
import { RiskBadge } from "@/components/shell/explainability-panel";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { toForwardParams, type FilterSpec } from "@/lib/toolbar-utils";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import PageHeader from "@/components/shell/page-header";

const BAND_OPTIONS = [
  { value: "HIGH", label: "HIGH" },
  { value: "MODERATE", label: "MODERATE" },
  { value: "LOW", label: "LOW" },
  { value: "UNSCORED", label: "Unscored" },
];

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

export default async function TeacherStudentRiskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();

  if (!sy) {
    return <EmptyState>No active school year. Ask the admin to activate one.</EmptyState>;
  }

  const sp = await searchParams;
  const search = param(sp, "q");
  const band = param(sp, "band");
  const sectionFilter = param(sp, "sectionId");

  const classes = await getTeacherClasses(session.user.id, sy.id);
  if (classes.length === 0) {
    return <EmptyState>You have no assigned classes for {sy.label}.</EmptyState>;
  }

  const seen = new Set<string>();
  const uniqueSections = classes.filter((c) => {
    if (seen.has(c.sectionId)) return false;
    seen.add(c.sectionId);
    return true;
  });

  // Fetch risk data per assigned section (no DB-level filter — small N per
  // teacher, in-app filter is fine and lets one query power multiple toggles).
  const sectionRisks = await Promise.all(
    uniqueSections.map((c) =>
      getSectionRiskForTeacher(session.user.id, c.sectionId, sy.id).then((rows) => ({
        sectionId: c.sectionId,
        sectionName: c.sectionName,
        gradeLevel: c.gradeLevel,
        rows,
      }))
    )
  );

  const totalStudents = sectionRisks.reduce((acc, s) => acc + s.rows.length, 0);
  const scoredStudents = sectionRisks.reduce(
    (acc, s) => acc + s.rows.filter((r) => r.riskBand !== null).length,
    0,
  );

  // Apply search/filter to each section's rows.
  const searchLc = search?.toLowerCase() ?? "";
  const filteredSections = sectionRisks
    .filter((s) => !sectionFilter || s.sectionId === sectionFilter)
    .map((s) => ({
      ...s,
      rows: s.rows.filter((r) => {
        if (searchLc) {
          const matchName = `${r.firstName} ${r.lastName}`.toLowerCase().includes(searchLc);
          const matchLrn = r.lrn.includes(searchLc);
          if (!matchName && !matchLrn) return false;
        }
        if (band) {
          if (band === "UNSCORED") return r.riskBand === null;
          if (r.riskBand !== band) return false;
        }
        return true;
      }),
    }));

  const allRows = filteredSections.flatMap((s) =>
    s.rows.map((r) => ({
      ...r,
      sectionName: s.sectionName,
      gradeLevel: s.gradeLevel,
    }))
  );

  const sortedRows = [...allRows].sort((a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1));

  const totalMatching = sortedRows.length;
  const filtered = !!(search || band || sectionFilter);

  const requestedPage = parsePageParam(sp.page);
  const pagination = paginate(totalMatching, requestedPage, PAGE_SIZE);
  const paginatedRows = sortedRows.slice(pagination.skip, pagination.skip + pagination.take);

  const filters: FilterSpec[] = [
    {
      name: "band",
      label: "Risk band",
      value: band,
      options: BAND_OPTIONS,
      placeholder: "Select risk band (all)",
    },
    {
      name: "sectionId",
      label: "Section",
      value: sectionFilter,
      options: uniqueSections.map((s) => ({
        value: s.sectionId,
        label: `${s.gradeLevel} · ${s.sectionName}`,
      })),
      placeholder: "Select section (all)",
    },
  ];
  
  const forwardParams = toForwardParams("q", search, filters);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Student Support"
        title="Student Risk"
        description={
          <>
            <span>Risk scores and factor breakdowns for students in your sections. </span>
            <span>
              {scoredStudents === 0
                ? "No scores computed yet — ask the admin to run the engine."
                : `${scoredStudents} of ${totalStudents} students scored for ${sy.label}.`}
            </span>
            {filtered && (
              <span className="ml-1 text-amber-600 font-semibold">
                · {totalMatching} match{totalMatching === 1 ? "" : "es"} the current filter.
              </span>
            )}
          </>
        }
      />
      <ListToolbar
        basePath="/teacher/student-risk"
        searchPlaceholder="Search name or LRN…"
        searchValue={search}
        filters={filters}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">LRN</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Risk Band</th>
                <th className="px-4 py-3">Academic</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Behavioral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((r, i) => (
                <tr key={r.enrollmentId} className="transition-colors hover:bg-slate-50/60 align-middle">
                  <td className="px-4 py-3 tabular-nums text-slate-400">{pagination.skip + i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/teacher/students/${r.studentId}`}
                      className="text-slate-900 hover:text-emerald-700 hover:underline"
                    >
                      {r.lastName}, {r.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.lrn}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                    {r.gradeLevel} &middot; {r.sectionName}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge band={r.riskBand} score={r.riskScore} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-650 font-semibold">
                    {r.factors ? `${r.factors.academic}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-650 font-semibold">
                    {r.factors ? `${r.factors.attendance}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-650 font-semibold">
                    {r.factors ? `${r.factors.behavioral}` : "—"}
                  </td>
                </tr>
              ))}
              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                    No students match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalMatching > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <PaginationBar pagination={pagination} basePath="/teacher/student-risk" forwardParams={forwardParams} />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Risk scores are recomputed by the admin. Factor columns show the 0–100 sub-score for each
        dimension. Full explainability is available in the Student Profile view.
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}
