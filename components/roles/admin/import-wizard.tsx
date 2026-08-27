"use client";

import { useMemo, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { previewStaffAction, commitStaffAction, type StaffPreview, type StaffCommit } from "@/app/actions/import/staff";
import { previewRosterAction, commitRosterAction, type RosterPreview, type RosterCommit } from "@/app/actions/import/roster";
import { previewAssignmentsAction, commitAssignmentsAction, type AssignmentsPreview, type AssignmentsCommit } from "@/app/actions/import/assignments";
import { previewGradesAction, commitGradesAction, type GradesPreview, type GradesCommit } from "@/app/actions/import/grades";
import { previewAttendanceAction, commitAttendanceAction, type AttendancePreview, type AttendanceCommit } from "@/app/actions/import/attendance";
import { previewBehavioralAction, commitBehavioralAction, type BehavioralPreview, type BehavioralCommit } from "@/app/actions/import/behavioral";
import { previewInterventionsAction, commitInterventionsAction, type InterventionsPreview, type InterventionsCommit } from "@/app/actions/import/interventions";
import { previewSELAction, commitSELAction, type SELPreview, type SELCommit } from "@/app/actions/import/sel";
import PageHeader from "@/components/shell/page-header";

type Year = { id: string; label: string; isActive: boolean };

type Props = {
  years: Year[];
  defaultYearId: string | null;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const STEP_LABELS: Record<Step, string> = {
  1: "Select school year",
  2: "Staff CSV",
  3: "Roster CSV",
  4: "Assignments CSV",
  5: "Grades CSV",
  6: "Attendance CSV",
  7: "Behavioral CSV (optional)",
  8: "Interventions CSV (optional)",
  9: "SEL CSV (optional)",
};

export default function ImportWizard({ years, defaultYearId }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(defaultYearId);
  const selectedYear = useMemo(() => years.find((y) => y.id === selectedYearId) ?? null, [years, selectedYearId]);

  const dataStepsEnabled = !!selectedYearId;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Data Administration"
        title="Import Wizard"
        description="Bulk-load student rosters, grades, attendance, behavioral records, historical interventions, and SEL assessments into the selected school year. Each step previews the first 20 rows and reports validation errors with row numbers before committing. Commits run as a single transaction — all-or-nothing."
      />

      {/* Stepper */}
      <ol className="grid gap-3 md:grid-cols-5 lg:grid-cols-9">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => {
          const s = id as Step;
          const active = s === step;
          const enabled = s === 1 || dataStepsEnabled;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => enabled && setStep(s)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : enabled
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step {s}</p>
                <p className="mt-1 font-medium">{STEP_LABELS[s]}</p>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <YearPickerStep
          years={years}
          selectedYearId={selectedYearId}
          onChange={setSelectedYearId}
          onContinue={() => setStep(2)}
        />
      )}

      {step >= 2 && step <= 9 && selectedYearId && selectedYear && (
        <>
          {step === 2 && (
            <CsvStep<StaffRowPreview, StaffCommit>
              title="Staff CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["email", "name", "role"]}
              optionalColumns={["password", "status"]}
              hints={
                <p>
                  <code className="font-mono">role</code> is one of <code>ADMIN</code>, <code>TEACHER</code>,{" "}
                  <code>COUNSELOR</code>, <code>PRINCIPAL</code>. Leave <code className="font-mono">password</code> blank
                  to apply the shared default. Re-importing never overwrites an existing user&apos;s password.
                  Import staff <strong>before</strong> assignments — assignment rows resolve teachers by email.
                </p>
              }
              sampleFileName="staff-sample.csv"
              sampleRows={[
                { email: "m.carandang@school.edu", name: "CARANDANG, Mary Jane S.", role: "PRINCIPAL", password: "", status: "ACTIVE" },
                { email: "a.rosales@school.edu", name: "ROSALES, Ann Charise M.", role: "COUNSELOR", password: "", status: "ACTIVE" },
                { email: "j.gabog@school.edu", name: "GABOG, Jonas M.", role: "TEACHER", password: "", status: "ACTIVE" },
              ]}
              previewAction={previewStaffAction}
              commitAction={commitStaffAction}
              previewHeaders={["Row", "Email", "Name", "Role", "Status"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="email" className="px-2 py-2 font-mono">{r.data.email}</td>,
                <td key="name" className="px-2 py-2">{r.data.name}</td>,
                <td key="role" className="px-2 py-2">{r.data.role}</td>,
                <td key="status" className="px-2 py-2">{r.data.status}</td>,
              ]}
              commitButtonLabel={(n) => `Commit ${n} staff row(s)`}
              renderSuccess={(c) => (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  <li>{c.created} user(s) created</li>
                  <li>{c.updated} user(s) updated</li>
                </ul>
              )}
            />
          )}

          {step === 3 && (
            <CsvStep<RosterRowPreview, RosterCommit>
              title="Roster CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["lrn", "firstName", "lastName", "sex", "birthDate", "gradeLevel", "section"]}
              optionalColumns={["middleName", "learningModality", "guardianName", "guardianContact", "spedStatus"]}
              hints={
                <>
                  <p>
                    <code className="font-mono">birthDate</code> accepts <code>YYYY-MM-DD</code> or <code>MM/DD/YYYY</code>.
                    <code className="font-mono"> sex</code> accepts <code>MALE</code> / <code>FEMALE</code> (or M/F).
                  </p>
                  <p>
                    <code className="font-mono">gradeLevel</code> is the full label (<code>Grade 9</code>) and{" "}
                    <code className="font-mono">section</code> is the bare name (<code>Newton</code>) — not{" "}
                    <code>9-Newton</code>. Sections are keyed on the pair, so mixing conventions creates duplicates.
                  </p>
                </>
              }
              sampleFileName="roster-sample.csv"
              sampleRows={[
                { lrn: "136800010001", firstName: "Maria", lastName: "Santos", middleName: "Dela Cruz", sex: "FEMALE", birthDate: "2010-04-12", gradeLevel: "Grade 9", section: "Newton", learningModality: "FACE_TO_FACE", guardianName: "Ana Santos", guardianContact: "09171234567", spedStatus: "NONE" },
                { lrn: "136800010002", firstName: "Juan", lastName: "Reyes", middleName: "", sex: "MALE", birthDate: "07/30/2010", gradeLevel: "Grade 9", section: "Curie", learningModality: "MODULAR", guardianName: "Rosa Reyes", guardianContact: "09181234567", spedStatus: "NONE" },
              ]}
              previewAction={previewRosterAction}
              commitAction={commitRosterAction}
              previewHeaders={["Row", "LRN", "Name", "Sex", "Birth", "Grade · Section", "Modality"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="lrn" className="px-2 py-2 font-mono">{r.data.lrn}</td>,
                <td key="name" className="px-2 py-2">{r.data.lastName}, {r.data.firstName}</td>,
                <td key="sex" className="px-2 py-2">{r.data.sex}</td>,
                <td key="birth" className="px-2 py-2">{r.data.birthDate.toISOString().slice(0, 10)}</td>,
                <td key="grade" className="px-2 py-2">{r.data.gradeLevel} · {r.data.section}</td>,
                <td key="mod" className="px-2 py-2">{r.data.learningModality}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} row(s) to ${label}`}
              renderSuccess={(c) => (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  <li>{c.created.sections} new section(s)</li>
                  <li>{c.created.students} new student(s)</li>
                  <li>{c.created.enrollments} new enrollment(s)</li>
                  <li>{c.created.consents} new consent record(s)</li>
                </ul>
              )}
            />
          )}

          {step === 4 && (
            <CsvStep<AssignmentsRowPreview, AssignmentsCommit>
              title="Assignments CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["email", "gradeLevel", "section"]}
              optionalColumns={["subjectCode", "subjectName", "isAdviser"]}
              hints={
                <p>
                  Leave <code className="font-mono">subjectCode</code> and <code className="font-mono">subjectName</code>{" "}
                  blank and set <code className="font-mono">isAdviser</code> to <code>true</code> for an advisory row.
                  Sections and subjects are created automatically. Use{" "}
                  <code className="font-mono">gradeLevel</code> = <code>Grade 9</code> and{" "}
                  <code className="font-mono">section</code> = <code>Moonstone</code> — bare section names, no grade prefix.
                </p>
              }
              sampleFileName="assignments-sample.csv"
              sampleRows={[
                { email: "j.gabog@school.edu", gradeLevel: "Grade 9", section: "Musgravite", subjectCode: "", subjectName: "", isAdviser: "true" },
                { email: "j.gabog@school.edu", gradeLevel: "Grade 9", section: "Morganite", subjectCode: "ENG9", subjectName: "English 9", isAdviser: "false" },
              ]}
              previewAction={previewAssignmentsAction}
              commitAction={commitAssignmentsAction}
              previewHeaders={["Row", "Teacher", "Grade · Section", "Subject", "Adviser"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="email" className="px-2 py-2 font-mono">{r.data.email}</td>,
                <td key="sec" className="px-2 py-2">{r.data.gradeLevel} · {r.data.section}</td>,
                <td key="subj" className="px-2 py-2">{r.data.subjectCode ?? "—"}</td>,
                <td key="adv" className="px-2 py-2">{r.data.isAdviser ? "Yes" : "—"}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} assignment(s) to ${label}`}
              renderSuccess={(c) => (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  <li>{c.created.sections} section(s) created</li>
                  <li>{c.created.subjects} subject(s) created</li>
                  <li>{c.created.assignments} assignment(s) created</li>
                </ul>
              )}
            />
          )}

          {step === 5 && (
            <CsvStep<GradesRowPreview, GradesCommit>
              title="Grades CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["lrn", "subjectCode", "quarter", "score", "maxScore"]}
              optionalColumns={["assessmentKind", "label"]}
              hints={
                <>
                  <p>
                    <code className="font-mono">assessmentKind</code>: <code>REGULAR</code> (default), <code>QUIZ</code>, <code>PERIODICAL</code>, <code>PRE_TEST</code>, <code>POST_TEST</code>.
                  </p>
                  <p>LRN must already be enrolled in the target year and subject code must exist for that year.</p>
                </>
              }
              sampleFileName="grades-sample.csv"
              sampleRows={[
                { lrn: "100000000001", subjectCode: "MATH9", quarter: "1", score: "88", maxScore: "100", assessmentKind: "REGULAR", label: "Quarterly Grade" },
                { lrn: "100000000001", subjectCode: "SCI9", quarter: "1", score: "15", maxScore: "20", assessmentKind: "QUIZ", label: "Quiz 1" },
              ]}
              previewAction={previewGradesAction}
              commitAction={commitGradesAction}
              previewHeaders={["Row", "LRN", "Subject", "Q", "Score", "Kind", "Label"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="lrn" className="px-2 py-2 font-mono">{r.data.lrn}</td>,
                <td key="subj" className="px-2 py-2">{r.data.subjectCode}</td>,
                <td key="q" className="px-2 py-2">{r.data.quarter}</td>,
                <td key="score" className="px-2 py-2">{r.data.score} / {r.data.maxScore}</td>,
                <td key="kind" className="px-2 py-2">{r.data.assessmentKind}</td>,
                <td key="label" className="px-2 py-2 text-slate-500">{r.data.label ?? "—"}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} grade row(s) to ${label}`}
              renderSuccess={(c) => (
                <p className="mt-2 text-xs">{c.created} grade record(s) created.</p>
              )}
            />
          )}

          {step === 6 && (
            <CsvStep<AttendanceRowPreview, AttendanceCommit>
              title="Attendance CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["lrn", "date", "status"]}
              optionalColumns={["notes"]}
              hints={
                <>
                  <p>
                    <code className="font-mono">date</code> accepts <code>YYYY-MM-DD</code> or <code>MM/DD/YYYY</code>.
                    <code className="font-mono"> status</code>: <code>PRESENT</code>/<code>ABSENT</code>/<code>TARDY</code>/<code>EXCUSED</code> (or P/A/T/E).
                  </p>
                  <p>Existing records for the same (student, date) are updated, not duplicated. Monthly chunks are fine.</p>
                </>
              }
              sampleFileName="attendance-sample.csv"
              sampleRows={[
                { lrn: "100000000001", date: "2025-08-15", status: "PRESENT", notes: "" },
                { lrn: "100000000001", date: "08/16/2025", status: "ABSENT", notes: "Sick" },
              ]}
              previewAction={previewAttendanceAction}
              commitAction={commitAttendanceAction}
              previewHeaders={["Row", "LRN", "Date", "Status", "Notes"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="lrn" className="px-2 py-2 font-mono">{r.data.lrn}</td>,
                <td key="date" className="px-2 py-2">{r.data.date.toISOString().slice(0, 10)}</td>,
                <td key="status" className="px-2 py-2">{r.data.status}</td>,
                <td key="notes" className="px-2 py-2 text-slate-500">{r.data.notes ?? "—"}</td>,
              ]}
              commitButtonLabel={(n, label) => `Upsert ${n} attendance row(s) to ${label}`}
              renderSuccess={(c) => (
                <p className="mt-2 text-xs">{c.upserted} attendance record(s) upserted.</p>
              )}
            />
          )}

          {step === 7 && (
            <CsvStep<BehavioralRowPreview, BehavioralCommit>
              title="Behavioral CSV (optional)"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["lrn", "date", "category", "severity", "description"]}
              optionalColumns={[]}
              hints={
                <>
                  <p>
                    <code className="font-mono">category</code>: <code>ACADEMIC</code>/<code>ATTENDANCE_RELATED</code>/<code>BEHAVIORAL</code>/<code>SOCIAL_EMOTIONAL</code>.
                  </p>
                  <p>
                    <code className="font-mono">severity</code>: <code>LOW</code>/<code>MODERATE</code>/<code>HIGH</code>.
                  </p>
                  <p>Each row creates a new incident — there is no upsert key.</p>
                </>
              }
              sampleFileName="behavioral-sample.csv"
              sampleRows={[
                { lrn: "100000000001", date: "2025-08-20", category: "ACADEMIC", severity: "LOW", description: "Missed two homework submissions" },
                { lrn: "100000000001", date: "2025-08-22", category: "BEHAVIORAL", severity: "MODERATE", description: "Disruptive during class discussion" },
              ]}
              previewAction={previewBehavioralAction}
              commitAction={commitBehavioralAction}
              previewHeaders={["Row", "LRN", "Date", "Category", "Severity", "Description"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="lrn" className="px-2 py-2 font-mono">{r.data.lrn}</td>,
                <td key="date" className="px-2 py-2">{r.data.date.toISOString().slice(0, 10)}</td>,
                <td key="cat" className="px-2 py-2">{r.data.category}</td>,
                <td key="sev" className="px-2 py-2">{r.data.severity}</td>,
                <td key="desc" className="px-2 py-2 text-slate-600">{r.data.description.slice(0, 60)}{r.data.description.length > 60 ? "…" : ""}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} incident(s) to ${label}`}
              renderSuccess={(c) => (
                <p className="mt-2 text-xs">{c.created} behavioral incident(s) recorded.</p>
              )}
            />
          )}

          {step === 8 && (
            <CsvStep<InterventionsRowPreview, InterventionsCommit>
              title="Historical interventions CSV (optional)"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["lrn", "type", "scope", "startDate", "endDate", "outcome"]}
              optionalColumns={[]}
              hints={
                <>
                  <p>
                    <code className="font-mono">scope</code>: <code>STUDENT</code>/<code>SECTION</code>/<code>GRADE</code>/<code>SCHOOL</code>.
                    Rows are keyed by LRN, so a section-, grade-, or school-wide plan is written as one row per
                    participating student — rows sharing scope, type, and both dates are folded into a single plan.
                  </p>
                  <p>
                    <code className="font-mono">outcome</code>: <code>IMPROVING</code>/<code>STABLE</code>/<code>DECLINING</code>/<code>COMPLETED</code>, recorded per participant.
                  </p>
                  <p>
                    Imported plans land as <code>COMPLETED</code> — they are finished work, not live cases — and are
                    owned by you as the importing admin. They feed the intervention-history dimension of the risk score.
                  </p>
                </>
              }
              sampleFileName="interventions-sample.csv"
              sampleRows={[
                { lrn: "100000000001", type: "ACADEMIC_SUPPORT", scope: "STUDENT", startDate: "2025-08-04", endDate: "2025-10-10", outcome: "IMPROVING" },
                { lrn: "100000000001", type: "ATTENDANCE_PROGRAM", scope: "SECTION", startDate: "2025-09-01", endDate: "2025-11-28", outcome: "STABLE" },
              ]}
              previewAction={previewInterventionsAction}
              commitAction={commitInterventionsAction}
              previewHeaders={["Row", "LRN", "Scope", "Type", "Start", "End", "Outcome"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="lrn" className="px-2 py-2 font-mono">{r.data.lrn}</td>,
                <td key="scope" className="px-2 py-2">{r.data.scope}</td>,
                <td key="type" className="px-2 py-2">{r.data.type}</td>,
                <td key="start" className="px-2 py-2">{r.data.startDate.toISOString().slice(0, 10)}</td>,
                <td key="end" className="px-2 py-2">{r.data.endDate.toISOString().slice(0, 10)}</td>,
                <td key="outcome" className="px-2 py-2">{r.data.outcome}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} participation row(s) to ${label}`}
              renderSuccess={(c) => (
                <p className="mt-2 text-xs">
                  {c.plansCreated} intervention plan(s) created with {c.participantsCreated} participant record(s).
                </p>
              )}
            />
          )}

          {step === 9 && (
            <CsvStep<SELRowPreview, SELCommit>
              title="SEL assessments CSV (optional)"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["lrn", "assessedByEmail", "assessedAt", "emotionalWellbeing", "stressLevel", "peerRelationships"]}
              optionalColumns={["selfAssessment", "notes"]}
              hints={
                <>
                  <p>
                    Every dimension uses the same scale — <code>THRIVING</code>/<code>STABLE</code>/<code>AT_RISK</code>/<code>CRITICAL</code> —
                    read as level of <em>concern</em>. For <code className="font-mono">stressLevel</code>, <code>THRIVING</code> means
                    well-regulated and <code>CRITICAL</code> means severe.
                  </p>
                  <p>
                    <code className="font-mono">assessedByEmail</code> must be an active counselor. SEL is counselor-authored
                    clinical data, so imported rows are attributed to that named counselor — never to you as the importing admin.
                  </p>
                  <p>
                    <code className="font-mono">selfAssessment</code> is the student&apos;s own rating and may be left blank.
                    <code className="font-mono"> notes</code> is counselor-only narrative — you are writing data you will not be
                    able to read back on the student profile.
                  </p>
                </>
              }
              sampleFileName="sel-sample.csv"
              sampleRows={[
                { lrn: "100000000001", assessedByEmail: "counselor@school.edu", assessedAt: "2025-09-15", emotionalWellbeing: "AT_RISK", stressLevel: "AT_RISK", peerRelationships: "STABLE", selfAssessment: "AT_RISK", notes: "Reports difficulty concentrating; agreed weekly check-in." },
                { lrn: "100000000001", assessedByEmail: "counselor@school.edu", assessedAt: "2025-11-10", emotionalWellbeing: "STABLE", stressLevel: "STABLE", peerRelationships: "THRIVING", selfAssessment: "", notes: "" },
              ]}
              previewAction={previewSELAction}
              commitAction={commitSELAction}
              previewHeaders={["Row", "LRN", "Assessed", "Counselor", "Emotional", "Stress", "Peer", "Self", "Notes"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="lrn" className="px-2 py-2 font-mono">{r.data.lrn}</td>,
                <td key="at" className="px-2 py-2">{r.data.assessedAt.toISOString().slice(0, 10)}</td>,
                <td key="by" className="px-2 py-2 text-slate-600">{r.data.assessedByEmail}</td>,
                <td key="emo" className="px-2 py-2">{r.data.emotionalWellbeing}</td>,
                <td key="str" className="px-2 py-2">{r.data.stressLevel}</td>,
                <td key="peer" className="px-2 py-2">{r.data.peerRelationships}</td>,
                <td key="self" className="px-2 py-2 text-slate-500">{r.data.selfAssessment ?? "—"}</td>,
                // Never echo the narrative into an admin-facing table.
                <td key="notes" className="px-2 py-2 text-slate-400">{r.data.notes ? "provided" : "—"}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} assessment(s) to ${label}`}
              renderSuccess={(c) => (
                <p className="mt-2 text-xs">{c.created} SEL assessment(s) recorded.</p>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Step 1 — Year picker ───────────────────────────────────────────────────

function YearPickerStep({
  years,
  selectedYearId,
  onChange,
  onContinue,
}: {
  years: Year[];
  selectedYearId: string | null;
  onChange: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Choose target school year</h2>
      <p className="mt-2 text-sm text-slate-600">
        All subsequent CSV imports will be bound to this year.
      </p>
      <div className="mt-4 grid gap-2 md:max-w-md">
        <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500" htmlFor="sy">School year</label>
        <select
          id="sy"
          value={selectedYearId ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
        >
          {years.length === 0 && <option value="">No school years yet</option>}
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}{y.isActive ? " · current" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!selectedYearId}
          onClick={onContinue}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          Continue →
        </button>
      </div>
    </section>
  );
}

// ─── Generic CSV step ───────────────────────────────────────────────────────

type PreviewOk<T> = {
  ok: true;
  // Optional: Staff isn't school-year-scoped, so its preview/commit results
  // carry no schoolYearLabel — every other importer's does.
  schoolYearLabel?: string;
  total: number;
  validCount: number;
  invalidCount: number;
  previewRows: { row: number; data: T }[];
  errors: { row: number; messages: string[]; raw: Record<string, string> }[];
};
type PreviewShape<T> = PreviewOk<T> | { ok: false; error: string };
type CommitOk = { ok: true; schoolYearLabel?: string };
type CommitShape = CommitOk | { ok: false; error: string };

// Concrete row types reused for prop typing (matches the server-action output exactly).
type StaffRowPreview = NonNullable<Extract<StaffPreview, { ok: true }>["previewRows"][number]>["data"];
type AssignmentsRowPreview = NonNullable<Extract<AssignmentsPreview, { ok: true }>["previewRows"][number]>["data"];
type RosterRowPreview = NonNullable<Extract<RosterPreview, { ok: true }>["previewRows"][number]>["data"];
type GradesRowPreview = NonNullable<Extract<GradesPreview, { ok: true }>["previewRows"][number]>["data"];
type AttendanceRowPreview = NonNullable<Extract<AttendancePreview, { ok: true }>["previewRows"][number]>["data"];
type BehavioralRowPreview = NonNullable<Extract<BehavioralPreview, { ok: true }>["previewRows"][number]>["data"];
type InterventionsRowPreview = NonNullable<Extract<InterventionsPreview, { ok: true }>["previewRows"][number]>["data"];
type SELRowPreview = NonNullable<Extract<SELPreview, { ok: true }>["previewRows"][number]>["data"];

function CsvStep<T, C extends CommitShape>({
  title,
  schoolYearId,
  schoolYearLabel,
  onChangeYear,
  requiredColumns,
  optionalColumns,
  hints,
  sampleRows,
  sampleFileName,
  previewAction,
  commitAction,
  previewHeaders,
  renderRow,
  commitButtonLabel,
  renderSuccess,
}: {
  title: string;
  schoolYearId: string;
  schoolYearLabel: string;
  onChangeYear: () => void;
  requiredColumns: string[];
  optionalColumns?: string[];
  hints?: ReactNode;
  sampleRows: Record<string, string>[];
  sampleFileName: string;
  previewAction: (fd: FormData) => Promise<PreviewShape<T>>;
  commitAction: (fd: FormData) => Promise<C>;
  previewHeaders: string[];
  renderRow: (row: { row: number; data: T }) => ReactNode[];
  commitButtonLabel: (validCount: number, schoolYearLabel?: string) => string;
  renderSuccess: (committed: Extract<C, { ok: true }>) => ReactNode;
}) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewOk<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState<Extract<C, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setPreview(null);
    setCommitted(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(f);
  };

  const handlePreview = () => {
    if (!csvText) return;
    setError(null);
    setCommitted(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("schoolYearId", schoolYearId);
      fd.set("csv", csvText);
      const r = await previewAction(fd);
      if (!r.ok) {
        setError(r.error);
        setPreview(null);
        return;
      }
      setPreview(r);
    });
  };

  const handleCommit = () => {
    if (!csvText || !preview) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("schoolYearId", schoolYearId);
      fd.set("csv", csvText);
      const r = await commitAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCommitted(r as Extract<C, { ok: true }>);
      setPreview(null);
      setCsvText("");
      setFileName(null);
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <header className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Target: <span className="font-medium text-slate-900">{schoolYearLabel}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={onChangeYear}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          ← Change year
        </button>
      </header>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">Required columns</p>
        <p><code className="font-mono">{requiredColumns.join(", ")}</code></p>
        {optionalColumns && optionalColumns.length > 0 && (
          <>
            <p className="mt-2 font-semibold uppercase tracking-[0.14em] text-slate-500">Optional columns</p>
            <p><code className="font-mono">{optionalColumns.join(", ")}</code></p>
          </>
        )}
        {hints && <div className="mt-2 text-slate-500 space-y-1">{hints}</div>}
        <div className="mt-3">
          <button
            type="button"
            onClick={() =>
              downloadCsv(sampleFileName, toCsv([...requiredColumns, ...(optionalColumns ?? [])], sampleRows))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <span aria-hidden>↓</span> Download sample CSV
          </button>
          <span className="ml-2 text-[11px] text-slate-400">Pre-filled example rows you can edit and re-upload.</span>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500" htmlFor={`csv-${title}`}>CSV file</label>
        <input
          id={`csv-${title}`}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
        />
        {fileName && <p className="mt-1 text-xs text-slate-500">Selected: {fileName}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={!csvText || pending}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending && !preview ? "Validating…" : "Validate and preview"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
      )}

      {preview && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Total rows" value={preview.total} />
            <Stat label="Valid" value={preview.validCount} tone="ok" />
            <Stat label="Invalid" value={preview.invalidCount} tone={preview.invalidCount > 0 ? "warn" : "muted"} />
          </div>

          {preview.errors.length > 0 && (
            <details open className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                {preview.errors.length} row(s) with errors
              </summary>
              <ul className="mt-2 space-y-2 text-sm text-amber-900">
                {preview.errors.slice(0, 50).map((e) => (
                  <li key={e.row} className="rounded-md bg-white px-3 py-2">
                    <p className="font-semibold">Row {e.row}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs">
                      {e.messages.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </li>
                ))}
                {preview.errors.length > 50 && (
                  <li className="text-xs text-amber-700">… and {preview.errors.length - 50} more</li>
                )}
              </ul>
            </details>
          )}

          {preview.previewRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Preview — first {preview.previewRows.length} valid row(s)
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {previewHeaders.map((h) => (
                        <th key={h} className="px-2 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.previewRows.map((r) => (
                      <tr key={r.row} className="border-t border-slate-100">
                        {renderRow(r)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCommit}
              disabled={pending || preview.invalidCount > 0 || preview.validCount === 0}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending && preview ? "Committing…" : commitButtonLabel(preview.validCount, preview.schoolYearLabel)}
            </button>
          </div>
          {preview.invalidCount > 0 && (
            <p className="text-xs text-amber-700">Fix the {preview.invalidCount} flagged row(s) and re-upload before committing.</p>
          )}
        </div>
      )}

      {committed && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Import complete{committed.schoolYearLabel ? ` — ${committed.schoolYearLabel}` : ""}</p>
          {renderSuccess(committed)}
          <p className="mt-2 text-xs text-emerald-700">Audit log entry created.</p>
        </div>
      )}
    </section>
  );
}

// ─── Sample CSV helpers ─────────────────────────────────────────────────────

/** Serialize rows to CSV text in the given column order, with RFC-4180 escaping. */
function toCsv(columns: string[], rows: Record<string, string>[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [columns.map(esc).join(",")];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c] ?? "")).join(","));
  return lines.join("\n");
}

/** Trigger a client-side download of CSV text as a file. */
function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "muted" }) {
  const accent =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
