import LoginForm from "@/components/auth/login-form";
import Image from "next/image";
import { getDevAccountGroups } from "@/lib/dev-accounts";

export default function LoginPage() {
  const devAccountGroups = getDevAccountGroups();

  return (
    <main className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left panel: full-bleed classroom image ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[58%] relative overflow-hidden">
        <Image
          src="/classroom-hero.jpg"
          alt="Students in a classroom"
          fill
          priority
          unoptimized
          className="object-cover object-center"
        />

        {/* dark gradient overlay for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(30,58,138,0.55) 60%, rgba(0,0,0,0.15) 100%)",
          }}
        />

        {/* branding / tagline floated over the image */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* top logo mark */}
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              A
            </div>
            <span className="text-white font-semibold text-sm tracking-wide opacity-90">AEM System</span>
          </div>

          {/* bottom tagline */}
          <div>
            <h2
              className="text-white font-bold leading-tight"
              style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.4rem)" }}
            >
              Supporting every learner,<br />one insight at a time.
            </h2>
            <p className="mt-3 text-blue-100 text-sm leading-relaxed max-w-xs" style={{ opacity: 0.85 }}>
              A data-driven platform for teachers, counselors, and administrators to track, support, and intervene — before it&apos;s too late.
            </p>

            {/* pill badges */}
            <div className="flex flex-wrap gap-2 mt-6">
              {["Risk Scoring", "Interventions", "Attendance", "AI Insights"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: containerless login form ── */}
      <div
        className="flex flex-col w-full lg:w-1/2 xl:w-[42%] min-h-screen relative"
        style={{ background: "#f8fafc" }}
      >
        {/* subtle top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #c7d2fe 100%)" }} />

        {/* center content vertically */}
        <div className="flex flex-col items-center justify-center flex-1 px-8 sm:px-14 xl:px-20 py-12">

          {/* logo mark (visible on mobile too) */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
              A
            </div>
            <span className="font-semibold text-slate-800 text-sm tracking-wide">AEM System</span>
          </div>

          {/* heading */}
          <div className="w-full max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-2">Staff Portal</p>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to your secure workspace
            </p>

            {/* divider */}
            <div className="my-8 h-px bg-slate-200" />

            {/* form — no wrapper card */}
            <LoginForm devAccountGroups={devAccountGroups} />

            {/* footer */}
            <p className="mt-10 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} AEM System · All rights reserved
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}