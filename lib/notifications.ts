// In-app notifications (spec §5).
//
// Deliberate boundary: a notification carries only the fact that something
// happened plus a link. It never carries rationale, counseling content, SEL
// detail, or any other field the query layer restricts — the recipient follows
// the link and the normal access rules apply there. Keeping payloads dumb means
// a notification can never become a side channel around RBAC.
//
// Emission never blocks the operation that triggered it: notifying is a
// courtesy, and a failed insert must not roll back a risk recompute or a
// referral decision.

import { prisma } from "@/lib/prisma";
import type { NotificationKind, RiskBand } from "@prisma/client";

export type NotificationDraft = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  linkHref?: string | null;
  schoolYearId?: string | null;
};

/** Bulk-insert notifications. Deduplicates nothing — callers decide relevance. */
export async function emitNotifications(drafts: NotificationDraft[]): Promise<number> {
  if (drafts.length === 0) return 0;
  const result = await prisma.notification.createMany({
    data: drafts.map((d) => ({
      userId: d.userId,
      kind: d.kind,
      title: d.title,
      body: d.body,
      linkHref: d.linkHref ?? null,
      schoolYearId: d.schoolYearId ?? null,
    })),
  });
  return result.count;
}

const BAND_RANK: Record<RiskBand, number> = { LOW: 0, MODERATE: 1, HIGH: 2 };

/** True when `next` is a worse band than `previous`. A first-ever score never counts. */
export function isBandIncrease(previous: RiskBand | null, next: RiskBand): boolean {
  if (previous === null) return false;
  return BAND_RANK[next] > BAND_RANK[previous];
}

export type BandCrossing = {
  studentName: string;
  sectionId: string;
  previousBand: RiskBand | null;
  nextBand: RiskBand;
};

/**
 * Turns scoring results into teacher notifications. Extracted from the compute
 * action so the fan-out rule is testable without a session — the action itself
 * only supplies data and persists the result.
 */
export function buildBandIncreaseNotifications(
  crossings: BandCrossing[],
  teachersBySection: Map<string, string[]>,
  schoolYearId: string,
): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];
  for (const c of crossings) {
    if (!isBandIncrease(c.previousBand, c.nextBand)) continue;
    for (const userId of teachersBySection.get(c.sectionId) ?? []) {
      drafts.push({
        userId,
        kind: "RISK_BAND_INCREASED",
        title: `${c.studentName} moved to ${c.nextBand} risk`,
        body: `Risk band changed from ${c.previousBand} to ${c.nextBand} in the latest recompute.`,
        linkHref: "/teacher/student-risk",
        schoolYearId,
      });
    }
  }
  return drafts;
}

/**
 * Teachers who should hear about a student in `sectionId` — every subject
 * teacher plus the adviser, since an adviser is just an assignment row with
 * `isAdviser = true`.
 */
export async function teachersForSection(sectionId: string, schoolYearId: string): Promise<string[]> {
  const rows = await prisma.teacherAssignment.findMany({
    where: { sectionId, schoolYearId },
    select: { userId: true },
  });
  return [...new Set(rows.map((r) => r.userId))];
}

/** Principals who should see approval requests. */
export async function activePrincipalIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "PRINCIPAL", status: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// ─── Read side ──────────────────────────────────────────────────────────────

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  linkHref: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function getNotifications(
  userId: string,
  options: { take?: number; unreadOnly?: boolean } = {},
): Promise<NotificationRow[]> {
  const rows = await prisma.notification.findMany({
    where: { userId, ...(options.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: options.take ?? 50,
  });
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    linkHref: n.linkHref,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));
}
