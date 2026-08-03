"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/page-header";
import ApprovalActions from "@/components/principal/approval-actions";
import { interventionTypeLabel } from "@/lib/intervention/types";
import type { PendingApprovalRow, ApprovedApprovalRow } from "@/lib/intervention/queries";

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

const STATUS_BADGE: Record<string, { label: string; style: string }> = {
  ACTIVE: { label: "Active", style: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  COMPLETED: { label: "Completed", style: "bg-sky-50 border-sky-200 text-sky-800" },
  CANCELLED: { label: "Cancelled", style: "bg-rose-50 border-rose-200 text-rose-800" },
};

type Props = {
  syLabel: string;
  pending: PendingApprovalRow[];
  approved: ApprovedApprovalRow[];
};

export default function ApprovalsHubView({ syLabel, pending, approved }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "approved">(
    pending.length > 0 ? "pending" : "approved"
  );

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Page Header */}
      <PageHeader
        label="Approval Queue"
        title="Intervention Approvals & History"
        description={`Review pending broader-scope intervention proposals and track approved active/completed plans for ${syLabel}.`}
      />

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "pending"
              ? "border-amber-500 text-amber-900 bg-amber-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Pending Approvals</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${pending.length > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
            {pending.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "approved"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Approved &amp; History</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
            {approved.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: PENDING APPROVALS QUEUE ────────────────────────────── */}
      {activeTab === "pending" && (
        <div className="flex flex-col gap-4">
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-450">
              No pending intervention proposals requiring your approval right now.
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {pending.map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                          {SCOPE_LABEL[p.scope] ?? p.scope}
                        </span>
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {interventionTypeLabel(p.type)}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900">{p.scopeLabel}</h2>
                      <p className="mt-0.5 text-xs text-slate-500 font-medium">
                        Proposed by <strong>{p.ownerName}</strong> · Starts {p.startDate}
                        {p.endDate ? ` → ${p.endDate}` : ""} · {p.participantCount} participant{p.participantCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <Link
                      href={`/principal/interventions/${p.id}`}
                      className="shrink-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all shadow-sm"
                    >
                      View Full Plan →
                    </Link>
                  </div>

                  {p.sensitive && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                          Rationale
                        </p>
                        <p className="mt-0.5 text-xs text-amber-950 whitespace-pre-wrap leading-relaxed">
                          {p.sensitive.rationale}
                        </p>
                      </div>

                      {p.sensitive.counselingContext && (
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                            Counseling Context
                          </p>
                          <p className="mt-0.5 text-xs text-amber-950 whitespace-pre-wrap leading-relaxed">
                            {p.sensitive.counselingContext}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-1">
                    <ApprovalActions interventionId={p.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── TAB 2: APPROVED INTERVENTIONS & HISTORY ────────────────────── */}
      {activeTab === "approved" && (
        <div className="flex flex-col gap-4">
          {approved.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-450">
              No approved or completed interventions recorded in history yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {approved.map((item) => {
                const statusMeta = STATUS_BADGE[item.status] ?? {
                  label: item.status,
                  style: "bg-slate-100 border-slate-200 text-slate-700",
                };
                const totalOutcomes = item.outcomes.total || 1;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 hover:border-emerald-200 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {SCOPE_LABEL[item.scope] ?? item.scope}
                          </span>
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {interventionTypeLabel(item.type)}
                          </span>
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${statusMeta.style}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{item.scopeLabel}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Owner: <strong>{item.ownerName}</strong> · Dates: {item.startDate}
                          {item.endDate ? ` → ${item.endDate}` : ""} · {item.participantCount} participant{item.participantCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      <Link
                        href={`/principal/interventions/${item.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
                      >
                        <span>View Full Plan</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>

                    {/* Outcome Tracking Bar */}
                    {item.participantCount > 0 && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Outcome Progress Tracking</span>
                          <span className="text-slate-400 font-medium">{item.outcomes.total} participant(s)</span>
                        </div>

                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                          <span className="bg-emerald-500 transition-all" style={{ width: `${(item.outcomes.improving / totalOutcomes) * 100}%` }} title={`Improving ${item.outcomes.improving}`} />
                          <span className="bg-emerald-300 transition-all" style={{ width: `${(item.outcomes.completed / totalOutcomes) * 100}%` }} title={`Completed ${item.outcomes.completed}`} />
                          <span className="bg-slate-300 transition-all" style={{ width: `${(item.outcomes.stable / totalOutcomes) * 100}%` }} title={`Stable ${item.outcomes.stable}`} />
                          <span className="bg-rose-400 transition-all" style={{ width: `${(item.outcomes.declining / totalOutcomes) * 100}%` }} title={`Declining ${item.outcomes.declining}`} />
                          <span className="bg-slate-200 transition-all" style={{ width: `${(item.outcomes.unset / totalOutcomes) * 100}%` }} title={`Unset ${item.outcomes.unset}`} />
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-0.5">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                            Improving: <strong>{item.outcomes.improving}</strong>
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-300 inline-block" />
                            Completed: <strong>{item.outcomes.completed}</strong>
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
                            Stable: <strong>{item.outcomes.stable}</strong>
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
                            Declining: <strong>{item.outcomes.declining}</strong>
                          </span>
                          {item.outcomes.unset > 0 && (
                            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                              <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
                              Unset: <strong>{item.outcomes.unset}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Feedback & Notes Section */}
                    {item.notes.length > 0 && (
                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Feedback &amp; Observations Feed ({item.notes.length})
                        </span>
                        <div className="flex flex-col gap-2">
                          {item.notes.map((n) => (
                            <div key={n.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 text-xs flex flex-col gap-1">
                              <div className="flex items-center justify-between text-slate-500 font-medium">
                                <span className="font-bold text-slate-800">{n.authorName}</span>
                                <span className="text-[10px] font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{n.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
