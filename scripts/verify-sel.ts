// Verifies the SEL module (Phase 8.1).
//
// The access matrix is the point of this script: SEL is the most sensitive
// non-counseling data in the system, and the decision "principal sees levels
// but never notes" is enforced in `getSELAssessments`, not in the UI. If that
// ever moves up into a component, this fails.
//
// Run: npx tsx scripts/verify-sel.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseCsv } from "../lib/import/csv";
import { validateSELCsv } from "../lib/import/sel";
import { getSELAssessments } from "../lib/student/queries";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });
  const [counselor, principal, teacher, admin] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { email: "counselor@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "principal@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "teacher@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "admin@school.edu" } }),
  ]);
  console.log(`SY: ${sy.label}\n`);

  // Find a seeded assessment that carries narrative notes.
  const withNotes = await prisma.sELAssessment.findFirst({
    where: { notes: { not: null }, enrollment: { schoolYearId: sy.id } },
    select: { enrollmentId: true, notes: true },
  });
  if (!withNotes) {
    console.log("FAIL  no SEL assessment with notes seeded — run scripts/seed-demo.ts");
    process.exit(1);
  }

  // ── Access matrix ─────────────────────────────────────────────────────────
  console.log("── Access matrix ──\n");

  const asCounselor = await getSELAssessments(withNotes.enrollmentId, "COUNSELOR", counselor.id);
  check("counselor sees assessments", asCounselor.length > 0, `${asCounselor.length} row(s)`);
  check("counselor sees narrative notes", asCounselor.some((a) => a.notes !== null));

  const asPrincipal = await getSELAssessments(withNotes.enrollmentId, "PRINCIPAL", principal.id);
  check("principal sees the same rows", asPrincipal.length === asCounselor.length, `${asPrincipal.length} row(s)`);
  check("principal sees dimension levels", asPrincipal.every((a) => a.emotionalWellbeing != null));
  check(
    "principal NEVER receives notes",
    asPrincipal.every((a) => a.notes === null),
    `${asPrincipal.filter((a) => a.notes !== null).length} leaked`,
  );

  for (const [role, user] of [
    ["TEACHER", teacher],
    ["ADMIN", admin],
  ] as const) {
    const rows = await getSELAssessments(withNotes.enrollmentId, role, user.id);
    check(`${role} gets zero rows`, rows.length === 0, `got ${rows.length}`);
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  console.log("\n── Audit ──\n");
  const reads = await prisma.auditLog.count({ where: { action: "SEL_ASSESSMENT_READ" } });
  check("reads are audited", reads > 0, `${reads} SEL_ASSESSMENT_READ row(s)`);

  const authors = await prisma.sELAssessment.findMany({
    select: { assessedBy: { select: { role: true } } },
    distinct: ["assessedById"],
  });
  check(
    "only counselors author SEL assessments",
    authors.every((a) => a.assessedBy.role === "COUNSELOR"),
    authors.map((a) => a.assessedBy.role).join(", "),
  );

  // ── Import validator ──────────────────────────────────────────────────────
  console.log("\n── Import validator ──\n");
  const enrollment = await prisma.studentEnrollment.findFirstOrThrow({
    where: { schoolYearId: sy.id },
    select: { id: true, student: { select: { lrn: true } } },
  });
  const refs = {
    enrollmentByLrn: new Map([[enrollment.student.lrn, enrollment.id]]),
    counselorByEmail: new Map([[counselor.email.toLowerCase(), counselor.id]]),
  };
  const lrn = enrollment.student.lrn;

  const badCsv = [
    "lrn,assessedByEmail,assessedAt,emotionalWellbeing,stressLevel,peerRelationships,selfAssessment",
    `999999999999,${counselor.email},2025-09-15,STABLE,STABLE,STABLE,`, // not enrolled
    `${lrn},${teacher.email},2025-09-15,STABLE,STABLE,STABLE,`, // not a counselor
    `${lrn},${counselor.email},nope,STABLE,STABLE,STABLE,`, // bad date
    `${lrn},${counselor.email},2025-09-15,SUPERB,STABLE,STABLE,`, // bad level
    `${lrn},${counselor.email},2025-09-15,STABLE,STABLE,STABLE,MAYBE`, // bad optional level
  ].join("\n");
  const bad = validateSELCsv(parseCsv(badCsv), refs);
  check("all 5 malformed rows rejected", bad.invalid.length === 5, `got ${bad.invalid.length}`);
  for (const inv of bad.invalid) console.log(`      row ${inv.row}: ${inv.errors.join("; ")}`);

  check(
    "a teacher email is rejected as assessor",
    bad.invalid.some((i) => i.errors.some((e) => e.includes("not an active counselor"))),
  );

  const goodCsv = [
    "lrn,assessedByEmail,assessedAt,emotionalWellbeing,stressLevel,peerRelationships,selfAssessment,notes",
    `${lrn},${counselor.email},2025-09-15,AT_RISK,CRITICAL,STABLE,AT_RISK,Context line`,
    `${lrn},${counselor.email.toUpperCase()},09/15/2025,thriving,stable,at_risk,,`, // case + US date + blank optional
  ].join("\n");
  const good = validateSELCsv(parseCsv(goodCsv), refs);
  check("2 clean rows validate", good.valid.length === 2, `${good.valid.length} valid, ${good.invalid.length} invalid`);
  if (good.invalid.length) for (const i of good.invalid) console.log(`      row ${i.row}: ${i.errors.join("; ")}`);
  check("blank selfAssessment stays null", good.valid[1]?.data.selfAssessment === null);
  check("assessor email is case-insensitive", good.valid[1]?.data.assessedById === counselor.id);

  console.log(`\n${failures === 0 ? "ALL SEL CHECKS PASS" : `${failures} FAILURE(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
