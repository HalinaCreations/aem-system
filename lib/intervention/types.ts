import type { InterventionType } from "@prisma/client";

// Single source of truth for the intervention type vocabulary (spec §6.6).
//
// This list was previously duplicated across seven call sites — the builder,
// the edit form, the referral form, three server actions, and the import
// validator — which meant adding a type meant finding all seven. Import from
// here instead.

export const INTERVENTION_TYPES = [
  "ACADEMIC_SUPPORT",
  "TUTORING",
  "SUBJECT_REMEDIATION",
  "STUDY_SKILLS_WORKSHOP",
  "COUNSELING_SESSION",
  "IMMEDIATE_COUNSELING",
  "SEL_PROGRAM",
  "PEER_SUPPORT",
  "POSITIVE_REINFORCEMENT",
  "PARENT_CONFERENCE",
  "EXTERNAL_REFERRAL",
  "CASE_REVIEW",
  "SECTION_INTERVENTION",
  "ATTENDANCE_PROGRAM",
] as const satisfies readonly InterventionType[];

export const INTERVENTION_TYPE_LABEL: Record<InterventionType, string> = {
  ACADEMIC_SUPPORT: "Academic support",
  TUTORING: "Tutoring",
  SUBJECT_REMEDIATION: "Subject remediation",
  STUDY_SKILLS_WORKSHOP: "Study skills workshop",
  COUNSELING_SESSION: "Counseling session",
  IMMEDIATE_COUNSELING: "Immediate counseling",
  SEL_PROGRAM: "SEL program",
  PEER_SUPPORT: "Peer support",
  POSITIVE_REINFORCEMENT: "Positive reinforcement",
  PARENT_CONFERENCE: "Parent conference",
  EXTERNAL_REFERRAL: "External referral",
  CASE_REVIEW: "Case review",
  SECTION_INTERVENTION: "Section intervention",
  ATTENDANCE_PROGRAM: "Attendance program",
};

/** Human-readable label, falling back to a de-underscored form for safety. */
export function interventionTypeLabel(type: string): string {
  return INTERVENTION_TYPE_LABEL[type as InterventionType] ?? type.replace(/_/g, " ");
}
