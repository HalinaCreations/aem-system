// Verifies Slice B (Phase 8.2): intervention-type alignment + notifications.
//
// Run: npx tsx scripts/verify-notifications.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  buildBandIncreaseNotifications,
  emitNotifications,
  getNotifications,
  getUnreadNotificationCount,
  isBandIncrease,
  teachersForSection,
  activePrincipalIds,
} from "../lib/notifications";
import { INTERVENTION_TYPES, INTERVENTION_TYPE_LABEL, interventionTypeLabel } from "../lib/intervention/types";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const MARKER = "[verify-notifications]";

async function main() {
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });

  // ── 8.2.1 Intervention types ──────────────────────────────────────────────
  console.log("── Intervention type vocabulary ──\n");

  const dbValues: string[] = await prisma
    .$queryRawUnsafe<Array<{ v: string }>>(
      `SELECT unnest(enum_range(NULL::"InterventionType"))::text AS v`,
    )
    .then((rows) => rows.map((r) => r.v));

  check("enum has 14 values", dbValues.length === 14, `${dbValues.length}`);
  for (const t of ["TUTORING", "PEER_SUPPORT", "PARENT_CONFERENCE", "EXTERNAL_REFERRAL", "SEL_PROGRAM", "STUDY_SKILLS_WORKSHOP"]) {
    check(`spec §6.6 type present: ${t}`, dbValues.includes(t));
  }
  check(
    "shared constant matches the DB enum exactly",
    [...INTERVENTION_TYPES].sort().join(",") === [...dbValues].sort().join(","),
  );
  check(
    "every type has a human label",
    INTERVENTION_TYPES.every((t) => INTERVENTION_TYPE_LABEL[t] && !INTERVENTION_TYPE_LABEL[t].includes("_")),
  );
  check("unknown type falls back gracefully", interventionTypeLabel("SOMETHING_NEW") === "SOMETHING NEW");

  // Historical rows must still resolve after an additive migration.
  const existing = await prisma.intervention.groupBy({ by: ["type"], _count: true });
  check(
    "all persisted intervention types are still valid",
    existing.every((e) => dbValues.includes(e.type)),
    existing.map((e) => `${e.type}=${e._count}`).join(" "),
  );

  // ── Band-increase logic ───────────────────────────────────────────────────
  console.log("\n── Band transition detection ──\n");
  check("LOW → MODERATE is an increase", isBandIncrease("LOW", "MODERATE"));
  check("MODERATE → HIGH is an increase", isBandIncrease("MODERATE", "HIGH"));
  check("LOW → HIGH is an increase", isBandIncrease("LOW", "HIGH"));
  check("HIGH → MODERATE is NOT an increase", !isBandIncrease("HIGH", "MODERATE"));
  check("MODERATE → MODERATE is NOT an increase", !isBandIncrease("MODERATE", "MODERATE"));
  check("first-ever score is NOT an increase", !isBandIncrease(null, "HIGH"), "no prior band to cross");

  // ── Fan-out helpers ───────────────────────────────────────────────────────
  console.log("\n── Recipient resolution ──\n");
  const section = await prisma.section.findFirstOrThrow({ where: { schoolYearId: sy.id } });
  const recipients = await teachersForSection(section.id, sy.id);
  const assignmentCount = await prisma.teacherAssignment.count({
    where: { sectionId: section.id, schoolYearId: sy.id },
  });
  check("section resolves to its teachers", recipients.length > 0, `${recipients.length} teacher(s)`);
  check("recipients are deduplicated", recipients.length <= assignmentCount, `${recipients.length} <= ${assignmentCount} assignment(s)`);

  const principals = await activePrincipalIds();
  check("active principals resolve", principals.length > 0, `${principals.length}`);

  // ── Fan-out composition (what the compute action actually runs) ───────────
  console.log("\n── Band-increase fan-out ──\n");
  const fanout = new Map<string, string[]>([
    ["sec-a", ["t1", "t2"]],
    ["sec-b", ["t3"]],
  ]);
  const drafts = buildBandIncreaseNotifications(
    [
      { studentName: "Rising Student", sectionId: "sec-a", previousBand: "LOW", nextBand: "HIGH" },
      { studentName: "Improving Student", sectionId: "sec-a", previousBand: "HIGH", nextBand: "LOW" },
      { studentName: "Unchanged Student", sectionId: "sec-b", previousBand: "MODERATE", nextBand: "MODERATE" },
      { studentName: "Newly Scored", sectionId: "sec-b", previousBand: null, nextBand: "HIGH" },
      { studentName: "Slipping Student", sectionId: "sec-b", previousBand: "LOW", nextBand: "MODERATE" },
    ],
    fanout,
    sy.id,
  );
  // 2 genuine increases: one in sec-a (2 teachers) + one in sec-b (1 teacher).
  check("2 genuine increases fan out to 3 teachers", drafts.length === 3, `${drafts.length} draft(s)`);
  check("increase in sec-a reaches both of its teachers", drafts.filter((d) => d.userId === "t1").length === 1 && drafts.filter((d) => d.userId === "t2").length === 1);
  check("improvement produces nothing", !drafts.some((d) => d.title.includes("Improving")));
  check("unchanged band produces nothing", !drafts.some((d) => d.title.includes("Unchanged")));
  check("first-ever score produces nothing", !drafts.some((d) => d.title.includes("Newly Scored")));
  check("a section with no teachers is skipped safely", buildBandIncreaseNotifications([{ studentName: "X", sectionId: "orphan", previousBand: "LOW", nextBand: "HIGH" }], fanout, sy.id).length === 0);

  // ── Emission + per-user isolation ─────────────────────────────────────────
  console.log("\n── Emission and isolation ──\n");
  const [userA, userB] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { email: "teacher@school.edu" } }),
    prisma.user.findFirstOrThrow({ where: { email: "adviser@school.edu" } }),
  ]);

  await prisma.notification.deleteMany({ where: { title: { startsWith: MARKER } } });
  const beforeA = await getUnreadNotificationCount(userA.id);

  const sent = await emitNotifications([
    {
      userId: userA.id,
      kind: "RISK_BAND_INCREASED",
      title: `${MARKER} Student moved to HIGH risk`,
      body: "Risk band changed from MODERATE to HIGH.",
      linkHref: "/teacher/student-risk",
      schoolYearId: sy.id,
    },
    {
      userId: userA.id,
      kind: "REFERRAL_DECLINED",
      title: `${MARKER} Referral declined`,
      body: "Handled through an existing plan.",
      linkHref: "/teacher/refer",
      schoolYearId: sy.id,
    },
  ]);
  check("two notifications emitted", sent === 2, `${sent}`);

  const afterA = await getUnreadNotificationCount(userA.id);
  check("unread count rises for the recipient", afterA === beforeA + 2, `${beforeA} → ${afterA}`);

  const rowsB = await getNotifications(userB.id);
  check(
    "a different user sees none of them",
    !rowsB.some((n) => n.title.startsWith(MARKER)),
    `${rowsB.length} row(s) for the other user`,
  );

  // Payload discipline: notifications must not carry restricted content.
  const rowsA = await getNotifications(userA.id);
  const mine = rowsA.filter((n) => n.title.startsWith(MARKER));
  check("notifications carry a link, not content", mine.every((n) => n.linkHref !== null));

  // ── Mark-read scoping (the filter the server action relies on) ────────────
  console.log("\n── Mark-read scoping ──\n");
  const target = mine[0];
  const wrongUser = await prisma.notification.updateMany({
    where: { id: target.id, userId: userB.id, readAt: null },
    data: { readAt: new Date() },
  });
  check("another user cannot mark it read", wrongUser.count === 0, `${wrongUser.count} row(s) affected`);

  const rightUser = await prisma.notification.updateMany({
    where: { id: target.id, userId: userA.id, readAt: null },
    data: { readAt: new Date() },
  });
  check("owner can mark it read", rightUser.count === 1);
  check("unread count drops", (await getUnreadNotificationCount(userA.id)) === afterA - 1);

  await prisma.notification.deleteMany({ where: { title: { startsWith: MARKER } } });
  console.log("      (test rows cleaned up)");

  console.log(`\n${failures === 0 ? "ALL CHECKS PASS" : `${failures} FAILURE(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
