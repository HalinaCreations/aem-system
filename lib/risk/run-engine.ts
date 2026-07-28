// Canonical risk-engine orchestration: score → detect patterns → draft
// recommendations → notify → audit.
//
// This lives in lib rather than inside the server action because there are now
// two callers with different auth stories: the admin's "Run engine" button
// (session-backed) and the scheduled cron endpoint (shared-secret, no session).
// Keeping one implementation means a scheduled run and a manual run cannot
// drift — in particular, both emit the band-crossing notifications that spec §5
// promises, which was previously only possible by clicking the button.

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { computeRiskScore } from "@/lib/risk/engine";
import { fetchInterventionHistory, EMPTY_INTERVENTION_HISTORY } from "@/lib/risk/intervention-history";
import {
  buildBandIncreaseNotifications,
  emitNotifications,
  teachersForSection,
  type BandCrossing,
} from "@/lib/notifications";
import type { RiskThresholds, RiskWeights } from "@/lib/risk/types";
import { detectStudentPatterns, detectSectionPatterns } from "@/lib/patterns/detector";
import { generateRecommendation } from "@/lib/patterns/recommendations";
import type { PatternRuleConfig, PatternRuleId } from "@/lib/patterns/rules";

export type RunEngineOptions = {
  schoolYearId: string;
  /** Limit to a single enrollment. Pattern detection is skipped when set. */
  enrollmentId?: string;
  /**
   * Who to attribute the audit row to. `null` means an unattended run — the
   * AuditLog userId is nullable precisely so system activity stays honest
   * rather than being blamed on whoever configured the schedule.
   */
  actorUserId: string | null;
  /** How the run was started; recorded in audit metadata. */
  trigger: "manual" | "scheduled";
};

export type RunEngineResult = {
  computed: number;
  patternsFound: number;
  recommendationsCreated: number;
  notificationsSent: number;
};

export async function runRiskEngine(
  options: RunEngineOptions,
): Promise<{ ok: true; result: RunEngineResult } | { ok: false; error: string }> {
  const { schoolYearId, enrollmentId, actorUserId, trigger } = options;

  const config = await prisma.algorithmConfig.findFirst({ where: { isActive: true } });
  if (!config) {
    return { ok: false, error: "No active AlgorithmConfig found. Please configure the algorithm first." };
  }

  const weights = config.weights as unknown as RiskWeights;
  const thresholds = config.thresholds as unknown as RiskThresholds;
  const ruleConfig = config.ruleConfig as unknown as PatternRuleConfig;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolYearId,
      status: "ACTIVE",
      ...(enrollmentId ? { id: enrollmentId } : {}),
    },
    include: {
      student: { select: { spedStatus: true, firstName: true, lastName: true } },
      grades: true,
      attendance: true,
      behavioralRecords: true,
      // Band before this run, so we can tell who crossed upward (spec §5).
      riskAssessments: { orderBy: { computedAt: "desc" }, take: 1, select: { band: true } },
    },
  });

  const historyByStudent = await fetchInterventionHistory(
    enrollments.map((e) => e.studentId),
    schoolYearId,
  );

  // Section → teacher fan-out, resolved once rather than per crossing.
  const teachersBySection = new Map<string, string[]>();
  for (const sectionId of new Set(enrollments.map((e) => e.sectionId))) {
    teachersBySection.set(sectionId, await teachersForSection(sectionId, schoolYearId));
  }

  const crossings: BandCrossing[] = [];
  let computed = 0;

  for (const enrollment of enrollments) {
    const result = computeRiskScore({
      grades: enrollment.grades,
      attendance: enrollment.attendance,
      behavioral: enrollment.behavioralRecords,
      interventionHistory: historyByStudent.get(enrollment.studentId) ?? EMPTY_INTERVENTION_HISTORY,
      spedStatus: enrollment.student.spedStatus,
      learningModality: enrollment.learningModality,
      weights,
      thresholds,
    });

    await prisma.riskAssessment.create({
      data: {
        enrollmentId: enrollment.id,
        schoolYearId,
        score: result.score,
        band: result.band,
        factors: result.factors as object,
        configId: config.id,
        configVersion: config.version,
      },
    });
    computed++;

    crossings.push({
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      sectionId: enrollment.sectionId,
      previousBand: enrollment.riskAssessments[0]?.band ?? null,
      nextBand: result.band,
    });
  }

  // Emitted outside the scoring loop so one bad insert cannot leave a partial
  // set of scores behind, and after scoring so the linked page is already true.
  const notificationsSent = await emitNotifications(
    buildBandIncreaseNotifications(crossings, teachersBySection, schoolYearId),
  );

  let patternsFound = 0;
  let recommendationsCreated = 0;

  // Pattern detection is a whole-year operation; a single-enrollment recompute
  // has nothing meaningful to compare against.
  if (!enrollmentId) {
    const [studentPatterns, sectionPatterns] = await Promise.all([
      detectStudentPatterns(schoolYearId, ruleConfig),
      detectSectionPatterns(schoolYearId, ruleConfig),
    ]);

    for (const pattern of [...studentPatterns, ...sectionPatterns]) {
      // Upsert: one open pattern per (scope, scopeTargetId, ruleId, schoolYearId).
      const existing = await prisma.patternMatch.findFirst({
        where: {
          scope: pattern.scope,
          scopeTargetId: pattern.scopeTargetId,
          ruleId: pattern.ruleId,
          schoolYearId: pattern.schoolYearId,
          status: "OPEN",
        },
      });

      let patternId: string;
      if (existing) {
        await prisma.patternMatch.update({
          where: { id: existing.id },
          data: { evidence: pattern.evidence as object, matchedAt: new Date() },
        });
        patternId = existing.id;
      } else {
        const created = await prisma.patternMatch.create({
          data: {
            scope: pattern.scope,
            scopeTargetId: pattern.scopeTargetId,
            ruleId: pattern.ruleId,
            evidence: pattern.evidence as object,
            schoolYearId: pattern.schoolYearId,
            status: "OPEN",
          },
        });
        patternId = created.id;
        patternsFound++;
      }

      const existingRec = await prisma.recommendationDraft.findFirst({
        where: { triggeringPatternId: patternId, status: "OPEN" },
      });
      if (!existingRec) {
        const rec = generateRecommendation({
          scope: pattern.scope,
          scopeTargetId: pattern.scopeTargetId,
          schoolYearId: pattern.schoolYearId,
          ruleId: pattern.ruleId as PatternRuleId,
          patternMatchId: patternId,
          evidence: pattern.evidence,
        });
        await prisma.recommendationDraft.create({
          data: {
            scope: rec.scope,
            scopeTargetId: rec.scopeTargetId,
            schoolYearId: rec.schoolYearId,
            suggestedType: rec.suggestedType,
            rationale: rec.rationale,
            evidence: rec.evidence as object,
            triggeringPatternId: rec.triggeringPatternId,
            status: "OPEN",
          },
        });
        recommendationsCreated++;
      }
    }
  }

  await logAudit({
    action: "RISK_RECOMPUTED",
    userId: actorUserId,
    resourceType: "RiskAssessment",
    metadata: {
      schoolYearId,
      enrollmentId: enrollmentId ?? "all",
      trigger,
      computed,
      patternsFound,
      recommendationsCreated,
      notificationsSent,
    },
  });

  return { ok: true, result: { computed, patternsFound, recommendationsCreated, notificationsSent } };
}
