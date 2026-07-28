"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissRecommendationAction } from "@/app/actions/risk/compute";

/**
 * Declining an algorithmic suggestion is a first-class action, not an absence
 * of one — the dismissed draft stays in the DB as evidence that a human looked
 * and said no (audited as RECOMMENDATION_DISMISSED).
 */
export default function DismissRecommendationButton({ recommendationId }: { recommendationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function dismiss() {
    setError(null);
    startTransition(async () => {
      const result = await dismissRecommendationAction({ id: recommendationId });
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  if (error) {
    return (
      <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
        {error}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
      >
        Dismiss
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={dismiss}
        disabled={pending}
        className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
      >
        {pending ? "Dismissing…" : "Confirm dismiss"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors"
      >
        Cancel
      </button>
    </span>
  );
}
