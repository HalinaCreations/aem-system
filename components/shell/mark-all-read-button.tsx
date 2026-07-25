"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

export default function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await markAllNotificationsReadAction();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {pending ? "Marking…" : "Mark all read"}
      </button>
    </div>
  );
}
