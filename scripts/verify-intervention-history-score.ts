// Verifies the intervention-history risk dimension (Phase 8.0.1).
//
// Two parts:
//  1. Pure-engine table test — the sub-score responds to history as designed,
//     and an active plan alone never raises the score.
//  2. DB check — at least one real student carries a non-zero contribution.
//
// Run: npx tsx scripts/verify-intervention-history-score.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ParticipationOutcome } from "@prisma/client";
import { computeRiskScore } from "../lib/risk/engine";
import type { RiskFactors, RiskThresholds, RiskWeights } from "../lib/risk/types";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const WEIGHTS: RiskWeights = {
  academic: 0.3,
  attendance: 0.25,
  behavioral: 0.2,
  interventionHistory: 0.15,
  profile: 0.1,
};
const THRESHOLDS: RiskThresholds = { moderateMin: 40, highMin: 70 };

function subScoreFor(outcomes: ParticipationOutcome[], hasActive = false): number {
  const r = computeRiskScore({
    grades: [],
    attendance: [],
    behavioral: [],
    interventionHistory: { priorCompletedOutcomes: outcomes, hasActiveIntervention: hasActive },
    learningModality: "FACE_TO_FACE",
    weights: WEIGHTS,
    thresholds: THRESHOLDS,
  });
  return r.factors.interventionHistory;
}

interface Case {
  name: string;
  outcomes: ParticipationOutcome[];
  hasActive: boolean;
  expected: number;
}

const CASES: Case[] = [
  { name: "no history", outcomes: [], hasActive: false, expected: 0 },
  { name: "active plan only, no history", outcomes: [], hasActive: true, expected: 0 },
  { name: "1 stable", outcomes: ["STABLE"], hasActive: false, expected: 10 },
  { name: "1 improving (protective)", outcomes: ["IMPROVING"], hasActive: false, expected: 0 },
  { name: "1 declining", outcomes: ["DECLINING"], hasActive: false, expected: 30 },
  { name: "2 declining", outcomes: ["DECLINING", "DECLINING"], hasActive: false, expected: 65 },
  { name: "3 declining (caps)", outcomes: ["DECLINING", "DECLINING", "DECLINING"], hasActive: false, expected: 80 },
  { name: "2 completed, 1 improving", outcomes: ["COMPLETED", "IMPROVING"], hasActive: false, expected: 10 },
  { name: "3 stable (recurrence only)", outcomes: ["STABLE", "STABLE", "STABLE"], hasActive: false, expected: 40 },
];

async function main() {
  let failures = 0;

  console.log("── Pure engine: intervention-history sub-score ──\n");
  for (const c of CASES) {
    const got = subScoreFor(c.outcomes, c.hasActive);
    const ok = got === c.expected;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(32)} expected ${c.expected}, got ${got}`);
  }

  // The feedback-loop guard: an active plan must not change the total score.
  console.log("\n── Active-plan neutrality (no feedback loop) ──\n");
  const withoutActive = computeRiskScore({
    grades: [], attendance: [], behavioral: [],
    interventionHistory: { priorCompletedOutcomes: ["DECLINING"], hasActiveIntervention: false },
    learningModality: "FACE_TO_FACE", weights: WEIGHTS, thresholds: THRESHOLDS,
  });
  const withActive = computeRiskScore({
    grades: [], attendance: [], behavioral: [],
    interventionHistory: { priorCompletedOutcomes: ["DECLINING"], hasActiveIntervention: true },
    learningModality: "FACE_TO_FACE", weights: WEIGHTS, thresholds: THRESHOLDS,
  });
  const neutral = withoutActive.score === withActive.score;
  if (!neutral) failures++;
  console.log(
    `${neutral ? "PASS" : "FAIL"}  starting an active plan leaves score unchanged  ` +
      `(${withoutActive.score} → ${withActive.score})`,
  );

  // DB: confirm the dimension actually fires on real data.
  console.log("\n── Persisted assessments ──\n");
  const assessments = await prisma.riskAssessment.findMany({
    select: { factors: true, schoolYearId: true },
  });
  let nonZero = 0;
  let missingKey = 0;
  for (const a of assessments) {
    const f = a.factors as unknown as RiskFactors;
    if (f.breakdown?.interventionHistory === undefined) missingKey++;
    if ((f.interventionHistory ?? 0) > 0) nonZero++;
  }
  console.log(`total assessments      : ${assessments.length}`);
  console.log(`with non-zero history  : ${nonZero}`);
  console.log(`missing breakdown key  : ${missingKey} (stale rows from before Phase 8.0.1)`);

  if (assessments.length > 0 && nonZero === 0) {
    console.log("\nWARN  no student carries an intervention-history contribution — re-run the engine.");
  }

  console.log(`\n${failures === 0 ? "ALL ENGINE CASES PASS" : `${failures} FAILURE(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
