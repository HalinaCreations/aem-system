import type { SELLevel } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

// SEL assessment import (spec §6.4 — counselor-managed periodic assessments).
// Every dimension uses the same concern scale: THRIVING is the healthy end for
// all of them, including stress. `selfAssessment` and `notes` are optional —
// the student may not have given a self-rating, and narrative context is not
// always recorded.

export const SEL_COLUMNS = [
  "lrn",
  "assessedByEmail",
  "assessedAt",
  "emotionalWellbeing",
  "stressLevel",
  "peerRelationships",
  "selfAssessment",
  "notes",
] as const;
export const SEL_REQUIRED = [
  "lrn",
  "assessedByEmail",
  "assessedAt",
  "emotionalWellbeing",
  "stressLevel",
  "peerRelationships",
] as const;

export type SELRow = {
  lrn: string;
  enrollmentId: string;
  assessedByEmail: string;
  assessedById: string;
  assessedAt: Date;
  emotionalWellbeing: SELLevel;
  stressLevel: SELLevel;
  peerRelationships: SELLevel;
  selfAssessment: SELLevel | null;
  notes: string | null;
};

function normalizeLevel(v: string): SELLevel | null {
  const x = v.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (x === "THRIVING" || x === "GOOD") return "THRIVING";
  if (x === "STABLE" || x === "OK") return "STABLE";
  if (x === "AT_RISK" || x === "ATRISK" || x === "CONCERN") return "AT_RISK";
  if (x === "CRITICAL" || x === "SEVERE") return "CRITICAL";
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

type Refs = {
  enrollmentByLrn: Map<string, string>;
  /** Active COUNSELOR users only, keyed by lower-cased email. */
  counselorByEmail: Map<string, string>;
};

export function validateSELCsv(parsed: ParsedCsv, refs: Refs): ValidationResult<SELRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missing = SEL_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));
  if (missing.length > 0) {
    return summarize<SELRow>([
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

  const LEVEL_HELP = "THRIVING/STABLE/AT_RISK/CRITICAL";

  const validated: ValidatedRow<SELRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const lrn = get(raw, "lrn");
    if (!/^\d{12}$/.test(lrn)) errors.push("LRN must be exactly 12 digits");
    const enrollmentId = refs.enrollmentByLrn.get(lrn);
    if (!enrollmentId && /^\d{12}$/.test(lrn)) {
      errors.push(`LRN ${lrn} is not enrolled in the target school year`);
    }

    // The wizard is admin-only, but SEL is counselor-authored clinical data.
    // Requiring an explicit counselor keeps spec §14 named accountability intact
    // rather than attributing imported assessments to the importing admin — who
    // cannot even read them back.
    const assessedByEmail = get(raw, "assessedByEmail").toLowerCase();
    const assessedById = refs.counselorByEmail.get(assessedByEmail);
    if (!assessedByEmail) errors.push("assessedByEmail required");
    else if (!assessedById) errors.push(`assessedByEmail "${assessedByEmail}" is not an active counselor`);

    const assessedAt = parseDate(get(raw, "assessedAt"));
    if (!assessedAt) {
      errors.push(`assessedAt must be YYYY-MM-DD or MM/DD/YYYY (got "${get(raw, "assessedAt")}")`);
    }

    const emotionalWellbeing = normalizeLevel(get(raw, "emotionalWellbeing"));
    if (!emotionalWellbeing) {
      errors.push(`emotionalWellbeing must be ${LEVEL_HELP} (got "${get(raw, "emotionalWellbeing")}")`);
    }

    const stressLevel = normalizeLevel(get(raw, "stressLevel"));
    if (!stressLevel) errors.push(`stressLevel must be ${LEVEL_HELP} (got "${get(raw, "stressLevel")}")`);

    const peerRelationships = normalizeLevel(get(raw, "peerRelationships"));
    if (!peerRelationships) {
      errors.push(`peerRelationships must be ${LEVEL_HELP} (got "${get(raw, "peerRelationships")}")`);
    }

    // Optional — blank is valid, but a non-empty unrecognised value is an error
    // rather than a silent drop.
    const rawSelf = get(raw, "selfAssessment");
    let selfAssessment: SELLevel | null = null;
    if (rawSelf) {
      selfAssessment = normalizeLevel(rawSelf);
      if (!selfAssessment) errors.push(`selfAssessment must be ${LEVEL_HELP} or blank (got "${rawSelf}")`);
    }

    const notes = get(raw, "notes") || null;

    if (
      errors.length > 0 ||
      !enrollmentId ||
      !assessedById ||
      !assessedAt ||
      !emotionalWellbeing ||
      !stressLevel ||
      !peerRelationships
    ) {
      return { ok: false, row: rowNum, errors, raw };
    }

    return {
      ok: true,
      row: rowNum,
      data: {
        lrn,
        enrollmentId,
        assessedByEmail,
        assessedById,
        assessedAt,
        emotionalWellbeing,
        stressLevel,
        peerRelationships,
        selfAssessment,
        notes,
      },
    };
  });

  return summarize(validated);
}
