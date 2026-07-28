import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { PatternRuleConfig, PatternRuleId } from "@/lib/patterns/rules";

// Conditions are transcribed from lib/patterns/rules.ts. Unlike the weights on
// the risk-score page, these thresholds are compiled into the rule functions
// rather than stored in config — so they are written out here in prose, and
// this page has to be updated if a rule changes. Flagged in the tracker as the
// one drift risk in the /learn surface.
const RULES: Array<{
  id: PatternRuleId;
  scope: "Student" | "Section";
  label: string;
  plainLanguage: string;
  conditions: string[];
}> = [
  {
    id: "ACADEMIC_DECLINE_CLUSTER",
    scope: "Student",
    label: "Academic decline cluster",
    plainLanguage:
      "Grades are falling quarter after quarter and the student is also missing a lot of school. Either alone is common; together they tend to compound.",
    conditions: ["At least 2 consecutive quarters of falling averages", "Absence rate of 15% or higher"],
  },
  {
    id: "DISENGAGEMENT_SIGNAL",
    scope: "Student",
    label: "Disengagement signal",
    plainLanguage:
      "The student is drifting away from school rather than failing outright — arriving late, missing days, and picking up incidents.",
    conditions: ["Tardiness rate of 10% or higher", "Weighted behavioral count of 2 or more", "Absence rate of 8% or higher"],
  },
  {
    id: "CRISIS_WARNING",
    scope: "Student",
    label: "Crisis warning",
    plainLanguage:
      "A sustained disappearance from school alongside serious incidents. This is the rule most likely to need someone to act today rather than this term.",
    conditions: ["5 or more consecutive absences", "Weighted behavioral count of 3 or more"],
  },
  {
    id: "RECOVERY_TRACKING",
    scope: "Student",
    label: "Recovery tracking",
    plainLanguage:
      "Something is working. A student on an active plan has been improving for two quarters running — worth knowing so support is sustained rather than withdrawn early.",
    conditions: ["Currently on an active intervention", "At least 2 consecutive quarters of improving averages"],
  },
  {
    id: "CHRONIC_CONCERN",
    scope: "Student",
    label: "Chronic concern",
    plainLanguage:
      "Support has been tried more than once and has not held. This is a signal to change approach, not to repeat it.",
    conditions: ["2 or more past interventions that ended unfavourably", "Currently in the HIGH band"],
  },
  {
    id: "CONCENTRATED_RISK",
    scope: "Section",
    label: "Concentrated risk",
    plainLanguage:
      "Risk is clustering in one section rather than spread across the year group, which often points at something about the class rather than the individuals in it.",
    conditions: ["More than 30% of the section in MODERATE or HIGH"],
  },
  {
    id: "SUBJECT_STRUGGLE",
    scope: "Section",
    label: "Subject struggle",
    plainLanguage:
      "A whole section is failing one particular subject — usually a teaching, pacing, or resourcing question rather than a student one.",
    conditions: ["More than 40% failing marks in a single subject"],
  },
  {
    id: "ATTENDANCE_EROSION",
    scope: "Section",
    label: "Attendance erosion",
    plainLanguage:
      "One section is missing noticeably more school than the rest of the school.",
    conditions: ["Section absence rate more than 5 percentage points above the school average"],
  },
];

export default async function LearnPatternsPage() {
  await requireSession();
  const config = await prisma.algorithmConfig.findFirst({ where: { isActive: true } });
  const ruleConfig = (config?.ruleConfig ?? {}) as unknown as PatternRuleConfig;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          What the pattern rules look for
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          A score compresses everything into one number, which hides shape. These eight rules look
          for specific <em>situations</em> instead. Each one either fires or does not — there is no
          confidence value and no partial match, and every match records the evidence that produced
          it.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          A rule firing is not an accusation and not an instruction. It puts an item in a
          counselor&apos;s inbox, where a person decides whether it means anything.
        </p>
      </header>

      {(["Student", "Section"] as const).map((scope) => (
        <section key={scope}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {scope}-level rules
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {RULES.filter((r) => r.scope === scope).map((r) => {
              const disabled = ruleConfig[r.id] === false;
              return (
                <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{r.label}</h3>
                    {disabled && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Turned off
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.plainLanguage}</p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Fires only when all of these are true
                  </p>
                  <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-sm text-slate-700">
                    {r.conditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Rules that are not implemented
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Two further groups are described in the system design but do not run: grade-level rules
          (transition difficulty, cohort trend) and school-level rules (day-of-week effect,
          year-over-year drift). They need data across multiple full school years. They are listed
          here so their absence is visible rather than assumed.
        </p>
      </section>
    </div>
  );
}
