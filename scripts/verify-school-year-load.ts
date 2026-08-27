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
  staff: 31,
  consents: 1728,
};

async function main() {
  const label = process.argv[2] ?? "SY 2026-2027";
  const sy = await prisma.schoolYear.findUnique({ where: { label } });
  if (!sy) throw new Error(`School year "${label}" not found`);

  const [enrollments, sections, subjects, assignments, advisers, users, consents, grades, attendance] =
    await Promise.all([
      prisma.studentEnrollment.count({ where: { schoolYearId: sy.id } }),
      prisma.section.count({ where: { schoolYearId: sy.id } }),
      prisma.subject.count({ where: { schoolYearId: sy.id } }),
      prisma.teacherAssignment.count({ where: { schoolYearId: sy.id } }),
      prisma.teacherAssignment.count({ where: { schoolYearId: sy.id, isAdviser: true } }),
      prisma.user.count(),
      prisma.consentRecord.count(),
      prisma.grade.count({ where: { enrollment: { schoolYearId: sy.id } } }),
      prisma.attendance.count({ where: { enrollment: { schoolYearId: sy.id } } }),
    ]);

  const rows = [
    ["enrollments", enrollments, EXPECTED.students],
    ["sections", sections, EXPECTED.sections],
    ["advisers", advisers, EXPECTED.sections],
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
  console.log(`info users (all years): ${users}`);
  console.log(`info consents (all years): ${consents}`);

  // Every enrollment must point at a section belonging to this year.
  const orphaned = await prisma.studentEnrollment.count({
    where: { schoolYearId: sy.id, section: { schoolYearId: { not: sy.id } } },
  });
  if (orphaned !== 0) {
    failed = true;
    console.log(`FAIL orphaned enrollments (section in a different year): ${orphaned}`);
  } else {
    console.log("ok   no cross-year section leakage");
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
