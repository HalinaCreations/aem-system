import Link from "next/link";

const SECTIONS = [
  {
    href: "/learn/risk-score",
    title: "How the risk score is computed",
    description:
      "The five dimensions, what each one measures, how they are weighted, and where the band cut-offs sit. Rendered from the weights the system is running right now.",
  },
  {
    href: "/learn/patterns",
    title: "What the pattern rules look for",
    description:
      "The eight rules that scan for situations a single score can miss, and the exact conditions each one requires before it fires.",
  },
  {
    href: "/learn/decisions",
    title: "What the system decides — and what it doesn't",
    description:
      "Where the algorithm stops and a person takes over. Worth reading before trusting anything on this page.",
  },
];

export default function LearnIndexPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          How this system works
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Every number this system shows you can be traced back to data someone entered and a rule
          someone wrote. Nothing here is a black box, and nothing here decides anything about a
          student on its own.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          These pages describe the <em>current</em> configuration, not a snapshot from when they were
          written — the weights and thresholds below are read from the live algorithm config each
          time you load them. If an administrator retunes the algorithm, this page changes with it.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <h2 className="text-base font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Want to experiment?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Counselors can open the{" "}
          <Link href="/counselor/what-if" className="font-medium text-slate-900 underline underline-offset-2">
            What-If Simulator
          </Link>{" "}
          to change hypothetical student data and watch the score move. It runs the same engine that
          scores real students, so what you learn there is true of the real thing.
        </p>
      </section>
    </div>
  );
}
