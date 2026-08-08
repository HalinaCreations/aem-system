// Report registry (Figure 20 — "automated reports" / "easy report generation").
//
// Each report declares which roles may run it AND scopes its own rows to the
// caller. Both matter: the role list decides whether the button appears, and
// the generator decides what a teacher actually sees when they press it. A
// teacher running the risk roster gets their sections only — that restriction
// is applied here, not in the page, so the download route cannot be used to
// step around it.

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { interventionTypeLabel } from "@/lib/intervention/types";
import type { CsvCell } from "@/lib/reports/csv";

export type ReportId =
  | "risk-roster"
  | "intervention-outcomes"
  | "attendance-summary"
  | "bias-breakdown";

export type ReportContext = {
  schoolYearId: string;
  schoolYearLabel: string;
  caller: { id: string; role: Role };
};

export type ReportPayload = {
  header: string[];
  rows: CsvCell[][];
};

export type ReportDef = {
  id: ReportId;
  label: string;
  description: string;
  roles: Role[];
  /** Extra line shown in the UI when the output is narrowed for this caller. */
  scopeNote?: (role: Role) => string | null;
  generate: (ctx: ReportContext) => Promise<ReportPayload>;
};

/** Section ids a teacher teaches or advises; empty for every other role. */
async function teacherSectionIds(userId: string, schoolYearId: string): Promise<string[]> {
  const rows = await prisma.teacherAssignment.findMany({
    where: { userId, schoolYearId },
    select: { sectionId: true },
  });
  return [...new Set(rows.map((r) => r.sectionId))];
}

const riskRoster: ReportDef = {
  id: "risk-roster",
  label: "Risk roster",
  description:
    "Every enrolled student with their latest risk score, band, and any principal override. The list behind the caseload and student-risk screens.",
  roles: ["COUNSELOR", "PRINCIPAL", "TEACHER"],
  scopeNote: (role) =>
    role === "TEACHER" ? "Limited to students in the sections you teach or advise." : null,
  async generate({ schoolYearId, caller }) {
    const sectionIds =
      caller.role === "TEACHER" ? await teacherSectionIds(caller.id, schoolYearId) : null;

    // A teacher with no assignments gets an empty report rather than everyone.
    if (sectionIds !== null && sectionIds.length === 0) {
      return { header: HEADERS.riskRoster, rows: [] };
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolYearId,
        status: "ACTIVE",
        ...(sectionIds ? { sectionId: { in: sectionIds } } : {}),
      },
      include: {
        student: { select: { lrn: true, firstName: true, lastName: true } },
        section: { select: { name: true, gradeLevel: true } },
        riskAssessments: {
          orderBy: { computedAt: "desc" },
          take: 1,
          select: { score: true, band: true, computedAt: true },
        },
        riskOverrides: {
          where: { clearedAt: null },
          take: 1,
          select: { overrideBand: true, justification: true },
        },
      },
      orderBy: [{ section: { name: "asc" } }, { student: { lastName: "asc" } }],
    });

    return {
      header: HEADERS.riskRoster,
      rows: enrollments.map((e) => {
        const latest = e.riskAssessments[0];
        const override = e.riskOverrides[0];
        return [
          e.student.lrn,
          `${e.student.lastName}, ${e.student.firstName}`,
          e.section.gradeLevel,
          e.section.name,
          latest ? latest.score : "",
          latest ? latest.band : "Not scored",
          override ? override.overrideBand : "",
          override ? override.justification : "",
          latest ? latest.computedAt.toISOString().slice(0, 10) : "",
        ];
      }),
    };
  },
};

const interventionOutcomes: ReportDef = {
  id: "intervention-outcomes",
  label: "Intervention pipeline & outcomes",
  description:
    "Every intervention for the year with its scope, type, status, owner, and the distribution of participant outcomes. Answers 'what did we try, and did it help?'.",
  roles: ["COUNSELOR", "PRINCIPAL"],
  async generate({ schoolYearId }) {
    const interventions = await prisma.intervention.findMany({
      where: { schoolYearId },
      include: {
        owner: { select: { name: true } },
        participations: { select: { outcome: true } },
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });

    return {
      header: HEADERS.interventionOutcomes,
      rows: interventions.map((i) => {
        const counts = { IMPROVING: 0, STABLE: 0, DECLINING: 0, COMPLETED: 0, unset: 0 };
        for (const p of i.participations) {
          if (p.outcome) counts[p.outcome]++;
          else counts.unset++;
        }
        return [
          i.scope,
          interventionTypeLabel(i.type),
          i.status,
          i.owner.name,
          i.startDate.toISOString().slice(0, 10),
          i.endDate ? i.endDate.toISOString().slice(0, 10) : "",
          i.participations.length,
          counts.IMPROVING,
          counts.STABLE,
          counts.DECLINING,
          counts.COMPLETED,
          counts.unset,
        ];
        // Deliberately excludes rationale and counseling context — those are
        // restricted fields, and a CSV leaves the access-controlled UI behind.
      }),
    };
  },
};

const attendanceSummary: ReportDef = {
  id: "attendance-summary",
  label: "Attendance summary by section",
  description:
    "Per-section attendance totals and rates for the year, with the school average for comparison.",
  roles: ["COUNSELOR", "PRINCIPAL", "TEACHER", "ADMIN"],
  scopeNote: (role) => (role === "TEACHER" ? "Limited to sections you teach or advise." : null),
  async generate({ schoolYearId, caller }) {
    const sectionIds =
      caller.role === "TEACHER" ? await teacherSectionIds(caller.id, schoolYearId) : null;
    if (sectionIds !== null && sectionIds.length === 0) {
      return { header: HEADERS.attendanceSummary, rows: [] };
    }

    const sections = await prisma.section.findMany({
      where: { schoolYearId, ...(sectionIds ? { id: { in: sectionIds } } : {}) },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { attendance: { select: { status: true } } },
        },
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    });

    // School-wide baseline is computed across all sections regardless of the
    // caller's scope — otherwise a teacher's "school average" would be their
    // own sections, which is not a comparison.
    const allSections = await prisma.section.findMany({
      where: { schoolYearId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { attendance: { select: { status: true } } },
        },
      },
    });
    let schoolDays = 0;
    let schoolAbsent = 0;
    for (const s of allSections) {
      for (const e of s.enrollments) {
        schoolDays += e.attendance.length;
        schoolAbsent += e.attendance.filter((a) => a.status === "ABSENT").length;
      }
    }
    const schoolRate = schoolDays === 0 ? 0 : (schoolAbsent / schoolDays) * 100;

    return {
      header: HEADERS.attendanceSummary,
      rows: sections.map((s) => {
        let days = 0;
        let absent = 0;
        let tardy = 0;
        for (const e of s.enrollments) {
          days += e.attendance.length;
          absent += e.attendance.filter((a) => a.status === "ABSENT").length;
          tardy += e.attendance.filter((a) => a.status === "TARDY").length;
        }
        const absenceRate = days === 0 ? 0 : (absent / days) * 100;
        return [
          s.gradeLevel,
          s.name,
          s.enrollments.length,
          days,
          absent,
          tardy,
          absenceRate.toFixed(2),
          days === 0 ? "" : ((tardy / days) * 100).toFixed(2),
          schoolRate.toFixed(2),
          (absenceRate - schoolRate).toFixed(2),
        ];
      }),
    };
  },
};

const biasBreakdown: ReportDef = {
  id: "bias-breakdown",
  label: "Bias monitoring breakdown",
  description:
    "Risk band distribution across sex, SPED status, and learning modality — the governance view, as data you can bring to a review meeting.",
  roles: ["PRINCIPAL"],
  async generate({ schoolYearId }) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolYearId, status: "ACTIVE" },
      include: {
        student: { select: { sex: true } },
        riskAssessments: { orderBy: { computedAt: "desc" }, take: 1, select: { band: true } },
      },
    });

    type Bucket = { LOW: number; MODERATE: number; HIGH: number; unscored: number };
    const groups = new Map<string, Bucket>();
    const bump = (dimension: string, value: string, band: string | undefined) => {
      const key = `${dimension} ${value}`;
      const b = groups.get(key) ?? { LOW: 0, MODERATE: 0, HIGH: 0, unscored: 0 };
      if (band === "LOW" || band === "MODERATE" || band === "HIGH") b[band]++;
      else b.unscored++;
      groups.set(key, b);
    };

    for (const e of enrollments) {
      const band = e.riskAssessments[0]?.band;
      bump("Sex", e.student.sex, band);
      bump("Learning modality", e.learningModality, band);
    }

    const schoolTotal = enrollments.length;
    const schoolHigh = enrollments.filter((e) => e.riskAssessments[0]?.band === "HIGH").length;
    const schoolHighRate = schoolTotal === 0 ? 0 : (schoolHigh / schoolTotal) * 100;

    return {
      header: HEADERS.biasBreakdown,
      rows: [...groups.entries()].map(([key, b]) => {
        const [dimension, value] = key.split(" ");
        const total = b.LOW + b.MODERATE + b.HIGH + b.unscored;
        const highRate = total === 0 ? 0 : (b.HIGH / total) * 100;
        return [
          dimension,
          value,
          total,
          b.LOW,
          b.MODERATE,
          b.HIGH,
          b.unscored,
          highRate.toFixed(2),
          schoolHighRate.toFixed(2),
          (highRate - schoolHighRate).toFixed(2),
        ];
      }),
    };
  },
};

const HEADERS = {
  riskRoster: [
    "LRN", "Student", "Grade", "Section",
    "Risk score", "Band", "Override band", "Override justification", "Scored on",
  ],
  interventionOutcomes: [
    "Scope", "Type", "Status", "Owner", "Start", "End",
    "Participants", "Improving", "Stable", "Declining", "Completed", "Outcome not set",
  ],
  attendanceSummary: [
    "Grade", "Section", "Students", "Attendance days recorded", "Absences", "Tardies",
    "Absence rate %", "Tardy rate %", "School absence rate %", "Difference vs school %",
  ],
  biasBreakdown: [
    "Dimension", "Group", "Students", "Low", "Moderate", "High", "Not scored",
    "High rate %", "School high rate %", "Difference vs school %",
  ],
};

export const REPORTS: ReportDef[] = [
  riskRoster,
  interventionOutcomes,
  attendanceSummary,
  biasBreakdown,
];

export function getReport(id: string): ReportDef | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function reportsForRole(role: Role): ReportDef[] {
  return REPORTS.filter((r) => r.roles.includes(role));
}
