import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getStudentProfile, getLatestRiskForStudent } from "@/lib/student/queries";
import { generateRiskNarrative } from "@/lib/ai/narrative";
import StudentProfileView from "@/components/shell/student-profile-view";
import { prisma } from "@/lib/prisma";

export default async function TeacherStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("TEACHER");
  const { id } = await params;
  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  // Guard: ensure the teacher has an assignment in the student's section
  // for the active school year.
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: id, schoolYearId: sy.id, status: "ACTIVE" },
    select: { sectionId: true },
  });
  if (!enrollment) notFound();

  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      userId: session.user.id,
      sectionId: enrollment.sectionId,
      schoolYearId: sy.id,
    },
  });
  if (!assignment) notFound(); // teacher is not assigned to this student's section

  const profile = await getStudentProfile(id, sy.id);
  if (!profile) notFound();

  const latestRisk = await getLatestRiskForStudent(id, sy.id);
  const aiConsentRevoked = profile.consents.some(
    (c) => c.scope === "AI_ANALYSIS" && c.status === "REVOKED",
  );
  const risk = latestRisk
    ? {
        ...latestRisk,
        narrative: await generateRiskNarrative({
          firstName: profile.student.firstName,
          gradeLabel: profile.enrollment.gradeLevel,
          score: latestRisk.score,
          band: latestRisk.band,
          factors: latestRisk.factors,
          consentRevoked: aiConsentRevoked,
        }),
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/teacher/student-risk"
        className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to Student Risk
      </Link>
      <StudentProfileView
        profile={profile}
        viewerRole="TEACHER"
        risk={risk}
      />
    </div>
  );
}
