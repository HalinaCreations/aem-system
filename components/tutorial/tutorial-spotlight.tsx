"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTutorial } from "./tutorial-context";

export function TutorialSpotlight() {
  const {
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    skipTour,
    openGuideModal,
    isFirstLoginPromptOpen,
    startTour,
    dismissFirstLoginPrompt,
    guideData,
  } = useTutorial();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showStepList, setShowStepList] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const measureTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to measure element coordinates accurately
  const measureElement = useCallback(() => {
    if (!isTourActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    const selectors = currentStep.targetSelector
      ? currentStep.targetSelector.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let el: Element | null = null;
    for (const selector of selectors) {
      try {
        const found = document.querySelector(selector);
        if (found) {
          const rect = found.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el = found;
            break;
          }
        }
      } catch {
        // Ignore selector syntax issues
      }
    }

    // Fallback only if no explicit selector matched
    if (!el && selectors.length === 0) {
      el = document.querySelector("main > div") || document.querySelector("main");
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return true;
      }
    }

    return false;
  }, [isTourActive, currentStep]);

  // Handle step change and element finding with retries
  useEffect(() => {
    // No clearing needed on the inactive path — the component renders null while
    // the tour is off, and findTarget() re-measures before the next step paints.
    if (!isTourActive || !currentStep) {
      return;
    }

    let retries = 0;
    const maxRetries = 15;
    const retryInterval = 100;

    const findTarget = () => {
      const found = measureElement();
      if (found) {
        // Smoothly scroll target into center view if outside viewport
        const selectors = currentStep.targetSelector
          ? currentStep.targetSelector.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        for (const selector of selectors) {
          try {
            const el = document.querySelector(selector);
            if (el) {
              const rect = el.getBoundingClientRect();
              const isOutOfView =
                rect.top < 70 ||
                rect.bottom > window.innerHeight - 70 ||
                rect.left < 0 ||
                rect.right > window.innerWidth;
              if (isOutOfView) {
                el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                // Re-measure after scroll settles
                setTimeout(() => measureElement(), 280);
              }
              break;
            }
          } catch {
            // Ignore
          }
        }
        return;
      }

      if (retries < maxRetries) {
        retries++;
        measureTimerRef.current = setTimeout(findTarget, retryInterval);
      } else {
        // If not found after all retries, measure main container as fallback
        const fallback = document.querySelector("main > div") || document.querySelector("main");
        if (fallback) {
          setTargetRect(fallback.getBoundingClientRect());
        }
      }
    };

    findTarget();

    const handleUpdate = () => {
      measureElement();
    };

    window.addEventListener("resize", handleUpdate, { passive: true });
    window.addEventListener("scroll", handleUpdate, { passive: true });

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      } else if (e.key === "Escape") {
        skipTour();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTourActive, currentStep, measureElement, nextStep, prevStep, skipTour]);

  // First Login Welcome Modal
  if (isFirstLoginPromptOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          {/* Header Visual with Accent */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-br from-indigo-50 via-slate-50 to-white border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                First Login Multi-Page Tour
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {guideData.roleDisplayName}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome to the AEM System
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {guideData.roleDescription}
            </p>
          </div>

          {/* Quick Highlight Cards */}
          <div className="p-6 sm:p-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {guideData.quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-800 truncate">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                <svg className="h-4 w-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Interactive Workflow Tour
              </p>
              <p className="mt-1 text-xs text-indigo-950/80 leading-relaxed">
                Take an interactive tour that automatically navigates through every page, spotlighting specific buttons, modals, input forms, and step-by-step processes.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <button
                type="button"
                onClick={dismissFirstLoginPrompt}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Skip for now
              </button>

              <div className="flex w-full sm:w-auto items-center gap-2">
                <button
                  type="button"
                  onClick={() => openGuideModal("features")}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                >
                  Browse Manual
                </button>
                <button
                  type="button"
                  onClick={startTour}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Start Multi-Page Tour</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Step-by-Step Tour Spotlight
  if (!isTourActive || !currentStep) {
    return null;
  }

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  // Calculate card position with wider boundaries
  const CARD_WIDTH = 580;
  const CARD_HEIGHT = 440;
  let cardPositionStyles: React.CSSProperties = {};

  if (targetRect) {
    const isLargeContainer = targetRect.width > 700 && targetRect.height > 400;
    if (isLargeContainer) {
      cardPositionStyles = {
        top: 84,
        right: 24,
      };
    } else {
      const spaceBelow = window.innerHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      const spaceRight = window.innerWidth - targetRect.right;
      const spaceLeft = targetRect.left;

      if (currentStep.placement === "right" && spaceRight > CARD_WIDTH + 24) {
        cardPositionStyles = {
          top: Math.max(76, Math.min(window.innerHeight - CARD_HEIGHT - 30, targetRect.top)),
          left: Math.min(window.innerWidth - CARD_WIDTH - 20, targetRect.right + 20),
        };
      } else if (currentStep.placement === "left" && spaceLeft > CARD_WIDTH + 24) {
        cardPositionStyles = {
          top: Math.max(76, Math.min(window.innerHeight - CARD_HEIGHT - 30, targetRect.top)),
          left: Math.max(20, targetRect.left - CARD_WIDTH - 20),
        };
      } else if (spaceBelow >= 300 || spaceBelow >= spaceAbove) {
        cardPositionStyles = {
          top: Math.min(window.innerHeight - CARD_HEIGHT - 20, targetRect.bottom + 16),
          left: Math.max(20, Math.min(window.innerWidth - CARD_WIDTH - 20, targetRect.left)),
        };
      } else {
        cardPositionStyles = {
          top: Math.max(76, targetRect.top - CARD_HEIGHT - 16),
          left: Math.max(20, Math.min(window.innerWidth - CARD_WIDTH - 20, targetRect.left)),
        };
      }
    }
  } else {
    cardPositionStyles = {
      top: 84,
      right: 24,
    };
  }

  // Safe padding coordinates for spotlight cutout
  const cutoutStyle = targetRect
    ? {
        top: Math.max(68, Math.round(targetRect.top - 8)),
        left: Math.max(10, Math.round(targetRect.left - 8)),
        width: Math.min(Math.round(targetRect.width + 16), window.innerWidth - Math.max(10, Math.round(targetRect.left - 8)) - 12),
        height: Math.min(Math.round(targetRect.height + 16), window.innerHeight - Math.max(68, Math.round(targetRect.top - 8)) - 12),
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* ── Stable Non-Flickering Backdrop Overlay with Smooth Cutout ── */}
      {cutoutStyle ? (
        <div
          className="pointer-events-none fixed z-40 rounded-2xl border-2 border-indigo-400 ring-4 ring-indigo-500/20 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.78),0_0_32px_rgba(99,102,241,0.45)]"
          style={{
            top: cutoutStyle.top,
            left: cutoutStyle.left,
            width: cutoutStyle.width,
            height: cutoutStyle.height,
            transition: "top 0.32s cubic-bezier(0.16, 1, 0.3, 1), left 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1), height 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Target Element Tag on Top of Cutout */}
          {currentStep.targetElementName && (
            <div className="absolute -top-7 left-2 flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
              <span>🎯 Focus:</span>
              <span className="truncate max-w-[240px]">{currentStep.targetElementName}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 z-40 bg-slate-950/78 pointer-events-none" />
      )}

      {/* ── Tour Step Floating Card (Wider and Cleaner) ── */}
      <div
        ref={cardRef}
        className="pointer-events-auto fixed z-50 w-full max-w-[560px] sm:max-w-[600px] lg:max-w-[620px] rounded-3xl border border-slate-700/80 bg-slate-900 text-white shadow-2xl p-5 sm:p-6 flex flex-col gap-3.5"
        style={{
          ...cardPositionStyles,
          transition: "top 0.32s cubic-bezier(0.16, 1, 0.3, 1), left 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center flex-wrap gap-2">
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-bold text-indigo-400">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            {currentStep.badge && (
              <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {currentStep.badge}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowStepList((prev) => !prev)}
              className="text-[11px] font-semibold text-slate-400 hover:text-white underline transition-colors"
            >
              {showStepList ? "Hide" : "All Steps ▾"}
            </button>
          </div>

          <button
            type="button"
            onClick={skipTour}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Exit tour"
          >
            ✕ Exit
          </button>
        </div>

        {/* Step Jump Menu */}
        {showStepList && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1">
            {guideData.tourSteps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  goToStep(idx);
                  setShowStepList(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                  idx === currentStepIndex
                    ? "bg-indigo-600 font-bold text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="truncate">{step.title}</span>
                {step.route && (
                  <span className="text-[10px] opacity-75 font-mono ml-2 shrink-0">
                    {step.route}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Route and Focus Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {currentStep.route && (
            <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/90 px-2 py-0.5 text-[11px] font-mono text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>{currentStep.route}</span>
            </div>
          )}
          {currentStep.targetElementName && (
            <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span>🎯 Focus:</span>
              <span className="font-bold text-emerald-200">{currentStep.targetElementName}</span>
            </div>
          )}
        </div>

        {/* Title and Short Direct Content */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            {currentStep.title}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* 2-Column or Stacked Detail Grid (Modal + Execution Steps) */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Modal / Dialog / Drawer Workflow Box */}
          {currentStep.modalExplanation && (
            <div className="rounded-2xl bg-indigo-950/50 border border-indigo-500/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mb-1">
                <svg className="h-3.5 w-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <span>Modal &amp; Form Action</span>
              </div>
              <p className="text-[11px] text-indigo-200/90 leading-snug">
                {currentStep.modalExplanation}
              </p>
            </div>
          )}

          {/* Step-by-Step Execution Process Checklist */}
          {currentStep.processFlowSteps && currentStep.processFlowSteps.length > 0 && (
            <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span>Quick Process Flow</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {currentStep.processFlowSteps.map((flowStep, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-200">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{flowStep.replace(/^\d+\.\s*/, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Hint */}
        {currentStep.actionHint && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2">
            <svg className="h-3.5 w-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
            <p className="text-[11px] text-amber-300 font-medium leading-snug">{currentStep.actionHint}</p>
          </div>
        )}

        {/* Key Elements horizontally arranged */}
        {currentStep.elements && currentStep.elements.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              🔍 Key Controls
            </p>
            <div className="flex flex-wrap gap-1.5">
              {currentStep.elements.map((el, i) => {
                const [label] = el.split(" — ");
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                    title={el}
                  >
                    <span className="h-1 w-1 rounded-full bg-indigo-400" />
                    <span className="font-semibold text-slate-200">{label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => openGuideModal("features")}
            className="text-[11px] font-medium text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Full Guide
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={prevStep}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                ← Back
              </button>
            )}

            <button
              type="button"
              onClick={isLastStep ? skipTour : nextStep}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1"
            >
              {isLastStep ? "✓ Finish Tour" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
