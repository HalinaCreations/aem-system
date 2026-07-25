"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import {
  validateInterventionsCsv,
  groupInterventions,
  type InterventionRow,
} from "@/lib/import/interventions";

export type InterventionsPreview =
  | {
      ok: true;
      schoolYearLabel: string;
      total: number;
      validCount: number;
      invalidCount: number;
      planCount: number;
      previewRows: Array<{ row: number; data: InterventionRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
    }
  | { ok: false; error: string };

const input = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

async function loadEnrollmentRefs(schoolYearId: string) {
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
  return { enrollmentByLrn };
}

export async function previewInterventionsAction(formData: FormData): Promise<InterventionsPreview> {
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

  const refs = await loadEnrollmentRefs(sy.id);
  const result = validateInterventionsCsv(parsedCsv, refs);

  return {
    ok: true,
    schoolYearLabel: sy.label,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    planCount: groupInterventions(result.valid.map((r) => r.data)).length,
    previewRows: result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data })),
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
  };
}

export type InterventionsCommit =
  | { ok: true; schoolYearLabel: string; plansCreated: number; participantsCreated: number }
  | { ok: false; error: string };

export async function commitInterventionsAction(formData: FormData): Promise<InterventionsCommit> {
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

  const refs = await loadEnrollmentRefs(sy.id);
  const result = validateInterventionsCsv(parsedCsv, refs);
  if (result.invalid.length > 0) {
    return {
      ok: false,
      error: `${result.invalid.length} row(s) have errors. Fix them and re-upload before committing.`,
    };
  }
  if (result.valid.length === 0) return { ok: false, error: "No valid rows to import." };

  const plans = groupInterventions(result.valid.map((r) => r.data));

  await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      const created = await tx.intervention.create({
        data: {
          scope: plan.scope,
          scopeTargetId: plan.scopeTargetId,
          type: plan.type,
          // Historical rows carry a recorded outcome, so the plan is closed by
          // definition. Importing them as ACTIVE would put finished work back
          // into the counselor's live queue.
          status: "COMPLETED",
          schoolYearId: sy.id,
          // The importing admin is the accountable human for a historical
          // record (spec §14). No counselor made this decision in-system.
          ownerId: session.user.id,
          startDate: plan.startDate,
          endDate: plan.endDate,
        },
      });

      for (const p of plan.participants) {
        await tx.interventionParticipation.create({
          data: {
            interventionId: created.id,
            enrollmentId: p.enrollmentId,
            outcome: p.outcome,
          },
        });
      }
    }
  });

  const participantsCreated = plans.reduce((acc, p) => acc + p.participants.length, 0);

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "Interventions",
    resourceId: sy.id,
    metadata: {
      schoolYearLabel: sy.label,
      totalRows: result.total,
      plansCreated: plans.length,
      participantsCreated,
    },
  });

  return {
    ok: true,
    schoolYearLabel: sy.label,
    plansCreated: plans.length,
    participantsCreated,
  };
}
