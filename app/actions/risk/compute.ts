"use server";

// Session-backed entry point for the risk engine. The orchestration itself
// lives in lib/risk/run-engine.ts so the scheduled cron path runs identical
// logic — this file is only auth, validation, and revalidation.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { runRiskEngine } from "@/lib/risk/run-engine";

const ComputeInput = z.object({
  schoolYearId: z.string().min(1),
  enrollmentId: z.string().optional(), // if omitted, computes all in year
});

type ComputeResult =
  | { ok: true; computed: number; patternsFound: number; recommendationsCreated: number; notificationsSent: number }
  | { ok: false; error: string };

export async function computeRiskAction(formData: FormData): Promise<ComputeResult> {
  const session = await requireRole(["COUNSELOR", "ADMIN", "PRINCIPAL"]);
  const raw = Object.fromEntries(formData);
  const parse = ComputeInput.safeParse(raw);
  if (!parse.success) return { ok: false, error: parse.error.issues[0].message };

  const run = await runRiskEngine({
    schoolYearId: parse.data.schoolYearId,
    enrollmentId: parse.data.enrollmentId,
    actorUserId: session.user.id,
    trigger: "manual",
  });
  if (!run.ok) return run;

  return { ok: true, ...run.result };
}

// Server action to dismiss a recommendation draft.
const DismissInput = z.object({ id: z.string().min(1) });

export async function dismissRecommendationAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("COUNSELOR");
  const parse = DismissInput.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.issues[0].message };

  const draft = await prisma.recommendationDraft.findUnique({ where: { id: parse.data.id } });
  if (!draft) return { ok: false, error: "Recommendation not found." };

  await prisma.recommendationDraft.update({
    where: { id: draft.id },
    data: { status: "DISMISSED" },
  });

  await logAudit({
    action: "RECOMMENDATION_DISMISSED",
    userId: session.user.id,
    resourceType: "RecommendationDraft",
    resourceId: draft.id,
    metadata: { action: "DISMISSED", scope: draft.scope, suggestedType: draft.suggestedType },
  });

  revalidatePath("/counselor/interventions");
  return { ok: true };
}
