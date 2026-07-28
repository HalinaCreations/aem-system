import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getSchoolRiskDistribution, getOpenRecommendations } from "@/lib/risk/queries";
import { PRINCIPAL_NAV } from "@/components/roles/principal/principal-config";
import Link from "next/link";
import SystemWorksLink from "@/components/shell/system-works-link";

const PRINCIPAL_METRICS = [
  { label: "Oversight scope", value: "School-wide (All Cohorts)" },
  { label: "Primary action", value: "Strategic governance & approvals" },
  { label: "Governance role", value: "Accountable risk override authority" },
];

function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("student")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (t.includes("dashboard") || t.includes("school")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2M2 22h20M12 2a10 10 0 110 20 10 10 0 010-20z" />
      </svg>
    );
  }
  if (t.includes("queue") || t.includes("approval")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  if (t.includes("cohort") || t.includes("analysis")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  }
  if (t.includes("governance") || t.includes("review") || t.includes("audit")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  if (t.includes("how") || t.includes("learn") || t.includes("works") || t.includes("system")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  }
  if (t.includes("report")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default async function PrincipalPage() {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();

  let distribution: { low: number; moderate: number; high: number; unscored: number; total: number } | null = null;
  let openRecommendations = 0;

  if (sy) {
    distribution = await getSchoolRiskDistribution(sy.id);
    const recs = await getOpenRecommendations(sy.id);
    openRecommendations = recs.length;
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Welcome Banner ── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-600 to-slate-900 p-8 text-white shadow-lg"
      >
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Oversight Console</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl lg:text-4xl">
            Oversight and decision dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-200 md:text-base">
            Monitor school-wide risk distributions, review equity trends, and execute final approvals on targeted interventions.
          </p>
        </div>
      </section>

      {/* ── 2-Column Dashboard Grid ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Metrics & Main Modules (70%) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          
          {/* Risk Distribution Block */}
          {distribution && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-slate-900">School-wide Risk Distribution</h2>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {sy?.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Active status overview for all {distribution.total} enrolled students
              </p>
              
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <RiskStatCard label="HIGH" count={distribution.high} total={distribution.total} color="rose" />
                <RiskStatCard label="MODERATE" count={distribution.moderate} total={distribution.total} color="amber" />
                <RiskStatCard label="LOW" count={distribution.low} total={distribution.total} color="emerald" />
                <RiskStatCard label="Not scored" count={distribution.unscored} total={distribution.total} color="slate" />
              </div>
              
              {distribution.unscored === distribution.total && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  No risk scores computed yet. Ask the administrator to run the algorithmic risk engine.
                </div>
              )}
            </div>
          )}

          {/* Principal Modules Navigation */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Governance Modules</h2>
              <span className="text-xs text-slate-500 font-medium">Select a module to launch</span>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
              {PRINCIPAL_NAV.map((s) => {
                const Icon = getSectionIcon(s.title);
                const cardContent = (
                  <>
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 transition-colors">
                      {Icon}
                    </div>
                    <div className="mt-4 flex-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between">
                        {s.title}
                        {s.href && (
                          <span className="text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all text-xs font-normal">
                            Launch →
                          </span>
                        )}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3">
                        {s.description}
                      </p>
                    </div>
                  </>
                );

                return s.href ? (
                  <Link
                    key={s.title}
                    href={s.href}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-emerald-100/50 hover:shadow-md hover:-translate-y-0.5"
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div
                    key={s.title}
                    className="flex flex-col justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 opacity-60 relative group"
                  >
                    {cardContent}
                    <div className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded self-start">
                      Future Phase
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </div>

        {/* Right Column: Actions, Metrics, & Explainability Sidebar (30%) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          
          {/* Urgent Actions / Approvals Card */}
          {openRecommendations > 0 && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 h-16 w-16 bg-rose-100 rounded-full blur-xl opacity-60" />
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-rose-500 absolute" />
                <span className="h-2 w-2 rounded-full bg-rose-500 relative" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Urgent Review Needed</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Intervention Recommendations</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  There are <span className="font-semibold text-rose-700">{openRecommendations}</span> open recommendation draft{openRecommendations !== 1 ? "s" : ""} awaiting clinical or administrative review.
                </p>
              </div>
              <Link
                href="/principal/approvals"
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 transition-colors flex items-center gap-1 mt-1 self-start"
              >
                Go to Approval Queue →
              </Link>
            </div>
          )}

          {/* System Metrics */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Security & Scope</h2>
            <section className="grid gap-3">
              {PRINCIPAL_METRICS.map((m) => (
                <article
                  key={m.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {m.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {m.value}
                    </p>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </article>
              ))}
            </section>
          </div>

          {/* AI Literacy Banner */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 h-16 w-16 bg-slate-800 rounded-full blur-xl opacity-50" />
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">AI Governance Charter</span>
            </div>
            <div>
              <h4 className="text-sm font-bold">Human Accountability Clause</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Algorithmic scores and pattern logic are entirely transparent. Principals hold exclusive override authority, requiring documented written justifications for audit logs.
              </p>
            </div>
            <SystemWorksLink
              tab="overview"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 mt-1 self-start"
            >
              Understand risk indicators &rarr;
            </SystemWorksLink>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskStatCard({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: "rose" | "amber" | "emerald" | "slate";
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  const styles = {
    rose: {
      bg: "bg-rose-50/50 border-rose-100 text-rose-800",
      dot: "bg-rose-500",
      progressBg: "bg-rose-100",
      progressBar: "bg-rose-500",
    },
    amber: {
      bg: "bg-amber-50/50 border-amber-100 text-amber-800",
      dot: "bg-amber-500",
      progressBg: "bg-amber-100",
      progressBar: "bg-amber-500",
    },
    emerald: {
      bg: "bg-emerald-50/50 border-emerald-100 text-emerald-800",
      dot: "bg-emerald-500",
      progressBg: "bg-emerald-100",
      progressBar: "bg-emerald-500",
    },
    slate: {
      bg: "bg-slate-50/50 border-slate-200 text-slate-700",
      dot: "bg-slate-400",
      progressBg: "bg-slate-100",
      progressBar: "bg-slate-400",
    },
  };

  const selected = styles[color];

  return (
    <div className={`rounded-xl border p-4 flex flex-col justify-between min-h-[110px] ${selected.bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">{label}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${selected.dot}`} />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-black leading-none">{count}</p>
        <p className="text-[10px] opacity-75 mt-1">{pct}% of enrolled</p>
      </div>
      
      {/* Subtle Progress Bar */}
      <div className={`w-full h-1.5 rounded-full mt-3 ${selected.progressBg}`}>
        <div
          className={`h-full rounded-full ${selected.progressBar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
