"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { RoleName } from "@/components/shell/role-shell";
import { ROLE_TUTORIAL_DATA } from "./role-tutorial-data";
import type { RoleGuideDocument, TourStep } from "./tutorial-types";

type GuideTab = "tour" | "features" | "workflows" | "governance";

type TutorialContextType = {
  role: RoleName;
  userId: string;
  guideData: RoleGuideDocument;
  isTourActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  isFirstLoginPromptOpen: boolean;
  isGuideModalOpen: boolean;
  guideModalTab: GuideTab;
  selectedFeatureId: string | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  finishTour: () => void;
  skipTour: () => void;
  dismissFirstLoginPrompt: () => void;
  openGuideModal: (tab?: GuideTab, featureId?: string) => void;
  closeGuideModal: () => void;
  resetTourProgress: () => void;
};

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TOUR_SESSION_KEY = "aem_active_tour_session_state";

export function TutorialProvider({
  role,
  userId,
  children,
}: {
  role: RoleName;
  userId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const guideData = useMemo(() => ROLE_TUTORIAL_DATA[role] || ROLE_TUTORIAL_DATA.teacher, [role]);
  const tourSteps = guideData.tourSteps;

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFirstLoginPromptOpen, setIsFirstLoginPromptOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideModalTab, setGuideModalTab] = useState<GuideTab>("tour");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const storageKey = useMemo(() => `aem_tutorial_seen_v2_${role}_${userId}`, [role, userId]);

  // Check on mount for active tour in progress across page changes or first login prompt
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem(TOUR_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.isTourActive && parsed.role === role && parsed.userId === userId) {
          setIsTourActive(true);
          setCurrentStepIndex(parsed.stepIndex || 0);
          return;
        }
      }

      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setIsFirstLoginPromptOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [role, userId, storageKey]);

  // Navigate to a specific tour step, automatically routing to that page if needed
  const navigateToStepIndex = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= tourSteps.length) return;

    const targetStep = tourSteps[targetIndex];
    setCurrentStepIndex(targetIndex);
    setIsTourActive(true);
    setIsFirstLoginPromptOpen(false);
    setIsGuideModalOpen(false);

    try {
      sessionStorage.setItem(
        TOUR_SESSION_KEY,
        JSON.stringify({
          isTourActive: true,
          stepIndex: targetIndex,
          role,
          userId,
        })
      );
    } catch {}

    if (targetStep && targetStep.route && pathname !== targetStep.route) {
      router.push(targetStep.route);
    }
  }, [tourSteps, role, userId, pathname, router]);

  const startTour = useCallback(() => {
    setIsFirstLoginPromptOpen(false);
    setIsGuideModalOpen(false);
    navigateToStepIndex(0);
  }, [navigateToStepIndex]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < tourSteps.length - 1) {
      navigateToStepIndex(currentStepIndex + 1);
    } else {
      setIsTourActive(false);
      try {
        sessionStorage.removeItem(TOUR_SESSION_KEY);
        localStorage.setItem(storageKey, "true");
      } catch {}
    }
  }, [currentStepIndex, tourSteps.length, navigateToStepIndex, storageKey]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      navigateToStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex, navigateToStepIndex]);

  const goToStep = useCallback((index: number) => {
    navigateToStepIndex(index);
  }, [navigateToStepIndex]);

  const finishTour = useCallback(() => {
    setIsTourActive(false);
    try {
      sessionStorage.removeItem(TOUR_SESSION_KEY);
      localStorage.setItem(storageKey, "true");
    } catch {}
  }, [storageKey]);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    try {
      sessionStorage.removeItem(TOUR_SESSION_KEY);
      localStorage.setItem(storageKey, "true");
    } catch {}
  }, [storageKey]);

  const dismissFirstLoginPrompt = useCallback(() => {
    setIsFirstLoginPromptOpen(false);
    try {
      sessionStorage.removeItem(TOUR_SESSION_KEY);
      localStorage.setItem(storageKey, "true");
    } catch {}
  }, [storageKey]);

  const openGuideModal = useCallback((tab: GuideTab = "features", featureId?: string) => {
    setIsTourActive(false);
    setIsFirstLoginPromptOpen(false);
    setGuideModalTab(tab);
    if (featureId) {
      setSelectedFeatureId(featureId);
    }
    setIsGuideModalOpen(true);
  }, []);

  const closeGuideModal = useCallback(() => {
    setIsGuideModalOpen(false);
  }, []);

  const resetTourProgress = useCallback(() => {
    try {
      sessionStorage.removeItem(TOUR_SESSION_KEY);
      localStorage.removeItem(storageKey);
    } catch {}
    startTour();
  }, [storageKey, startTour]);

  const currentStep = useMemo(
    () => (isTourActive && tourSteps[currentStepIndex] ? tourSteps[currentStepIndex] : null),
    [isTourActive, tourSteps, currentStepIndex]
  );

  const contextValue = useMemo<TutorialContextType>(
    () => ({
      role,
      userId,
      guideData,
      isTourActive,
      currentStepIndex,
      currentStep,
      totalSteps: tourSteps.length,
      isFirstLoginPromptOpen,
      isGuideModalOpen,
      guideModalTab,
      selectedFeatureId,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      finishTour,
      skipTour,
      dismissFirstLoginPrompt,
      openGuideModal,
      closeGuideModal,
      resetTourProgress,
    }),
    [
      role,
      userId,
      guideData,
      isTourActive,
      currentStepIndex,
      currentStep,
      tourSteps.length,
      isFirstLoginPromptOpen,
      isGuideModalOpen,
      guideModalTab,
      selectedFeatureId,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      finishTour,
      skipTour,
      dismissFirstLoginPrompt,
      openGuideModal,
      closeGuideModal,
      resetTourProgress,
    ]
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
}

const defaultFallbackData = ROLE_TUTORIAL_DATA.teacher;

export function useTutorial(): TutorialContextType {
  const context = useContext(TutorialContext);
  if (!context) {
    return {
      role: "teacher",
      userId: "",
      guideData: defaultFallbackData,
      isTourActive: false,
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: defaultFallbackData.tourSteps.length,
      isFirstLoginPromptOpen: false,
      isGuideModalOpen: false,
      guideModalTab: "tour",
      selectedFeatureId: null,
      startTour: () => {},
      nextStep: () => {},
      prevStep: () => {},
      goToStep: () => {},
      finishTour: () => {},
      skipTour: () => {},
      dismissFirstLoginPrompt: () => {},
      openGuideModal: () => {},
      closeGuideModal: () => {},
      resetTourProgress: () => {},
    };
  }
  return context;
}
