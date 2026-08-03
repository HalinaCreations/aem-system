import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getLatestRiskForStudent, getSELAssessments, getStudentProfile } from "@/lib/student/queries";
import { generateRiskNarrative } from "@/lib/ai/narrative";
import StudentProfileView from "@/components/shell/student-profile-view";

export default async function AdminStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const profile = await getStudentProfile(id, sy.id);
  if (!profile) notFound();

  // Levels only — getSELAssessments nulls out sensitive notes for admin/principal.
  const selAssessments = await getSELAssessments(
    profile.enrollment.id,
    session.user.role,
    session.user.id,
  );

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
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 transition-colors gap-1.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Students
        </Link>
      </div>
      <StudentProfileView
        profile={profile}
        viewerRole="PRINCIPAL"
        selAssessments={selAssessments}
        risk={risk}
      />
    </div>
  );
}
