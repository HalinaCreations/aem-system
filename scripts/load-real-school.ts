// Replays the three real-school CSVs (staff, roster, assignments) straight
// into the database, bypassing the admin wizard UI. `npm run db:reset` wipes
// everything, so without this script the three files would need to be
// re-clicked through the wizard after every reset.
//
// SOURCE OF TRUTH — this script mirrors, and must be kept in sync with:
//   - app/actions/import/staff.ts       (commitStaffAction)
//   - app/actions/import/roster.ts      (commitRosterAction)
//   - app/actions/import/assignments.ts (commitAssignmentsAction)
//
// Those are Server Actions that call requireRole("ADMIN") and therefore need
// an HTTP session — they cannot be invoked from a CLI. This script calls the
// SAME validators those actions use (lib/import/staff.ts, lib/import/roster.ts,
// lib/import/assignments.ts) so validation can never drift between the wizard
// and this replay path. The persistence logic below (upsert keys, before-check
// counting, transaction boundaries, ordering) is a deliberate, structurally
// close duplicate of the three action files above — if you change one, change
// the other.
//
// Usage: npm run db:load:school

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient, ConsentScope } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logAudit } from "../lib/audit";
import { parseCsv } from "../lib/import/csv";
import { validateStaffCsv } from "../lib/import/staff";
import { validateRosterCsv } from "../lib/import/roster";
import { validateAssignmentsCsv } from "../lib/import/assignments";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Mirrors app/actions/import/staff.ts.
const DEFAULT_STAFF_PASSWORD = "aem2026";
const BCRYPT_COST = 10;

const SCHOOL_YEAR_LABEL = "SY 2026-2027";
const SCHOOL_YEAR_START = "2026-08-01";
const SCHOOL_YEAR_END = "2027-05-31";

// Prisma's default interactive-transaction timeout is 5s, sized for a live
// request. The roster stage runs hundreds of rows (each with a handful of
// before-check + upsert round trips) inside one transaction, matching the
// action's transaction boundary — so it needs more wall-clock room here than
// it would from a warm server connection. Same transaction, longer timeout.
const BULK_TRANSACTION_OPTIONS = { timeout: 60_000 };

const CSV_DIR = path.resolve(__dirname, "..", "sample-import-data", "generated");
const STAFF_CSV = path.join(CSV_DIR, "staff.csv");
const ROSTER_CSV = path.join(CSV_DIR, "roster.csv");
const ASSIGNMENTS_CSV = path.join(CSV_DIR, "assignments.csv");

function checkFilesExist(paths: string[]): void {
  const missing = paths.filter((p) => !fs.existsSync(p));
  if (missing.length > 0) {
    console.error("Cannot run: the following required CSV file(s) are missing:");
    for (const p of missing) console.error(`  ${p}`);
    process.exit(1);
  }
}

function printInvalid(fileName: string, invalid: { row: number; errors: string[] }[]): void {
  console.error(`${fileName}: ${invalid.length} invalid row(s):`);
  for (const r of invalid) {
    console.error(`  row ${r.row}: ${r.errors.join("; ")}`);
  }
}

/**
 * Mirrors the create+activate pattern in app/actions/admin/setup.ts
 * (createSchoolYearAction / activateSchoolYearAction): clear isActive on
 * every row, then set it on this one, inside a single transaction, so
 * exactly one row is ever active.
 */
async function ensureSchoolYear(): Promise<{ id: string; label: string; created: boolean }> {
  const existing = await prisma.schoolYear.findUnique({ where: { label: SCHOOL_YEAR_LABEL } });

  const sy = await prisma.$transaction(async (tx) => {
    await tx.schoolYear.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.schoolYear.upsert({
      where: { label: SCHOOL_YEAR_LABEL },
      update: { isActive: true },
      create: {
        label: SCHOOL_YEAR_LABEL,
        startDate: new Date(SCHOOL_YEAR_START),
        endDate: new Date(SCHOOL_YEAR_END),
        isActive: true,
      },
      select: { id: true, label: true },
    });
  });

  return { id: sy.id, label: sy.label, created: !existing };
}

// ─── Stage 1: Staff ─────────────────────────────────────────────────────────
// Mirrors app/actions/import/staff.ts commitStaffAction.

async function loadStaff(csvText: string): Promise<{ total: number; created: number; updated: number }> {
  const parsed = parseCsv(csvText);
  const validation = validateStaffCsv(parsed);
  if (validation.invalid.length > 0) {
    printInvalid("staff.csv", validation.invalid);
    throw new Error(`staff.csv has ${validation.invalid.length} invalid row(s); aborting.`);
  }
  if (validation.valid.length === 0) throw new Error("staff.csv has no valid rows.");

  const existing = await prisma.user.findMany({
    where: { email: { in: validation.valid.map((v) => v.data.email) } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email));

  // Hash outside the transaction — bcrypt at cost 10 is deliberately slow and
  // would hold the transaction open far longer than necessary.
  const rows = await Promise.all(
    validation.valid.map(async (v) => {
      if (!existingEmails.has(v.data.email)) {
        const hashedPassword = await bcrypt.hash(v.data.password ?? DEFAULT_STAFF_PASSWORD, BCRYPT_COST);
        return { ...v.data, isNew: true as const, hashedPassword };
      }
      const hashedPassword = v.data.password ? await bcrypt.hash(v.data.password, BCRYPT_COST) : null;
      return { ...v.data, isNew: false as const, hashedPassword };
    }),
  );

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (row.isNew) {
        await tx.user.create({
          data: {
            email: row.email,
            name: row.name,
            role: row.role,
            status: row.status,
            hashedPassword: row.hashedPassword,
          },
        });
        created++;
      } else {
        await tx.user.update({
          where: { email: row.email },
          data: {
            name: row.name,
            role: row.role,
            status: row.status,
            // null ⇒ CSV password column was blank ⇒ leave the stored hash
            // untouched; only overwrite when the CSV gave an explicit value.
            ...(row.hashedPassword ? { hashedPassword: row.hashedPassword } : {}),
          },
        });
        updated++;
      }
    }
  });

  return { total: validation.total, created, updated };
}

// ─── Stage 2: Roster ────────────────────────────────────────────────────────
// Mirrors app/actions/import/roster.ts commitRosterAction.

type RosterResult = {
  total: number;
  createdSections: number;
  createdStudents: number;
  updatedStudents: number;
  createdEnrollments: number;
  updatedEnrollments: number;
  createdConsents: number;
};

async function loadRoster(csvText: string, schoolYearId: string): Promise<RosterResult> {
  const parsed = parseCsv(csvText);
  const validation = validateRosterCsv(parsed);
  if (validation.invalid.length > 0) {
    printInvalid("roster.csv", validation.invalid);
    throw new Error(`roster.csv has ${validation.invalid.length} invalid row(s); aborting.`);
  }
  if (validation.valid.length === 0) throw new Error("roster.csv has no valid rows.");

  // Group by (gradeLevel, section) to upsert Sections in one pass.
  const sectionKey = (g: string, s: string) => `${g}::${s}`;
  const sectionsNeeded = new Map<string, { gradeLevel: string; name: string }>();
  for (const v of validation.valid) {
    sectionsNeeded.set(sectionKey(v.data.gradeLevel, v.data.section), {
      gradeLevel: v.data.gradeLevel,
      name: v.data.section,
    });
  }

  let createdSections = 0;
  let createdStudents = 0;
  let updatedStudents = 0;
  let createdEnrollments = 0;
  let updatedEnrollments = 0;
  let createdConsents = 0;

  // Full success / full rollback.
  await prisma.$transaction(async (tx) => {
    const sectionIdByKey = new Map<string, string>();

    for (const [key, s] of sectionsNeeded) {
      const where = {
        schoolYearId_gradeLevel_name: { schoolYearId, gradeLevel: s.gradeLevel, name: s.name },
      };
      const before = await tx.section.findUnique({ where, select: { id: true } });
      const sec = await tx.section.upsert({
        where,
        update: {},
        create: { schoolYearId, gradeLevel: s.gradeLevel, name: s.name },
        select: { id: true },
      });
      sectionIdByKey.set(key, sec.id);
      if (!before) createdSections++;
    }

    for (const v of validation.valid) {
      const sectionId = sectionIdByKey.get(sectionKey(v.data.gradeLevel, v.data.section))!;

      const beforeStudent = await tx.student.findUnique({ where: { lrn: v.data.lrn }, select: { id: true } });
      const student = await tx.student.upsert({
        where: { lrn: v.data.lrn },
        update: {
          firstName: v.data.firstName,
          lastName: v.data.lastName,
          middleName: v.data.middleName,
          sex: v.data.sex,
          birthDate: v.data.birthDate,
          guardianName: v.data.guardianName,
          guardianContact: v.data.guardianContact,
          spedStatus: v.data.spedStatus,
        },
        create: {
          lrn: v.data.lrn,
          firstName: v.data.firstName,
          lastName: v.data.lastName,
          middleName: v.data.middleName,
          sex: v.data.sex,
          birthDate: v.data.birthDate,
          guardianName: v.data.guardianName,
          guardianContact: v.data.guardianContact,
          spedStatus: v.data.spedStatus,
        },
      });
      if (!beforeStudent) createdStudents++;
      else updatedStudents++;

      const beforeEnrollment = await tx.studentEnrollment.findUnique({
        where: { studentId_schoolYearId: { studentId: student.id, schoolYearId } },
        select: { id: true },
      });
      await tx.studentEnrollment.upsert({
        where: { studentId_schoolYearId: { studentId: student.id, schoolYearId } },
        update: { sectionId, gradeLevel: v.data.gradeLevel, learningModality: v.data.learningModality },
        create: {
          studentId: student.id,
          schoolYearId,
          sectionId,
          gradeLevel: v.data.gradeLevel,
          learningModality: v.data.learningModality,
        },
      });
      if (!beforeEnrollment) createdEnrollments++;
      else updatedEnrollments++;

      // Default consents — all three scopes granted on import unless already on file.
      for (const scope of [
        ConsentScope.DATA_PROCESSING,
        ConsentScope.AI_ANALYSIS,
        ConsentScope.INTERVENTION_PLANNING,
      ]) {
        const beforeC = await tx.consentRecord.findUnique({
          where: { studentId_scope: { studentId: student.id, scope } },
          select: { id: true },
        });
        await tx.consentRecord.upsert({
          where: { studentId_scope: { studentId: student.id, scope } },
          update: {},
          create: { studentId: student.id, scope },
        });
        if (!beforeC) createdConsents++;
      }
    }
  }, BULK_TRANSACTION_OPTIONS);

  return {
    total: validation.total,
    createdSections,
    createdStudents,
    updatedStudents,
    createdEnrollments,
    updatedEnrollments,
    createdConsents,
  };
}

// ─── Stage 3: Assignments ───────────────────────────────────────────────────
// Mirrors app/actions/import/assignments.ts commitAssignmentsAction.

type AssignmentsResult = {
  total: number;
  createdSections: number;
  createdSubjects: number;
  updatedSubjects: number;
  createdAssignments: number;
  updatedAssignments: number;
};

async function loadAssignments(csvText: string, schoolYearId: string): Promise<AssignmentsResult> {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const userIdByEmail = new Map<string, string>();
  for (const u of users) userIdByEmail.set(u.email.toLowerCase(), u.id);

  const parsed = parseCsv(csvText);
  const validation = validateAssignmentsCsv(parsed, { userIdByEmail });
  if (validation.invalid.length > 0) {
    printInvalid("assignments.csv", validation.invalid);
    throw new Error(`assignments.csv has ${validation.invalid.length} invalid row(s); aborting.`);
  }
  if (validation.valid.length === 0) throw new Error("assignments.csv has no valid rows.");

  let createdSections = 0;
  let createdSubjects = 0;
  let updatedSubjects = 0;
  let createdAssignments = 0;
  let updatedAssignments = 0;

  await prisma.$transaction(async (tx) => {
    const sectionIdByKey = new Map<string, string>();
    const subjectIdByCode = new Map<string, string>();

    for (const v of validation.valid) {
      const sectionKey = `${v.data.gradeLevel}::${v.data.section}`;
      let sectionId = sectionIdByKey.get(sectionKey);
      if (!sectionId) {
        const where = {
          schoolYearId_gradeLevel_name: { schoolYearId, gradeLevel: v.data.gradeLevel, name: v.data.section },
        };
        const before = await tx.section.findUnique({ where, select: { id: true } });
        const sec = await tx.section.upsert({
          where,
          update: {},
          create: { schoolYearId, gradeLevel: v.data.gradeLevel, name: v.data.section },
          select: { id: true },
        });
        if (!before) createdSections++;
        sectionId = sec.id;
        sectionIdByKey.set(sectionKey, sectionId);
      }

      let subjectId: string | null = null;
      if (v.data.subjectCode) {
        subjectId = subjectIdByCode.get(v.data.subjectCode) ?? null;
        if (!subjectId) {
          const where = { schoolYearId_code: { schoolYearId, code: v.data.subjectCode } };
          const before = await tx.subject.findUnique({ where, select: { id: true } });
          const subj = await tx.subject.upsert({
            where,
            update: { name: v.data.subjectName as string },
            create: { schoolYearId, code: v.data.subjectCode, name: v.data.subjectName as string },
            select: { id: true },
          });
          if (!before) createdSubjects++;
          else updatedSubjects++;
          subjectId = subj.id;
          subjectIdByCode.set(v.data.subjectCode, subjectId);
        }
      }

      if (subjectId !== null) {
        // Subject rows: subjectId is non-null, so the compound unique key
        // (userId, sectionId, subjectId, schoolYearId) is a real DB-enforced
        // uniqueness constraint and upsert() can key off it directly.
        const where = {
          userId_sectionId_subjectId_schoolYearId: { userId: v.data.userId, sectionId, subjectId, schoolYearId },
        };
        const before = await tx.teacherAssignment.findUnique({ where, select: { id: true } });
        await tx.teacherAssignment.upsert({
          where,
          update: { isAdviser: v.data.isAdviser },
          create: { userId: v.data.userId, sectionId, subjectId, schoolYearId, isAdviser: v.data.isAdviser },
        });
        if (!before) createdAssignments++;
        else updatedAssignments++;
      } else {
        // Adviser rows: subjectId is NULL. Postgres treats NULL as distinct in
        // the composite unique index, so there is no DB-enforced uniqueness to
        // key an upsert() off of here. Plain findFirst + create/update gives
        // the same before/after semantics as upsert() would for the non-null
        // case.
        const before = await tx.teacherAssignment.findFirst({
          where: { userId: v.data.userId, sectionId, subjectId: null, schoolYearId },
          select: { id: true },
        });
        if (before) {
          await tx.teacherAssignment.update({ where: { id: before.id }, data: { isAdviser: v.data.isAdviser } });
          updatedAssignments++;
        } else {
          await tx.teacherAssignment.create({
            data: { userId: v.data.userId, sectionId, subjectId: null, schoolYearId, isAdviser: v.data.isAdviser },
          });
          createdAssignments++;
        }
      }
    }
  }, BULK_TRANSACTION_OPTIONS);

  return { total: validation.total, createdSections, createdSubjects, updatedSubjects, createdAssignments, updatedAssignments };
}

// ─── Orchestration ──────────────────────────────────────────────────────────

async function main() {
  console.log("=== load-real-school ===");

  checkFilesExist([STAFF_CSV, ROSTER_CSV, ASSIGNMENTS_CSV]);

  const staffCsv = fs.readFileSync(STAFF_CSV, "utf-8");
  const rosterCsv = fs.readFileSync(ROSTER_CSV, "utf-8");
  const assignmentsCsv = fs.readFileSync(ASSIGNMENTS_CSV, "utf-8");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!admin) throw new Error("No ADMIN user exists yet — run `npm run db:seed` first.");
  console.log(`Attributing audit log entries to admin: ${admin.email}`);

  const { id: schoolYearId, label: schoolYearLabel, created: yearCreated } = await ensureSchoolYear();
  console.log(`School year ${schoolYearLabel} ${yearCreated ? "created" : "already existed"} and set active.`);

  console.log("\n--- Stage 1: Staff (staff.csv) ---");
  const staffResult = await loadStaff(staffCsv);
  console.log(`total=${staffResult.total} created=${staffResult.created} updated=${staffResult.updated}`);
  await logAudit({
    action: "IMPORT",
    userId: admin.id,
    resourceType: "Staff",
    resourceId: "staff-csv",
    metadata: { totalRows: staffResult.total, created: staffResult.created, updated: staffResult.updated },
  });

  console.log("\n--- Stage 2: Roster (roster.csv) ---");
  const rosterResult = await loadRoster(rosterCsv, schoolYearId);
  console.log(
    `total=${rosterResult.total} sectionsCreated=${rosterResult.createdSections} ` +
      `studentsCreated=${rosterResult.createdStudents} studentsUpdated=${rosterResult.updatedStudents} ` +
      `enrollmentsCreated=${rosterResult.createdEnrollments} enrollmentsUpdated=${rosterResult.updatedEnrollments} ` +
      `consentsCreated=${rosterResult.createdConsents}`,
  );
  await logAudit({
    action: "IMPORT",
    userId: admin.id,
    resourceType: "Roster",
    resourceId: schoolYearId,
    metadata: {
      schoolYearLabel,
      totalRows: rosterResult.total,
      studentsCreated: rosterResult.createdStudents,
      studentsUpdated: rosterResult.updatedStudents,
      enrollmentsCreated: rosterResult.createdEnrollments,
      enrollmentsUpdated: rosterResult.updatedEnrollments,
      consentsCreated: rosterResult.createdConsents,
      sectionsCreated: rosterResult.createdSections,
    },
  });

  console.log("\n--- Stage 3: Assignments (assignments.csv) ---");
  const assignmentsResult = await loadAssignments(assignmentsCsv, schoolYearId);
  console.log(
    `total=${assignmentsResult.total} sectionsCreated=${assignmentsResult.createdSections} ` +
      `subjectsCreated=${assignmentsResult.createdSubjects} subjectsUpdated=${assignmentsResult.updatedSubjects} ` +
      `assignmentsCreated=${assignmentsResult.createdAssignments} assignmentsUpdated=${assignmentsResult.updatedAssignments}`,
  );
  await logAudit({
    action: "IMPORT",
    userId: admin.id,
    resourceType: "TeacherAssignment",
    resourceId: schoolYearId,
    metadata: {
      schoolYearLabel,
      totalRows: assignmentsResult.total,
      sectionsCreated: assignmentsResult.createdSections,
      subjectsCreated: assignmentsResult.createdSubjects,
      assignmentsCreated: assignmentsResult.createdAssignments,
    },
  });

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
