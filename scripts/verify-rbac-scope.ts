// Query-layer RBAC regression suite.
//
// Exercises the helpers production actually calls. The previous version tested
// `lib/rbac.ts`'s composable where-fragments, which no application code ever
// used — a green run proved nothing about the running system. That module is
// gone; enforcement lives in the per-role query helpers, each of which takes
// the caller's userId and verifies ownership itself.
//
// Run: npx tsx scripts/verify-rbac-scope.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getTeacherClasses,
  getTeacherClassDetail,
  getReferableStudents,
  canTeacherReferStudent,
} from "../lib/teacher/queries";
import { getSectionRiskForTeacher } from "../lib/risk/queries";
import { getCounselingNotes } from "../lib/student/queries";
import { getIntervention } from "../lib/intervention/queries";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });
  console.log(`School year: ${sy.label}\n`);

  const [teacher, counselor, principal, admin] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { email: "teacher@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "counselor@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "principal@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "admin@school.edu" } }),
  ]);

  // ── Teacher section scoping ───────────────────────────────────────────────
  console.log("── Teacher class scoping ──\n");
  const classes = await getTeacherClasses(teacher.id, sy.id);
  const teacherSectionIds = new Set(classes.map((c) => c.sectionId));
  check("teacher sees at least one assigned class", classes.length > 0, `${classes.length} class(es)`);

  const allSections = await prisma.section.findMany({ where: { schoolYearId: sy.id }, select: { id: true, name: true } });
  const foreignSection = allSections.find((s) => !teacherSectionIds.has(s.id));
  check("a section the teacher does NOT teach exists (fixture sanity)", !!foreignSection, foreignSection?.name);

  // Every student the teacher can reach must be in one of their sections.
  const detail = await getTeacherClassDetail(teacher.id, classes[0].assignmentId, sy.id);
  check("own assignment resolves", detail !== null);
  check(
    "roster confined to the assignment's section",
    detail!.enrollments.every((e) => e.sectionId === classes[0].sectionId),
  );

  // Another teacher's assignment must not resolve.
  const foreignAssignment = await prisma.teacherAssignment.findFirst({
    where: { schoolYearId: sy.id, userId: { not: teacher.id } },
  });
  const leaked = foreignAssignment
    ? await getTeacherClassDetail(teacher.id, foreignAssignment.id, sy.id)
    : null;
  check("another teacher's assignment returns null", leaked === null);

  // ── Risk data scoping ─────────────────────────────────────────────────────
  console.log("\n── Teacher risk scoping ──\n");
  const ownRisk = await getSectionRiskForTeacher(teacher.id, classes[0].sectionId, sy.id);
  check("risk rows returned for own section", ownRisk.length > 0, `${ownRisk.length} student(s)`);
  if (foreignSection) {
    const foreignRisk = await getSectionRiskForTeacher(teacher.id, foreignSection.id, sy.id);
    check("risk rows empty for a section they don't teach", foreignRisk.length === 0, `got ${foreignRisk.length}`);
  }

  // ── Referral scope guard ──────────────────────────────────────────────────
  console.log("\n── Referral scope guard ──\n");
  const referable = await getReferableStudents(teacher.id, sy.id);
  check("referable list non-empty", referable.length > 0, `${referable.length} student(s)`);
  check("referable student passes the guard", await canTeacherReferStudent(teacher.id, referable[0].id, sy.id));

  const referableIds = new Set(referable.map((r) => r.id));
  const outsideStudent = await prisma.student.findFirst({
    where: { id: { notIn: [...referableIds] }, enrollments: { some: { schoolYearId: sy.id } } },
  });
  if (outsideStudent) {
    check(
      "student outside the teacher's sections is rejected",
      !(await canTeacherReferStudent(teacher.id, outsideStudent.id, sy.id)),
    );
  }

  // ── Counseling notes: counselor-only ──────────────────────────────────────
  console.log("\n── Counseling note access ──\n");
  const noted = await prisma.counselingNote.findFirst({ select: { enrollmentId: true } });
  if (noted) {
    const asCounselor = await getCounselingNotes(noted.enrollmentId, "COUNSELOR", counselor.id);
    check("counselor reads note bodies", asCounselor.length > 0, `${asCounselor.length} note(s)`);
    for (const [role, user] of [
      ["TEACHER", teacher],
      ["PRINCIPAL", principal],
      ["ADMIN", admin],
    ] as const) {
      const rows = await getCounselingNotes(noted.enrollmentId, role, user.id);
      check(`${role} gets zero notes`, rows.length === 0, `got ${rows.length}`);
    }
  } else {
    console.log("SKIP  no counseling notes seeded");
  }

  // ── Intervention sensitive-field stripping ────────────────────────────────
  console.log("\n── Intervention sensitive fields ──\n");
  const withSensitive = await prisma.intervention.findFirst({
    where: { sensitive: { isNot: null } },
    select: { id: true, ownerId: true },
  });
  if (withSensitive) {
    const asPrincipal = await getIntervention(withSensitive.id, "PRINCIPAL", principal.id);
    check("principal sees sensitive block", asPrincipal?.sensitive != null);

    const asTeacher = await getIntervention(withSensitive.id, "TEACHER", teacher.id);
    check("teacher never sees sensitive block", asTeacher === null || asTeacher.sensitive == null);

    const asAdmin = await getIntervention(withSensitive.id, "ADMIN", admin.id);
    check("admin sees metadata only — no sensitive", asAdmin === null || asAdmin.sensitive == null);
    check("admin participant list stripped", asAdmin === null || asAdmin.participants.length === 0);
  } else {
    console.log("SKIP  no intervention with sensitive fields seeded");
  }

  console.log(`\n${failures === 0 ? "ALL RBAC CHECKS PASS" : `${failures} FAILURE(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
