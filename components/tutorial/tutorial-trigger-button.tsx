"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTutorial } from "./tutorial-context";

export function TutorialTriggerButton() {
  const { openGuideModal, startTour, guideData } = useTutorial();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} data-tour="guide-tour-btn">
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        title="Interactive System Guide & Tutorials"
      >
        <svg
          className="h-3.5 w-3.5 text-indigo-600 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>Guide & Tour</span>
        <svg
          className={`h-3 w-3 text-indigo-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-100 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {guideData.roleDisplayName} Help
            </p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              Workspace Guides & Tutorials
            </p>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                startTour();
              }}
              className="w-full flex items-start gap-3 rounded-xl p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">Start Interactive Tour</p>
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                  Walk step-by-step through pages, buttons, and tools in your workspace.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openGuideModal("features");
              }}
              className="w-full flex items-start gap-3 rounded-xl p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">Full Role Manual & Features</p>
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                  Explore complete page guides, functions, and privacy rules.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openGuideModal("workflows");
              }}
              className="w-full flex items-start gap-3 rounded-xl p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">Daily Workflows & How-Tos</p>
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                  Step-by-step procedures for your day-to-day operations.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openGuideModal("governance");
              }}
              className="w-full flex items-start gap-3 rounded-xl p-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">AI & Governance Rules</p>
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                  Understand risk formulas and privacy boundaries.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
