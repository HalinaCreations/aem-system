// Shared intervention-history fetch for the risk engine and the pattern detector.
//
// Both consumers need the same two facts per student — prior completed
// participation outcomes (across ALL years, because a student's history does
// not live on their current enrollment) and whether they are under an active
// plan in the year being scored. They differ only in how they interpret them,
// so the fetch is shared and the interpretation stays with each caller.

import { prisma } from "@/lib/prisma";
import type { ParticipationOutcome } from "@prisma/client";

export interface StudentInterventionHistory {
  /** Outcomes from COMPLETED interventions, across every school year. */
  priorCompletedOutcomes: Array<ParticipationOutcome | null>;
  /** True when the student is in an ACTIVE plan in the year being scored. */
  hasActiveIntervention: boolean;
}

export const EMPTY_INTERVENTION_HISTORY: StudentInterventionHistory = {
  priorCompletedOutcomes: [],
  hasActiveIntervention: false,
};

// One bulk query, grouped in memory — keeps this at N=1 regardless of cohort
// size. Callers loop over students and read from the returned map.
export async function fetchInterventionHistory(
  studentIds: string[],
  schoolYearId: string,
): Promise<Map<string, StudentInterventionHistory>> {
  const byStudent = new Map<string, StudentInterventionHistory>();
  if (studentIds.length === 0) return byStudent;

  const participations = await prisma.interventionParticipation.findMany({
    where: { enrollment: { studentId: { in: studentIds } } },
    select: {
      outcome: true,
      enrollment: { select: { studentId: true } },
      intervention: { select: { status: true, schoolYearId: true } },
    },
  });

  for (const p of participations) {
    const sid = p.enrollment.studentId;
    let entry = byStudent.get(sid);
    if (!entry) {
      entry = { priorCompletedOutcomes: [], hasActiveIntervention: false };
      byStudent.set(sid, entry);
    }
    if (p.intervention.status === "COMPLETED") {
      entry.priorCompletedOutcomes.push(p.outcome);
    }
    if (p.intervention.status === "ACTIVE" && p.intervention.schoolYearId === schoolYearId) {
      entry.hasActiveIntervention = true;
    }
  }

  return byStudent;
}
