import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { RiskThresholds, RiskWeights } from "@/lib/risk/types";

// Prose lives next to the dimension it describes, but the *numbers* never do —
// they are read from the active AlgorithmConfig below. A hardcoded "30%" here
// would silently become a lie the first time an admin retunes the weights.
const DIMENSIONS: Array<{
  key: keyof RiskWeights;
  label: string;
  measures: string;
  detail: string;
}> = [
  {
    key: "academic",
    label: "Academic",
    measures: "Grades across quarters",
    detail:
      "Combines the overall average, how many subjects sit below the passing line, and the direction of travel across quarters. A student holding steady at a low average and a student falling quickly are treated differently — the slope matters on its own.",
  },
  {
    key: "attendance",
    label: "Attendance",
    measures: "Absences, tardiness, and unbroken absence runs",
    detail:
      "Absence rate carries most of the weight, tardiness adds a smaller amount, and a long unbroken run of absences adds more still — five consecutive days is a different signal from five days scattered across a term.",
  },
  {
    key: "behavioral",
    label: "Behavioral",
    measures: "Logged incidents, weighted by severity",
    detail:
      "Incidents are counted with severity weighting rather than as a flat tally, so one serious incident is not equivalent to three minor ones.",
  },
  {
    key: "interventionHistory",
    label: "Intervention history",
    measures: "Whether past support worked",
    detail:
      "The one thing the other four dimensions cannot see. Needing repeated plans raises the score, and a plan that ended with the student declining raises it further; a plan that ended with improvement lowers it. Being under an active plan right now contributes nothing at all — the situation that justified it is already counted elsewhere, and charging a student for receiving help would mean the score rose every time someone tried to support them.",
  },
  {
    key: "profile",
    label: "Profile",
    measures: "Learning context",
    detail:
      "A small adjustment for SPED status and learning modality, reflecting how much direct support a student's setup gives them. This is the smallest dimension by design, and it is the one to watch on the bias dashboard.",
  },
];

export default async function LearnRiskScorePage() {
  await requireSession();
  const config = await prisma.algorithmConfig.findFirst({ where: { isActive: true } });

  if (!config) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active algorithm configuration, so there is nothing to describe yet. An administrator
        needs to configure the algorithm first.
      </div>
    );
  }

  const weights = config.weights as unknown as RiskWeights;
  const thresholds = config.thresholds as unknown as RiskThresholds;

  // The engine normalises weights, so relative share is what actually applies —
  // showing the raw numbers would misrepresent the maths if they don't sum to 1.
  const total = DIMENSIONS.reduce((acc, d) => acc + (weights[d.key] ?? 0), 0);
  const share = (key: keyof RiskWeights) => (total === 0 ? 0 : ((weights[key] ?? 0) / total) * 100);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          How the risk score is computed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Each student gets a score from 0 to 100. It is a weighted sum of five separate
          measurements — not a prediction, and not a judgement about the student. A high score means
          the data the school holds shows several things going wrong at once.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Showing algorithm configuration <span className="font-mono">v{config.version}</span>, the
          version currently in use.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          The five dimensions
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {DIMENSIONS.map((d) => (
            <li key={d.key} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">{d.label}</h3>
                <span className="text-sm font-semibold text-slate-700">
                  {share(d.key).toFixed(0)}% of the score
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                {d.measures}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${share(d.key)}%` }} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{d.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Where the bands sit
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The score is a number; the band is a label put on ranges of that number so lists can be
          sorted and filtered. The cut-offs are configuration, not fact — an administrator can move
          them, and moving them changes who appears at the top of a caseload without any student&apos;s
          situation having changed.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <BandCard label="Low" range={`Below ${thresholds.moderateMin}`} className="border-emerald-200 bg-emerald-50 text-emerald-800" />
          <BandCard label="Moderate" range={`${thresholds.moderateMin} to ${thresholds.highMin - 0.1}`} className="border-amber-200 bg-amber-50 text-amber-800" />
          <BandCard label="High" range={`${thresholds.highMin} and above`} className="border-rose-200 bg-rose-50 text-rose-800" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          What the score is not
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            It is not a prediction. Nothing here is a trained model estimating what a student
            <em> will </em> do — it is arithmetic over what has already been recorded.
          </li>
          <li>
            It is not a decision. A score never starts an intervention; a counselor does. See{" "}
            <Link href="/learn/decisions" className="font-medium text-slate-900 underline underline-offset-2">
              what the system decides
            </Link>
            .
          </li>
          <li>
            It is not better than the data underneath it. A student whose attendance was never
            recorded will score low for reasons that have nothing to do with how they are doing.
          </li>
          <li>
            It can be overridden. A principal can replace the band with their own judgement, in
            writing, and the original score stays visible underneath.
          </li>
        </ul>
      </section>
    </div>
  );
}

function BandCard({ label, range, className }: { label: string; range: string; className: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{range}</p>
    </div>
  );
}
