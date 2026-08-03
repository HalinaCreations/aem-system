"use client";

import React, { useState } from "react";
import type { CounselingNoteRow, SELAssessmentRow, StudentProfileData } from "@/lib/student/queries";
import type { SELLevel } from "@prisma/client";
import SELAssessmentForm from "@/components/counselor/sel-assessment-form";
import type { RiskBandLabel, RiskFactors } from "@/lib/risk/types";
import type { GenerateResult } from "@/lib/ai/gemini";
import CounselingNoteForm from "@/components/counselor/counseling-note-form";
import ExplainabilityPanel from "@/components/shell/explainability-panel";
import RiskOverrideControls from "@/components/principal/risk-override-controls";
import RegenerateNarrativeButton from "@/components/shell/regenerate-narrative-button";

function fallbackMessage(reason: string): string {
  switch (reason) {
    case "no_key":
      return "AI narrative disabled (no GEMINI_API_KEY configured). Algorithmic output shown below.";
    case "quota":
      return "AI quota exhausted for now — algorithmic output shown below.";
    case "network":
      return "AI service unavailable. Algorithmic output shown below.";
    case "empty_response":
      return "AI returned no narrative for this input. Algorithmic output shown below.";
    case "consent_revoked":
      return "This student's AI analysis consent has been revoked. Only algorithmic output is shown.";
    default:
      return "AI narrative generation failed. Algorithmic output shown below.";
  }
}

type Props = {
  profile: StudentProfileData;
  viewerRole: "COUNSELOR" | "PRINCIPAL" | "TEACHER";
  counselingNotes?: CounselingNoteRow[];
  selAssessments?: SELAssessmentRow[];
  risk?: {
    score: number;
    band: RiskBandLabel;
    factors: RiskFactors;
    computedAt: string;
    enrollmentId: string;
    narrative: GenerateResult;
    override: {
      id: string;
      originalScore: number;
      originalBand: RiskBandLabel;
      overrideBand: RiskBandLabel;
      justification: string;
      overriddenByName: string;
      createdAt: string;
    } | null;
  } | null;
};

const KIND_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  QUIZ: "Quiz",
  PERIODICAL: "Periodical",
  PRE_TEST: "Pre-test",
  POST_TEST: "Post-test",
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-emerald-100 border-emerald-300 hover:bg-emerald-200 text-emerald-800",
  ABSENT: "bg-rose-100 border-rose-300 hover:bg-rose-200 text-rose-800",
  TARDY: "bg-amber-100 border-amber-300 hover:bg-amber-200 text-amber-800",
  EXCUSED: "bg-sky-100 border-sky-300 hover:bg-sky-200 text-sky-800",
};

const STATUS_TEXT: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  TARDY: "T",
  EXCUSED: "E",
};

type ProfileTab = "risk" | "academic" | "attendance" | "behavioral" | "counseling";

export default function StudentProfileView({
  profile,
  viewerRole,
  counselingNotes,
  selAssessments,
  risk,
}: Props) {
  const { student, enrollment, consents, grades, attendance, behavioral, stats } = profile;
  const fullName = [student.lastName + ",", student.firstName, student.middleName].filter(Boolean).join(" ");
  
  const showCounselingNotes = viewerRole === "COUNSELOR" && counselingNotes !== undefined;
  const showSEL = selAssessments !== undefined;
  const showRisk = risk !== undefined && risk !== null;

  // Determine default tab
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    if (showRisk) return "risk";
    return "academic";
  });

  const formattedDob = new Date(student.birthDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const initials = `${student.firstName[0] || ""}${student.lastName[0] || ""}`.toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      
      {/* LEFT COLUMN: Sidebar (Core Profile & Stats) */}
      <div className="flex flex-col gap-5 lg:col-span-4">
        
        {/* Core Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col items-center text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-extrabold text-lg tracking-wider shadow-sm">
            {initials}
          </div>
          
          <h2 className="mt-3 text-lg font-bold text-slate-900 leading-tight">
            {fullName}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500 font-semibold">{student.lrn}</p>

          <div className="mt-4 w-full border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-left text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Cohort</span>
              <span className="font-semibold text-slate-800">{enrollment.gradeLevel} &middot; {enrollment.sectionName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Modality</span>
              <span className="font-semibold text-slate-800">{enrollment.learningModality.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Sex</span>
              <span className="font-semibold text-slate-800">{student.sex}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Birth Date</span>
              <span className="font-semibold text-slate-800">{formattedDob}</span>
            </div>
          </div>

          {/* Consents Section */}
          <div className="mt-4 w-full border-t border-slate-100 pt-4 text-left">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-2">Consent Checklist</span>
            <ConsentBadges consents={consents} />
          </div>
        </div>

        {/* Stats Grid Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-3">Key Metrics Snapshot</span>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Latest GWA"
              value={
                stats.gwaByQuarter.filter((g) => g.gwa !== null).slice(-1)[0]?.gwa?.toFixed(1) ?? "—"
              }
              suffix="%"
            />
            <StatCard
              label="Absence rate"
              value={stats.totalAttendanceDays === 0 ? "—" : (stats.absenceRate * 100).toFixed(1)}
              suffix={stats.totalAttendanceDays === 0 ? "" : "%"}
              tone={stats.absenceRate > 0.15 ? "warn" : stats.absenceRate > 0.08 ? "muted" : "ok"}
            />
            <StatCard
              label="Tardy rate"
              value={stats.totalAttendanceDays === 0 ? "—" : (stats.tardyRate * 100).toFixed(1)}
              suffix={stats.totalAttendanceDays === 0 ? "" : "%"}
            />
            <StatCard
              label="Incidents"
              value={String(stats.behavioralIncidentCount)}
              tone={stats.behavioralIncidentCount > 2 ? "warn" : stats.behavioralIncidentCount > 0 ? "muted" : "ok"}
            />
          </div>
        </div>

        {/* Guardian Info Card */}
        {(student.guardianName || student.guardianContact) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-2">Guardian Contact Info</span>
            <div className="flex flex-col gap-1 text-sm text-slate-800 font-semibold">
              <span className="text-slate-900 font-bold">{student.guardianName ?? "—"}</span>
              {student.guardianContact && (
                <span className="text-xs text-slate-500 font-medium font-mono flex items-center gap-1 mt-0.5">
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {student.guardianContact}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Tabbed Detail Pages */}
      <div className="flex flex-col gap-4 lg:col-span-8">
        
        {/* Navigation Tabs Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2 flex flex-wrap gap-1 shadow-sm">
          {showRisk && (
            <button
              onClick={() => setActiveTab("risk")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "risk"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Risk Profile
            </button>
          )}
          <button
            onClick={() => setActiveTab("academic")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "academic"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.232.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Academic Performance
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "attendance"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("behavioral")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "behavioral"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Behavior & SEL
          </button>
          {showCounselingNotes && (
            <button
              onClick={() => setActiveTab("counseling")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "counseling"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Counseling Notes
            </button>
          )}
        </div>

        {/* Tab Content Display Area */}
        <div className="flex flex-col gap-4">
          
          {/* TAB 1: Risk Profile */}
          {activeTab === "risk" && showRisk && risk && (
            <div className="flex flex-col gap-4">
              
              {/* Decision trail & header info */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Predictive Support Assessment</h3>
                  <p className="text-xs text-slate-500 mt-1">Computed {new Date(risk.computedAt).toLocaleString()}</p>
                </div>
                
                {viewerRole !== "TEACHER" && (
                  <a
                    href={`/counselor/students/${student.id}/audit`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Decision Audit Trail
                  </a>
                )}
              </div>

              {/* AI Narrative Result */}
              {risk.narrative.ok ? (
                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-100/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-sky-850">
                      AI Generated Insights
                    </span>
                    {viewerRole !== "TEACHER" && (
                      <RegenerateNarrativeButton
                        studentId={student.id}
                        schoolYearId={enrollment.schoolYearId}
                      />
                    )}
                  </div>
                  <p className="mt-3 text-sm text-sky-900 font-medium whitespace-pre-wrap leading-relaxed">
                    {risk.narrative.text}
                  </p>
                  <p className="mt-3 text-[10px] font-semibold text-sky-600/70">
                    Generated by Gemini using algorithmic indicators. Always cross-reference with live assessments below.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-500 font-semibold">{fallbackMessage(risk.narrative.reason)}</p>
                  {risk.narrative.reason !== "no_key" &&
                    risk.narrative.reason !== "consent_revoked" &&
                    viewerRole !== "TEACHER" && (
                      <RegenerateNarrativeButton
                        studentId={student.id}
                        schoolYearId={enrollment.schoolYearId}
                      />
                    )}
                </div>
              )}

              {/* Active Override Alert */}
              {risk.override && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm">
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-150 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-rose-800">
                    Principal Override Active
                  </span>
                  <p className="mt-2 text-sm text-rose-950 font-bold">
                    Algorithmic status <span className="font-mono text-xs">{risk.override.originalBand}</span> (score {risk.override.originalScore.toFixed(0)}) &rarr; changed to <span className="font-mono text-xs">{risk.override.overrideBand}</span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm italic text-rose-900 font-medium leading-relaxed bg-white/40 p-2.5 rounded-xl border border-rose-100/50">
                    &ldquo;{risk.override.justification}&rdquo;
                  </p>
                  <p className="mt-2 text-[10px] text-rose-600/80 font-semibold">
                    Authorized by {risk.override.overriddenByName} &middot; {new Date(risk.override.createdAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Explainability Matrix */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-4">Risk Factor Breakdown</span>
                <ExplainabilityPanel
                  score={risk.override ? risk.override.originalScore : risk.score}
                  band={risk.override ? risk.override.originalBand : risk.band}
                  factors={risk.factors}
                />
              </div>

              {/* Override controls (for principals) */}
              {viewerRole === "PRINCIPAL" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-3">Governance Panel</span>
                  <RiskOverrideControls
                    enrollmentId={risk.enrollmentId}
                    currentBand={risk.band}
                    activeOverride={risk.override}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Academic Performance */}
          {activeTab === "academic" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Academic Performance</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Quarterly average scores evaluated over {grades.length} recorded entry details.
                </p>
              </div>

              {grades.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-455">
                  No academic grades recorded for this student.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/20">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-455">
                        <tr>
                          <th className="px-4 py-3">Subject / Course Details</th>
                          <th className="px-4 py-3">Q1</th>
                          <th className="px-4 py-3">Q2</th>
                          <th className="px-4 py-3">Q3</th>
                          <th className="px-4 py-3">Q4</th>
                          <th className="px-4 py-3">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.subjectAverages.map((s) => (
                          <tr key={s.subjectCode} className="align-middle">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 text-xs">{s.subjectCode}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{s.subjectName}</p>
                            </td>
                            {s.quarters.map((q) => (
                              <td key={q.quarter} className="px-4 py-3 font-semibold tabular-nums text-slate-700">
                                {q.pct === null ? <span className="text-slate-300">—</span> : `${q.pct.toFixed(1)}%`}
                              </td>
                            ))}
                            <td className="px-4 py-3 w-32">
                              <Sparkline values={s.quarters.map((q) => q.pct)} />
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-150">
                          <td className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                            General Average (GWA)
                          </td>
                          {stats.gwaByQuarter.map((q) => (
                            <td key={q.quarter} className="px-4 py-3 tabular-nums text-slate-900">
                              {q.gwa === null ? <span className="text-slate-300">—</span> : `${q.gwa.toFixed(1)}%`}
                            </td>
                          ))}
                          <td className="px-4 py-3 w-32">
                            <Sparkline values={stats.gwaByQuarter.map((q) => q.gwa)} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <details className="rounded-xl border border-slate-200 bg-white group">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 select-none flex items-center justify-between transition-colors">
                      <span>View individual marks database ({grades.length} entries)</span>
                      <svg className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <ul className="divide-y divide-slate-100 px-4 pb-3 text-xs">
                      {grades.map((g) => (
                        <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="font-semibold text-slate-700">
                            <span className="font-mono font-bold text-slate-900">{g.subjectCode}</span> &middot; Q{g.quarter} &middot; {KIND_LABEL[g.assessmentKind] ?? g.assessmentKind}
                            {g.label ? ` &middot; ${g.label}` : ""}
                          </span>
                          <span className="font-mono font-bold text-slate-500">{g.score}/{g.maxScore} ({g.percentage}%)</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
            </div>
          )}

          {/* TAB 3: Attendance Heatmap */}
          {activeTab === "attendance" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Attendance Log Heatmap</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological day-by-day logs for the active year. Hover or tap blocks for details.
                </p>
              </div>

              {attendance.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-455">
                  No attendance history logged.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                    {attendance.map((a) => (
                      <span
                        key={a.id}
                        title={`${a.date} — Status: ${a.status}${a.notes ? `\nNote: ${a.notes}` : ""}`}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-mono font-bold text-slate-850 cursor-help transition-all ${STATUS_COLOR[a.status] ?? "bg-slate-100"}`}
                      >
                        {STATUS_TEXT[a.status] ?? "?"}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 border-t border-slate-100 pt-3">
                    <Legend label="Present" color="bg-emerald-100 border border-emerald-300" />
                    <Legend label="Absent" color="bg-rose-100 border border-rose-300" />
                    <Legend label="Tardy" color="bg-amber-100 border border-amber-300" />
                    <Legend label="Excused" color="bg-sky-100 border border-sky-300" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Behavior & SEL */}
          {activeTab === "behavioral" && (
            <div className="flex flex-col gap-4">
              
              {/* Behavioral Records */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Behavioral Incidents</h3>
                  <p className="text-xs text-slate-500 mt-1">Logged instances of student conduct, action parameters, and interventions.</p>
                </div>

                {behavioral.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-455 mt-4">
                    No behavioral incidents on file.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {behavioral.map((b) => (
                      <li key={b.id} className="py-3.5 flex flex-col gap-1.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <span className="font-bold text-xs text-slate-900">{new Date(b.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                          
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${
                            b.severity === "HIGH"
                              ? "border-rose-200 bg-rose-50 text-rose-800"
                              : b.severity === "MODERATE"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-slate-250 bg-slate-50 text-slate-650"
                          }`}>
                            {b.severity} Severity &middot; {b.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                          {b.description}
                        </p>
                        
                        {b.recordedByName && (
                          <p className="text-[10px] text-slate-400 font-semibold align-self-end">
                            Filed by Counselor {b.recordedByName}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Counselor Social Emotional Learning Section */}
              {showSEL && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Social-Emotional Learning (SEL)</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Concern scales managed by counseling staff. Thriving denotes the healthiest level of regulation.
                    </p>
                  </div>

                  {selAssessments!.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-455">
                      No SEL assessments logged yet.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3.5">
                      {selAssessments!.map((a) => (
                        <li key={a.id} className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-450 border-b border-slate-50 pb-2">
                            <span className="font-bold text-slate-800">{a.assessorName}</span>
                            <span>{new Date(a.assessedAt).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                            <SELDimension label="Emotional Well-being" level={a.emotionalWellbeing} />
                            <SELDimension label="Stress Management" level={a.stressLevel} />
                            <SELDimension label="Peer Relationships" level={a.peerRelationships} />
                            <SELDimension label="Student Self-Rating" level={a.selfAssessment} />
                          </div>
                          
                          {a.notes && (
                            <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-700 font-medium leading-relaxed">
                              {a.notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {viewerRole === "COUNSELOR" && (
                    <div className="mt-2 border-t border-slate-150 pt-4">
                      <SELAssessmentForm enrollmentId={enrollment.id} studentId={student.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Counseling Notes */}
          {activeTab === "counseling" && showCounselingNotes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Confidential Counseling Logs</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Confidential documents restricted to counselors. Access is monitored and logged in audit trails.
                </p>
              </div>

              {counselingNotes!.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-455">
                  No notes recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {counselingNotes!.map((n) => (
                    <li key={n.id} className="py-3.5 flex flex-col gap-1 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                        <span className="font-bold text-slate-700">{n.authorName}</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                        {n.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 border-t border-slate-150 pt-4">
                <CounselingNoteForm enrollmentId={enrollment.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SEL_STYLES: Record<SELLevel, { label: string; className: string }> = {
  THRIVING: { label: "Thriving", className: "border-emerald-250 bg-emerald-50 text-emerald-800" },
  STABLE: { label: "Stable", className: "border-sky-250 bg-sky-50 text-sky-800" },
  AT_RISK: { label: "At risk", className: "border-amber-250 bg-amber-50 text-amber-800" },
  CRITICAL: { label: "Critical", className: "border-rose-250 bg-rose-50 text-rose-800 font-bold" },
};

function SELDimension({ label, level }: { label: string; level: SELLevel | null }) {
  if (level === null) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 shadow-sm flex flex-col gap-1">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="text-xs text-slate-400 font-semibold">Not Given</span>
      </div>
    );
  }
  const style = SEL_STYLES[level];
  return (
    <div className={`rounded-xl border p-3 shadow-sm flex flex-col gap-1 ${style.className}`}>
      <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-70">{label}</span>
      <span className="text-xs font-bold">{style.label}</span>
    </div>
  );
}

function ConsentBadges({ consents }: { consents: Array<{ scope: string; status: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {consents.map((c) => {
        const active = c.status === "GRANTED";
        const label = c.scope === "DATA_PROCESSING" ? "Data Policy" : c.scope === "AI_ANALYSIS" ? "AI Analytics" : "Intervention";
        return (
          <span
            key={c.scope}
            title={`${c.scope.replace(/_/g, " ")}: ${c.status}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              active
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-850"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
            {label}
          </span>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "ok" | "muted" | "warn";
}) {
  const accent = tone === "warn" ? "text-rose-700 bg-rose-50 border-rose-100" : tone === "ok" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-slate-900 border-slate-100 bg-slate-50/50";
  return (
    <div className={`rounded-xl border p-3 flex flex-col justify-between shadow-sm min-h-[70px] ${accent}`}>
      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-base font-black tracking-tight mt-1">{value}{suffix ?? ""}</span>
    </div>
  );
}

function Sparkline({ values }: { values: (number | null)[] }) {
  const filled = values.map((v) => v ?? 0);
  if (filled.every((v) => v === 0)) {
    return <span className="text-[10px] font-bold text-slate-350 tracking-wider">no data</span>;
  }
  const max = Math.max(100, ...filled);
  const min = Math.min(0, ...filled);
  const w = 100;
  const h = 24;
  const points = filled
    .map((v, i) => {
      const x = (i / Math.max(1, filled.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1, max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  
  const first = filled[0];
  const last = filled[filled.length - 1];
  const stroke = last > first ? "#10b981" : last < first ? "#f43f5e" : "#94a3b8";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100" height="24" className="text-slate-700">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        if (v === null) return null;
        const x = (i / Math.max(1, filled.length - 1)) * w;
        const y = h - ((v - min) / Math.max(1, max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="2.2" fill={stroke} />;
      })}
    </svg>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold tracking-wider">
      <span className={`h-3 w-3 rounded-md ${color}`} />
      <span>{label}</span>
    </span>
  );
}
