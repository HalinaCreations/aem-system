"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { logAudit } from "@/lib/audit";
import { ConsentScope, Sex, LearningModality } from "@prisma/client";

const createStudentSchema = z.object({
  lrn: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "LRN must be exactly 12 numeric digits."),
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  middleName: z.string().trim().max(100).optional().nullable(),
  sex: z.nativeEnum(Sex),
  birthDate: z.string().optional().nullable(),
  sectionId: z.string().min(1, "Section is required."),
  learningModality: z.nativeEnum(LearningModality).default("FACE_TO_FACE"),
});

export type CreateStudentResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

export async function createStudentAction(formData: FormData): Promise<CreateStudentResult> {
  const session = await requireRole("ADMIN");
  const sy = await getActiveSchoolYear();

  if (!sy) {
    return { ok: false, error: "No active school year found. Please activate a school year first." };
  }

  const rawData = {
    lrn: formData.get("lrn"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    middleName: formData.get("middleName") || null,
    sex: formData.get("sex"),
    birthDate: formData.get("birthDate") || null,
    sectionId: formData.get("sectionId"),
    learningModality: formData.get("learningModality") || "FACE_TO_FACE",
  };

  const parsed = createStudentSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid form input.";
    return { ok: false, error: firstIssue };
  }

  const data = parsed.data;

  // Ensure section exists in active school year
  const section = await prisma.section.findFirst({
    where: { id: data.sectionId, schoolYearId: sy.id },
    select: { id: true, gradeLevel: true, name: true },
  });

  if (!section) {
    return { ok: false, error: "Selected section does not exist in the active school year." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert Student
      const birthDateObj = data.birthDate ? new Date(data.birthDate) : new Date("2010-01-01");
      const student = await tx.student.upsert({
        where: { lrn: data.lrn },
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName ?? null,
          sex: data.sex,
          birthDate: birthDateObj,
        },
        create: {
          lrn: data.lrn,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName ?? null,
          sex: data.sex,
          birthDate: birthDateObj,
        },
      });

      // Upsert StudentEnrollment
      await tx.studentEnrollment.upsert({
        where: {
          studentId_schoolYearId: {
            studentId: student.id,
            schoolYearId: sy.id,
          },
        },
        update: {
          sectionId: section.id,
          gradeLevel: section.gradeLevel,
          learningModality: data.learningModality,
          status: "ACTIVE",
        },
        create: {
          studentId: student.id,
          schoolYearId: sy.id,
          sectionId: section.id,
          gradeLevel: section.gradeLevel,
          learningModality: data.learningModality,
          status: "ACTIVE",
        },
      });

      // Default Consents
      for (const scope of [
        ConsentScope.DATA_PROCESSING,
        ConsentScope.AI_ANALYSIS,
        ConsentScope.INTERVENTION_PLANNING,
      ]) {
        await tx.consentRecord.upsert({
          where: { studentId_scope: { studentId: student.id, scope } },
          update: {},
          create: { studentId: student.id, scope },
        });
      }

      return student;
    });

    await logAudit({
      action: "CREATE",
      userId: session.user.id,
      resourceType: "Student",
      resourceId: result.id,
      metadata: {
        lrn: data.lrn,
        name: `${data.lastName}, ${data.firstName}`,
        section: `${section.gradeLevel} - ${section.name}`,
        schoolYear: sy.label,
      },
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/users`);
    return { ok: true, studentId: result.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save student.";
    return { ok: false, error: msg };
  }
}
