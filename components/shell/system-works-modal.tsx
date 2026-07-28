"use client";

import React, { useState, useEffect } from "react";
import { useSystemWorks } from "./system-works-context";
import { getActiveAlgorithmConfigAction } from "@/app/actions/learn/config";
import type { RiskWeights, RiskThresholds } from "@/lib/risk/types";
import type { PatternRuleConfig, PatternRuleId } from "@/lib/patterns/rules";

const DIMENSIONS: Array<{
  key: keyof RiskWeights;
  label: string;
  measures: string;
  detail: string;
}> = [
  {
    key: "academic",
    label: "Academic",
    measures: "Grades across quarters",
    detail:
      "Combines the overall average, how many subjects sit below the passing line, and the direction of travel across quarters. A student holding steady at a low average and a student falling quickly are treated differently — the slope matters on its own.",
  },
  {
    key: "attendance",
    label: "Attendance",
    measures: "Absences, tardiness, and unbroken absence runs",
    detail:
      "Absence rate carries most of the weight, tardiness adds a smaller amount, and a long unbroken run of absences adds more still — five consecutive days is a different signal from five days scattered across a term.",
  },
  {
    key: "behavioral",
    label: "Behavioral",
    measures: "Logged incidents, weighted by severity",
    detail:
      "Incidents are counted with severity weighting rather than as a flat tally, so one serious incident is not equivalent to three minor ones.",
  },
  {
    key: "interventionHistory",
    label: "Intervention history",
    measures: "Whether past support worked",
    detail:
      "The one thing the other four dimensions cannot see. Needing repeated plans raises the score, and a plan that ended with the student declining raises it further; a plan that ended with improvement lowers it. Being under an active plan right now contributes nothing at all — the situation that justified it is already counted elsewhere, and charging a student for receiving help would mean the score rose every time someone tried to support them.",
  },
  {
    key: "profile",
    label: "Profile",
    measures: "Learning context",
    detail:
      "A small adjustment for SPED status and learning modality, reflecting how much direct support a student's setup gives them. This is the smallest dimension by design, and it is the one to watch on the bias dashboard.",
  },
];

const RULES: Array<{
  id: PatternRuleId;
  scope: "Student" | "Section";
  label: string;
  plainLanguage: string;
  conditions: string[];
}> = [
  {
    id: "ACADEMIC_DECLINE_CLUSTER",
    scope: "Student",
    label: "Academic decline cluster",
    plainLanguage:
      "Grades are falling quarter after quarter and the student is also missing a lot of school. Either alone is common; together they tend to compound.",
    conditions: ["At least 2 consecutive quarters of falling averages", "Absence rate of 15% or higher"],
  },
  {
    id: "DISENGAGEMENT_SIGNAL",
    scope: "Student",
    label: "Disengagement signal",
    plainLanguage:
      "The student is drifting away from school rather than failing outright — arriving late, missing days, and picking up incidents.",
    conditions: ["Tardiness rate of 10% or higher", "Weighted behavioral count of 2 or more", "Absence rate of 8% or higher"],
  },
  {
    id: "CRISIS_WARNING",
    scope: "Student",
    label: "Crisis warning",
    plainLanguage:
      "A sustained disappearance from school alongside serious incidents. This is the rule most likely to need someone to act today rather than this term.",
    conditions: ["5 or more consecutive absences", "Weighted behavioral count of 3 or more"],
  },
  {
    id: "RECOVERY_TRACKING",
    scope: "Student",
    label: "Recovery tracking",
    plainLanguage:
      "Something is working. A student on an active plan has been improving for two quarters running — worth knowing so support is sustained rather than withdrawn early.",
    conditions: ["Currently on an active intervention", "At least 2 consecutive quarters of improving averages"],
  },
  {
    id: "CHRONIC_CONCERN",
    scope: "Student",
    label: "Chronic concern",
    plainLanguage:
      "Support has been tried more than once and has not held. This is a signal to change approach, not to repeat it.",
    conditions: ["2 or more past interventions that ended unfavourably", "Currently in the HIGH band"],
  },
  {
    id: "CONCENTRATED_RISK",
    scope: "Section",
    label: "Concentrated risk",
    plainLanguage:
      "Risk is clustering in one section rather than spread across the year group, which often points at something about the class rather than the individuals in it.",
    conditions: ["More than 30% of the section in MODERATE or HIGH"],
  },
  {
    id: "SUBJECT_STRUGGLE",
    scope: "Section",
    label: "Subject struggle",
    plainLanguage:
      "A whole section is failing one particular subject — usually a teaching, pacing, or resourcing question rather than a student one.",
    conditions: ["More than 40% failing marks in a single subject"],
  },
  {
    id: "ATTENDANCE_EROSION",
    scope: "Section",
    label: "Attendance erosion",
    plainLanguage:
      "One section is missing noticeably more school than the rest of the school.",
    conditions: ["Section absence rate more than 5 percentage points above the school average"],
  },
];

const SYSTEM_DOES = [
  "Adds up recorded grades, attendance, behaviour, and intervention history into a score.",
  "Sorts and filters students by that score so long lists have an order.",
  "Checks eight fixed rules and flags when a situation matches one.",
  "Drafts a suggested plan type with a written rationale, and puts it in a queue.",
  "Writes plain-language summaries of numbers that are already on the screen.",
  "Records who did what, and when, in a log that cannot be edited or deleted.",
];

const PEOPLE_DO = [
  "Decide whether a flagged situation actually means anything.",
  "Decide whether an intervention happens at all, and what it contains.",
  "Approve any plan affecting more than one student.",
  "Override a risk band, in writing, when the number does not match the child in front of them.",
  "Judge whether a plan worked, and record the outcome.",
  "Decide what data is collected in the first place, and revoke consent for it.",
];

type TabType = "overview" | "risk" | "patterns" | "decisions";

const TABS: Array<{ id: TabType; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk Scoring" },
  { id: "patterns", label: "Pattern Rules" },
  { id: "decisions", label: "Governance" },
];

export default function SystemWorksModal() {
  const { isOpen, activeTab, open, close } = useSystemWorks();
  const [config, setConfig] = useState<{
    version: number;
    weights: RiskWeights;
    thresholds: RiskThresholds;
    ruleConfig: PatternRuleConfig;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    getActiveAlgorithmConfigAction()
      .then((res) => {
        if (!active) return;
        if (res) {
          setConfig({
            version: res.version,
            weights: res.weights,
            thresholds: res.thresholds,
            ruleConfig: res.ruleConfig as unknown as PatternRuleConfig,
          });
        }
      })
      .catch((err) => console.error("Failed to load algorithm config", err))
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const weights = config?.weights;
  const thresholds = config?.thresholds;
  const ruleConfig = config?.ruleConfig ?? {};

  const totalWeights = weights
    ? DIMENSIONS.reduce((acc, d) => acc + (weights[d.key] ?? 0), 0)
    : 0;

  const getShare = (key: keyof RiskWeights) => {
    if (!weights || totalWeights === 0) return 0;
    return ((weights[key] ?? 0) / totalWeights) * 100;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      onClick={close}
    >
      <div 
        className="relative flex flex-col w-full max-w-3xl h-[80vh] bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple, clean header with no color background */}
        <header className="shrink-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <h2 className="text-md font-bold text-slate-800 tracking-tight">How the System Works</h2>
              {config && (
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Active Config v{config.version}</p>
              )}
            </div>
          </div>
          <button
            onClick={close}
            className="rounded-xl p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Clean pill tab switcher */}
        <div className="shrink-0 flex gap-1.5 bg-slate-50/50 border-b border-slate-100 px-6 py-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                activeTab === t.id
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <div className="w-6 h-6 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading settings...</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800">System Overview</h3>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Every number displayed in this system can be traced back directly to recorded data and established administrative rules. There are no black-box predictions; the system coordinates inputs to assist educators without making independent decisions.
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      This explainer documents the active system configuration, updated in real time whenever weights or rules are adjusted.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      onClick={() => open("risk")}
                      className="text-left rounded-xl border border-slate-100 bg-slate-50/30 p-4 hover:border-teal-200 hover:bg-teal-50/10 transition"
                    >
                      <h4 className="font-semibold text-slate-800 text-xs">1. Risk Score Formula</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Explore how academic, attendance, behavioral, and history metrics are weighted.
                      </p>
                    </button>
                    <button
                      onClick={() => open("patterns")}
                      className="text-left rounded-xl border border-slate-100 bg-slate-50/30 p-4 hover:border-teal-200 hover:bg-teal-50/10 transition"
                    >
                      <h4 className="font-semibold text-slate-800 text-xs">2. Scanned Patterns</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Review the rules scanning for student and section trends that scores miss.
                      </p>
                    </button>
                    <button
                      onClick={() => open("decisions")}
                      className="text-left rounded-xl border border-slate-100 bg-slate-50/30 p-4 hover:border-teal-200 hover:bg-teal-50/10 transition"
                    >
                      <h4 className="font-semibold text-slate-800 text-xs">3. Governance & Roles</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Read about accountability limits and the boundary between system drafts and human decisions.
                      </p>
                    </button>
                  </div>

                  <div className="rounded-xl border border-teal-100/50 bg-teal-50/20 p-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                      Educational Simulator
                    </h4>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-teal-950">
                      Counselors have access to the **What-If Simulator** inside their dashboard. Use it to feed mock values to the active risk engine and verify exactly how scores shift in response.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "risk" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800">Risk Score Formula</h3>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Student scores range from 0 to 100, representing a normalized sum of five distinct data dimensions. Higher scores simply signal multiple concurrent challenges.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Weights</h4>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                      {DIMENSIONS.map((d) => (
                        <div key={d.key} className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 text-xs">{d.label}</span>
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                              {getShare(d.key).toFixed(0)}% weight
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-400 font-medium">{d.measures}</p>
                          <p className="mt-2 text-xs leading-relaxed text-slate-500">{d.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {thresholds && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Band Limits</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">Low</span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">0 to {thresholds.moderateMin - 1}</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider">Moderate</span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">{thresholds.moderateMin} to {thresholds.highMin - 1}</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider">High</span>
                          <p className="mt-1.5 text-xs font-semibold text-slate-800">{thresholds.highMin} to 100</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "patterns" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800">Pattern Scan Rules</h3>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Scores compress values, which can mask critical contextual shapes. These eight scanning rules flag compound situations directly. Matches are binary and include full supporting evidence.
                    </p>
                  </div>

                  {(["Student", "Section"] as const).map((scope) => (
                    <div key={scope} className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {scope}-level Rules
                      </h4>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                        {RULES.filter((r) => r.scope === scope).map((r) => {
                          const disabled = ruleConfig[r.id] === false;
                          return (
                            <div key={r.id} className={`p-4 ${disabled ? "bg-slate-50/50" : "bg-white"}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 text-xs">{r.label}</span>
                                {disabled && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{r.plainLanguage}</p>
                              <div className="mt-2.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Logic Check:</span>
                                <ul className="mt-1 list-disc pl-4 text-xs text-slate-600 space-y-0.5">
                                  {r.conditions.map((c) => (
                                    <li key={c}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "decisions" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800">Governance & Limits</h3>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Educators retain complete ownership of student actions. The algorithm suggests, tracks, and formats data without enforcing actions.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Automation:</h4>
                      <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1.5">
                        {SYSTEM_DOES.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Educator Ownership:</h4>
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1.5">
                        {PEOPLE_DO.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500 leading-relaxed">
                    <div>
                      <span className="font-bold text-slate-800">Draft Recommendation Flow:</span>
                      <p className="mt-0.5">
                        Alerts and plan proposals exist as editable drafts inside inboxes. They do not initiate plans or contact parents automatically. Plan details are fully owned, edited, and approved by counselors.
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Generative AI Boundaries:</span>
                      <p className="mt-0.5">
                        Language models only summarize data. They have no influence on the numeric risk score or matching conditions. If consent is revoked or the model is offline, only the text summary is hidden; all data points remain fully viewable.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
