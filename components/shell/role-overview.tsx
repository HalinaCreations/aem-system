import Image from "next/image";
import Link from "next/link";
import type { NavSection, ThemeName } from "@/components/shell/role-shell";
import SystemWorksLink from "@/components/shell/system-works-link";

type Metric = {
  label: string;
  value: string;
};

type RoleOverviewProps = {
  title: string;
  description: string;
  theme: ThemeName;
  metrics: Metric[];
  sections: NavSection[];
};

const themeStyles = {
  indigo: {
    primary: "#4f46e5",
    accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
    gradient: "from-indigo-600 to-slate-900",
    glow: "shadow-indigo-100 hover:shadow-indigo-200/50 hover:border-indigo-300",
    badge: "bg-indigo-100 text-indigo-800",
  },
  emerald: {
    primary: "#059669",
    accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
    gradient: "from-emerald-600 to-slate-900",
    glow: "shadow-emerald-100 hover:shadow-emerald-200/50 hover:border-emerald-300",
    badge: "bg-emerald-100 text-emerald-800",
  },
  amber: {
    primary: "#d97706",
    accent: "text-amber-600 bg-amber-50 border-amber-100",
    gradient: "from-amber-600 to-slate-900",
    glow: "shadow-amber-100 hover:shadow-amber-200/50 hover:border-amber-300",
    badge: "bg-amber-100 text-amber-800",
  },
  rose: {
    primary: "#e11d48",
    accent: "text-rose-600 bg-rose-50 border-rose-100",
    gradient: "from-rose-600 to-slate-900",
    glow: "shadow-rose-100 hover:shadow-rose-200/50 hover:border-rose-300",
    badge: "bg-rose-100 text-rose-800",
  },
} as const;

function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("caseload") || t.includes("classes") || t.includes("school-wide")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2M2 22h20M12 2a10 10 0 110 20 10 10 0 010-20z" />
      </svg>
    );
  }
  if (t.includes("builder") || t.includes("intervention")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  }
  if (t.includes("referral") || t.includes("approval")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  if (t.includes("pattern") || t.includes("inbox")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (t.includes("what-if") || t.includes("simulator")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    );
  }
  if (t.includes("feedback") || t.includes("queue")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
  if (t.includes("user")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (t.includes("setup") || t.includes("term")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (t.includes("import") || t.includes("wizard")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    );
  }
  if (t.includes("consent")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  if (t.includes("algorithm") || t.includes("config")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
  }
  if (t.includes("audit") || t.includes("log")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  }
  if (t.includes("bias") || t.includes("monitoring")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function RoleOverview({
  title,
  description,
  theme,
  metrics,
  sections,
}: RoleOverviewProps) {
  const styles = themeStyles[theme];

  return (
    <div className="flex flex-col gap-6 lg:gap-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Welcome Banner ── */}
      <section
        data-tour="workspace-hero"
        className="relative overflow-hidden rounded-3xl border border-slate-800 p-8 text-white shadow-lg"
      >
        <Image
          src="/classroom-hero.jpg"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center pointer-events-none"
        />

        {/* dark gradient overlay for text legibility, matching login page */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.88) 0%, rgba(30,58,138,0.7) 60%, rgba(15,23,42,0.95) 100%)",
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Workspace Active</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl lg:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-200 md:text-base">
            {description}
          </p>
        </div>
      </section>

      {/* ── 2-Column Dashboard Grid ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Actionable Modules (70%) */}
        <div className="flex flex-col gap-6 lg:col-span-8" data-tour="available-modules">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Available Modules</h2>
            <span className="text-xs text-slate-500 font-medium">Select a module to proceed</span>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            {sections.map((s) => {
              const Icon = getSectionIcon(s.title);
              const tourSlug = `module-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
              const cardContent = (
                <>
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${styles.accent}`}>
                    {Icon}
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition-colors flex items-center justify-between">
                      {s.title}
                      <span className="text-slate-400 group-hover:translate-x-1 group-hover:text-slate-600 transition-all text-xs font-normal">
                        Launch →
                      </span>
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
                  data-tour={tourSlug}
                  className={`group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 ${styles.glow}`}
                >
                  {cardContent}
                </Link>
              ) : (
                <div
                  key={s.title}
                  data-tour={tourSlug}
                  className="flex flex-col justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 opacity-60"
                >
                  {cardContent}
                </div>
              );
            })}
          </section>
        </div>

        {/* Right Column: Metrics & Help Desk Sidebar (30%) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Metrics */}
          <div className="flex flex-col gap-4" data-tour="system-context-metrics">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">System Context</h2>
            <section className="grid gap-3">
              {metrics.map((m) => (
                <article
                  key={m.label}
                  className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4`}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {m.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {m.value}
                    </p>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${theme === 'amber' ? 'bg-amber-400' : theme === 'emerald' ? 'bg-emerald-400' : theme === 'rose' ? 'bg-rose-400' : 'bg-indigo-400'}`} />
                </article>
              ))}
            </section>
          </div>

          {/* AI Literacy / Explainer Banner */}
          <div data-tour="ai-literacy-card" className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
            {/* Visual accent */}
            <div className="absolute right-0 bottom-0 h-16 w-16 bg-slate-800 rounded-full blur-xl opacity-50" />
            
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">AI & Algorithm Info</span>
            </div>
            <div>
              <h4 className="text-sm font-bold">Transparent Algorithmic Engine</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Risk Scores, Patterns, and Recommendations are derived from explainable mathematical rules. Gemini is only used to format natural-language text.
              </p>
            </div>
            <SystemWorksLink
              tab="overview"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 mt-1 self-start"
            >
              Learn how the system works &rarr;
            </SystemWorksLink>
          </div>
        </div>
      </div>
    </div>
  );
}
