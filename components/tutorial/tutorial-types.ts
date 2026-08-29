import type { RoleName } from "@/components/shell/role-shell";

export type TourStep = {
  id: string;
  route?: string;
  targetSelector?: string;
  /** Human-friendly name of the specific button, modal, or component being spotlighted */
  targetElementName?: string;
  title: string;
  badge?: string;
  content: string;
  /** Short action hint shown in yellow — what the user should DO on this step */
  actionHint?: string;
  /** Detailed explanation of the modal, popup, or drawer triggered by this component */
  modalExplanation?: string;
  /** Step-by-step process flow checklist for completing the action */
  processFlowSteps?: string[];
  /** Bullet list of specific UI elements or buttons to notice */
  elements?: string[];
  placement?: "top" | "bottom" | "left" | "right" | "center";
  icon?: "sparkle" | "layout" | "calendar" | "bell" | "shield" | "brain" | "users" | "book" | "chart" | "check";
};

export type FeatureDocumentation = {
  id: string;
  title: string;
  route: string;
  category: string;
  badge?: string;
  summary: string;
  whatYouCanDo: string[];
  keyFunctions: {
    name: string;
    description: string;
  }[];
  privacyAndScope: string;
  tips: string[];
};

export type RoleWorkflow = {
  id: string;
  title: string;
  summary: string;
  estimatedTime: string;
  frequency: "Daily" | "Weekly" | "Quarterly" | "As Needed";
  steps: {
    stepNumber: number;
    actionTitle: string;
    pageRoute: string;
    instructions: string;
  }[];
};

export type RoleGuideDocument = {
  role: RoleName;
  roleDisplayName: string;
  roleDescription: string;
  primaryFocus: string;
  privacyScope: string;
  quickStats: {
    label: string;
    value: string;
  }[];
  tourSteps: TourStep[];
  features: FeatureDocumentation[];
  workflows: RoleWorkflow[];
  aiAndAlgorithmNotes: {
    title: string;
    content: string;
  }[];
};
