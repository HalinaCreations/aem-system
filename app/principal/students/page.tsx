import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getCaseload, getCaseloadCount } from "@/lib/student/queries";
import { getSectionsAndGradesForYear } from "@/lib/risk/queries";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { toForwardParams, type FilterSpec } from "@/lib/toolbar-utils";
import PageHeader from "@/components/shell/page-header";

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

export default async function PrincipalStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">No active school year.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const requestedPage = parsePageParam(sp.page);
  const search = param(sp, "q");
  const sectionId = param(sp, "sectionId");
  const gradeLevel = param(sp, "gradeLevel");

  const sectionsAndGrades = await getSectionsAndGradesForYear(sy.id);
  const filterArgs = { search, sectionId, gradeLevel };

  const [totalUnfiltered, totalFiltered] = await Promise.all([
    getCaseloadCount(sy.id),
    getCaseloadCount(sy.id, filterArgs),
  ]);
  const pagination = paginate(totalFiltered, requestedPage, PAGE_SIZE);
  const rows = await getCaseload(sy.id, {
    skip: pagination.skip,
    take: pagination.take,
    ...filterArgs,
  });

  const filters: FilterSpec[] = [
    {
      name: "gradeLevel",
      label: "Grade",
      value: gradeLevel,
      options: sectionsAndGrades.gradeLevels.map((g) => ({ value: g, label: g })),
    },
    {
      name: "sectionId",
      label: "Section",
      value: sectionId,
      options: sectionsAndGrades.sections.map((s) => ({ value: s.id, label: s.label })),
    },
  ];
  const forwardParams = toForwardParams("q", search, filters);
  const filtered = totalFiltered !== totalUnfiltered;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Cohort Oversight"
        title={`Students — ${sy.label}`}
        description={
          <>
            <span>Read-only oversight of all {totalUnfiltered.toLocaleString()} enrolled students. </span>
            {filtered && (
              <span className="text-amber-600 font-semibold">
                {totalFiltered.toLocaleString()} match the current filter.
              </span>
            )}{" "}
            <span>Click a row to open the full profile.</span>
          </>
        }
      />
      <ListToolbar
        basePath="/principal/students"
        searchPlaceholder="Search name or LRN…"
        searchValue={search}
        filters={filters}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Section</th>
                <th className="px-3 py-2 font-medium">Sex</th>
                <th className="px-3 py-2 font-medium">Absence</th>
                <th className="px-3 py-2 font-medium">Behavioral</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-slate-400">{pagination.skip + i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/principal/students/${r.studentId}`}
                      className="font-medium text-slate-900 hover:text-rose-700"
                    >
                      {r.lastName}, {r.firstName}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono">{r.lrn}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.gradeLevel} · {r.sectionName}</td>
                  <td className="px-3 py-2 text-slate-600">{r.sex}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.totalAttendanceDays === 0 ? "—" : `${(r.absenceRate * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.behavioralIncidentCount}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/principal/students/${r.studentId}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1 text-xs font-bold text-white transition-all shadow-sm"
                    >
                      <span>View</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={7}>
                    {filtered
                      ? "No students match the current filter. Adjust or clear it above."
                      : "No students on this page."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-3 py-3">
          <PaginationBar
            pagination={pagination}
            basePath="/principal/students"
            forwardParams={forwardParams}
          />
        </div>
      </div>
    </div>
  );
}
