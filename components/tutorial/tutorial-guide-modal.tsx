"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useTutorial } from "./tutorial-context";

export function TutorialGuideModal() {
  const {
    isGuideModalOpen,
    closeGuideModal,
    guideModalTab,
    openGuideModal,
    guideData,
    startTour,
    goToStep,
    selectedFeatureId,
  } = useTutorial();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFeatureCategory, setActiveFeatureCategory] = useState<string>("all");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(selectedFeatureId);

  const categories = useMemo(() => {
    const set = new Set<string>();
    guideData.features.forEach((f) => set.add(f.category));
    return ["all", ...Array.from(set)];
  }, [guideData.features]);

  const filteredFeatures = useMemo(() => {
    return guideData.features.filter((f) => {
      const matchesCat = activeFeatureCategory === "all" || f.category === activeFeatureCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;
      const matchesSearch =
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.route.toLowerCase().includes(q) ||
        f.whatYouCanDo.some((item) => item.toLowerCase().includes(q)) ||
        f.keyFunctions.some((k) => k.name.toLowerCase().includes(q) || k.description.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [guideData.features, activeFeatureCategory, searchQuery]);

  if (!isGuideModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] max-h-[850px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shrink-0 shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {guideData.roleDisplayName} User Guide & Manual
                </h2>
                <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  Documentation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {guideData.primaryFocus}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={startTour}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Launch UI Tour</span>
            </button>

            <button
              type="button"
              onClick={closeGuideModal}
              className="h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
              title="Close Guide"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-6 border-b border-slate-200 bg-white shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => openGuideModal("tour")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              guideModalTab === "tour"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>🧭 Interactive Tour Map</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-semibold">
              {guideData.tourSteps.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuideModal("features")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              guideModalTab === "features"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>📑 All Pages & Features</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-semibold">
              {guideData.features.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuideModal("workflows")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              guideModalTab === "workflows"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>⚡ Daily Workflows</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-semibold">
              {guideData.workflows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuideModal("governance")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              guideModalTab === "governance"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>🛡️ AI & Privacy Rules</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
          {/* TAB 1: TOUR MAP */}
          {guideModalTab === "tour" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                <h3 className="text-sm font-bold text-indigo-900">
                  Step-by-Step Interactive UI Walkthrough
                </h3>
                <p className="mt-1 text-xs text-indigo-950/80 leading-relaxed">
                  The interactive spotlight walks you through all primary components in your active dashboard. Click any step below to jump directly to it in the live workspace.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={startTour}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
                  >
                    <span>Start Guided Tour from Beginning</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {guideData.tourSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          Step {idx + 1} of {guideData.tourSteps.length}
                        </span>
                        {step.badge && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {step.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        {step.content}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {step.targetSelector ? "Points to UI element" : "Workspace overview"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          closeGuideModal();
                          goToStep(idx);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Highlight in UI &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE PAGE & FEATURE GUIDE */}
          {guideModalTab === "features" && (
            <div className="space-y-6">
              {/* Search and Category Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages, functions, or features…"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveFeatureCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                        activeFeatureCategory === cat
                          ? "bg-indigo-600 text-white font-bold shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {cat === "all" ? "All Features" : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Cards List */}
              <div className="space-y-4">
                {filteredFeatures.map((feat) => {
                  const isExpanded = expandedFeatureId === feat.id;
                  return (
                    <div
                      key={feat.id}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? "border-indigo-300 bg-white shadow-md ring-1 ring-indigo-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      {/* Card Summary Header */}
                      <div
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                        onClick={() =>
                          setExpandedFeatureId(isExpanded ? null : feat.id)
                        }
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                              {feat.category}
                            </span>
                            {feat.badge && (
                              <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                {feat.badge}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            {feat.title}
                            <span className="text-xs font-normal text-slate-400 font-mono">
                              ({feat.route})
                            </span>
                          </h3>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {feat.summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <Link
                            href={feat.route}
                            onClick={closeGuideModal}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                          >
                            Open Page →
                          </Link>
                          <button
                            type="button"
                            className="text-xs font-semibold text-indigo-600 p-1"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? "▲ Hide" : "▼ Details"}
                          </button>
                        </div>
                      </div>

                      {/* Expanded In-Depth Manual */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 text-xs">
                          {/* What You Can Do */}
                          <div>
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                              Capabilities & What You Can Do
                            </h4>
                            <ul className="grid sm:grid-cols-2 gap-2 text-slate-600">
                              {feat.whatYouCanDo.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Key Functions */}
                          <div>
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                              Primary Functions & Tools on This Screen
                            </h4>
                            <div className="grid sm:grid-cols-2 gap-2.5">
                              {feat.keyFunctions.map((fn, i) => (
                                <div
                                  key={i}
                                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                                >
                                  <p className="font-bold text-slate-900 text-xs">{fn.name}</p>
                                  <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">
                                    {fn.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Privacy & Tips */}
                          <div className="grid sm:grid-cols-2 gap-3 pt-2">
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                              <p className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider">
                                Privacy & Security Scope
                              </p>
                              <p className="mt-1 text-indigo-950/80 text-[11px] leading-relaxed">
                                {feat.privacyAndScope}
                              </p>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                              <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                                Pro Tips & Best Practices
                              </p>
                              <ul className="mt-1 space-y-1 text-amber-950/80 text-[11px]">
                                {feat.tips.map((tip, i) => (
                                  <li key={i}>• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredFeatures.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      No features matching &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try searching by route name, keyword, or clear your category filter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WORKFLOWS */}
          {guideModalTab === "workflows" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  Operational Playbooks for {guideData.roleDisplayName}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Follow these proven standard operating procedures to accomplish common tasks efficiently and accurately within the system.
                </p>
              </div>

              <div className="space-y-6">
                {guideData.workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{wf.title}</h4>
                          <span className="rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                            {wf.frequency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{wf.summary}</p>
                      </div>
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                        ⏱ Est. {wf.estimatedTime}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {wf.steps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                        >
                          <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {step.stepNumber}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-slate-900 text-xs">
                                {step.actionTitle}
                              </h5>
                              <Link
                                href={step.pageRoute}
                                onClick={closeGuideModal}
                                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 underline"
                              >
                                Go to screen &rarr;
                              </Link>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {step.instructions}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GOVERNANCE & AI */}
          {guideModalTab === "governance" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-500 font-bold">★</span>
                  <h3 className="text-sm font-bold text-indigo-950">
                    Algorithmic Transparency & Educational Governance
                  </h3>
                </div>
                <p className="text-xs text-indigo-950/80 leading-relaxed">
                  The AEM System adheres to strict DepEd educational ethics and Data Privacy Act standards. Predictions are explainable, human-centered, and designed to support—not replace—educator judgment.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {guideData.aiAndAlgorithmNotes.map((note, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-600" />
                      {note.title}
                    </h4>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Privacy Wall Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Role Data Separation Matrix
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                        <th className="p-2.5 rounded-l-lg">Role</th>
                        <th className="p-2.5">Classroom Scope</th>
                        <th className="p-2.5">Risk Scores & Factors</th>
                        <th className="p-2.5">Counseling Notes</th>
                        <th className="p-2.5 rounded-r-lg">Interventions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5 px-2.5 font-bold text-slate-900">Admin</td>
                        <td className="py-2.5 px-2.5">All Sections</td>
                        <td className="py-2.5 px-2.5">Weights & Setup</td>
                        <td className="py-2.5 px-2.5 text-rose-600 font-medium">Metadata Only</td>
                        <td className="py-2.5 px-2.5">Audit & Pipeline</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2.5 font-bold text-slate-900">Teacher</td>
                        <td className="py-2.5 px-2.5">Assigned Sections</td>
                        <td className="py-2.5 px-2.5">Full Factor Breakdown</td>
                        <td className="py-2.5 px-2.5 text-rose-600 font-medium">Private (Sealed)</td>
                        <td className="py-2.5 px-2.5">Session Logging & Notes</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2.5 font-bold text-slate-900">Counselor</td>
                        <td className="py-2.5 px-2.5">School-Wide</td>
                        <td className="py-2.5 px-2.5">Full Factor Breakdown</td>
                        <td className="py-2.5 px-2.5 text-emerald-600 font-bold">Full Access</td>
                        <td className="py-2.5 px-2.5">AI Authoring & Ownership</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2.5 font-bold text-slate-900">Principal</td>
                        <td className="py-2.5 px-2.5">School-Wide</td>
                        <td className="py-2.5 px-2.5">Institutional Analytics</td>
                        <td className="py-2.5 px-2.5 text-rose-600 font-medium">Private (Sealed)</td>
                        <td className="py-2.5 px-2.5">Executive Approvals</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs shrink-0">
          <p className="text-slate-500 text-[11px]">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono shadow-sm">Esc</kbd> anytime to return to your workspace.
          </p>
          <button
            type="button"
            onClick={closeGuideModal}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
