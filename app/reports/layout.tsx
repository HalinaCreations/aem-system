import Link from "next/link";
import type { ReactNode } from "react";
import { requireSession, roleLandingPath } from "@/lib/session";

/**
 * Like /learn, this sits outside the role prefixes — every role has reports,
 * they just get different ones. Which reports appear, and what rows they
 * contain, is decided by the registry rather than by the URL.
 */
export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <Link href="/reports" className="text-sm font-semibold tracking-tight text-slate-900">
            Reports
          </Link>
          <Link
            href={roleLandingPath(session.user.role)}
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Back to workspace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
