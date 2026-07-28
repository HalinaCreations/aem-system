"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

type SelectContextType = {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  labels: Record<string, string>;
  registerLabel: (val: string, label: string) => void;
};

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

export function Select({ children, value: controlledValue, defaultValue, onValueChange, name }: SelectProps) {
  const [localValue, setLocalValue] = useState(defaultValue ?? "");
  const value = controlledValue !== undefined ? controlledValue : localValue;

  const [isOpen, setIsOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  const registerLabel = (val: string, label: string) => {
    setLabels((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  };

  const onChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setLocalValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onChange, isOpen, setIsOpen, labels, registerLabel }}>
      <div className="relative w-full">
        {children}
        {name && <input type="hidden" name={name} value={value} />}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<"button">) {
  const { isOpen, setIsOpen } = useContext(SelectContext)!;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-100 ${className}`}
      {...props}
    >
      {children}
      <svg className="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useContext(SelectContext)!;
  return <span>{labels[value] || placeholder || value}</span>;
}

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isOpen, setIsOpen } = useContext(SelectContext)!;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg focus:outline-none ${className}`}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value: itemValue, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { value, onChange, registerLabel } = useContext(SelectContext)!;
  const isSelected = value === itemValue;

  useEffect(() => {
    registerLabel(itemValue, String(children));
  }, [itemValue, children, registerLabel]);

  return (
    <div
      onClick={() => onChange(itemValue)}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-50 hover:text-slate-900 ${
        isSelected ? "bg-teal-50 text-teal-800 font-semibold" : "text-slate-700"
      } ${className}`}
      style={{ cursor: "pointer" }}
    >
      {isSelected && (
        <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
          <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      {children}
    </div>
  );
}
