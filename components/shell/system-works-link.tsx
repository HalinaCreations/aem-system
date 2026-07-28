"use client";

import React from "react";
import { useSystemWorks } from "./system-works-context";

type Props = {
  tab?: "overview" | "risk" | "patterns" | "decisions";
  className?: string;
  children: React.ReactNode;
};

export default function SystemWorksLink({ tab = "overview", className, children }: Props) {
  const { open } = useSystemWorks();

  return (
    <button
      type="button"
      onClick={() => open(tab)}
      className={className}
      style={{ cursor: "pointer" }}
    >
      {children}
    </button>
  );
}
