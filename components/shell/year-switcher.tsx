"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchSchoolYearAction } from "@/app/actions/school-year";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Year = { id: string; label: string; isActive: boolean };

export default function YearSwitcher({
  years,
  selectedId,
}: {
  years: Year[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleValueChange = (id: string) => {
    startTransition(async () => {
      const result = await switchSchoolYearAction(id);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div data-tour="year-switcher">
      <Select
        value={selectedId ?? ""}
        onValueChange={handleValueChange}
      >
        <SelectTrigger
          disabled={pending || years.length === 0}
          className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60 w-[140px]"
        >
          <SelectValue placeholder="No years" />
        </SelectTrigger>
        <SelectContent>
          {years.length === 0 && <SelectItem value="">No years</SelectItem>}
          {years.map((y) => (
            <SelectItem key={y.id} value={y.id}>
              {y.label}
              {y.isActive ? " (Active)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
