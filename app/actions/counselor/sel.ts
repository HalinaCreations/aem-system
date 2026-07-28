"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const LEVEL = z.enum(["THRIVING", "STABLE", "AT_RISK", "CRITICAL"]);

const inputSchema = z.object({
  enrollmentId: z.string().min(1),
  studentId: z.string().min(1), // for revalidating the profile route
  emotionalWellbeing: LEVEL,
  stressLevel: LEVEL,
  peerRelationships: LEVEL,
  // The student's own rating, relayed to the counselor. Optional because there
  // is no student portal (spec §16) — it only exists if the student gave one.
  selfAssessment: LEVEL.optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type CreateSELResult =
  | { ok: true; assessmentId: string }
  | { ok: false; error: string };

export async function createSELAssessmentAction(input: unknown): Promise<CreateSELResult> {
  const session = await requireRole("COUNSELOR");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: data.enrollmentId },
    select: { id: true, studentId: true },
  });
  if (!enrollment) return { ok: false, error: "Enrollment not found." };
  if (enrollment.studentId !== data.studentId) {
    return { ok: false, error: "Enrollment does not belong to that student." };
  }

  const created = await prisma.sELAssessment.create({
    data: {
      enrollmentId: data.enrollmentId,
      assessedById: session.user.id,
      emotionalWellbeing: data.emotionalWellbeing,
      stressLevel: data.stressLevel,
      peerRelationships: data.peerRelationships,
      selfAssessment: data.selfAssessment ?? null,
      notes: data.notes?.length ? data.notes : null,
    },
    select: { id: true },
  });

  // Dimension levels are audited; `notes` content deliberately is not — the
  // audit log is readable by admin and principal, and copying clinical
  // narrative into it would route around the access rule the query enforces.
  await logAudit({
    action: "SEL_ASSESSMENT_CREATED",
    userId: session.user.id,
    resourceType: "SELAssessment",
    resourceId: created.id,
    metadata: {
      enrollmentId: data.enrollmentId,
      emotionalWellbeing: data.emotionalWellbeing,
      stressLevel: data.stressLevel,
      peerRelationships: data.peerRelationships,
      selfAssessment: data.selfAssessment ?? null,
      hasNotes: Boolean(data.notes?.length),
    },
  });

  revalidatePath(`/counselor/students/${data.studentId}`);
  return { ok: true, assessmentId: created.id };
}
