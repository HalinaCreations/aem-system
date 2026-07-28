"use client";

import React, { createContext, useContext, useState } from "react";
import SystemWorksModal from "./system-works-modal";

type TabType = "overview" | "risk" | "patterns" | "decisions";

type SystemWorksContextType = {
  isOpen: boolean;
  activeTab: TabType;
  open: (tab?: TabType) => void;
  close: () => void;
};

const SystemWorksContext = createContext<SystemWorksContextType | undefined>(undefined);

export function SystemWorksProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const open = (tab: TabType = "overview") => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  return (
    <SystemWorksContext.Provider value={{ isOpen, activeTab, open, close }}>
      {children}
      <SystemWorksModal />
    </SystemWorksContext.Provider>
  );
}

export function useSystemWorks() {
  const context = useContext(SystemWorksContext);
  if (!context) {
    throw new Error("useSystemWorks must be used within a SystemWorksProvider");
  }
  return context;
}
