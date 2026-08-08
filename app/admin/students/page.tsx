import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getCaseload, getCaseloadCount } from "@/lib/student/queries";
import { getSectionsAndGradesForYear } from "@/lib/risk/queries";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { toForwardParams, type FilterSpec } from "@/lib/toolbar-utils";
import AdminStudentsManager from "@/components/roles/admin/admin-students-manager";

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("ADMIN");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">No active school year. Activate a school year in School Setup.</p>
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
    <AdminStudentsManager
      students={rows}
      sections={sectionsAndGrades.sections}
      syLabel={sy.label}
      totalUnfiltered={totalUnfiltered}
      totalFiltered={totalFiltered}
      filtered={filtered}
      pagination={pagination}
      search={search}
      filters={filters}
      forwardParams={forwardParams}
    />
  );
}
