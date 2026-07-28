"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logSessionAction,
  submitOutcomeObservationAction,
  submitRevisionRequestAction,
} from "@/app/actions/teacher/intervention-feedback";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Tab = "OBSERVATION" | "REVISION_REQUEST" | "OUTCOME_OBSERVATION";

const TAB_META: Record<Tab, { label: string; placeholder: string; buttonBg: string; activeBg: string }> = {
  OBSERVATION: {
    label: "Log Session / Observation",
    placeholder: "What you observed during a session you ran or in your classroom.",
    buttonBg: "border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100/70",
    activeBg: "bg-sky-600 text-white border-sky-600 focus:ring-sky-200",
  },
  REVISION_REQUEST: {
    label: "Request Revision",
    placeholder: "What needs to change about this plan, and why.",
    buttonBg: "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100/70",
    activeBg: "bg-amber-600 text-white border-amber-600 focus:ring-amber-200",
  },
  OUTCOME_OBSERVATION: {
    label: "Outcome Observation",
    placeholder: "Indicators that the intervention is working (or not) for the student.",
    buttonBg: "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70",
    activeBg: "bg-emerald-600 text-white border-emerald-600 focus:ring-emerald-200",
  },
};

const ACTIONS: Record<Tab, (input: unknown) => Promise<{ ok: true; noteId: string } | { ok: false; error: string }>> = {
  OBSERVATION: logSessionAction,
  REVISION_REQUEST: submitRevisionRequestAction,
  OUTCOME_OBSERVATION: submitOutcomeObservationAction,
};

const NOTE_STATUS_TONE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  OPEN: { bg: "bg-blue-50/50", border: "border-blue-100", text: "text-blue-700", label: "Open in Queue" },
  ACKNOWLEDGED: { bg: "bg-amber-50/50", border: "border-amber-100", text: "text-amber-700", label: "Acknowledged" },
  INCORPORATED: { bg: "bg-emerald-50/50", border: "border-emerald-100", text: "text-emerald-700", label: "Plan Revised" },
  DISMISSED: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-500", label: "Closed" },
};

const NOTE_TYPE_TONE: Record<string, string> = {
  OBSERVATION: "border-sky-200 bg-sky-50 text-sky-700",
  REVISION_REQUEST: "border-amber-200 bg-amber-50 text-amber-700",
  OUTCOME_OBSERVATION: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const NOTE_TYPE_LABEL: Record<string, string> = {
  OBSERVATION: "Session/Observation Log",
  REVISION_REQUEST: "Plan Revision Request",
  OUTCOME_OBSERVATION: "Outcome Assessment",
};

type InterventionNote = {
  id: string;
  noteType: "OBSERVATION" | "REVISION_REQUEST" | "OUTCOME_OBSERVATION";
  content: string;
  status: "OPEN" | "ACKNOWLEDGED" | "INCORPORATED" | "DISMISSED";
  createdAt: string;
};

type InterventionRow = {
  id: string;
  scope: string;
  scopeLabel: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string | null;
  schedule: string | null;
  accommodations: string | null;
  staffActions: string | null;
  targetOutcomes: string | null;
  notes: InterventionNote[];
};

type Props = {
  interventions: InterventionRow[];
};

export default function InterventionFeedbackClient({ interventions }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    interventions.length > 0 ? interventions[0].id : null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING_APPROVAL">("ALL");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "STUDENT" | "SECTION" | "GRADE" | "SCHOOL">("ALL");

  // Form State
  const [formTab, setFormTab] = useState<Tab>("OBSERVATION");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail Right Panel Tab
  const [detailTab, setDetailTab] = useState<"plan" | "form" | "history">("plan");

  const selectedIntervention = interventions.find((i) => i.id === selectedId) || null;

  // Filtered interventions
  const filtered = interventions.filter((i) => {
    const matchesSearch =
      i.scopeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || i.status === statusFilter;
    const matchesScope = scopeFilter === "ALL" || i.scope === scopeFilter;
    return matchesSearch && matchesStatus && matchesScope;
  });

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setSuccess(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please describe your feedback details.");
      return;
    }

    startTransition(async () => {
      const result = await ACTIONS[formTab]({ interventionId: selectedId, content: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContent("");
      setSuccess(`Your logs have been successfully submitted to the owning counselor.`);
      router.refresh();
      // Switch view to history tab to see the logged note
      setTimeout(() => {
        setDetailTab("history");
        setSuccess(null);
      }, 2000);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {/* LEFT COLUMN: Master List */}
      <div className="flex flex-col gap-4 md:col-span-5 lg:col-span-4">
        {/* Filters Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search interventions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
              <div className="mt-1">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as "ALL" | "ACTIVE" | "PENDING_APPROVAL")}
                >
                  <SelectTrigger className="w-full text-slate-700 font-medium">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scope</label>
              <div className="mt-1">
                <Select
                  value={scopeFilter}
                  onValueChange={(val) => setScopeFilter(val as "ALL" | "STUDENT" | "SECTION" | "GRADE" | "SCHOOL")}
                >
                  <SelectTrigger className="w-full text-slate-700 font-medium">
                    <SelectValue placeholder="All Scopes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Scopes</SelectItem>
                    <SelectItem value="STUDENT">Individual</SelectItem>
                    <SelectItem value="SECTION">Section</SelectItem>
                    <SelectItem value="GRADE">Grade Level</SelectItem>
                    <SelectItem value="SCHOOL">School-wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Master List Card */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white min-h-[400px]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Interventions ({filtered.length})</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] no-scrollbar">
            {filtered.map((i) => {
              const isActive = i.id === selectedId;
              const isPending = i.status === "PENDING_APPROVAL";
              
              return (
                <button
                  key={i.id}
                  onClick={() => {
                    setSelectedId(i.id);
                    // reset success/error
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`w-full text-left p-4 transition-all duration-200 flex flex-col gap-1.5 ${
                    isActive
                      ? "bg-emerald-50/40 border-l-4 border-emerald-600 pl-3"
                      : "hover:bg-slate-50 border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {i.scope === "STUDENT" && "Individual"}
                      {i.scope === "SECTION" && "Section"}
                      {i.scope === "GRADE" && "Grade Level"}
                      {i.scope === "SCHOOL" && "School-wide"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}
                    >
                      {i.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className={`text-sm font-bold truncate transition-colors ${isActive ? "text-emerald-955" : "text-slate-900"}`}>
                    {i.scopeLabel}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium truncate">
                    {i.type.replace(/_/g, " ")}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.0} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {i.startDate}
                    </span>
                    {i.notes.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-bold text-[9px] text-slate-600 uppercase tracking-wider">
                        {i.notes.length} log{i.notes.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">
                No matching support plans found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Detail and Forms */}
      <div className="md:col-span-7 lg:col-span-8">
        {selectedIntervention ? (
          <div className="flex flex-col gap-4">
            {/* Header Information Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {selectedIntervention.scope === "STUDENT" && (
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {selectedIntervention.scope === "SECTION" && (
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                      {selectedIntervention.scope === "GRADE" && (
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {selectedIntervention.scope === "SCHOOL" && (
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      )}
                      {selectedIntervention.scope === "STUDENT" ? "Individual" : selectedIntervention.scope === "SECTION" ? "Section-wide" : selectedIntervention.scope === "GRADE" ? "Grade-wide" : "School-wide"}
                    </span>

                    <span className="text-xs text-slate-400 font-semibold">&middot;</span>
                    <span className="text-xs text-slate-600 font-bold">{selectedIntervention.type.replace(/_/g, " ")}</span>
                  </div>

                  <h2 className="mt-1.5 text-lg font-bold text-slate-900 leading-tight">
                    {selectedIntervention.scopeLabel}
                  </h2>

                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Timeline:</span>
                    <span className="font-bold text-slate-700">{selectedIntervention.startDate}</span>
                    {selectedIntervention.endDate && (
                      <>
                        <span>&rarr;</span>
                        <span className="font-bold text-slate-700">{selectedIntervention.endDate}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                      selectedIntervention.status === "ACTIVE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedIntervention.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {selectedIntervention.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle tabs for View */}
            <div className="flex border-b border-slate-200/80">
              <button
                type="button"
                onClick={() => setDetailTab("plan")}
                className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                  detailTab === "plan"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Plan Parameters
              </button>
              {selectedIntervention.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => setDetailTab("form")}
                  className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                    detailTab === "form"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Submit Feedback
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailTab("history")}
                className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-all flex items-center gap-1.5 ${
                  detailTab === "history"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Feedback Log
                {selectedIntervention.notes.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-600">
                    {selectedIntervention.notes.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT: Plan details */}
            {detailTab === "plan" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField
                  label="Schedule / Frequency"
                  value={selectedIntervention.schedule}
                  icon={
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <DetailField
                  label="Accommodations Provided"
                  value={selectedIntervention.accommodations}
                  icon={
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
                <DetailField
                  label="Staff / Teacher Actions"
                  value={selectedIntervention.staffActions}
                  icon={
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.232.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />
                <DetailField
                  label="Target Outcomes"
                  value={selectedIntervention.targetOutcomes}
                  icon={
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>
            )}

            {/* TAB CONTENT: Submit Feedback Form */}
            {detailTab === "form" && selectedIntervention.status === "ACTIVE" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Submit Feedback Log</h3>
                
                {/* Custom Styled Form Selector Tab Switching */}
                <div className="flex flex-wrap gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                  {(Object.keys(TAB_META) as Tab[]).map((t) => {
                    const active = formTab === t;
                    const meta = TAB_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setFormTab(t);
                          setError(null);
                          setSuccess(null);
                        }}
                        className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-center transition-all ${
                          active
                            ? meta.activeBg + " shadow-sm"
                            : meta.buttonBg
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleFormSubmit} className="mt-4 flex flex-col gap-3">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={TAB_META[formTab].placeholder}
                    rows={4}
                    disabled={pending}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/20 p-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/50 disabled:bg-slate-100 transition-all"
                  />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400 font-medium">
                      This feedback is routed directly to the counselor owning this plan.
                    </p>
                    <button
                      type="submit"
                      disabled={pending || content.trim().length === 0}
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      {pending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        "Send Feedback"
                      )}
                    </button>
                  </div>
                  
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex gap-2">
                      <svg className="h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 flex gap-2">
                      <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {success}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* TAB CONTENT: Feedback log history */}
            {detailTab === "history" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Your Submitted Logs</h3>

                {selectedIntervention.notes.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    <p className="text-2xl">📝</p>
                    <p className="mt-2 font-medium">No feedback logged by you yet for this plan.</p>
                    {selectedIntervention.status === "ACTIVE" && (
                      <button
                        onClick={() => setDetailTab("form")}
                        className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Submit First Log
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {selectedIntervention.notes.map((note) => {
                      const tone = NOTE_STATUS_TONE[note.status] || { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", label: note.status };
                      return (
                        <li key={note.id} className="rounded-xl border border-slate-200/80 p-4 hover:border-slate-350 transition-all flex flex-col gap-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${NOTE_TYPE_TONE[note.noteType]}`}>
                              {NOTE_TYPE_LABEL[note.noteType] || note.noteType}
                            </span>
                            
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${tone.bg} ${tone.border} ${tone.text}`}>
                              <span className={`h-1 w-1 rounded-full ${note.status === "INCORPORATED" ? "bg-emerald-500" : note.status === "OPEN" ? "bg-blue-500" : "bg-amber-500"}`} />
                              {tone.label}
                            </span>
                          </div>

                          <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2">
                            <span>Logged by you</span>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center h-full min-h-[400px]">
            <span className="text-4xl text-slate-300">💡</span>
            <h3 className="mt-3 text-sm font-bold text-slate-700">Select an Intervention</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xs">
              Pick any support plan from the left list to review detailed parameters, log observations, or check submitted logs history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex flex-col gap-2.5 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-2 border-b border-slate-50 pb-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
          {icon}
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed pl-1">
        {value ? value : <span className="italic text-slate-400">None specified</span>}
      </p>
    </div>
  );
}
