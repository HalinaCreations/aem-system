"use client";

import { useState, useTransition } from "react";
import { createStudentAction } from "@/app/actions/admin/students";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type SectionOption = {
  id: string;
  gradeLevel: string;
  label: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionOption[];
};

export default function CreateStudentModal({ isOpen, onClose, sections }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sex, setSex] = useState<"MALE" | "FEMALE">("MALE");
  const [sectionId, setSectionId] = useState<string>(sections[0]?.id ?? "");
  const [learningModality, setLearningModality] = useState<string>("FACE_TO_FACE");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("sex", sex);
    fd.set("sectionId", sectionId);
    fd.set("learningModality", learningModality);

    startTransition(async () => {
      const res = await createStudentAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <section className="relative z-10 bg-white rounded-3xl border border-slate-200 p-7 max-w-lg w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 transition-colors"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Add New Student</h2>
            <p className="mt-1 text-xs text-slate-500">
              Register a learner manually and enroll them into a class section.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {/* LRN */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label htmlFor="cs-lrn" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              LRN (12 Digits) <span className="text-red-500">*</span>
            </label>
            <input
              id="cs-lrn"
              name="lrn"
              required
              pattern="\d{12}"
              maxLength={12}
              placeholder="e.g. 101234567890"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* First Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="cs-fn" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="cs-fn"
              name="firstName"
              required
              maxLength={100}
              placeholder="e.g. Juan"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Last Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="cs-ln" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="cs-ln"
              name="lastName"
              required
              maxLength={100}
              placeholder="e.g. Dela Cruz"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Middle Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="cs-mn" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Middle Name (optional)
            </label>
            <input
              id="cs-mn"
              name="middleName"
              maxLength={100}
              placeholder="e.g. Santos"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Sex */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Sex <span className="text-red-500">*</span>
            </label>
            <Select value={sex} onValueChange={(val) => setSex(val as "MALE" | "FEMALE")}>
              <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all w-full flex items-center justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class Section */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Assigned Section <span className="text-red-500">*</span>
            </label>
            <Select value={sectionId} onValueChange={(val) => setSectionId(val)}>
              <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all w-full flex items-center justify-between">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>



          {/* Birth Date */}
          <div className="flex flex-col gap-1">
            <label htmlFor="cs-bd" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Birth Date (optional)
            </label>
            <input
              id="cs-bd"
              name="birthDate"
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
          </div>

          {/* Learning Modality */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Learning Modality
            </label>
            <Select value={learningModality} onValueChange={(val) => setLearningModality(val)}>
              <SelectTrigger className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all w-full flex items-center justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FACE_TO_FACE">Face to Face</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="MODULAR_PRINT">Modular (Print)</SelectItem>
                <SelectItem value="MODULAR_DIGITAL">Modular (Digital)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer Actions */}
          <div className="md:col-span-2 flex flex-col gap-3 mt-3 border-t border-slate-100 pt-4">
            {error && <p className="text-xs text-red-650 font-bold" role="alert">{error}</p>}
            <div className="flex gap-2.5 justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !sectionId}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all shadow-sm"
              >
                {pending ? "Adding…" : "Add Student"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
