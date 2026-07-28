"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INTERVENTION_TYPES, INTERVENTION_TYPE_LABEL } from "@/lib/intervention/types";
import { createReferralAction } from "@/app/actions/teacher/referrals";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Student = { id: string; label: string; sectionLabel: string };

const URGENCY_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

export default function ReferralForm({ students }: { students: Student[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState("");
  const [suggestedType, setSuggestedType] = useState("ACADEMIC_SUPPORT");
  const [rationale, setRationale] = useState("");
  const [urgency, setUrgency] = useState<string>("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createReferralAction({ studentId, suggestedType, rationale, urgency });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStudentId("");
      setRationale("");
      setUrgency("MEDIUM");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Student</span>
        <Select
          value={studentId}
          onValueChange={(val) => setStudentId(val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a student…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Select a student…</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label} — {s.sectionLabel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Suggested intervention type</span>
        <Select
          value={suggestedType}
          onValueChange={(val) => setSuggestedType(val)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVENTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{INTERVENTION_TYPE_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Reason / rationale</span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          maxLength={4000}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="What you're seeing in class that prompts this referral."
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Urgency</span>
        <Select
          value={urgency}
          onValueChange={(val) => setUrgency(val)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {URGENCY_OPTIONS.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={pending || !studentId || !rationale}
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit referral"}
      </button>
    </form>
  );
}
