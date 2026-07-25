// Verifies the historical-interventions CSV import (Phase 8.0.2).
//
// Exercises the validator's error paths, the scope-grouping logic, and a real
// transactional commit against the active school year (then rolls it back, so
// the script is safe to re-run).
//
// Run: npx tsx scripts/verify-interventions-import.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseCsv } from "../lib/import/csv";
import { validateInterventionsCsv, groupInterventions } from "../lib/import/interventions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function loadRefs(schoolYearId: string) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId },
    select: {
      id: true,
      studentId: true,
      sectionId: true,
      gradeLevel: true,
      student: { select: { lrn: true } },
    },
  });
  const enrollmentByLrn = new Map<
    string,
    { enrollmentId: string; studentId: string; sectionId: string; gradeLevel: string }
  >();
  for (const e of enrollments) {
    enrollmentByLrn.set(e.student.lrn, {
      enrollmentId: e.id,
      studentId: e.studentId,
      sectionId: e.sectionId,
      gradeLevel: e.gradeLevel,
    });
  }
  return { enrollmentByLrn, sample: enrollments };
}

let failures = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });
  const refs = await loadRefs(sy.id);
  console.log(`SY: ${sy.label} · ${refs.sample.length} enrollments\n`);

  // Three real LRNs from the same section so SECTION grouping is meaningful.
  const bySection = new Map<string, typeof refs.sample>();
  for (const e of refs.sample) {
    const arr = bySection.get(e.sectionId) ?? [];
    arr.push(e);
    bySection.set(e.sectionId, arr);
  }
  const biggest = [...bySection.values()].sort((a, b) => b.length - a.length)[0];
  const [s1, s2, s3] = biggest;

  // ── Error paths ───────────────────────────────────────────────────────────
  console.log("── Validator error detection ──\n");
  const badCsv = [
    "lrn,type,scope,startDate,endDate,outcome",
    `999999999999,ACADEMIC_SUPPORT,STUDENT,2025-08-01,2025-09-01,IMPROVING`, // not enrolled
    `${s1.student.lrn},NOT_A_TYPE,STUDENT,2025-08-01,2025-09-01,IMPROVING`, // bad type
    `${s1.student.lrn},ACADEMIC_SUPPORT,PLANET,2025-08-01,2025-09-01,IMPROVING`, // bad scope
    `${s1.student.lrn},ACADEMIC_SUPPORT,STUDENT,not-a-date,2025-09-01,IMPROVING`, // bad date
    `${s1.student.lrn},ACADEMIC_SUPPORT,STUDENT,2025-09-01,2025-08-01,IMPROVING`, // end before start
    `${s1.student.lrn},ACADEMIC_SUPPORT,STUDENT,2025-08-01,2025-09-01,WHATEVER`, // bad outcome
    `12345,ACADEMIC_SUPPORT,STUDENT,2025-08-01,2025-09-01,IMPROVING`, // bad LRN length
  ].join("\n");

  const badResult = validateInterventionsCsv(parseCsv(badCsv), refs);
  check("all 7 malformed rows rejected", badResult.invalid.length === 7, `got ${badResult.invalid.length}`);
  check("no valid rows leaked through", badResult.valid.length === 0, `got ${badResult.valid.length}`);
  for (const inv of badResult.invalid) {
    console.log(`      row ${inv.row}: ${inv.errors.join("; ")}`);
  }

  // Missing-column detection.
  const missingCol = validateInterventionsCsv(parseCsv("lrn,type,scope\n123,X,Y"), refs);
  check(
    "missing required columns reported",
    missingCol.invalid.length === 1 && missingCol.invalid[0].errors[0].includes("Missing required column"),
  );

  // ── Grouping ──────────────────────────────────────────────────────────────
  console.log("\n── Scope grouping ──\n");
  const goodCsv = [
    "lrn,type,scope,startDate,endDate,outcome",
    // One individual plan.
    `${s1.student.lrn},ACADEMIC_SUPPORT,STUDENT,2025-08-04,2025-10-10,IMPROVING`,
    // A second individual plan for the same student — must NOT merge.
    `${s1.student.lrn},COUNSELING_SESSION,STUDENT,2025-08-04,2025-10-10,STABLE`,
    // One section plan spanning three students — must collapse to ONE plan.
    `${s1.student.lrn},ATTENDANCE_PROGRAM,SECTION,2025-09-01,2025-11-28,STABLE`,
    `${s2.student.lrn},ATTENDANCE_PROGRAM,SECTION,2025-09-01,2025-11-28,IMPROVING`,
    `${s3.student.lrn},ATTENDANCE_PROGRAM,SECTION,2025-09-01,2025-11-28,DECLINING`,
    // Alias handling: "remedial" → SUBJECT_REMEDIATION, "individual" → STUDENT.
    `${s2.student.lrn},remedial,individual,2025-08-04,2025-09-30,COMPLETED`,
  ].join("\n");

  const goodResult = validateInterventionsCsv(parseCsv(goodCsv), refs);
  check("6 clean rows validate", goodResult.valid.length === 6, `got ${goodResult.valid.length} valid, ${goodResult.invalid.length} invalid`);
  if (goodResult.invalid.length > 0) {
    for (const inv of goodResult.invalid) console.log(`      row ${inv.row}: ${inv.errors.join("; ")}`);
  }

  const grouped = groupInterventions(goodResult.valid.map((r) => r.data));
  check("6 rows fold into 4 plans", grouped.length === 4, `got ${grouped.length}`);
  const sectionPlan = grouped.find((g) => g.scope === "SECTION");
  check("section plan carries 3 participants", sectionPlan?.participants.length === 3, `got ${sectionPlan?.participants.length}`);
  check(
    "section plan targets the sectionId",
    sectionPlan?.scopeTargetId === s1.sectionId,
    `${sectionPlan?.scopeTargetId} vs ${s1.sectionId}`,
  );
  const aliasPlan = grouped.find((g) => g.type === "SUBJECT_REMEDIATION");
  check("alias 'remedial'/'individual' normalised", aliasPlan?.scope === "STUDENT", `scope=${aliasPlan?.scope}`);

  // ── Transactional commit (rolled back) ────────────────────────────────────
  console.log("\n── Transactional commit ──\n");
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const before = await prisma.intervention.count({ where: { schoolYearId: sy.id } });

  let createdPlans = 0;
  let createdParts = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const plan of grouped) {
        const created = await tx.intervention.create({
          data: {
            scope: plan.scope,
            scopeTargetId: plan.scopeTargetId,
            type: plan.type,
            status: "COMPLETED",
            schoolYearId: sy.id,
            ownerId: admin.id,
            startDate: plan.startDate,
            endDate: plan.endDate,
          },
        });
        createdPlans++;
        for (const p of plan.participants) {
          await tx.interventionParticipation.create({
            data: { interventionId: created.id, enrollmentId: p.enrollmentId, outcome: p.outcome },
          });
          createdParts++;
        }
      }
      const during = await tx.intervention.count({ where: { schoolYearId: sy.id } });
      check("plans visible inside transaction", during === before + 4, `${before} → ${during}`);
      // Deliberate abort — this script must not mutate the demo database.
      throw new Error("ROLLBACK_SENTINEL");
    });
  } catch (err) {
    if ((err as Error).message !== "ROLLBACK_SENTINEL") throw err;
  }

  const after = await prisma.intervention.count({ where: { schoolYearId: sy.id } });
  check("rollback restored original count", after === before, `${before} → ${after}`);
  console.log(`      (would have created ${createdPlans} plans / ${createdParts} participations)`);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASS" : `${failures} FAILURE(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
