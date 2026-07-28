// Verifies Phase 9: scheduled recompute + report generation.
//
// Run: npx tsx scripts/verify-phase-9.ts

import "dotenv/config";
import { PrismaClient, type Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { toCsv, reportFilename } from "../lib/reports/csv";
import { REPORTS, getReport, reportsForRole } from "../lib/reports/registry";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });
  console.log(`SY: ${sy.label}\n`);

  // ── CSV serialisation ─────────────────────────────────────────────────────
  console.log("── CSV safety ──\n");
  const tricky = toCsv(
    ["a", "b", "c"],
    [
      ["plain", 'has "quotes"', "has,comma"],
      ["line\nbreak", "=SUM(A1:A9)", "+1234"],
      [null, undefined, 0],
    ],
  );
  check("quotes are doubled and wrapped", tricky.includes('"has ""quotes"""'));
  check("commas force quoting", tricky.includes('"has,comma"'));
  check("newlines force quoting", tricky.includes('"line\nbreak"'));
  check("formula injection is neutralised", tricky.includes("'=SUM(A1:A9)"), "leading = prefixed");
  check("leading + is neutralised", tricky.includes("'+1234"));
  check("null and undefined become empty", tricky.includes(",,0"));
  check("rows are CRLF-separated", tricky.includes("\r\n"));
  check(
    "filename is slugged and dated",
    /^risk-roster_sy-2025-2026_\d{4}-\d{2}-\d{2}\.csv$/.test(reportFilename("risk-roster", "SY 2025-2026")),
    reportFilename("risk-roster", "SY 2025-2026"),
  );

  // ── Registry / role gating ────────────────────────────────────────────────
  console.log("\n── Report access ──\n");
  check("unknown report id resolves to nothing", getReport("not-a-report") === undefined);
  check("every report declares at least one role", REPORTS.every((r) => r.roles.length > 0));
  check("bias breakdown is principal-only", getReport("bias-breakdown")!.roles.join() === "PRINCIPAL");
  check(
    "teachers cannot run intervention outcomes",
    !getReport("intervention-outcomes")!.roles.includes("TEACHER"),
  );
  for (const role of ["ADMIN", "TEACHER", "COUNSELOR", "PRINCIPAL"] as Role[]) {
    const allowed = reportsForRole(role);
    check(
      `${role} sees only reports listing that role`,
      allowed.every((r) => r.roles.includes(role)),
      `${allowed.length} report(s)`,
    );
  }

  // ── Row scoping actually applies ──────────────────────────────────────────
  console.log("\n── Row-level scoping ──\n");
  const [teacher, counselor] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { email: "teacher@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "counselor@school.edu" } }),
  ]);
  const ctx = { schoolYearId: sy.id, schoolYearLabel: sy.label };

  const roster = getReport("risk-roster")!;
  const asCounselor = await roster.generate({ ...ctx, caller: { id: counselor.id, role: "COUNSELOR" } });
  const asTeacher = await roster.generate({ ...ctx, caller: { id: teacher.id, role: "TEACHER" } });

  check("counselor roster covers the year", asCounselor.rows.length > 0, `${asCounselor.rows.length} row(s)`);
  check(
    "teacher roster is strictly smaller",
    asTeacher.rows.length > 0 && asTeacher.rows.length < asCounselor.rows.length,
    `teacher ${asTeacher.rows.length} vs counselor ${asCounselor.rows.length}`,
  );

  const teacherSections = await prisma.teacherAssignment.findMany({
    where: { userId: teacher.id, schoolYearId: sy.id },
    select: { section: { select: { name: true } } },
  });
  const allowedNames = new Set(teacherSections.map((t) => t.section.name));
  const sectionColumn = asTeacher.header.indexOf("Section");
  check(
    "every teacher row is in a section they teach",
    asTeacher.rows.every((r) => allowedNames.has(String(r[sectionColumn]))),
    [...allowedNames].join(", "),
  );

  // A teacher with no assignments must get zero rows, not the whole school.
  const orphan = await prisma.user.create({
    data: { email: `orphan-${Date.now()}@school.edu`, name: "Orphan Teacher", role: "TEACHER", hashedPassword: "x" },
  });
  const asOrphan = await roster.generate({ ...ctx, caller: { id: orphan.id, role: "TEACHER" } });
  check("teacher with no sections gets zero rows", asOrphan.rows.length === 0, `${asOrphan.rows.length}`);
  await prisma.user.delete({ where: { id: orphan.id } });

  // ── Restricted content never reaches an export ────────────────────────────
  console.log("\n── Export content discipline ──\n");
  const outcomes = getReport("intervention-outcomes")!;
  const outcomePayload = await outcomes.generate({ ...ctx, caller: { id: counselor.id, role: "COUNSELOR" } });
  const headerText = outcomePayload.header.join(" ").toLowerCase();
  check("no rationale column", !headerText.includes("rationale"));
  check("no counseling column", !headerText.includes("counsel"));

  const sensitive = await prisma.interventionSensitive.findFirst({ select: { rationale: true } });
  if (sensitive?.rationale) {
    const body = toCsv(outcomePayload.header, outcomePayload.rows);
    check("no rationale text leaks into the CSV body", !body.includes(sensitive.rationale.slice(0, 30)));
  } else {
    console.log("SKIP  no sensitive rationale seeded to test against");
  }

  // ── Every report runs for every role that may run it ───────────────────────
  console.log("\n── All reports execute ──\n");
  for (const report of REPORTS) {
    const role = report.roles.includes("PRINCIPAL") ? "PRINCIPAL" : report.roles[0];
    const user = await prisma.user.findFirstOrThrow({ where: { role } });
    const payload = await report.generate({ ...ctx, caller: { id: user.id, role } });
    check(
      `${report.id} generates as ${role}`,
      payload.header.length > 0 && Array.isArray(payload.rows),
      `${payload.rows.length} row(s) × ${payload.header.length} cols`,
    );
    check(
      `${report.id} rows match header width`,
      payload.rows.every((r) => r.length === payload.header.length),
    );
  }

  // ── Scheduled recompute plumbing ──────────────────────────────────────────
  console.log("\n── Scheduled recompute ──\n");
  check("CRON_SECRET is configured for this environment", Boolean(process.env.CRON_SECRET));

  const scheduled = await prisma.auditLog.findFirst({
    where: { action: "RISK_RECOMPUTED", metadata: { path: ["trigger"], equals: "scheduled" } },
    orderBy: { createdAt: "desc" },
  });
  if (scheduled) {
    check("scheduled run is attributed to no user (system)", scheduled.userId === null);
  } else {
    console.log("SKIP  no scheduled run recorded yet — exercised by the live smoke test");
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASS" : `${failures} FAILURE(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
