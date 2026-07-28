import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getInterventionsForTeacher } from "@/lib/intervention/queries";
import InterventionFeedbackClient from "@/components/teacher/intervention-feedback-client";
import PageHeader from "@/components/shell/page-header";

export default async function TeacherInterventionFeedbackPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const interventions = await getInterventionsForTeacher(session.user.id, sy.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Student Support"
        title="Intervention Feedback"
        description={`${interventions.length} intervention${interventions.length === 1 ? "" : "s"} touching your assignments in ${sy.label}. You see public plan fields only — rationale and counseling context stay with the counselor.`}
      />

      {interventions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          No active interventions in your scope yet.
        </div>
      ) : (
        <InterventionFeedbackClient interventions={interventions} />
      )}
    </div>
  );
}
