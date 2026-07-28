import Link from "next/link";
import type { ReactNode } from "react";
import { requireSession, roleLandingPath } from "@/lib/session";

/**
 * Cross-role literacy surface (spec §6.9, §13). Deliberately outside the
 * per-role route prefixes: every role sees the same explanation of how the
 * algorithm works, because "the counselor was shown a different version of the
 * rules" would defeat the point. `proxy.ts` still requires a session.
 */
export default async function LearnLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const backHref = roleLandingPath(session.user.role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <Link href="/learn" className="text-sm font-semibold tracking-tight text-slate-900">
            How this system works
          </Link>
          <Link
            href={backHref}
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
