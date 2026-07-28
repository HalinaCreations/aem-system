import type { ReactNode } from "react";

/**
 * Inline explanation for an algorithmic output (spec §6.9 — "tooltips on every
 * algorithmic output").
 *
 * Deliberately CSS-only: a `<details>`-free, JS-free hover/focus popover. These
 * appear inside server components on data-heavy pages, and shipping a client
 * component per badge would mean hydrating dozens of islands to show a sentence.
 * `tabIndex` + `focus-within` keeps it reachable by keyboard rather than
 * hover-only.
 */
export default function Explain({
  children,
  label = "What is this?",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <span className="group relative inline-flex focus-within:z-20 hover:z-20">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[9px] font-bold leading-none text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-600 opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
