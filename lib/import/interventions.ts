import type { InterventionType, ParticipationOutcome, PatternScope } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

// Historical interventions import — spec §6.11 step 6.
// Rows are keyed by LRN because that is how schools hold their records. A
// broader-scope plan therefore arrives as several rows sharing the same scope,
// type, and dates; `groupInterventions` folds those back into one plan with
// many participants. Individual plans stay one-row-one-plan.

// No free-text column: `Intervention` has no `description` field (it carries
// schedule / accommodations / staffActions / targetOutcomes instead), and
// mapping imported prose into one of those would misrepresent it. Spec §6.11
// requires only the six columns below.
export const INTERVENTION_COLUMNS = [
  "lrn",
  "type",
  "scope",
  "startDate",
  "endDate",
  "outcome",
] as const;
export const INTERVENTION_REQUIRED = ["lrn", "type", "scope", "startDate", "endDate", "outcome"] as const;

export type InterventionRow = {
  lrn: string;
  enrollmentId: string;
  studentId: string;
  /** Resolved per the same convention the builder uses (see resolveScopeTarget). */
  scope: PatternScope;
  scopeTargetId: string;
  type: InterventionType;
  startDate: Date;
  endDate: Date;
  outcome: ParticipationOutcome;
};

const VALID_TYPES: InterventionType[] = [
  "ACADEMIC_SUPPORT",
  "COUNSELING_SESSION",
  "IMMEDIATE_COUNSELING",
  "POSITIVE_REINFORCEMENT",
  "CASE_REVIEW",
  "SECTION_INTERVENTION",
  "SUBJECT_REMEDIATION",
  "ATTENDANCE_PROGRAM",
];

function normalizeType(v: string): InterventionType | null {
  const x = v.trim().toUpperCase().replace(/[-\s]+/g, "_");
  // Friendly aliases for the vocabulary schools actually write down.
  if (x === "REMEDIAL" || x === "REMEDIATION") return "SUBJECT_REMEDIATION";
  if (x === "COUNSELING") return "COUNSELING_SESSION";
  if (x === "ATTENDANCE" || x === "ATTENDANCE_CAMPAIGN") return "ATTENDANCE_PROGRAM";
  return (VALID_TYPES as string[]).includes(x) ? (x as InterventionType) : null;
}

function normalizeScope(v: string): PatternScope | null {
  const x = v.trim().toUpperCase();
  if (x === "STUDENT" || x === "INDIVIDUAL") return "STUDENT";
  if (x === "SECTION") return "SECTION";
  if (x === "GRADE" || x === "GRADE_LEVEL") return "GRADE";
  if (x === "SCHOOL" || x === "SCHOOL_WIDE" || x === "SCHOOLWIDE") return "SCHOOL";
  return null;
}

function normalizeOutcome(v: string): ParticipationOutcome | null {
  const x = v.trim().toUpperCase();
  if (x === "IMPROVING" || x === "IMPROVED") return "IMPROVING";
  if (x === "STABLE" || x === "NO_CHANGE") return "STABLE";
  if (x === "DECLINING" || x === "DECLINED") return "DECLINING";
  if (x === "COMPLETED" || x === "COMPLETE") return "COMPLETED";
  return null;
}

function parseDate(v: string): Date | null {
  if (!v) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  let d: Date | null = null;
  if (iso.test(v)) d = new Date(v + "T00:00:00.000Z");
  else if (us.test(v)) {
    const m = v.match(us)!;
    d = new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00.000Z`);
  }
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

type EnrollmentRef = { enrollmentId: string; studentId: string; sectionId: string; gradeLevel: string };

type Refs = {
  enrollmentByLrn: Map<string, EnrollmentRef>;
};

export function validateInterventionsCsv(parsed: ParsedCsv, refs: Refs): ValidationResult<InterventionRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missing = INTERVENTION_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));
  if (missing.length > 0) {
    return summarize<InterventionRow>([
      { ok: false, row: 0, errors: [`Missing required column(s): ${missing.join(", ")}`], raw: {} },
    ]);
  }

  const get = (r: Record<string, string>, key: string): string => {
    const exact = r[key];
    if (exact !== undefined) return (exact ?? "").toString().trim();
    const lower = key.toLowerCase();
    for (const k of Object.keys(r)) {
      if (k.toLowerCase() === lower) return (r[k] ?? "").toString().trim();
    }
    return "";
  };

  const validated: ValidatedRow<InterventionRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const lrn = get(raw, "lrn");
    if (!/^\d{12}$/.test(lrn)) errors.push("LRN must be exactly 12 digits");
    const ref = refs.enrollmentByLrn.get(lrn);
    if (!ref && /^\d{12}$/.test(lrn)) {
      errors.push(`LRN ${lrn} is not enrolled in the target school year`);
    }

    const type = normalizeType(get(raw, "type"));
    if (!type) errors.push(`type must be one of ${VALID_TYPES.join("/")} (got "${get(raw, "type")}")`);

    const scope = normalizeScope(get(raw, "scope"));
    if (!scope) errors.push(`scope must be STUDENT/SECTION/GRADE/SCHOOL (got "${get(raw, "scope")}")`);

    const startDate = parseDate(get(raw, "startDate"));
    if (!startDate) errors.push(`startDate must be YYYY-MM-DD or MM/DD/YYYY (got "${get(raw, "startDate")}")`);

    const endDate = parseDate(get(raw, "endDate"));
    if (!endDate) errors.push(`endDate must be YYYY-MM-DD or MM/DD/YYYY (got "${get(raw, "endDate")}")`);

    if (startDate && endDate && endDate < startDate) {
      errors.push("endDate must be on or after startDate");
    }

    const outcome = normalizeOutcome(get(raw, "outcome"));
    if (!outcome) errors.push(`outcome must be IMPROVING/STABLE/DECLINING/COMPLETED (got "${get(raw, "outcome")}")`);

    if (errors.length > 0 || !ref || !type || !scope || !startDate || !endDate || !outcome) {
      return { ok: false, row: rowNum, errors, raw };
    }

    // Same targeting convention as the counselor builder's resolveScopeTarget.
    const scopeTargetId =
      scope === "STUDENT"
        ? ref.studentId
        : scope === "SECTION"
          ? ref.sectionId
          : scope === "GRADE"
            ? ref.gradeLevel
            : "school";

    return {
      ok: true,
      row: rowNum,
      data: {
        lrn,
        enrollmentId: ref.enrollmentId,
        studentId: ref.studentId,
        scope,
        scopeTargetId,
        type,
        startDate,
        endDate,
        outcome,
      },
    };
  });

  return summarize(validated);
}

export type GroupedIntervention = {
  scope: PatternScope;
  scopeTargetId: string;
  type: InterventionType;
  startDate: Date;
  endDate: Date;
  participants: Array<{ enrollmentId: string; outcome: ParticipationOutcome }>;
};

/**
 * Folds validated rows into the plans to create. Individual-scope rows each
 * become their own plan; broader-scope rows sharing scope, target, type, and
 * dates collapse into a single plan with one participation per LRN.
 */
export function groupInterventions(rows: InterventionRow[]): GroupedIntervention[] {
  const groups = new Map<string, GroupedIntervention>();

  for (const r of rows) {
    const key =
      r.scope === "STUDENT"
        ? // Never merge individual plans — two rows for the same student are
          // two separate historical plans.
          `STUDENT::${r.enrollmentId}::${r.type}::${r.startDate.toISOString()}::${r.endDate.toISOString()}`
        : `${r.scope}::${r.scopeTargetId}::${r.type}::${r.startDate.toISOString()}::${r.endDate.toISOString()}`;

    const existing = groups.get(key);
    if (existing) {
      existing.participants.push({ enrollmentId: r.enrollmentId, outcome: r.outcome });
    } else {
      groups.set(key, {
        scope: r.scope,
        scopeTargetId: r.scopeTargetId,
        type: r.type,
        startDate: r.startDate,
        endDate: r.endDate,
        participants: [{ enrollmentId: r.enrollmentId, outcome: r.outcome }],
      });
    }
  }

  return Array.from(groups.values());
}
