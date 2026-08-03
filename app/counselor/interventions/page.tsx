import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getInterventionsForYear,
  getInterventionsCountForYear,
  getOutcomeTracking,
  type InterventionFilters,
} from "@/lib/intervention/queries";
import { getOpenRecommendations } from "@/lib/risk/queries";
import { prisma } from "@/lib/prisma";
import { generateRecommendationNarrative } from "@/lib/ai/narrative";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { INTERVENTION_TYPES } from "@/lib/intervention/types";
import type { InterventionStatus, InterventionType, PatternScope } from "@prisma/client";
import InterventionsHubView from "@/components/roles/counselor/interventions-hub-view";

const INTERVENTION_STATUSES: InterventionStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

const SCOPE_VALUES: PatternScope[] = ["STUDENT", "SECTION", "GRADE", "SCHOOL"];

export default async function CounselorInterventionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year. Ask the admin to activate one.
      </div>
    );
  }

  const sp = await searchParams;

  // ── Parse filter params ────────────────────────────────────────────────────
  const filterStatus =
    typeof sp.status === "string" && INTERVENTION_STATUSES.includes(sp.status as InterventionStatus)
      ? (sp.status as InterventionStatus)
      : undefined;
  const filterScope =
    typeof sp.scope === "string" && SCOPE_VALUES.includes(sp.scope as PatternScope)
      ? (sp.scope as PatternScope)
      : undefined;
  const filterType =
    typeof sp.type === "string" && INTERVENTION_TYPES.includes(sp.type as InterventionType)
      ? (sp.type as InterventionType)
      : undefined;
  const filterSectionId = typeof sp.section === "string" && sp.section ? sp.section : undefined;
  const filterQ = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  const filterRecSectionId = typeof sp.recSection === "string" && sp.recSection ? sp.recSection : undefined;
  const initialTab =
    typeof sp.initialTab === "string" && ["all", "recommendations", "outcomes"].includes(sp.initialTab)
      ? (sp.initialTab as "all" | "recommendations" | "outcomes")
      : undefined;

  const filters: InterventionFilters = {
    status: filterStatus,
    scope: filterScope,
    type: filterType,
    sectionId: filterSectionId,
    q: filterQ,
  };

  const requestedPage = parsePageParam(sp.page);
  const totalInterventions = await getInterventionsCountForYear(sy.id, filters);
  const pagination = paginate(totalInterventions, requestedPage, PAGE_SIZE);

  // Parallel data fetching: interventions list, recommendations, outcome tracking, sections, & status counts
  const [
    interventions,
    allRecommendations,
    outcomes,
    allSections,
    activeCount,
    pendingCount,
    completedCount,
  ] = await Promise.all([
    getInterventionsForYear(sy.id, { skip: pagination.skip, take: pagination.take, filters }),
    getOpenRecommendations(sy.id),
    getOutcomeTracking(sy.id),
    prisma.section.findMany({
      where: { schoolYearId: sy.id },
      select: { id: true, gradeLevel: true, name: true },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
    prisma.intervention.count({ where: { schoolYearId: sy.id, status: "ACTIVE" } }),
    prisma.intervention.count({ where: { schoolYearId: sy.id, status: "PENDING_APPROVAL" } }),
    prisma.intervention.count({ where: { schoolYearId: sy.id, status: "COMPLETED" } }),
  ]);

  // ── Filter recommendations by section ─────────────────────────────────────
  let recommendations = allRecommendations;
  if (filterRecSectionId) {
    const sectionEnrollments = await prisma.studentEnrollment.findMany({
      where: { sectionId: filterRecSectionId, schoolYearId: sy.id, status: "ACTIVE" },
      select: { studentId: true },
    });
    const enrolledStudentIds = new Set(sectionEnrollments.map((e) => e.studentId));
    recommendations = allRecommendations.filter((r) => {
      if (r.scope === "SECTION") return r.scopeTargetId === filterRecSectionId;
      if (r.scope === "STUDENT") return enrolledStudentIds.has(r.scopeTargetId);
      return true;
    });
  }

  // Resolve scope labels for recommendations + narratives
  const studentIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const r of recommendations) {
    if (r.scope === "STUDENT") studentIds.add(r.scopeTargetId);
    if (r.scope === "SECTION") sectionIds.add(r.scopeTargetId);
  }
  const [students, sections] = await Promise.all([
    studentIds.size === 0
      ? Promise.resolve([])
      : prisma.student.findMany({
          where: { id: { in: [...studentIds] } },
          select: { id: true, firstName: true, lastName: true },
        }),
    sectionIds.size === 0
      ? Promise.resolve([])
      : prisma.section.findMany({
          where: { id: { in: [...sectionIds] }, schoolYearId: sy.id },
          select: { id: true, gradeLevel: true, name: true },
        }),
  ]);
  const labelMap = new Map<string, string>();
  for (const s of students) labelMap.set(`STUDENT:${s.id}`, `${s.lastName}, ${s.firstName}`);
  for (const sec of sections) labelMap.set(`SECTION:${sec.id}`, `${sec.gradeLevel} · ${sec.name}`);

  const recommendationNarratives: Awaited<ReturnType<typeof generateRecommendationNarrative>>[] = [];
  for (const r of recommendations) {
    const result = await generateRecommendationNarrative({
      scope: r.scope as "STUDENT" | "SECTION" | "GRADE" | "SCHOOL",
      scopeLabel:
        labelMap.get(`${r.scope}:${r.scopeTargetId}`) ??
        (r.scope === "GRADE" ? r.scopeTargetId : r.scope === "SCHOOL" ? "School-wide" : r.scopeTargetId),
      suggestedType: r.suggestedType,
      rationale: r.rationale,
      evidence: r.evidence,
      triggeringRuleId: r.triggeringRuleId,
    });
    recommendationNarratives.push(result);
  }

  const formattedRecommendations = recommendations.map((r, i) => ({
    id: r.id,
    scope: r.scope,
    scopeTargetId: r.scopeTargetId,
    suggestedType: r.suggestedType as InterventionType,
    rationale: r.rationale,
    evidence: r.evidence as Record<string, unknown>,
    triggeringRuleId: r.triggeringRuleId,
    scopeTarget:
      labelMap.get(`${r.scope}:${r.scopeTargetId}`) ??
      (r.scope === "GRADE" ? r.scopeTargetId : r.scope === "SCHOOL" ? "School-wide" : r.scopeTargetId),
    narrative: recommendationNarratives[i],
  }));

  const metrics = {
    activeCount,
    pendingCount,
    openRecCount: allRecommendations.length,
    completedCount,
    totalCount: totalInterventions,
  };

  return (
    <InterventionsHubView
      syLabel={sy.label}
      metrics={metrics}
      interventions={interventions}
      recommendations={formattedRecommendations}
      allRecommendationsCount={allRecommendations.length}
      outcomes={outcomes}
      allSections={allSections}
      pagination={pagination}
      filters={{
        status: filterStatus,
        scope: filterScope,
        type: filterType,
        section: filterSectionId,
        q: filterQ,
        recSection: filterRecSectionId,
        initialTab,
      }}
    />
  );
}
