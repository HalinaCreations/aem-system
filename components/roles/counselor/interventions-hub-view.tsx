"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/page-header";
import { PaginationBar } from "@/components/shell/pagination-bar";
import DismissRecommendationButton from "@/components/counselor/dismiss-recommendation-button";
import { interventionTypeLabel } from "@/lib/intervention/types";
import type { InterventionStatus, InterventionType, PatternScope } from "@prisma/client";
import type { InterventionListRow } from "@/lib/intervention/queries";
import type { Pagination } from "@/lib/pagination";

function getFallbackMessage(reason?: string): string {
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
      return "AI insight currently unavailable.";
  }
}

const INTERVENTION_STATUSES: InterventionStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

const SCOPE_VALUES: PatternScope[] = ["STUDENT", "SECTION", "GRADE", "SCHOOL"];

const STATUS_BADGE: Record<string, { label: string; style: string }> = {
  DRAFT: { label: "Draft", style: "bg-slate-100 border-slate-200 text-slate-700" },
  PENDING_APPROVAL: { label: "Pending Approval", style: "bg-amber-50 border-amber-200 text-amber-800" },
  ACTIVE: { label: "Active", style: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  COMPLETED: { label: "Completed", style: "bg-sky-50 border-sky-200 text-sky-800" },
  CANCELLED: { label: "Cancelled", style: "bg-rose-50 border-rose-200 text-rose-800" },
};

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

export type RecommendationItem = {
  id: string;
  scope: string;
  scopeTargetId: string;
  suggestedType: InterventionType;
  rationale: string;
  evidence: Record<string, unknown>;
  triggeringRuleId: string | null;
  scopeTarget: string;
  narrative: {
    ok: boolean;
    text?: string;
    reason?: string;
    cached?: boolean;
  };
};

export type OutcomeItem = {
  interventionId: string;
  scopeLabel: string;
  scope: string;
  type: InterventionType;
  endDate: string | null;
  total: number;
  improving: number;
  completed: number;
  stable: number;
  declining: number;
  unset: number;
};

export type SectionOption = {
  id: string;
  gradeLevel: string;
  name: string;
};

type Props = {
  syLabel: string;
  metrics: {
    activeCount: number;
    pendingCount: number;
    openRecCount: number;
    completedCount: number;
    totalCount: number;
  };
  interventions: InterventionListRow[];
  recommendations: RecommendationItem[];
  allRecommendationsCount: number;
  outcomes: OutcomeItem[];
  allSections: SectionOption[];
  pagination: Pagination;
  filters: {
    status?: InterventionStatus;
    scope?: PatternScope;
    type?: InterventionType;
    section?: string;
    q?: string;
    recSection?: string;
    initialTab?: "all" | "recommendations" | "outcomes";
  };
};

export default function InterventionsHubView({
  syLabel,
  metrics,
  interventions,
  recommendations,
  allRecommendationsCount,
  outcomes,
  allSections,
  pagination,
  filters,
}: Props) {
  // Determine active main tab (default: 'all', or 'recommendations' if recSection is set or explicit tab specified)
  const defaultTab = filters.initialTab ?? (filters.recSection ? "recommendations" : "all");
  const [activeTab, setActiveTab] = useState<"all" | "recommendations" | "outcomes">(defaultTab);

  const hasActiveFilters = !!(
    filters.status ||
    filters.scope ||
    filters.type ||
    filters.section ||
    filters.q
  );

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        label="Student Support & Intervention Hub"
        title="Intervention Manager"
        description={`Manage personalized intervention plans for ${syLabel}. Streamline individual activations, track principal approvals, and review AI insights.`}
        actions={
          <Link
            href="/counselor/interventions/new"
            className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Intervention</span>
          </Link>
        }
      />

      {/* ── Overview Metric KPI Cards ──────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Plans */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Active Plans</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{metrics.activeCount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">Currently active &amp; monitored</p>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-amber-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pending Review</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{metrics.pendingCount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">Awaiting Principal approval</p>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">AI Recommendations</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{allRecommendationsCount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">Pattern drafts ready to build</p>
          </div>
        </div>

        {/* Completed / Outcomes */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-sky-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Completed Plans</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{metrics.completedCount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">Outcome history recorded</p>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Tabs ───────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "all"
              ? "border-emerald-700 text-emerald-800 bg-emerald-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>All Interventions</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
            {metrics.totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recommendations")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "recommendations"
              ? "border-indigo-600 text-indigo-800 bg-indigo-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI Recommendations</span>
          {allRecommendationsCount > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
              {allRecommendationsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("outcomes")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "outcomes"
              ? "border-sky-600 text-sky-800 bg-sky-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Outcome Tracking</span>
          {outcomes.length > 0 && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-700">
              {outcomes.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: ALL INTERVENTIONS ─────────────────────────────────── */}
      {activeTab === "all" && (
        <div className="flex flex-col gap-5">
          {/* Sleek Filter & Search Bar */}
          <form method="GET" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Filter Interventions</h3>
              {hasActiveFilters && (
                <Link
                  href="/counselor/interventions"
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear Filters</span>
                </Link>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Search */}
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Search Target</span>
                <div className="relative">
                  <input
                    type="search"
                    name="q"
                    defaultValue={filters.q ?? ""}
                    placeholder="Search student or section name…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Section</span>
                <select
                  name="section"
                  defaultValue={filters.section ?? ""}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                >
                  <option value="">All sections</option>
                  {allSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.gradeLevel} · {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status</span>
                <select
                  name="status"
                  defaultValue={filters.status ?? ""}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                >
                  <option value="">All statuses</option>
                  {INTERVENTION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_BADGE[s]?.label ?? s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Scope</span>
                <select
                  name="scope"
                  defaultValue={filters.scope ?? ""}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                >
                  <option value="">All scopes</option>
                  {SCOPE_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
              >
                Apply Filter
              </button>
            </div>
          </form>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Target / Plan</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interventions.map((i, idx) => {
                    const statusMeta = STATUS_BADGE[i.status] ?? { label: i.status, style: "bg-slate-100 border-slate-200 text-slate-600" };
                    return (
                      <tr key={i.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="px-4 py-3.5 text-slate-400 font-medium text-xs">
                          {pagination.skip + idx + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/counselor/interventions/${i.id}`}
                            className="font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                          >
                            {i.scopeLabel}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                          <span className="inline-flex rounded-lg bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {SCOPE_LABEL[i.scope] ?? i.scope}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                          {interventionTypeLabel(i.type)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${statusMeta.style}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          <span>{i.startDate}</span>
                          {i.endDate && <span className="text-slate-400"> → {i.endDate}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700 font-semibold">{i.ownerName}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/counselor/interventions/${i.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-emerald-700 px-3 py-1 text-xs font-bold text-white transition-all shadow-sm"
                          >
                            <span>View Plan</span>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {interventions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                        {hasActiveFilters
                          ? "No interventions match your active filter criteria."
                          : "No interventions recorded yet. Click '+ New Intervention' above to get started."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <PaginationBar
                  pagination={pagination}
                  basePath="/counselor/interventions"
                  forwardParams={{}}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: AI RECOMMENDATIONS ─────────────────────────────────── */}
      {activeTab === "recommendations" && (
        <div className="flex flex-col gap-5">
          {/* Section Filter Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Algorithmic Recommendation Drafts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically generated by pattern detection rules. Opening a draft pre-fills the intervention builder.
              </p>
            </div>

            <form method="GET" className="flex items-center gap-2">
              <input type="hidden" name="initialTab" value="recommendations" />
              <select
                name="recSection"
                defaultValue={filters.recSection ?? ""}
                onChange={(e) => e.target.form?.submit()}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">All sections</option>
                {allSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.gradeLevel} · {s.name}
                  </option>
                ))}
              </select>
              {filters.recSection && (
                <Link
                  href="/counselor/interventions?initialTab=recommendations"
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Clear Section Filter
                </Link>
              )}
            </form>
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-450">
              {filters.recSection
                ? "No open recommendations for this section. Try clearing the section filter."
                : "No open recommendations available. Run the risk engine to detect new pattern drafts."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recommendations.map((r) => {
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4 hover:border-indigo-200 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            {SCOPE_LABEL[r.scope] ?? r.scope}
                          </span>
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {interventionTypeLabel(r.suggestedType)}
                          </span>
                        </div>
                        {r.triggeringRuleId && (
                          <span className="text-[10px] font-mono text-slate-400">
                            #{r.triggeringRuleId.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      {/* Target */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Target</span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{r.scopeTarget}</p>
                      </div>

                      {/* Rationale */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pattern Rationale</span>
                        <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{r.rationale}</p>
                      </div>

                      {/* AI Narrative Box */}
                      <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-indigo-50/40 p-3.5">
                        <div className="flex items-center gap-1.5 mb-1 text-sky-700">
                          <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            AI Synthesis {r.narrative.cached ? "(cached)" : ""}
                          </span>
                        </div>
                        {r.narrative.ok ? (
                          <p className="text-xs text-slate-600 leading-relaxed">{r.narrative.text}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            {getFallbackMessage(r.narrative.reason)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-1">
                      <DismissRecommendationButton recommendationId={r.id} />
                      <Link
                        href={`/counselor/interventions/new?fromRecommendation=${r.id}`}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>Open in Builder</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: OUTCOME TRACKING ─────────────────────────────────── */}
      {activeTab === "outcomes" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Completed Intervention Outcomes</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks participation outcomes from completed plans. Feeds the intervention history risk sub-score.
            </p>
          </div>

          {outcomes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-450">
              No completed intervention outcomes recorded yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {outcomes.map((o) => {
                const total = o.total || 1;
                return (
                  <div key={o.interventionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/counselor/interventions/${o.interventionId}`}
                          className="font-bold text-slate-900 text-sm hover:text-emerald-700 transition-colors"
                        >
                          {o.scopeLabel}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          {SCOPE_LABEL[o.scope] ?? o.scope} · {interventionTypeLabel(o.type)}
                          {o.endDate ? ` · Ended ${o.endDate}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                        {o.total} participant{o.total === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                      <span className="bg-emerald-500 transition-all" style={{ width: `${(o.improving / total) * 100}%` }} title={`Improving ${o.improving}`} />
                      <span className="bg-emerald-300 transition-all" style={{ width: `${(o.completed / total) * 100}%` }} title={`Completed ${o.completed}`} />
                      <span className="bg-slate-300 transition-all" style={{ width: `${(o.stable / total) * 100}%` }} title={`Stable ${o.stable}`} />
                      <span className="bg-rose-400 transition-all" style={{ width: `${(o.declining / total) * 100}%` }} title={`Declining ${o.declining}`} />
                      <span className="bg-slate-100 transition-all" style={{ width: `${(o.unset / total) * 100}%` }} title={`Unset ${o.unset}`} />
                    </div>

                    {/* Legend Pills */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs pt-1">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                        Improving: <strong>{o.improving}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 inline-block" />
                        Completed: <strong>{o.completed}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" />
                        Stable: <strong>{o.stable}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
                        Declining: <strong>{o.declining}</strong>
                      </span>
                      {o.unset > 0 && (
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-200 border border-slate-300 inline-block" />
                          Unset: <strong>{o.unset}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
