import Link from "next/link";
import { requireSession } from "@/lib/session";

const SYSTEM_DOES = [
  "Adds up recorded grades, attendance, behaviour, and intervention history into a score.",
  "Sorts and filters students by that score so long lists have an order.",
  "Checks eight fixed rules and flags when a situation matches one.",
  "Drafts a suggested plan type with a written rationale, and puts it in a queue.",
  "Writes plain-language summaries of numbers that are already on the screen.",
  "Records who did what, and when, in a log that cannot be edited or deleted.",
];

const PEOPLE_DO = [
  "Decide whether a flagged situation actually means anything.",
  "Decide whether an intervention happens at all, and what it contains.",
  "Approve any plan affecting more than one student.",
  "Override a risk band, in writing, when the number does not match the child in front of them.",
  "Judge whether a plan worked, and record the outcome.",
  "Decide what data is collected in the first place, and revoke consent for it.",
];

export default async function LearnDecisionsPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          What the system decides — and what it doesn&apos;t
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The short version: this system decides nothing about any student. It measures, sorts, and
          suggests. Every action that touches a child is taken by a named person who can be asked to
          explain it.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            The system does
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-slate-600">
            {SYSTEM_DOES.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            People do
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-slate-700">
            {PEOPLE_DO.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Where the line is drawn in the code
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          A suggestion and a plan are different things in the database, not just on screen. When the
          engine finds something, it writes a <em>recommendation draft</em>. A draft can sit in the
          queue forever, be dismissed, or be edited beyond recognition before anything happens. An
          intervention only exists once a counselor creates one — and dismissing a draft is recorded
          too, so a decision not to act is as visible as a decision to act.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Where the AI fits
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The language model writes prose, and nothing else. It never computes a score, never
          decides a band, never picks who is at risk. It reads numbers the algorithm already
          produced and puts them in a sentence. If it is unavailable or a student&apos;s consent for
          AI analysis has been withdrawn, the narrative disappears and every number stays exactly
          where it was — which is the test of whether it was ever doing the real work.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          How to disagree with it
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Disagreeing is a supported operation, not a workaround. A principal can override a band
          with a written justification; the original score stays visible underneath it so nobody
          loses the fact that the two differ. A counselor can dismiss a recommendation. A teacher who
          thinks a plan is wrong can submit a revision request against it. If a number looks wrong,
          the useful next step is usually to check the data underneath it on the student&apos;s
          profile — an absence that was never recorded is invisible to the score.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          Related:{" "}
          <Link href="/learn/risk-score" className="font-medium text-slate-900 underline underline-offset-2">
            how the score is computed
          </Link>{" "}
          ·{" "}
          <Link href="/learn/patterns" className="font-medium text-slate-900 underline underline-offset-2">
            what the pattern rules look for
          </Link>
        </p>
      </section>
    </div>
  );
}
