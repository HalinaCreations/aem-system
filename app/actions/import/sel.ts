"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import { validateSELCsv, type SELRow } from "@/lib/import/sel";

export type SELPreview =
  | {
      ok: true;
      schoolYearLabel: string;
      total: number;
      validCount: number;
      invalidCount: number;
      previewRows: Array<{ row: number; data: SELRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
    }
  | { ok: false; error: string };

const input = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

async function loadRefs(schoolYearId: string) {
  const [enrollments, counselors] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { schoolYearId },
      select: { id: true, student: { select: { lrn: true } } },
    }),
    prisma.user.findMany({
      where: { role: "COUNSELOR", status: "ACTIVE" },
      select: { id: true, email: true },
    }),
  ]);
  const enrollmentByLrn = new Map<string, string>();
  for (const e of enrollments) enrollmentByLrn.set(e.student.lrn, e.id);
  const counselorByEmail = new Map<string, string>();
  for (const c of counselors) counselorByEmail.set(c.email.toLowerCase(), c.id);
  return { enrollmentByLrn, counselorByEmail };
}

export async function previewSELAction(formData: FormData): Promise<SELPreview> {
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

  const refs = await loadRefs(sy.id);
  const result = validateSELCsv(parsedCsv, refs);

  return {
    ok: true,
    schoolYearLabel: sy.label,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    // Narrative context is counselor-only, so it is never echoed into an
    // admin-facing preview table — only whether a row carries one.
    previewRows: result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data })),
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
  };
}

export type SELCommit =
  | { ok: true; schoolYearLabel: string; created: number }
  | { ok: false; error: string };

export async function commitSELAction(formData: FormData): Promise<SELCommit> {
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

  const refs = await loadRefs(sy.id);
  const result = validateSELCsv(parsedCsv, refs);
  if (result.invalid.length > 0) {
    return {
      ok: false,
      error: `${result.invalid.length} row(s) have errors. Fix them and re-upload before committing.`,
    };
  }
  if (result.valid.length === 0) return { ok: false, error: "No valid rows to import." };

  await prisma.$transaction(async (tx) => {
    for (const v of result.valid) {
      await tx.sELAssessment.create({
        data: {
          enrollmentId: v.data.enrollmentId,
          // Attributed to the named counselor from the CSV, never the importer.
          assessedById: v.data.assessedById,
          assessedAt: v.data.assessedAt,
          emotionalWellbeing: v.data.emotionalWellbeing,
          stressLevel: v.data.stressLevel,
          peerRelationships: v.data.peerRelationships,
          selfAssessment: v.data.selfAssessment,
          notes: v.data.notes,
        },
      });
    }
  });

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "SELAssessment",
    resourceId: sy.id,
    metadata: {
      schoolYearLabel: sy.label,
      totalRows: result.total,
      assessmentsCreated: result.valid.length,
      // Who the assessments were attributed to — the accountability trail the
      // admin importer is not themselves part of.
      attributedTo: [...new Set(result.valid.map((v) => v.data.assessedByEmail))],
    },
  });

  return { ok: true, schoolYearLabel: sy.label, created: result.valid.length };
}
