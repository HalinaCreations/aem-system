"use server";

import { prisma } from "@/lib/prisma";
import type { RiskWeights, RiskThresholds } from "@/lib/risk/types";

export async function getActiveAlgorithmConfigAction() {
  const config = await prisma.algorithmConfig.findFirst({
    where: { isActive: true },
  });
  if (!config) return null;
  return {
    version: config.version,
    weights: config.weights as unknown as RiskWeights,
    thresholds: config.thresholds as unknown as RiskThresholds,
    ruleConfig: config.ruleConfig ? JSON.parse(JSON.stringify(config.ruleConfig)) : {},
  };
}
