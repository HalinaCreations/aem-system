// Asserts a fully loaded school year. Run after importing all three CSVs.
// Usage: tsx scripts/verify-school-year-load.ts "SY 2026-2027"

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EXPECTED = {
  students: 576,
  sections: 17,
  // Teaching staff only: staff.csv also loads 1 PRINCIPAL, 1 COUNSELOR, and 1
  // ADMIN who never receive a TeacherAssignment row, so 31 total staff !=
  // this year-scoped count.
  teachingStaff: 28,
  consents: 1728,
  sectionsByGrade: {
    "Grade 7": 4,
    "Grade 8": 5,
    "Grade 9": 4,
    "Grade 10": 4,
  } as Record<string, number>,
};

async function main() {
  const label = process.argv[2] ?? "SY 2026-2027";
  const sy = await prisma.schoolYear.findUnique({ where: { label } });
  if (!sy) throw new Error(`School year "${label}" not found`);

  const [
    enrollments,
    sections,
    subjects,
    assignments,
    grades,
    attendance,
    sectionRows,
    adviserAssignments,
    enrollmentsPerSection,
    staffUsers,
    yearConsents,
  ] = await Promise.all([
    prisma.studentEnrollment.count({ where: { schoolYearId: sy.id } }),
    prisma.section.count({ where: { schoolYearId: sy.id } }),
    prisma.subject.count({ where: { schoolYearId: sy.id } }),
    prisma.teacherAssignment.count({ where: { schoolYearId: sy.id } }),
    prisma.grade.count({ where: { enrollment: { schoolYearId: sy.id } } }),
    prisma.attendance.count({ where: { enrollment: { schoolYearId: sy.id } } }),
    prisma.section.findMany({ where: { schoolYearId: sy.id }, select: { id: true, name: true, gradeLevel: true } }),
    prisma.teacherAssignment.findMany({
      where: { schoolYearId: sy.id, isAdviser: true },
      select: { sectionId: true },
    }),
    prisma.studentEnrollment.groupBy({ by: ["sectionId"], where: { schoolYearId: sy.id }, _count: { _all: true } }),
    prisma.teacherAssignment.findMany({ where: { schoolYearId: sy.id }, select: { userId: true }, distinct: ["userId"] }),
    prisma.consentRecord.count({ where: { student: { enrollments: { some: { schoolYearId: sy.id } } } } }),
  ]);

  const rows = [
    ["enrollments", enrollments, EXPECTED.students],
    ["sections", sections, EXPECTED.sections],
    ["teaching staff (distinct users with an assignment this year)", staffUsers.length, EXPECTED.teachingStaff],
    ["consents (students enrolled this year)", yearConsents, EXPECTED.consents],
    ["grades (must be 0)", grades, 0],
    ["attendance (must be 0)", attendance, 0],
  ] as const;

  let failed = false;
  for (const [name, actual, expected] of rows) {
    const ok = actual === expected;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${actual} (expected ${expected})`);
  }
  console.log(`info subjects: ${subjects}`);
  console.log(`info assignments: ${assignments}`);

  // Advisers: exactly one per section, not just 17 rows in aggregate.
  const sectionById = new Map(sectionRows.map((s) => [s.id, `${s.gradeLevel} ${s.name}`]));
  const adviserCountBySection = new Map<string, number>();
  for (const a of adviserAssignments) {
    adviserCountBySection.set(a.sectionId, (adviserCountBySection.get(a.sectionId) ?? 0) + 1);
  }
  const sectionsWithoutOneAdviser: string[] = [];
  for (const s of sectionRows) {
    const count = adviserCountBySection.get(s.id) ?? 0;
    if (count !== 1) sectionsWithoutOneAdviser.push(`${sectionById.get(s.id)} (${count})`);
  }
  const adviserGroupCount = adviserCountBySection.size;
  if (adviserGroupCount !== EXPECTED.sections || sectionsWithoutOneAdviser.length > 0) {
    failed = true;
    console.log(
      `FAIL advisers: ${adviserGroupCount} section(s) with an adviser (expected ${EXPECTED.sections}), ` +
        `${sectionsWithoutOneAdviser.length} section(s) without exactly one adviser` +
        (sectionsWithoutOneAdviser.length > 0 ? `: ${sectionsWithoutOneAdviser.join(", ")}` : ""),
    );
  } else {
    console.log(`ok   advisers: every section has exactly one adviser (${adviserGroupCount})`);
  }

  // Section distribution by grade level.
  const actualByGrade = new Map<string, number>();
  for (const s of sectionRows) actualByGrade.set(s.gradeLevel, (actualByGrade.get(s.gradeLevel) ?? 0) + 1);
  const gradeMismatches: string[] = [];
  const allGrades = new Set([...Object.keys(EXPECTED.sectionsByGrade), ...actualByGrade.keys()]);
  for (const grade of allGrades) {
    const expectedCount = EXPECTED.sectionsByGrade[grade] ?? 0;
    const actualCount = actualByGrade.get(grade) ?? 0;
    if (actualCount !== expectedCount) gradeMismatches.push(`${grade}: ${actualCount} (expected ${expectedCount})`);
  }
  if (gradeMismatches.length > 0) {
    failed = true;
    console.log(`FAIL sections by grade level mismatch: ${gradeMismatches.join(", ")}`);
  } else {
    console.log("ok   sections by grade level match expected distribution");
  }

  // Every section must hold at least one enrollment.
  const enrolledSectionIds = new Set(enrollmentsPerSection.map((g) => g.sectionId));
  const emptySections = sectionRows.filter((s) => !enrolledSectionIds.has(s.id)).map((s) => sectionById.get(s.id));
  if (emptySections.length > 0) {
    failed = true;
    console.log(`FAIL empty section(s) with no enrollments: ${emptySections.join(", ")}`);
  } else {
    console.log("ok   every section has at least one enrollment");
  }

  // Every enrollment must point at a section belonging to this year, and every
  // teacher assignment must point at a section and subject belonging to this year.
  const [orphanedEnrollments, orphanedAssignments] = await Promise.all([
    prisma.studentEnrollment.count({
      where: { schoolYearId: sy.id, section: { schoolYearId: { not: sy.id } } },
    }),
    prisma.teacherAssignment.count({
      where: {
        schoolYearId: sy.id,
        OR: [{ section: { schoolYearId: { not: sy.id } } }, { subject: { is: { schoolYearId: { not: sy.id } } } }],
      },
    }),
  ]);
  const orphaned = orphanedEnrollments + orphanedAssignments;
  if (orphaned !== 0) {
    failed = true;
    console.log(
      `FAIL cross-year leakage: ${orphanedEnrollments} orphaned enrollment(s), ${orphanedAssignments} orphaned assignment(s)`,
    );
  } else {
    console.log("ok   no cross-year section/subject leakage");
  }

  if (failed) throw new Error("one or more assertions failed");
  console.log("PASS");
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
