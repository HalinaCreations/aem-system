import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import AssignmentRosterView from "@/components/roles/admin/assignment-roster-view";

export default async function AdminAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  await requireRole("ADMIN");
  const { id, assignmentId } = await params;

  const teacher = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!teacher || teacher.role !== "TEACHER") notFound();

  const assignment = await prisma.teacherAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      userId: true,
      isAdviser: true,
      section: { select: { id: true, gradeLevel: true, name: true } },
      subject: { select: { id: true, code: true, name: true } },
      schoolYear: { select: { id: true, label: true } },
    },
  });

  if (!assignment || assignment.userId !== teacher.id) notFound();

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      sectionId: assignment.section.id,
      schoolYearId: assignment.schoolYear.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      learningModality: true,
      student: {
        select: {
          id: true,
          lrn: true,
          firstName: true,
          lastName: true,
          middleName: true,
          sex: true,
        },
      },
    },
    orderBy: [
      { student: { lastName: "asc" } },
      { student: { firstName: "asc" } },
    ],
  });

  return (
    <AssignmentRosterView
      teacher={{ id: teacher.id, name: teacher.name, email: teacher.email }}
      assignment={{
        id: assignment.id,
        isAdviser: assignment.isAdviser,
        section: assignment.section,
        subject: assignment.subject,
        schoolYear: assignment.schoolYear,
      }}
      students={enrollments.map((e) => ({
        id: e.student.id,
        lrn: e.student.lrn,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        middleName: e.student.middleName,
        sex: e.student.sex,
        learningModality: e.learningModality,
      }))}
    />
  );
}
