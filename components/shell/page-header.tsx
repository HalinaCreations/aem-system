import React from "react";

type PageHeaderProps = {
  label: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function PageHeader({ label, title, description, actions }: PageHeaderProps) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-sky-50/50 px-5 py-4 md:px-6 md:py-5 shadow-sm"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Visual background accent */}
      <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 bg-blue-200/30 rounded-full blur-xl opacity-50" />
      
      <div className="relative z-10 flex flex-col gap-1">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-800">
          {label}
        </span>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
              {title}
            </h1>
            {description && (
              <div className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
                {description}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 self-start md:self-center">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
