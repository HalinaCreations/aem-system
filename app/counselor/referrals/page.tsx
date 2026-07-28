import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { prisma } from "@/lib/prisma";
import ReferralQueue, { type ReferralCard } from "@/components/counselor/referral-queue";
import PageHeader from "@/components/shell/page-header";

export default async function CounselorReferralsPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const rows = await prisma.interventionReferral.findMany({
    where: { schoolYearId: sy.id, status: "PENDING" },
    include: {
      student: { select: { firstName: true, lastName: true, lrn: true } },
      referredBy: { select: { name: true, email: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });

  const referrals: ReferralCard[] = rows.map((r) => ({
    id: r.id,
    studentLabel: `${r.student.lastName}, ${r.student.firstName} · ${r.student.lrn}`,
    teacherLabel: r.referredBy.name ?? r.referredBy.email,
    suggestedType: r.suggestedType,
    urgency: r.urgency,
    rationale: r.rationale,
    createdAt: r.createdAt.toLocaleDateString(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Student Support"
        title="Teacher Referrals"
        description={`${referrals.length} pending referral${referrals.length === 1 ? "" : "s"} in ${sy.label}. Accept to pre-fill a new intervention you own, or decline with a reason.`}
      />
      <ReferralQueue referrals={referrals} />
    </div>
  );
}
