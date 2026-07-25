"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SELLevel } from "@prisma/client";
import { createSELAssessmentAction } from "@/app/actions/counselor/sel";

const LEVELS: SELLevel[] = ["THRIVING", "STABLE", "AT_RISK", "CRITICAL"];
const LEVEL_LABEL: Record<SELLevel, string> = {
  THRIVING: "Thriving",
  STABLE: "Stable",
  AT_RISK: "At risk",
  CRITICAL: "Critical",
};

type DimensionKey = "emotionalWellbeing" | "stressLevel" | "peerRelationships";

const DIMENSIONS: Array<{ key: DimensionKey; label: string; hint: string }> = [
  { key: "emotionalWellbeing", label: "Emotional well-being", hint: "Overall mood and regulation" },
  { key: "stressLevel", label: "Stress", hint: "Thriving = well-regulated, Critical = severe" },
  { key: "peerRelationships", label: "Peer relationships", hint: "Belonging and social connection" },
];

export default function SELAssessmentForm({
  enrollmentId,
  studentId,
}: {
  enrollmentId: string;
  studentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<Record<DimensionKey, SELLevel>>({
    emotionalWellbeing: "STABLE",
    stressLevel: "STABLE",
    peerRelationships: "STABLE",
  });
  const [selfAssessment, setSelfAssessment] = useState<SELLevel | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setLevels({ emotionalWellbeing: "STABLE", stressLevel: "STABLE", peerRelationships: "STABLE" });
    setSelfAssessment("");
    setNotes("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSELAssessmentAction({
        enrollmentId,
        studentId,
        ...levels,
        ...(selfAssessment ? { selfAssessment } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Record SEL assessment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">New SEL assessment</p>

      {DIMENSIONS.map((d) => (
        <fieldset key={d.key} className="flex flex-col gap-1.5">
          <legend className="text-xs font-medium text-slate-700">
            {d.label} <span className="font-normal text-slate-400">· {d.hint}</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lvl) => (
              <label
                key={lvl}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  levels[d.key] === lvl
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name={d.key}
                  value={lvl}
                  checked={levels[d.key] === lvl}
                  onChange={() => setLevels((p) => ({ ...p, [d.key]: lvl }))}
                  disabled={pending}
                  className="sr-only"
                />
                {LEVEL_LABEL[lvl]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
        <span>
          Student self-rating{" "}
          <span className="font-normal text-slate-400">· optional — only if the student gave one</span>
        </span>
        <select
          value={selfAssessment}
          onChange={(e) => setSelfAssessment(e.target.value as SELLevel | "")}
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="">Not given</option>
          {LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {LEVEL_LABEL[lvl]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
        <span>
          Narrative context <span className="font-normal text-slate-400">· optional, counselor-only</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={4000}
          disabled={pending}
          placeholder="Context behind these ratings. Not shown to the principal."
          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Saving…" : "Save assessment"}
        </button>
      </div>
    </form>
  );
}
