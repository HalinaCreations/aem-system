"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import { validateAssignmentsCsv, type AssignmentRow } from "@/lib/import/assignments";

// Prisma's default interactive-transaction timeout (5s) is sized for a live
// request, not an admin-only bulk write. A full assignments commit runs
// several sequential round trips per row (section lookup/upsert, subject
// lookup/upsert, assignment before-check + upsert), so it needs far more
// wall-clock room than the default gives it. Same transaction boundary,
// longer timeout.
const BULK_TRANSACTION_OPTIONS = { timeout: 60_000 };

export type AssignmentsPreview =
  | {
      ok: true;
      schoolYearLabel: string;
      total: number;
      validCount: number;
      invalidCount: number;
      previewRows: Array<{ row: number; data: AssignmentRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
    }
  | { ok: false; error: string };

const input = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

async function loadUserRefs() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const userIdByEmail = new Map<string, string>();
  for (const u of users) userIdByEmail.set(u.email.toLowerCase(), u.id);
  return { userIdByEmail };
}

export async function previewAssignmentsAction(formData: FormData): Promise<AssignmentsPreview> {
  await requireRole("ADMIN");

  const parsed = input.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  const sy = await prisma.schoolYear.findUnique({ where: { id: parsed.data.schoolYearId } });
  if (!sy) return { ok: false, error: "School year not found." };

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const refs = await loadUserRefs();
  const result = validateAssignmentsCsv(parsedCsv, refs);

  return {
    ok: true,
    schoolYearLabel: sy.label,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    previewRows: result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data })),
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
  };
}

export type AssignmentsCommit =
  | { ok: true; schoolYearLabel: string; created: { sections: number; subjects: number; assignments: number } }
  | { ok: false; error: string };

export async function commitAssignmentsAction(formData: FormData): Promise<AssignmentsCommit> {
  const session = await requireRole("ADMIN");

  const parsed = input.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  const sy = await prisma.schoolYear.findUnique({ where: { id: parsed.data.schoolYearId } });
  if (!sy) return { ok: false, error: "School year not found." };

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const refs = await loadUserRefs();
  const validation = validateAssignmentsCsv(parsedCsv, refs);
  if (validation.invalid.length > 0) {
    return {
      ok: false,
      error: `${validation.invalid.length} row(s) have errors. Fix them and re-upload before committing.`,
    };
  }
  if (validation.valid.length === 0) return { ok: false, error: "No valid rows to import." };

  let createdSections = 0;
  let createdSubjects = 0;
  let createdAssignments = 0;

  await prisma.$transaction(async (tx) => {
    const sectionIdByKey = new Map<string, string>();
    const subjectIdByCode = new Map<string, string>();

    for (const v of validation.valid) {
      const sectionKey = `${v.data.gradeLevel}::${v.data.section}`;
      let sectionId = sectionIdByKey.get(sectionKey);
      if (!sectionId) {
        const where = {
          schoolYearId_gradeLevel_name: {
            schoolYearId: sy.id,
            gradeLevel: v.data.gradeLevel,
            name: v.data.section,
          },
        };
        const before = await tx.section.findUnique({ where, select: { id: true } });
        const sec = await tx.section.upsert({
          where,
          update: {},
          create: { schoolYearId: sy.id, gradeLevel: v.data.gradeLevel, name: v.data.section },
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
          const where = { schoolYearId_code: { schoolYearId: sy.id, code: v.data.subjectCode } };
          const before = await tx.subject.findUnique({ where, select: { id: true } });
          const subj = await tx.subject.upsert({
            where,
            update: { name: v.data.subjectName as string },
            create: {
              schoolYearId: sy.id,
              code: v.data.subjectCode,
              name: v.data.subjectName as string,
            },
            select: { id: true },
          });
          if (!before) createdSubjects++;
          subjectId = subj.id;
          subjectIdByCode.set(v.data.subjectCode, subjectId);
        }
      }

      if (subjectId !== null) {
        // Subject rows: subjectId is non-null, so the compound unique key
        // (userId, sectionId, subjectId, schoolYearId) is a real DB-enforced
        // uniqueness constraint and upsert() can key off it directly.
        const where = {
          userId_sectionId_subjectId_schoolYearId: {
            userId: v.data.userId,
            sectionId,
            subjectId,
            schoolYearId: sy.id,
          },
        };
        const before = await tx.teacherAssignment.findUnique({ where, select: { id: true } });
        await tx.teacherAssignment.upsert({
          where,
          update: { isAdviser: v.data.isAdviser },
          create: {
            userId: v.data.userId,
            sectionId,
            subjectId,
            schoolYearId: sy.id,
            isAdviser: v.data.isAdviser,
          },
        });
        if (!before) createdAssignments++;
      } else {
        // Adviser rows: subjectId is NULL. Postgres treats NULL as distinct in
        // the composite unique index, so there is no DB-enforced uniqueness to
        // key an upsert() off of here (Prisma's generated compound-key type
        // correctly requires a non-null subjectId and rejects this shape). The
        // validator already guarantees at most one adviser row per section, so
        // a plain findFirst + create/update gives the same before/after
        // semantics as upsert() would for the non-null case.
        const before = await tx.teacherAssignment.findFirst({
          where: { userId: v.data.userId, sectionId, subjectId: null, schoolYearId: sy.id },
          select: { id: true },
        });
        if (before) {
          await tx.teacherAssignment.update({
            where: { id: before.id },
            data: { isAdviser: v.data.isAdviser },
          });
        } else {
          await tx.teacherAssignment.create({
            data: {
              userId: v.data.userId,
              sectionId,
              subjectId: null,
              schoolYearId: sy.id,
              isAdviser: v.data.isAdviser,
            },
          });
          createdAssignments++;
        }
      }
    }
  }, BULK_TRANSACTION_OPTIONS);

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "TeacherAssignment",
    resourceId: sy.id,
    metadata: {
      schoolYearLabel: sy.label,
      totalRows: validation.total,
      sectionsCreated: createdSections,
      subjectsCreated: createdSubjects,
      assignmentsCreated: createdAssignments,
    },
  });

  return {
    ok: true,
    schoolYearLabel: sy.label,
    created: { sections: createdSections, subjects: createdSubjects, assignments: createdAssignments },
  };
}
